import type { PageRenderResult } from './pdfRenderer';
import { createSliceCanvas, canvasToBlob } from './pdfRenderer';
import { analyzePageForSlicing } from './whitespaceDetector';
import { saveSlice, clearSlicesForDocument } from './storage';
import type { TextItem, PageTextContent } from './textExtractor';
import { getTextItemsForSlice } from './textExtractor';

export interface SliceInfo {
    id: string;
    documentId: string;
    pageNumber: number;
    sliceIndex: number;
    globalIndex: number;
    imageUrl: string;
    startY: number;
    endY: number;
    overlapHeight: number;
    width: number;
    height: number;
    textItems: TextItem[];
}

export interface ProcessingProgress {
    phase: 'rendering' | 'slicing' | 'complete';
    currentPage: number;
    totalPages: number;
    currentSlice: number;
    totalSlices: number;
}

const OVERLAP_HEIGHT = 60;

/**
 * Process all pages and create slices with text content
 */
export async function processDocumentSlices(
    documentId: string,
    renderedPages: PageRenderResult[],
    textContents: PageTextContent[],
    viewportHeight: number,
    onProgress?: (progress: ProcessingProgress) => void
): Promise<SliceInfo[]> {
    await clearSlicesForDocument(documentId);

    const allSlices: SliceInfo[] = [];
    let globalIndex = 0;

    for (let pageIdx = 0; pageIdx < renderedPages.length; pageIdx++) {
        const page = renderedPages[pageIdx];
        const pageText = textContents[pageIdx];

        onProgress?.({
            phase: 'slicing',
            currentPage: pageIdx + 1,
            totalPages: renderedPages.length,
            currentSlice: globalIndex,
            totalSlices: 0,
        });

        const sliceBounds = analyzePageForSlicing(
            page.imageData,
            viewportHeight,
            2
        );

        for (let sliceIdx = 0; sliceIdx < sliceBounds.length; sliceIdx++) {
            const bounds = sliceBounds[sliceIdx];
            const isFirstSlice = sliceIdx === 0 && pageIdx === 0;
            const overlapHeight = isFirstSlice ? 0 : OVERLAP_HEIGHT;

            const sliceCanvas = createSliceCanvas(
                page.canvas,
                bounds.startY,
                bounds.endY,
                overlapHeight
            );

            const imageBlob = await canvasToBlob(sliceCanvas);
            const imageUrl = URL.createObjectURL(imageBlob);
            const sliceId = `${documentId}-p${page.pageNumber}-s${sliceIdx}`;

            // Get text items that fall within this slice
            const adjustedStartY = Math.max(0, bounds.startY - overlapHeight);
            const textItems = pageText
                ? getTextItemsForSlice(pageText, adjustedStartY, bounds.endY)
                : [];

            await saveSlice({
                id: sliceId,
                documentId,
                pageNumber: page.pageNumber,
                sliceIndex: sliceIdx,
                imageData: imageBlob,
                startY: bounds.startY,
                endY: bounds.endY,
                overlapHeight,
            });

            allSlices.push({
                id: sliceId,
                documentId,
                pageNumber: page.pageNumber,
                sliceIndex: sliceIdx,
                globalIndex,
                imageUrl,
                startY: bounds.startY,
                endY: bounds.endY,
                overlapHeight,
                width: sliceCanvas.width,
                height: sliceCanvas.height,
                textItems,
            });

            globalIndex++;
        }
    }

    onProgress?.({
        phase: 'complete',
        currentPage: renderedPages.length,
        totalPages: renderedPages.length,
        currentSlice: globalIndex,
        totalSlices: globalIndex,
    });

    return allSlices;
}

interface StoredSlice {
    id: string;
    documentId: string;
    pageNumber: number;
    sliceIndex: number;
    imageData: Blob;
    startY: number;
    endY: number;
    overlapHeight: number;
}

/**
 * Load slices from storage (text content not persisted, empty array)
 */
export async function loadSlicesFromStorage(
    _documentId: string,
    storedSlices: StoredSlice[]
): Promise<SliceInfo[]> {
    return storedSlices
        .sort((a: StoredSlice, b: StoredSlice) => {
            if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
            return a.sliceIndex - b.sliceIndex;
        })
        .map((slice: StoredSlice, globalIndex: number) => {
            const url = URL.createObjectURL(slice.imageData);
            return {
                id: slice.id,
                documentId: slice.documentId,
                pageNumber: slice.pageNumber,
                sliceIndex: slice.sliceIndex,
                globalIndex,
                imageUrl: url,
                startY: slice.startY,
                endY: slice.endY,
                overlapHeight: slice.overlapHeight,
                width: 0, // Unknown from storage
                height: 0,
                textItems: [], // Text not persisted
            };
        });
}

export function revokeSliceUrls(slices: SliceInfo[]): void {
    for (const slice of slices) {
        URL.revokeObjectURL(slice.imageUrl);
    }
}
