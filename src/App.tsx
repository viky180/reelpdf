import { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { SliceReader } from './components/SliceReader';
import { HighlightsPanel } from './components/HighlightsPanel';
import { ProcessingOverlay } from './components/ProcessingOverlay';
import { loadPDF, getPDFInfo, renderAllPages } from './lib/pdfRenderer';
import { processDocumentSlices, revokeSliceUrls, loadSlicesFromStorage } from './lib/pageSlicer';
import type { SliceInfo, ProcessingProgress } from './lib/pageSlicer';
import { saveDocument, getProgress, getSlicesForDocument } from './lib/storage';
import { extractAllPagesText } from './lib/textExtractor';

type AppView = 'upload' | 'processing' | 'reader';

interface DocumentState {
  id: string;
  name: string;
  slices: SliceInfo[];
  initialSliceIndex: number;
}

function App() {
  const [view, setView] = useState<AppView>('upload');
  const [document, setDocument] = useState<DocumentState | null>(null);
  const [processingProgress, setProcessingProgress] = useState<ProcessingProgress>({
    phase: 'rendering',
    currentPage: 0,
    totalPages: 0,
    currentSlice: 0,
    totalSlices: 0,
  });
  const [showHighlights, setShowHighlights] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate document ID from file
  const generateDocId = (file: File): string => {
    return `doc-${file.name}-${file.size}-${file.lastModified}`;
  };

  // Handle file upload
  const handleFileSelect = useCallback(async (file: File) => {
    setError(null);
    setView('processing');

    try {
      const docId = generateDocId(file);
      const arrayBuffer = await file.arrayBuffer();

      // Clone the ArrayBuffer before pdf.js detaches it
      const arrayBufferForStorage = arrayBuffer.slice(0);

      // Check if we have cached slices
      const existingSlices = await getSlicesForDocument(docId);

      if (existingSlices.length > 0) {
        // Load from cache
        const slices = await loadSlicesFromStorage(docId, existingSlices);
        const progress = await getProgress(docId);

        setDocument({
          id: docId,
          name: file.name,
          slices,
          initialSliceIndex: progress?.currentSliceIndex ?? 0,
        });
        setView('reader');
        return;
      }

      // Load and process PDF
      const pdf = await loadPDF(arrayBuffer);
      const info = await getPDFInfo(pdf);

      // Save document with the cloned buffer
      await saveDocument(docId, file.name, arrayBufferForStorage, info.pageCount);

      // Render pages
      setProcessingProgress({
        phase: 'rendering',
        currentPage: 0,
        totalPages: info.pageCount,
        currentSlice: 0,
        totalSlices: 0,
      });

      const renderedPages = await renderAllPages(pdf, 2, (current, total) => {
        setProcessingProgress(prev => ({
          ...prev,
          phase: 'rendering',
          currentPage: current,
          totalPages: total,
        }));
      });

      // Extract text content for all pages
      const textContents = await extractAllPagesText(pdf, 2);

      // Get viewport height for slicing
      const viewportHeight = window.innerHeight;

      // Process slices
      const slices = await processDocumentSlices(
        docId,
        renderedPages,
        textContents,
        viewportHeight,
        (progress) => setProcessingProgress(progress)
      );

      setDocument({
        id: docId,
        name: file.name,
        slices,
        initialSliceIndex: 0,
      });
      setView('reader');

    } catch (err) {
      console.error('Failed to process PDF:', err);
      setError('Failed to process PDF. Please try again.');
      setView('upload');
    }
  }, []);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (document) {
      revokeSliceUrls(document.slices);
    }
    setDocument(null);
    setView('upload');
  }, [document]);

  // Handle jump to slice from highlights
  const handleJumpToSlice = useCallback((sliceIndex: number) => {
    if (document) {
      setDocument(prev => prev ? { ...prev, initialSliceIndex: sliceIndex } : null);
    }
  }, [document]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (document) {
        revokeSliceUrls(document.slices);
      }
    };
  }, []);

  return (
    <>
      {view === 'upload' && (
        <FileUpload
          onFileSelect={handleFileSelect}
          isLoading={false}
        />
      )}

      {view === 'processing' && (
        <ProcessingOverlay progress={processingProgress} />
      )}

      {view === 'reader' && document && (
        <>
          <SliceReader
            documentId={document.id}
            documentName={document.name}
            slices={document.slices}
            initialSliceIndex={document.initialSliceIndex}
            onBack={handleBack}
            onOpenHighlights={() => setShowHighlights(true)}
          />
          <HighlightsPanel
            documentId={document.id}
            documentName={document.name}
            isOpen={showHighlights}
            onClose={() => setShowHighlights(false)}
            onJumpToSlice={handleJumpToSlice}
          />
        </>
      )}

      {error && (
        <div className="error-toast glass">
          <span>{error}</span>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}
    </>
  );
}

export default App;
