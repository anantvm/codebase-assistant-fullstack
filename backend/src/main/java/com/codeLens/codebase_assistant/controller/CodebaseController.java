package com.codeLens.codebase_assistant.controller;

import com.codeLens.codebase_assistant.service.CodebaseService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@RestController
@RequestMapping("/api/codebase")
@CrossOrigin(origins = "*")
public class CodebaseController {

    private static final Logger log = LoggerFactory.getLogger(CodebaseController.class);

    private final CodebaseService codebaseService;

    public CodebaseController(CodebaseService codebaseService) {
        this.codebaseService = codebaseService;
    }

    // Hits the Embeddings logic
    @PostMapping("/upload")
    public ResponseEntity<String> uploadProject(@RequestParam("file") MultipartFile file) {
        String name = file.getOriginalFilename();
        if (file.isEmpty() || name == null || !name.toLowerCase().endsWith(".zip")) {
            return ResponseEntity.badRequest().body("Please upload a valid .zip file.");
        }

        try {
            return ResponseEntity.ok(codebaseService.processZipFile(file));
        } catch (Exception e) {
            log.error("Upload failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error processing file: " + describe(e));
        }
    }

    // Hits the RAG logic
    @PostMapping("/chat")
    public ResponseEntity<String> chat(@RequestBody Map<String, String> request) {
        String question = request.get("question");

        if (question == null || question.trim().isEmpty()) {
            return ResponseEntity.badRequest().body("Question cannot be empty.");
        }

        try {
            return ResponseEntity.ok(codebaseService.askQuestion(question));
        } catch (Exception e) {
            log.error("Chat failed", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error generating answer: " + describe(e));
        }
    }

    // Walks to the root cause so the real Google API error is visible
    private String describe(Exception e) {
        Throwable root = e;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        return root.getClass().getSimpleName() + ": " + root.getMessage();
    }
}