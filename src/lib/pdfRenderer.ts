import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface PageRenderResult {
    pageNumber: number;
    width: number;
    height: number;
    canvas: HTMLCanvasElement;
    imageData: ImageData;
}

export interface PDFDocumentInfo {
    pageCount: number;
    title?: string;
}

/**
 * Load a PDF document from ArrayBuffer
 */
export async function loadPDF(data: ArrayBuffer): Promise<pdfjsLib.PDFDocumentProxy> {
    const loadingTask = pdfjsLib.getDocument({ data });
    return await loadingTask.promise;
}

/**
 * Get PDF document info
 */
export async function getPDFInfo(pdf: pdfjsLib.PDFDocumentProxy): Promise<PDFDocumentInfo> {
    const metadata = await pdf.getMetadata().catch(() => null);
    return {
        pageCount: pdf.numPages,
        title: (metadata?.info as Record<string, unknown>)?.Title as string | undefined,
    };
}

/**
 * Render a single PDF page to canvas at high resolution
 * @param pdf - PDF document
 * @param pageNumber - 1-indexed page number
 * @param scale - Render scale (2 = 2x resolution for retina)
 */
export async function renderPage(
    pdf: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    scale: number = 2
): Promise<PageRenderResult> {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    // Create canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    // Render page - pdfjs-dist v4+ requires canvas property
    await page.render({
        canvasContext: context,
        viewport: viewport,
        canvas: canvas,
    } as Parameters<typeof page.render>[0]).promise;

    // Get image data for whitespace analysis
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    return {
        pageNumber,
        width: viewport.width,
        height: viewport.height,
        canvas,
        imageData,
    };
}

/**
 * Render all pages of a PDF
 */
export async function renderAllPages(
    pdf: pdfjsLib.PDFDocumentProxy,
    scale: number = 2,
    onProgress?: (current: number, total: number) => void
): Promise<PageRenderResult[]> {
    const results: PageRenderResult[] = [];
    const totalPages = pdf.numPages;

    for (let i = 1; i <= totalPages; i++) {
        const result = await renderPage(pdf, i, scale);
        results.push(result);
        onProgress?.(i, totalPages);
    }

    return results;
}

/**
 * Convert canvas to Blob for storage
 */
export function canvasToBlob(
    canvas: HTMLCanvasElement,
    type: string = 'image/webp',
    quality: number = 0.9
): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('Failed to convert canvas to blob'));
            },
            type,
            quality
        );
    });
}

/**
 * Create a cropped slice from a canvas
 */
export function createSliceCanvas(
    sourceCanvas: HTMLCanvasElement,
    startY: number,
    endY: number,
    overlapHeight: number = 0
): HTMLCanvasElement {
    const sliceCanvas = document.createElement('canvas');
    const ctx = sliceCanvas.getContext('2d')!;

    const adjustedStartY = Math.max(0, startY - overlapHeight);
    const sliceHeight = endY - adjustedStartY;

    sliceCanvas.width = sourceCanvas.width;
    sliceCanvas.height = sliceHeight;

    ctx.drawImage(
        sourceCanvas,
        0, adjustedStartY, sourceCanvas.width, sliceHeight,
        0, 0, sourceCanvas.width, sliceHeight
    );

    return sliceCanvas;
}
