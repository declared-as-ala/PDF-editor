import React, { useRef } from 'react';

interface PDFUploaderProps {
    onFileSelect: (file: File) => void;
}

export const PDFUploader: React.FC<PDFUploaderProps> = ({ onFileSelect }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && file.type === 'application/pdf') {
            onFileSelect(file);
        } else {
            alert('Please select a valid PDF file');
        }
    };

    const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();
    };

    const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
        event.preventDefault();
        event.stopPropagation();

        const file = event.dataTransfer.files?.[0];
        if (file && file.type === 'application/pdf') {
            onFileSelect(file);
        } else {
            alert('Please drop a valid PDF file');
        }
    };

    const handleClick = () => {
        fileInputRef.current?.click();
    };

    return (
        <div
            className="pdf-uploader"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={handleClick}
        >
            <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                style={{ display: 'none' }}
            />
            <div className="upload-content">
                <svg
                    className="upload-icon"
                    width="64"
                    height="64"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <h3>Upload PDF</h3>
                <p>Click or drag and drop a PDF file here</p>
                <p className="file-types">Supports: PDF files only</p>
            </div>
        </div>
    );
};
