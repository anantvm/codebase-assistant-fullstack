package com.codeLens.codebase_assistant.controller;

import com.codeLens.codebase_assistant.service.CodebaseService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/codebase")
@CrossOrigin(origins = "*")
public class CodebaseController {

    private final CodebaseService codebaseService;

    public CodebaseController(CodebaseService codebaseService) {
        this.codebaseService = codebaseService;
    }

    @PostMapping("/upload")
    public ResponseEntity<String> uploadProject(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty() || !file.getOriginalFilename().endsWith(".zip")) {
            return ResponseEntity.badRequest().body("Please upload a valid .zip file.");
        }

        try {
            String result = codebaseService.processZipFile(file);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Error processing file: " + e.getMessage());
        }
    }
}