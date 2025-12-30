export interface WhitespaceGap {
    startY: number;
    endY: number;
    height: number;
    centerY: number;
    score: number; // Higher = better cut point
}

export interface DetectionConfig {
    /** Minimum brightness ratio to consider a row as whitespace (0-1) */
    whitespaceThreshold: number;
    /** Minimum gap height in pixels to consider as a break point */
    minGapHeight: number;
    /** Minimum distance from edges to consider cutting */
    edgeMargin: number;
    /** Prefer gaps closer to center of page */
    centerBias: number;
}

const DEFAULT_CONFIG: DetectionConfig = {
    whitespaceThreshold: 0.95,
    minGapHeight: 15,
    edgeMargin: 50,
    centerBias: 0.2,
};

/**
 * Analyze a single row of pixels to determine if it's whitespace
 * @returns brightness ratio (0-1, 1 = pure white)
 */
function analyzeRow(imageData: ImageData, y: number): number {
    const { data, width } = imageData;
    let whitePx = 0;
    const rowStart = y * width * 4;

    for (let x = 0; x < width; x++) {
        const idx = rowStart + x * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];

        // Calculate brightness (simple average)
        const brightness = (r + g + b) / 3 / 255;

        if (brightness > 0.9) {
            whitePx++;
        }
    }

    return whitePx / width;
}

/**
 * Detect all whitespace rows in an image
 */
function detectWhitespaceRows(
    imageData: ImageData,
    config: DetectionConfig
): boolean[] {
    const { height } = imageData;
    const rows: boolean[] = [];

    for (let y = 0; y < height; y++) {
        const brightnessRatio = analyzeRow(imageData, y);
        rows.push(brightnessRatio >= config.whitespaceThreshold);
    }

    return rows;
}

/**
 * Find contiguous gaps of whitespace
 */
function findGaps(
    whitespaceRows: boolean[],
    pageHeight: number,
    config: DetectionConfig
): WhitespaceGap[] {
    const gaps: WhitespaceGap[] = [];
    let gapStart: number | null = null;

    for (let y = 0; y < whitespaceRows.length; y++) {
        if (whitespaceRows[y]) {
            if (gapStart === null) {
                gapStart = y;
            }
        } else {
            if (gapStart !== null) {
                const gapHeight = y - gapStart;

                if (gapHeight >= config.minGapHeight) {
                    const centerY = gapStart + gapHeight / 2;

                    // Skip gaps too close to edges
                    if (centerY > config.edgeMargin && centerY < pageHeight - config.edgeMargin) {
                        // Calculate score based on gap size and position
                        const sizeScore = Math.min(gapHeight / 50, 1); // Larger gaps score higher

                        // Prefer cuts closer to visual center ranges (not exact center)
                        const normalizedY = centerY / pageHeight;
                        const centerScore = 1 - Math.abs(normalizedY - 0.5) * config.centerBias;

                        gaps.push({
                            startY: gapStart,
                            endY: y,
                            height: gapHeight,
                            centerY,
                            score: sizeScore * centerScore,
                        });
                    }
                }

                gapStart = null;
            }
        }
    }

    return gaps;
}

/**
 * Find optimal cut points for a page based on target slice height
 */
export function findCutPoints(
    imageData: ImageData,
    targetSliceHeight: number,
    config: Partial<DetectionConfig> = {}
): number[] {
    const mergedConfig = { ...DEFAULT_CONFIG, ...config };
    const { height } = imageData;

    // Detect whitespace rows
    const whitespaceRows = detectWhitespaceRows(imageData, mergedConfig);

    // Find all gaps
    const gaps = findGaps(whitespaceRows, height, mergedConfig);

    if (gaps.length === 0) {
        // No good cut points found, return evenly spaced cuts
        return generateEvenCuts(height, targetSliceHeight);
    }

    // Select best cut points based on target slice height
    const cutPoints: number[] = [0];
    let lastCut = 0;

    // Sort gaps by position
    const sortedGaps = [...gaps].sort((a, b) => a.centerY - b.centerY);

    for (const gap of sortedGaps) {
        const distanceFromLastCut = gap.centerY - lastCut;

        // If we've traveled far enough, consider this a cut point
        // Reduced from 0.7 to 0.5 for more frequent cuts
        if (distanceFromLastCut >= targetSliceHeight * 0.5) {
            cutPoints.push(Math.round(gap.centerY));
            lastCut = gap.centerY;
        }
        // If we've traveled too far, we need to cut even if gap isn't ideal
        else if (distanceFromLastCut >= targetSliceHeight * 1.0 && gap.score > 0.2) {
            cutPoints.push(Math.round(gap.centerY));
            lastCut = gap.centerY;
        }
    }

    // Add final cut at page end
    if (height - lastCut > targetSliceHeight * 0.3) {
        cutPoints.push(height);
    } else {
        // Extend last slice to end of page
        cutPoints[cutPoints.length - 1] = height;
    }

    return cutPoints;
}

/**
 * Generate evenly spaced cuts when no whitespace is detected
 */
function generateEvenCuts(height: number, targetHeight: number): number[] {
    const cuts = [0];
    let current = targetHeight;

    while (current < height - targetHeight * 0.3) {
        cuts.push(Math.round(current));
        current += targetHeight;
    }

    cuts.push(height);
    return cuts;
}

/**
 * Analyze page and return recommended slices
 */
export function analyzePageForSlicing(
    imageData: ImageData,
    viewportHeight: number,
    scale: number = 2
): { startY: number; endY: number }[] {
    // Convert viewport height to image pixels
    // Use 50% of viewport for smaller, more digestible slices
    const targetSliceHeight = viewportHeight * scale * 0.50;

    const cutPoints = findCutPoints(imageData, targetSliceHeight);

    const slices: { startY: number; endY: number }[] = [];

    for (let i = 0; i < cutPoints.length - 1; i++) {
        slices.push({
            startY: cutPoints[i],
            endY: cutPoints[i + 1],
        });
    }

    return slices;
}
