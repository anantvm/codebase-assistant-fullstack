import { useState, useRef, useEffect, useCallback } from 'react';
import { askQuestion } from '../api.js';
import MessageBubble from './MessageBubble.jsx';
import './ChatPanel.css';

export default function ChatPanel({ indexedFile, messages, setMessages }) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);

  const disabled = !indexedFile;

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  // Expose insertQuestion for sidebar example-question clicks
  useEffect(() => {
    window.__insertQuestion = (q) => {
      setInput(q);
      setTimeout(() => textareaRef.current?.focus(), 0);
    };
    return () => { delete window.__insertQuestion; };
  }, []);

  // Auto-grow textarea
  const handleInputChange = (e) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  const sendMessage = useCallback(async (questionText) => {
    const question = questionText ?? input.trim();
    if (!question || loading) return;

    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';

    const userMsg = { role: 'user', content: question, id: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const answer = await askQuestion(question);
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: answer, id: Date.now() },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: e.message, id: Date.now(), error: true, originalQuestion: question },
      ]);
    } finally {
      setLoading(false);
    }
  }, [input, loading, setMessages]);

  const handleRetry = useCallback((msg) => {
    // Remove the error message and resend
    setMessages((prev) => prev.filter((m) => m.id !== msg.id));
    sendMessage(msg.originalQuestion);
  }, [setMessages, sendMessage]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="chat-panel">
      {/* Transcript */}
      <div className="chat-transcript" ref={scrollRef}>
        {messages.length === 0 && !loading && (
          <div className="chat-empty">
            {disabled ? (
              <>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="chat-empty-title">No project indexed</p>
                <p className="chat-empty-desc">Upload a .zip file in the sidebar to start exploring your codebase.</p>
              </>
            ) : (
              <>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <p className="chat-empty-title">Ask a question</p>
                <p className="chat-empty-desc">Your codebase is indexed. Ask anything about its structure, dependencies, or implementation.</p>
              </>
            )}
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} onRetry={handleRetry} />
        ))}

        {loading && (
          <div className="typing-indicator">
            <div className="typing-avatar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="typing-dots">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="chat-composer">
        <div className="composer-inner">
          <textarea
            ref={textareaRef}
            className="composer-input"
            placeholder={disabled ? 'Upload a codebase first…' : 'Ask about your codebase…'}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={disabled || loading}
            rows={1}
          />
          <button
            className="composer-send"
            onClick={() => sendMessage()}
            disabled={disabled || loading || !input.trim()}
            aria-label="Send message"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
