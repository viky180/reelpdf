import React, { useCallback, useState } from 'react';
import './FileUpload.css';

interface FileUploadProps {
    onFileSelect: (file: File) => void;
    isLoading?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect, isLoading }) => {
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragOver(false);

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type === 'application/pdf') {
            onFileSelect(files[0]);
        }
    }, [onFileSelect]);

    const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            onFileSelect(files[0]);
        }
    }, [onFileSelect]);

    return (
        <div className="file-upload-container">
            <div className="upload-hero">
                <div className="app-icon">
                    <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="8" y="4" width="32" height="40" rx="4" stroke="currentColor" strokeWidth="2.5" />
                        <path d="M16 16h16M16 24h16M16 32h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        <circle cx="36" cy="36" r="10" fill="var(--accent-primary)" />
                        <path d="M36 32v8M32 36h8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </div>
                <h1 className="app-title">ReelPDF</h1>
                <p className="app-subtitle">Read in focus. One slice at a time.</p>
            </div>

            <div
                className={`upload-zone ${isDragOver ? 'drag-over' : ''} ${isLoading ? 'loading' : ''}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {isLoading ? (
                    <div className="loading-indicator">
                        <div className="spinner"></div>
                        <span>Processing PDF...</span>
                    </div>
                ) : (
                    <>
                        <div className="upload-icon">
                            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 15V3m0 0l-4 4m4-4l4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 17l.621 2.485A2 2 0 004.561 21h14.878a2 2 0 001.94-1.515L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <p className="upload-text">Drop PDF here or tap to select</p>
                        <input
                            type="file"
                            accept="application/pdf"
                            onChange={handleFileInput}
                            className="file-input"
                        />
                    </>
                )}
            </div>

            <div className="features-list">
                <div className="feature">
                    <span className="feature-icon">📖</span>
                    <span>Smart slicing at paragraph breaks</span>
                </div>
                <div className="feature">
                    <span className="feature-icon">👆</span>
                    <span>Swipe to navigate sections</span>
                </div>
                <div className="feature">
                    <span className="feature-icon">✨</span>
                    <span>Highlight & export your notes</span>
                </div>
                <div className="feature">
                    <span className="feature-icon">📴</span>
                    <span>Works offline</span>
                </div>
            </div>
        </div>
    );
};
