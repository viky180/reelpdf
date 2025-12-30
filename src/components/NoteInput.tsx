import React, { useState } from 'react';
import { saveHighlight } from '../lib/storage';
import './NoteInput.css';

interface NoteInputProps {
    documentId: string;
    sliceIndex: number;
    pageNumber: number;
    isOpen: boolean;
    onClose: () => void;
    onSaved: () => void;
}

export const NoteInput: React.FC<NoteInputProps> = ({
    documentId,
    sliceIndex,
    pageNumber,
    isOpen,
    onClose,
    onSaved,
}) => {
    const [text, setText] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!text.trim()) return;

        setIsSaving(true);
        try {
            await saveHighlight({
                id: `highlight-${documentId}-${Date.now()}`,
                documentId,
                sliceIndex,
                pageNumber,
                text: text.trim(),
                position: { x: 0, y: 0, width: 0, height: 0 },
                createdAt: Date.now(),
            });
            setText('');
            onSaved();
            onClose();
        } catch (err) {
            console.error('Failed to save note:', err);
        }
        setIsSaving(false);
    };

    if (!isOpen) return null;

    return (
        <div className="note-overlay" onClick={onClose}>
            <div className="note-modal glass" onClick={e => e.stopPropagation()}>
                <header className="note-header">
                    <h3>Add Note</h3>
                    <span className="note-meta">Page {pageNumber} • Slice {sliceIndex + 1}</span>
                </header>

                <textarea
                    className="note-textarea"
                    placeholder="Type or paste your note here..."
                    value={text}
                    onChange={e => setText(e.target.value)}
                    autoFocus
                    rows={4}
                />

                <div className="note-actions">
                    <button className="note-btn cancel" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        className="note-btn save"
                        onClick={handleSave}
                        disabled={!text.trim() || isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Note'}
                    </button>
                </div>
            </div>
        </div>
    );
};
