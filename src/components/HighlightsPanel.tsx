import React, { useEffect, useState } from 'react';
import { getHighlightsForDocument, deleteHighlight } from '../lib/storage';
import { exportHighlights, downloadHighlights, shareHighlights } from '../lib/exportHighlights';
import type { ExportFormat } from '../lib/exportHighlights';
import './HighlightsPanel.css';

interface Highlight {
    id: string;
    documentId: string;
    sliceIndex: number;
    pageNumber: number;
    text: string;
    createdAt: number;
}

interface HighlightsPanelProps {
    documentId: string;
    documentName: string;
    isOpen: boolean;
    onClose: () => void;
    onJumpToSlice: (sliceIndex: number) => void;
}

export const HighlightsPanel: React.FC<HighlightsPanelProps> = ({
    documentId,
    documentName,
    isOpen,
    onClose,
    onJumpToSlice,
}) => {
    const [highlights, setHighlights] = useState<Highlight[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadHighlights();
        }
    }, [isOpen, documentId]);

    const loadHighlights = async () => {
        const data = await getHighlightsForDocument(documentId);
        setHighlights(
            (data as Highlight[]).sort((a: Highlight, b: Highlight) =>
                a.pageNumber - b.pageNumber || a.sliceIndex - b.sliceIndex
            )
        );
    };

    const handleDelete = async (id: string) => {
        await deleteHighlight(id);
        setHighlights(prev => prev.filter(h => h.id !== id));
    };

    const handleExport = async (format: ExportFormat) => {
        setIsExporting(true);
        try {
            const content = await exportHighlights(documentId, documentName, format);

            // Try share first on mobile
            const shared = await shareHighlights(content, documentName);

            // Fall back to download
            if (!shared) {
                const filename = documentName.replace(/\.pdf$/i, '') + '_highlights';
                downloadHighlights(content, filename, format);
            }
        } catch (err) {
            console.error('Export failed:', err);
        }
        setIsExporting(false);
    };

    if (!isOpen) return null;

    return (
        <div className="highlights-overlay" onClick={onClose}>
            <div className="highlights-panel glass" onClick={e => e.stopPropagation()}>
                <header className="panel-header">
                    <h2>Highlights</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                        </svg>
                    </button>
                </header>

                {highlights.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📝</div>
                        <p>No highlights yet</p>
                        <p className="empty-hint">Select text while reading to highlight</p>
                    </div>
                ) : (
                    <>
                        <div className="highlights-list">
                            {highlights.map(h => (
                                <div key={h.id} className="highlight-item">
                                    <div className="highlight-meta">
                                        Page {h.pageNumber} • Slice {h.sliceIndex + 1}
                                    </div>
                                    <p className="highlight-text">{h.text}</p>
                                    <div className="highlight-actions">
                                        <button
                                            className="action-btn"
                                            onClick={() => {
                                                onJumpToSlice(h.sliceIndex);
                                                onClose();
                                            }}
                                        >
                                            Go to
                                        </button>
                                        <button
                                            className="action-btn delete"
                                            onClick={() => handleDelete(h.id)}
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="export-section">
                            <span className="export-label">Export as:</span>
                            <div className="export-buttons">
                                <button
                                    className="export-btn"
                                    onClick={() => handleExport('markdown')}
                                    disabled={isExporting}
                                >
                                    Markdown
                                </button>
                                <button
                                    className="export-btn"
                                    onClick={() => handleExport('text')}
                                    disabled={isExporting}
                                >
                                    Text
                                </button>
                                <button
                                    className="export-btn"
                                    onClick={() => handleExport('json')}
                                    disabled={isExporting}
                                >
                                    JSON
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
