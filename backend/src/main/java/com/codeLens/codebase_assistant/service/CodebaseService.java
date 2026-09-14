package com.codeLens.codebase_assistant.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.document.Document;
import org.springframework.ai.transformer.splitter.TokenTextSplitter;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class CodebaseService {

    private static final Logger log = LoggerFactory.getLogger(CodebaseService.class);

    private final VectorStore vectorStore;
    private final JdbcTemplate jdbcTemplate;
    private final ChatClient chatClient;

    public CodebaseService(VectorStore vectorStore, JdbcTemplate jdbcTemplate, ChatClient.Builder chatClientBuilder) {
        this.vectorStore = vectorStore;
        this.jdbcTemplate = jdbcTemplate;
        this.chatClient = chatClientBuilder.build();
    }

    private static final List<String> IGNORED_DIRS = List.of(
            "node_modules/", ".git/", ".idea/", ".vscode/",
            "target/", "build/", "dist/", "out/", "__macosx/"
    );

    private static final List<String> IGNORED_EXTENSIONS = List.of(
            ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
            ".jar", ".class", ".war", ".zip", ".pdf", ".lock",
            ".woff", ".woff2", ".ttf", ".eot", ".mp4", ".exe", ".dll", ".so"
    );

    // Skip anything bigger than this - a single giant file blows up the token budget
    private static final int MAX_FILE_BYTES = 200 * 1024;

    // ==========================================
    // STEP 1: EMBEDDING LOGIC (Upload Phase)
    // ==========================================
    public String processZipFile(MultipartFile file) throws Exception {
        Map<String, String> validSourceFiles = new HashMap<>();

        try (ZipInputStream zis = new ZipInputStream(file.getInputStream())) {
            ZipEntry entry;
            while ((entry = zis.getNextEntry()) != null) {
                if (entry.isDirectory() || shouldIgnore(entry.getName())) {
                    zis.closeEntry();
                    continue;
                }

                byte[] contentBytes = zis.readAllBytes();
                zis.closeEntry();

                if (contentBytes.length == 0 || contentBytes.length > MAX_FILE_BYTES) {
                    continue;
                }
                if (looksBinary(contentBytes)) {
                    continue;
                }

                String content = new String(contentBytes, StandardCharsets.UTF_8);
                if (content.isBlank()) {
                    continue;
                }
                validSourceFiles.put(entry.getName(), content);
            }
        }

        if (validSourceFiles.isEmpty()) {
            return "No readable source files found in that zip.";
        }

        List<Document> documents = new ArrayList<>();
        for (Map.Entry<String, String> entry : validSourceFiles.entrySet()) {
            documents.add(new Document(entry.getValue(), Map.of("filename", entry.getKey())));
        }

        TokenTextSplitter splitter = new TokenTextSplitter();
        List<Document> chunkedDocs = splitter.apply(documents);

        // Clears old project data so the AI doesn't get confused
        jdbcTemplate.execute("TRUNCATE TABLE vector_store");

        // Embed in batches - one huge call is the usual cause of upload timeouts
        int batchSize = 50;
        for (int i = 0; i < chunkedDocs.size(); i += batchSize) {
            List<Document> batch = chunkedDocs.subList(i, Math.min(i + batchSize, chunkedDocs.size()));
            vectorStore.add(batch);
            log.info("Embedded {}/{} chunks", Math.min(i + batchSize, chunkedDocs.size()), chunkedDocs.size());
        }

        return "Successfully processed " + validSourceFiles.size() + " files into "
                + chunkedDocs.size() + " vector embeddings.";
    }

    // ==========================================
    // STEP 2: RAG LOGIC (Chat Phase)
    // ==========================================
    public String askQuestion(String question) {
        List<Document> similarDocuments = vectorStore.similaritySearch(
                SearchRequest.builder()
                        .query(question)
                        .topK(8)
                        .similarityThreshold(0.0)
                        .build()
        );

        if (similarDocuments == null || similarDocuments.isEmpty()) {
            return "I couldn't find any indexed code. Upload a project zip to /api/codebase/upload first.";
        }

        log.info("Retrieved {} chunks for question: {}", similarDocuments.size(), question);

        // Combine the chunks, keeping the file path attached to each one
        String context = similarDocuments.stream()
                .map(doc -> {
                    Object filename = doc.getMetadata().get("filename");
                    String text = doc.getText() == null ? "" : doc.getText();
                    return "===== File: " + filename + " =====\n" + text;
                })
                .collect(Collectors.joining("\n\n"));

        String systemPrompt = """
                You are an expert AI codebase assistant.
                Use only the code snippets below to answer the user's question.
                Reference file names when it helps the explanation.
                If the answer is not contained in the snippets, say you don't know based on the provided code.

                Code Context:
                %s
                """.formatted(context);

        String answer = chatClient.prompt()
                .system(systemPrompt)
                .user(question)
                .call()
                .content();

        return (answer == null || answer.isBlank())
                ? "The model returned an empty response. Try rephrasing the question."
                : answer;
    }

    private boolean shouldIgnore(String filePath) {
        String lowerPath = filePath.toLowerCase();
        for (String dir : IGNORED_DIRS) {
            if (lowerPath.contains(dir)) return true;
        }
        for (String ext : IGNORED_EXTENSIONS) {
            if (lowerPath.endsWith(ext)) return true;
        }
        return false;
    }

    private boolean looksBinary(byte[] bytes) {
        int limit = Math.min(bytes.length, 1024);
        for (int i = 0; i < limit; i++) {
            if (bytes[i] == 0) return true;
        }
        return false;
    }
}