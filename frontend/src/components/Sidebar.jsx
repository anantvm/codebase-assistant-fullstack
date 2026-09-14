import { useState, useRef, useCallback } from 'react';
import { uploadCodebase } from '../api.js';
import './Sidebar.css';

const MAX_SIZE = 50 * 1024 * 1024; // 50 MB

const EXAMPLE_QUESTIONS = [
  'What is the overall architecture of this project?',
  'What are the main entry points?',
  'List the external dependencies and their purposes.',
  'Are there any potential security concerns?',
  'Explain the data flow through the application.',
];

export default function Sidebar({
  indexedFile,
  setIndexedFile,
  uploadStatus,
  setUploadStatus,
  onQuestionClick,
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadFileName, setUploadFileName] = useState('');
  const fileInputRef = useRef(null);

  const validate = (file) => {
    if (!file) return 'No file selected.';
    if (!file.name.endsWith('.zip')) return 'Only .zip files are accepted.';
    if (file.size > MAX_SIZE) return 'File exceeds the 50 MB limit.';
    return null;
  };

  const handleUpload = useCallback(
    async (file) => {
      const err = validate(file);
      if (err) {
        setUploadStatus({ type: 'error', message: err });
        return;
      }

      setUploading(true);
      setUploadFileName(file.name);
      setUploadStatus(null);

      try {
        const message = await uploadCodebase(file);
        setIndexedFile(file.name);
        setUploadStatus({ type: 'success', message });
      } catch (e) {
        setUploadStatus({ type: 'error', message: e.message });
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [setIndexedFile, setUploadStatus],
  );

  const onDrop = useCallback(
    (e) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleUpload(file);
    },
    [handleUpload],
  );

  const onDragOver = (e) => {
    e.preventDefault();
    setDragging(true);
  };

  const onDragLeave = (e) => {
    e.preventDefault();
    setDragging(false);
  };

  return (
    <div className="sidebar-inner">
      {/* Brand */}
      <div className="sidebar-brand">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
            stroke="var(--accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="sidebar-brand-name">CodeLens</span>
      </div>

      {/* Dropzone */}
      <div
        className={`dropzone ${dragging ? 'dragging' : ''} ${uploading ? 'uploading' : ''}`}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => !uploading && fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className="dropzone-input"
          onChange={(e) => handleUpload(e.target.files?.[0])}
          disabled={uploading}
        />
        {uploading ? (
          <>
            <div className="dropzone-spinner" />
            <span className="dropzone-label">Uploading {uploadFileName}…</span>
          </>
        ) : (
          <>
            <svg className="dropzone-icon" width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="dropzone-label">Drop a .zip here or click to browse</span>
            <span className="dropzone-hint">Max 50 MB</span>
          </>
        )}
      </div>

      {/* Status messages */}
      {uploadStatus?.type === 'success' && (
        <div className="status-message status-success">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {uploadStatus.message}
        </div>
      )}
      {uploadStatus?.type === 'error' && (
        <div className="status-message status-error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          {uploadStatus.message}
        </div>
      )}

      {/* Indexed chip */}
      {indexedFile && (
        <div className="indexed-chip">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
              d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M14 2v6h6" stroke="currentColor" strokeWidth="1.5" />
          </svg>
          <span>Indexed: {indexedFile}</span>
        </div>
      )}

      {/* Divider */}
      <div className="sidebar-divider" />

      {/* Example questions */}
      <div className="example-questions">
        <div className="example-questions-title">Example questions</div>
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            className="example-q-btn"
            onClick={() => onQuestionClick(q)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>{q}</span>
          </button>
        ))}
      </div>

      {/* Note */}
      <div className="sidebar-note">
        Uploading a new zip replaces the currently indexed project.
      </div>
    </div>
  );
}
