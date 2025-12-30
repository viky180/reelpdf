import { openDB } from 'idb';
import type { DBSchema, IDBPDatabase } from 'idb';

interface ReelPDFDB extends DBSchema {
    documents: {
        key: string;
        value: {
            id: string;
            name: string;
            data: ArrayBuffer;
            pageCount: number;
            createdAt: number;
            lastReadAt: number;
        };
    };
    slices: {
        key: string;
        value: {
            id: string;
            documentId: string;
            pageNumber: number;
            sliceIndex: number;
            imageData: Blob;
            startY: number;
            endY: number;
            overlapHeight: number;
        };
        indexes: { 'by-document': string };
    };
    progress: {
        key: string;
        value: {
            documentId: string;
            currentSliceIndex: number;
            totalSlices: number;
            lastUpdated: number;
        };
    };
    highlights: {
        key: string;
        value: {
            id: string;
            documentId: string;
            sliceIndex: number;
            pageNumber: number;
            text: string;
            position: {
                x: number;
                y: number;
                width: number;
                height: number;
            };
            createdAt: number;
        };
        indexes: { 'by-document': string };
    };
}

const DB_NAME = 'reelpdf-storage';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<ReelPDFDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<ReelPDFDB>> {
    if (dbInstance) return dbInstance;

    dbInstance = await openDB<ReelPDFDB>(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Documents store
            if (!db.objectStoreNames.contains('documents')) {
                db.createObjectStore('documents', { keyPath: 'id' });
            }

            // Slices store with index
            if (!db.objectStoreNames.contains('slices')) {
                const sliceStore = db.createObjectStore('slices', { keyPath: 'id' });
                sliceStore.createIndex('by-document', 'documentId');
            }

            // Progress store
            if (!db.objectStoreNames.contains('progress')) {
                db.createObjectStore('progress', { keyPath: 'documentId' });
            }

            // Highlights store with index
            if (!db.objectStoreNames.contains('highlights')) {
                const highlightStore = db.createObjectStore('highlights', { keyPath: 'id' });
                highlightStore.createIndex('by-document', 'documentId');
            }
        },
    });

    return dbInstance;
}

// Document operations
export async function saveDocument(
    id: string,
    name: string,
    data: ArrayBuffer,
    pageCount: number
): Promise<void> {
    const db = await getDB();
    await db.put('documents', {
        id,
        name,
        data,
        pageCount,
        createdAt: Date.now(),
        lastReadAt: Date.now(),
    });
}

export async function getDocument(id: string) {
    const db = await getDB();
    return db.get('documents', id);
}

export async function getAllDocuments() {
    const db = await getDB();
    return db.getAll('documents');
}

export async function deleteDocument(id: string): Promise<void> {
    const db = await getDB();

    // Delete document
    await db.delete('documents', id);

    // Delete associated slices
    const slices = await db.getAllFromIndex('slices', 'by-document', id);
    for (const slice of slices) {
        await db.delete('slices', slice.id);
    }

    // Delete progress
    await db.delete('progress', id);

    // Delete highlights
    const highlights = await db.getAllFromIndex('highlights', 'by-document', id);
    for (const highlight of highlights) {
        await db.delete('highlights', highlight.id);
    }
}

// Slice operations
export async function saveSlice(slice: ReelPDFDB['slices']['value']): Promise<void> {
    const db = await getDB();
    await db.put('slices', slice);
}

export async function getSlicesForDocument(documentId: string) {
    const db = await getDB();
    return db.getAllFromIndex('slices', 'by-document', documentId);
}

export async function clearSlicesForDocument(documentId: string): Promise<void> {
    const db = await getDB();
    const slices = await db.getAllFromIndex('slices', 'by-document', documentId);
    for (const slice of slices) {
        await db.delete('slices', slice.id);
    }
}

// Progress operations
export async function saveProgress(
    documentId: string,
    currentSliceIndex: number,
    totalSlices: number
): Promise<void> {
    const db = await getDB();
    await db.put('progress', {
        documentId,
        currentSliceIndex,
        totalSlices,
        lastUpdated: Date.now(),
    });

    // Update document's lastReadAt
    const doc = await db.get('documents', documentId);
    if (doc) {
        await db.put('documents', { ...doc, lastReadAt: Date.now() });
    }
}

export async function getProgress(documentId: string) {
    const db = await getDB();
    return db.get('progress', documentId);
}

// Highlight operations
export async function saveHighlight(highlight: ReelPDFDB['highlights']['value']): Promise<void> {
    const db = await getDB();
    await db.put('highlights', highlight);
}

export async function getHighlightsForDocument(documentId: string) {
    const db = await getDB();
    return db.getAllFromIndex('highlights', 'by-document', documentId);
}

export async function deleteHighlight(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('highlights', id);
}

export async function getAllHighlightsForDocument(documentId: string) {
    const db = await getDB();
    return db.getAllFromIndex('highlights', 'by-document', documentId);
}
