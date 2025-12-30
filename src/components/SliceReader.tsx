import React, { useRef, useEffect, useCallback, useState } from 'react';
import type { SliceInfo } from '../lib/pageSlicer';
import { saveProgress } from '../lib/storage';
import { NoteInput } from './NoteInput';
import { TextLayer } from './TextLayer';
import './SliceReader.css';

interface SliceReaderProps {
    documentId: string;
    documentName: string;
    slices: SliceInfo[];
    initialSliceIndex?: number;
    onBack: () => void;
    onOpenHighlights: () => void;
}

export const SliceReader: React.FC<SliceReaderProps> = ({
    documentId,
    documentName,
    slices,
    initialSliceIndex = 0,
    onBack,
    onOpenHighlights,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [currentIndex, setCurrentIndex] = useState(initialSliceIndex);
    const [showControls, setShowControls] = useState(true);
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [noteSavedMessage, setNoteSavedMessage] = useState(false);
    const controlsTimeoutRef = useRef<number | undefined>(undefined);

    // Handle highlight saved from text selection
    const handleHighlightSaved = useCallback(() => {
        setNoteSavedMessage(true);
        setTimeout(() => setNoteSavedMessage(false), 2000);
    }, []);

    // Scroll to initial slice
    useEffect(() => {
        if (containerRef.current && slices[initialSliceIndex]) {
            const sliceElement = containerRef.current.children[initialSliceIndex] as HTMLElement;
            if (sliceElement) {
                sliceElement.scrollIntoView({ behavior: 'instant' as ScrollBehavior });
            }
        }
    }, [initialSliceIndex, slices]);

    // Track scroll position and update current index
    const handleScroll = useCallback(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        // Find which slice is currently most visible
        let newIndex = 0;
        let maxVisibility = 0;

        Array.from(container.children).forEach((child, index) => {
            const element = child as HTMLElement;
            const rect = element.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();

            const visibleTop = Math.max(rect.top, containerRect.top);
            const visibleBottom = Math.min(rect.bottom, containerRect.bottom);
            const visibleHeight = Math.max(0, visibleBottom - visibleTop);

            if (visibleHeight > maxVisibility) {
                maxVisibility = visibleHeight;
                newIndex = index;
            }
        });

        if (newIndex !== currentIndex) {
            setCurrentIndex(newIndex);
            // Save progress
            saveProgress(documentId, newIndex, slices.length);
        }

        // Show controls briefly on scroll
        setShowControls(true);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        controlsTimeoutRef.current = window.setTimeout(() => {
            setShowControls(false);
        }, 2000);
    }, [currentIndex, documentId, slices.length]);

    // Tap to show controls
    const handleTap = useCallback(() => {
        setShowControls(prev => !prev);
        if (controlsTimeoutRef.current) {
            clearTimeout(controlsTimeoutRef.current);
        }
        if (!showControls) {
            controlsTimeoutRef.current = window.setTimeout(() => {
                setShowControls(false);
            }, 3000);
        }
    }, [showControls]);

    // Handle note saved
    const handleNoteSaved = useCallback(() => {
        setNoteSavedMessage(true);
        setTimeout(() => setNoteSavedMessage(false), 2000);
    }, []);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!containerRef.current) return;
            if (showNoteInput) return; // Don't navigate while note input is open

            if (e.key === 'ArrowDown' || e.key === ' ') {
                e.preventDefault();
                const nextSlice = containerRef.current.children[currentIndex + 1] as HTMLElement;
                nextSlice?.scrollIntoView({ behavior: 'smooth' });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prevSlice = containerRef.current.children[currentIndex - 1] as HTMLElement;
                prevSlice?.scrollIntoView({ behavior: 'smooth' });
            } else if (e.key === 'Escape') {
                onBack();
            } else if (e.key === 'n' || e.key === 'N') {
                // Press N to add note
                setShowNoteInput(true);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentIndex, onBack, showNoteInput]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (controlsTimeoutRef.current) {
                clearTimeout(controlsTimeoutRef.current);
            }
        };
    }, []);

    const currentSlice = slices[currentIndex];
    const progress = ((currentIndex + 1) / slices.length) * 100;

    return (
        <div className="slice-reader">
            {/* Top bar */}
            <header className={`reader-header glass ${showControls ? 'visible' : ''}`}>
                <button className="header-btn" onClick={onBack} aria-label="Go back">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <div className="header-title">
                    <span className="doc-name">{documentName}</span>
                    <span className="slice-info">
                        Slice {currentIndex + 1} of {slices.length}
                        {currentSlice && ` • Page ${currentSlice.pageNumber}`}
                    </span>
                </div>
                <button className="header-btn" onClick={onOpenHighlights} aria-label="View highlights">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </header>

            {/* Slices container */}
            <div
                ref={containerRef}
                className="slices-container"
                onScroll={handleScroll}
                onClick={handleTap}
            >
                {slices.map((slice, index) => (
                    <div key={slice.id} className="slice" data-index={index}>
                        {/* Overlap indicator */}
                        {slice.overlapHeight > 0 && (
                            <div
                                className="overlap-indicator"
                                style={{ height: slice.overlapHeight / 2 }}
                            />
                        )}
                        <img
                            src={slice.imageUrl}
                            alt={`Page ${slice.pageNumber}, slice ${slice.sliceIndex + 1}`}
                            className="slice-image"
                            draggable={false}
                        />
                        {/* Text layer for selection */}
                        {slice.textItems && slice.textItems.length > 0 && (
                            <TextLayer
                                textItems={slice.textItems}
                                sliceHeight={slice.height}
                                sliceWidth={slice.width}
                                documentId={documentId}
                                sliceIndex={slice.globalIndex}
                                pageNumber={slice.pageNumber}
                                onHighlightSaved={handleHighlightSaved}
                            />
                        )}
                    </div>
                ))}
            </div>

            {/* Floating Add Note button */}
            <button
                className={`add-note-btn ${showControls ? 'visible' : ''}`}
                onClick={(e) => {
                    e.stopPropagation();
                    setShowNoteInput(true);
                }}
                aria-label="Add note"
            >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>Add Note</span>
            </button>

            {/* Progress bar */}
            <div className={`progress-rail ${showControls ? 'visible' : ''}`}>
                <div className="progress-fill" style={{ height: `${progress}%` }} />
                <div
                    className="progress-thumb"
                    style={{ top: `${progress}%` }}
                />
            </div>

            {/* Navigation hints */}
            <div className={`nav-hints ${showControls ? 'visible' : ''}`}>
                {currentIndex > 0 && (
                    <div className="nav-hint up">↑ Swipe up</div>
                )}
                {currentIndex < slices.length - 1 && (
                    <div className="nav-hint down">↓ Swipe down</div>
                )}
            </div>

            {/* Note saved toast */}
            {noteSavedMessage && (
                <div className="note-saved-toast glass">
                    ✓ Note saved
                </div>
            )}

            {/* Note input modal */}
            {currentSlice && (
                <NoteInput
                    documentId={documentId}
                    sliceIndex={currentIndex}
                    pageNumber={currentSlice.pageNumber}
                    isOpen={showNoteInput}
                    onClose={() => setShowNoteInput(false)}
                    onSaved={handleNoteSaved}
                />
            )}
        </div>
    );
};
