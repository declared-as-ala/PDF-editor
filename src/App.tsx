import { useState } from 'react';
import { PDFUploader } from './components/PDFUploader';
import { PDFViewer } from './components/PDFViewer';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleClose = () => {
    setSelectedFile(null);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>
          <span className="logo-icon">📄</span>
          React PDF Editor
        </h1>
        <p className="subtitle">Upload and view PDF documents</p>
      </header>

      <main className="app-main">
        {!selectedFile ? (
          <PDFUploader onFileSelect={handleFileSelect} />
        ) : (
          <PDFViewer file={selectedFile} onClose={handleClose} />
        )}
      </main>

      <footer className="app-footer">
        <p>
          Built with React + TypeScript + react-pdf library
        </p>
        <p className="coming-soon">
          🚀 Coming soon: Text editing, annotations, and more!
        </p>
      </footer>
    </div>
  );
}

export default App;
