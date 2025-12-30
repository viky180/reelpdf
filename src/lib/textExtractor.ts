import * as pdfjsLib from 'pdfjs-dist';

export interface TextItem {
    str: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontHeight: number;
    transform: number[];
}

export interface PageTextContent {
    pageNumber: number;
    items: TextItem[];
    pageWidth: number;
    pageHeight: number;
}

/**
 * Extract text content with positions from a PDF page
 */
export async function extractPageText(
    pdf: pdfjsLib.PDFDocumentProxy,
    pageNumber: number,
    scale: number = 2
): Promise<PageTextContent> {
    const page = await pdf.getPage(pageNumber);
    const viewport = page.getViewport({ scale });
    const textContent = await page.getTextContent();

    const items: TextItem[] = [];

    for (const item of textContent.items) {
        if ('str' in item && item.str.trim()) {
            const tx = pdfjsLib.Util.transform(viewport.transform, item.transform);

            // Calculate position and size
            const fontHeight = Math.sqrt(tx[0] * tx[0] + tx[1] * tx[1]);
            const x = tx[4];
            const y = tx[5] - fontHeight; // Adjust for baseline

            // Estimate width based on string length and font size
            const width = item.width ? item.width * scale : item.str.length * fontHeight * 0.5;
            const height = fontHeight;

            items.push({
                str: item.str,
                x,
                y,
                width,
                height,
                fontHeight,
                transform: item.transform,
            });
        }
    }

    return {
        pageNumber,
        items,
        pageWidth: viewport.width,
        pageHeight: viewport.height,
    };
}

/**
 * Extract text for all pages
 */
export async function extractAllPagesText(
    pdf: pdfjsLib.PDFDocumentProxy,
    scale: number = 2,
    onProgress?: (current: number, total: number) => void
): Promise<PageTextContent[]> {
    const results: PageTextContent[] = [];
    const totalPages = pdf.numPages;

    for (let i = 1; i <= totalPages; i++) {
        const result = await extractPageText(pdf, i, scale);
        results.push(result);
        onProgress?.(i, totalPages);
    }

    return results;
}

/**
 * Get text items that fall within a slice's Y range
 */
export function getTextItemsForSlice(
    pageText: PageTextContent,
    startY: number,
    endY: number
): TextItem[] {
    return pageText.items.filter(item => {
        const itemBottom = item.y + item.height;
        // Item is in slice if any part of it overlaps
        return item.y < endY && itemBottom > startY;
    }).map(item => ({
        ...item,
        // Adjust Y position relative to slice start
        y: item.y - startY,
    }));
}
