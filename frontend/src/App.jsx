import { useState } from 'react';
import Sidebar from './components/Sidebar.jsx';
import ChatPanel from './components/ChatPanel.jsx';
import './App.css';

export default function App() {
  const [indexedFile, setIndexedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleQuestionClick = (question) => {
    setSidebarOpen(false);
    window.__insertQuestion?.(question);
  };

  return (
    <div className="app">
      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`}
           onClick={() => setSidebarOpen(false)} />
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar
          indexedFile={indexedFile}
          setIndexedFile={setIndexedFile}
          uploadStatus={uploadStatus}
          setUploadStatus={setUploadStatus}
          onQuestionClick={handleQuestionClick}
        />
      </aside>
      <main className="main-panel">
        <button
          className="mobile-menu-btn"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <ChatPanel
          indexedFile={indexedFile}
          messages={messages}
          setMessages={setMessages}
        />
      </main>
    </div>
  );
}
