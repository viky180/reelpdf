import { getAllHighlightsForDocument } from './storage';

export type ExportFormat = 'markdown' | 'text' | 'json';

interface HighlightData {
    pageNumber: number;
    sliceIndex: number;
    text: string;
    createdAt: number;
}

interface ExportedHighlight {
    text: string;
    page: number;
    slice: number;
    createdAt: string;
}

/**
 * Export highlights in the specified format
 */
export async function exportHighlights(
    documentId: string,
    documentName: string,
    format: ExportFormat
): Promise<string> {
    const highlights = await getAllHighlightsForDocument(documentId);

    // Sort by page and position
    const sorted = (highlights as HighlightData[]).sort((a: HighlightData, b: HighlightData) => {
        if (a.pageNumber !== b.pageNumber) return a.pageNumber - b.pageNumber;
        return a.sliceIndex - b.sliceIndex;
    });

    const exported: ExportedHighlight[] = sorted.map((h: HighlightData) => ({
        text: h.text,
        page: h.pageNumber,
        slice: h.sliceIndex,
        createdAt: new Date(h.createdAt).toISOString(),
    }));

    switch (format) {
        case 'markdown':
            return formatAsMarkdown(documentName, exported);
        case 'text':
            return formatAsText(documentName, exported);
        case 'json':
            return formatAsJSON(documentName, exported);
        default:
            throw new Error(`Unknown format: ${format}`);
    }
}

function formatAsMarkdown(documentName: string, highlights: ExportedHighlight[]): string {
    const lines = [
        `# Highlights from "${documentName}"`,
        '',
        `*Exported on ${new Date().toLocaleDateString()}*`,
        '',
        '---',
        '',
    ];

    let currentPage = -1;

    for (const h of highlights) {
        if (h.page !== currentPage) {
            currentPage = h.page;
            lines.push(`## Page ${h.page}`, '');
        }

        lines.push(`> ${h.text}`, '');
    }

    return lines.join('\n');
}

function formatAsText(documentName: string, highlights: ExportedHighlight[]): string {
    const lines = [
        `HIGHLIGHTS FROM: ${documentName}`,
        `Exported: ${new Date().toLocaleDateString()}`,
        '',
        '================================',
        '',
    ];

    for (const h of highlights) {
        lines.push(`[Page ${h.page}]`);
        lines.push(h.text);
        lines.push('');
    }

    return lines.join('\n');
}

function formatAsJSON(documentName: string, highlights: ExportedHighlight[]): string {
    return JSON.stringify({
        document: documentName,
        exportedAt: new Date().toISOString(),
        highlights,
    }, null, 2);
}

/**
 * Download highlights as a file
 */
export function downloadHighlights(content: string, filename: string, format: ExportFormat): void {
    const mimeTypes: Record<ExportFormat, string> = {
        markdown: 'text/markdown',
        text: 'text/plain',
        json: 'application/json',
    };

    const extensions: Record<ExportFormat, string> = {
        markdown: 'md',
        text: 'txt',
        json: 'json',
    };

    const blob = new Blob([content], { type: mimeTypes[format] });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${extensions[format]}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Share highlights using Web Share API (mobile)
 */
export async function shareHighlights(
    content: string,
    documentName: string
): Promise<boolean> {
    if (!navigator.share) {
        return false;
    }

    try {
        await navigator.share({
            title: `Highlights from ${documentName}`,
            text: content,
        });
        return true;
    } catch (err) {
        if ((err as Error).name !== 'AbortError') {
            console.error('Share failed:', err);
        }
        return false;
    }
}
