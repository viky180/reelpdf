import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { TextItem } from '../lib/textExtractor';
import { saveHighlight } from '../lib/storage';
import './TextLayer.css';

interface TextLayerProps {
    textItems: TextItem[];
    sliceHeight: number;
    sliceWidth: number;
    documentId: string;
    sliceIndex: number;
    pageNumber: number;
    onHighlightSaved?: () => void;
}

export const TextLayer: React.FC<TextLayerProps> = ({
    textItems,
    sliceHeight,
    sliceWidth,
    documentId,
    sliceIndex,
    pageNumber,
    onHighlightSaved,
}) => {
    const layerRef = useRef<HTMLDivElement>(null);
    const [selectedText, setSelectedText] = useState('');
    const [showHighlightBtn, setShowHighlightBtn] = useState(false);
    const [btnPosition, setBtnPosition] = useState({ x: 0, y: 0 });

    // Handle text selection
    const handleMouseUp = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            setShowHighlightBtn(false);
            setSelectedText('');
            return;
        }

        const text = selection.toString().trim();
        if (text.length > 0) {
            setSelectedText(text);

            // Position button near selection
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            const layerRect = layerRef.current?.getBoundingClientRect();

            if (layerRect) {
                setBtnPosition({
                    x: rect.left - layerRect.left + rect.width / 2,
                    y: rect.top - layerRect.top - 10,
                });
                setShowHighlightBtn(true);
            }
        }
    }, []);

    // Handle highlight save
    const handleSaveHighlight = useCallback(async () => {
        if (!selectedText) return;

        try {
            await saveHighlight({
                id: `highlight-${documentId}-${Date.now()}`,
                documentId,
                sliceIndex,
                pageNumber,
                text: selectedText,
                position: { x: btnPosition.x, y: btnPosition.y, width: 0, height: 0 },
                createdAt: Date.now(),
            });

            // Clear selection
            window.getSelection()?.removeAllRanges();
            setShowHighlightBtn(false);
            setSelectedText('');

            onHighlightSaved?.();
        } catch (err) {
            console.error('Failed to save highlight:', err);
        }
    }, [selectedText, documentId, sliceIndex, pageNumber, btnPosition, onHighlightSaved]);

    // Close button when clicking elsewhere
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (showHighlightBtn && layerRef.current && !layerRef.current.contains(e.target as Node)) {
                setShowHighlightBtn(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showHighlightBtn]);

    return (
        <div
            ref={layerRef}
            className="text-layer"
            style={{ width: sliceWidth, height: sliceHeight }}
            onMouseUp={handleMouseUp}
            onTouchEnd={handleMouseUp}
        >
            {textItems.map((item, idx) => (
                <span
                    key={idx}
                    className="text-item"
                    style={{
                        left: item.x,
                        top: item.y,
                        fontSize: item.fontHeight,
                        width: item.width,
                        height: item.height,
                    }}
                >
                    {item.str}
                </span>
            ))}

            {/* Floating highlight button */}
            {showHighlightBtn && (
                <button
                    className="highlight-btn glass"
                    style={{
                        left: btnPosition.x,
                        top: btnPosition.y,
                    }}
                    onClick={handleSaveHighlight}
                >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    Save
                </button>
            )}
        </div>
    );
};
