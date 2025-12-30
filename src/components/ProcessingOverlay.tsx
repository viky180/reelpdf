import React from 'react';
import type { ProcessingProgress } from '../lib/pageSlicer';
import './ProcessingOverlay.css';

interface ProcessingOverlayProps {
    progress: ProcessingProgress;
}

export const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ progress }) => {
    const getPhaseText = () => {
        switch (progress.phase) {
            case 'rendering':
                return `Rendering page ${progress.currentPage} of ${progress.totalPages}`;
            case 'slicing':
                return `Creating slices from page ${progress.currentPage}`;
            case 'complete':
                return 'Ready!';
            default:
                return 'Processing...';
        }
    };

    const getProgress = () => {
        if (progress.totalPages === 0) return 0;
        return (progress.currentPage / progress.totalPages) * 100;
    };

    return (
        <div className="processing-overlay">
            <div className="processing-content glass">
                <div className="processing-icon">
                    <svg viewBox="0 0 48 48" fill="none">
                        <rect x="8" y="4" width="32" height="40" rx="4" stroke="currentColor" strokeWidth="2.5" />
                        <path className="scan-line" d="M8 24h32" stroke="var(--accent-primary)" strokeWidth="2" />
                    </svg>
                </div>

                <div className="progress-info">
                    <span className="phase-text">{getPhaseText()}</span>
                    <div className="progress-bar">
                        <div
                            className="progress-bar-fill"
                            style={{ width: `${getProgress()}%` }}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
