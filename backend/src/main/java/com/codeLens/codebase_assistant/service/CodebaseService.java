package com.codeLens.codebase_assistant.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.zip.ZipEntry;
import java.util.zip.ZipInputStream;

@Service
public class CodebaseService {

    private static final List<String> IGNORED_DIRS = List.of(
            "node_modules/", ".git/", ".idea/", ".vscode/",
            "target/", "build/", "dist/", "out/"
    );

    private static final List<String> IGNORED_EXTENSIONS = List.of(
            ".png", ".jpg", ".jpeg", ".gif", ".svg", ".ico",
            ".jar", ".class", ".war", ".zip", ".pdf", ".lock"
    );

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
                String content = new String(contentBytes, StandardCharsets.UTF_8);

                validSourceFiles.put(entry.getName(), content);

                zis.closeEntry();
            }
        }

        return "Successfully extracted " + validSourceFiles.size() + " source files. Ready for embedding.";
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
}