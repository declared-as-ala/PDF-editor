import type { TextItem, TextContent } from '../types/types';

/**
 * Extract text content with position data and colors from a PDF page
 */
export class TextExtractor {
    static async extractTextFromPage(pdfDocument: any, pageNumber: number): Promise<TextItem[]> {
        try {
            const page = await pdfDocument.getPage(pageNumber);
            const textContent: TextContent = await page.getTextContent();

            const scale = 5.0;
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) throw new Error('Could not get canvas context');

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: context, viewport }).promise;

            // Extract REAL font names using operatorList
            const fontMap = new Map<string, { cleanName: string; originalName: string }>();
            try {
                const operatorList = await page.getOperatorList();
                const OPS = (window as any).pdfjsLib?.OPS;

                if (OPS && operatorList.fnArray) {
                    for (let j = 0; j < operatorList.fnArray.length; j++) {
                        const fn = operatorList.fnArray[j];
                        if (fn === OPS.setFont) {
                            const fontId = operatorList.argsArray[j][0];
                            try {
                                const fontObj = page.commonObjs.get(fontId);
                                if (fontObj && fontObj.name) {
                                    const originalName = fontObj.name;  // e.g., "MUFUZY+Rubik-Medium"
                                    const cleanedName = originalName.split('+').pop()?.split(',')[0].trim();
                                    if (cleanedName) {
                                        fontMap.set(fontId, { cleanName: cleanedName, originalName });
                                        console.log(`🔍 Font: ${fontId} → ${cleanedName} (original: ${originalName})`);
                                    }
                                }
                            } catch (e) {
                                // Font not available
                            }
                        }
                    }
                }
            } catch (e) {
                console.warn('Could not extract fonts:', e);
            }

            const textItems: TextItem[] = [];
            let itemIndex = 0;

            for (const item of textContent.items as any[]) {
                if (!item.str || item.str.trim() === '') continue;

                const transform = item.transform;
                const x = transform[4] * scale;
                const baselineY = transform[5] * scale;
                const y = viewport.height - baselineY;
                const fontSize = Math.sqrt(transform[2] ** 2 + transform[3] ** 2) * scale;

                const color = this.analyzeTextColor(context, x, y, fontSize, item.width * scale, item.str);

                // Map fonts with weight, style, and letter-spacing
                let fontFamily = 'Georgia, serif';
                let originalFontName: string | undefined;
                let fontWeight = 400;
                let fontStyle = 'normal';
                let letterSpacing = '0em';

                const fontInfo = fontMap.get(item.fontName);
                const realFont = fontInfo?.cleanName;
                originalFontName = fontInfo?.originalName;  // Store original subset name

                if (realFont) {
                    const lower = realFont.toLowerCase();

                    // Detect weight and style
                    if (lower.includes('bold')) fontWeight = 700;
                    if (lower.includes('italic') || lower.includes('oblique')) fontStyle = 'italic';
                    if (lower.includes('light') || lower.includes('thin')) fontWeight = 300;
                    if (lower.includes('black') || lower.includes('heavy')) fontWeight = 900;

                    // Map to system fonts with appropriate letter-spacing
                    if (lower.includes('centuryschoolbook') || lower.includes('century')) {
                        fontFamily = '"Century Schoolbook", Georgia, "Book Antiqua", serif';
                        letterSpacing = '0.015em';
                    } else if (lower.includes('calibri')) {
                        fontFamily = 'Calibri, "Segoe UI", Arial, sans-serif';
                        letterSpacing = '-0.005em';
                    } else if (lower.includes('times')) {
                        fontFamily = '"Times New Roman", Times, serif';
                        letterSpacing = '0em';
                    } else if (lower.includes('helvetica') || lower.includes('arial')) {
                        fontFamily = 'Arial, Helvetica, sans-serif';
                        letterSpacing = '-0.01em';
                    } else {
                        fontFamily = `${realFont}, Georgia, serif`;
                        letterSpacing = '0em';
                    }
                }

                textItems.push({
                    id: `page-${pageNumber}-item-${itemIndex}`,
                    text: item.str,
                    x: transform[4],
                    y: (viewport.height / scale - transform[5]) - (fontSize / scale * 1.0),
                    width: item.width,
                    height: item.height || fontSize / scale,
                    fontSize: fontSize / scale,
                    fontName: fontFamily,
                    originalFontName,  // Store original subset font name
                    fontWeight: fontWeight,
                    fontStyle: fontStyle,
                    letterSpacing: letterSpacing,
                    pageNumber,
                    transform,
                    color,
                });

                itemIndex++;
            }

            // Group text items into lines
            return this.groupTextItemsIntoLines(textItems);
        } catch (error) {
            console.error(`Error extracting text from page ${pageNumber}:`, error);
            return [];
        }
    }

    /**
     * Group text items into lines, merging items with same properties
     */
    private static groupTextItemsIntoLines(items: TextItem[]): TextItem[] {
        if (items.length === 0) return [];

        // Sort by Y position, then X position
        const sorted = [...items].sort((a, b) => {
            const yDiff = a.y - b.y;
            if (Math.abs(yDiff) > 2) return yDiff; // Different lines
            return a.x - b.x; // Same line, sort left to right
        });

        const grouped: TextItem[] = [];
        let currentGroup: TextItem | null = null;

        for (const item of sorted) {
            if (!currentGroup) {
                // Start first group
                currentGroup = { ...item };
                continue;
            }

            // Check if item belongs to current group
            const sameLine = Math.abs(item.y - currentGroup.y) <= 2;
            const sameColor = item.color === currentGroup.color;
            const sameFont = item.fontName === currentGroup.fontName;
            const sameWeight = item.fontWeight === currentGroup.fontWeight;
            const sameStyle = item.fontStyle === currentGroup.fontStyle;
            const sameFontSize = Math.abs((item.fontSize || 0) - (currentGroup.fontSize || 0)) < 0.5;

            if (sameLine && sameColor && sameFont && sameWeight && sameStyle && sameFontSize) {
                // Check if we need to add a space (detect word boundaries)
                const currentEnd = currentGroup.x + currentGroup.width;
                const gap = item.x - currentEnd;

                // If there's a significant gap (>1px), add a space
                const needsSpace = gap > 1;

                // Merge into current group
                currentGroup.text += (needsSpace ? ' ' : '') + item.text;
                currentGroup.width = (item.x + item.width) - currentGroup.x;
            } else {
                // Save current group and start new one
                grouped.push(currentGroup);
                currentGroup = { ...item };
            }
        }

        // Add final group
        if (currentGroup) {
            grouped.push(currentGroup);
        }

        return grouped;
    }

    private static analyzeTextColor(
        context: CanvasRenderingContext2D,
        x: number,
        y: number,
        fontSize: number,
        width: number,
        _text: string
    ): string {
        const scanX = Math.max(0, Math.round(x));
        const scanY = Math.max(0, Math.round(y - fontSize));
        const scanWidth = Math.max(1, Math.round(width));
        const scanHeight = Math.max(1, Math.round(fontSize * 1.2));

        try {
            const imageData = context.getImageData(scanX, scanY, scanWidth, scanHeight);
            const pixels = imageData.data;

            const darkColors = new Map<string, number>();
            const coloredPixels = new Map<string, number>();
            const allColors = new Map<string, number>();

            for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const a = pixels[i + 3];

                if (a < 200 || (r > 250 && g > 250 && b > 250)) continue;

                const color = `rgb(${r}, ${g}, ${b})`;
                allColors.set(color, (allColors.get(color) || 0) + 1);

                const maxChannel = Math.max(r, g, b);
                const minChannel = Math.min(r, g, b);
                const saturation = maxChannel === 0 ? 0 : (maxChannel - minChannel) / maxChannel;

                if (maxChannel < 100) {
                    darkColors.set(color, (darkColors.get(color) || 0) + 1);
                } else if (saturation > 0.4) {
                    coloredPixels.set(color, (coloredPixels.get(color) || 0) + 1);
                }
            }

            const colorsToUse = darkColors.size > 0 ? darkColors :
                coloredPixels.size > 0 ? coloredPixels :
                    allColors;

            if (colorsToUse.size === 0) return 'rgb(0, 0, 0)';

            let maxCount = 0;
            let dominantColor = 'rgb(0, 0, 0)';

            for (const [color, count] of colorsToUse.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    dominantColor = color;
                }
            }

            return dominantColor;
        } catch (e) {
            return 'rgb(0, 0, 0)';
        }
    }

    static async extractTextFromAllPages(pdfDocument: any): Promise<TextItem[]> {
        const numPages = pdfDocument.numPages;
        const allText: TextItem[] = [];

        for (let i = 1; i <= numPages; i++) {
            const pageText = await this.extractTextFromPage(pdfDocument, i);
            allText.push(...pageText);
        }

        return allText;
    }

    /**
     * Lightweight extraction with color detection - groups by line and color
     */
    static async extractTextRegions(pdfDocument: any, pageNumber: number): Promise<Array<{
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        pageNumber: number;
    }>> {
        try {
            const page = await pdfDocument.getPage(pageNumber);
            const textContent = await page.getTextContent();

            const scale = 3.0; // Use scale for better color detection
            const viewport = page.getViewport({ scale });

            // Render to canvas for color analysis
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d', { willReadFrequently: true });
            if (!context) throw new Error('Could not get canvas context');

            canvas.width = viewport.width;
            canvas.height = viewport.height;
            await page.render({ canvasContext: context, viewport }).promise;

            const regions: Array<{
                id: string;
                x: number;
                y: number;
                width: number;
                height: number;
                pageNumber: number;
            }> = [];

            // Extract text items with colors
            const items = textContent.items as any[];
            const itemsWithColors: Array<{
                item: any;
                x: number;
                y: number;
                fontSize: number;
                color: string;
            }> = [];

            for (const item of items) {
                if (!item.str || item.str.trim() === '') continue;

                const transform = item.transform;
                const x = transform[4] * scale;
                const baselineY = transform[5] * scale;
                const y = viewport.height - baselineY;
                const fontSize = Math.sqrt(transform[2] ** 2 + transform[3] ** 2) * scale;

                // Analyze color from canvas
                const color = this.analyzeTextColor(context, x, y, fontSize, item.width * scale, item.str);

                itemsWithColors.push({
                    item,
                    x: transform[4],
                    y: viewport.height / scale - transform[5],
                    fontSize: fontSize / scale,
                    color
                });
            }

            // Sort by Y, then X
            itemsWithColors.sort((a, b) => {
                const yDiff = a.y - b.y;
                if (Math.abs(yDiff) > 2) return yDiff;
                return a.x - b.x;
            });

            // Group by line and color
            let currentGroup: typeof itemsWithColors = [];
            let regionIndex = 0;

            for (let i = 0; i < itemsWithColors.length; i++) {
                const current = itemsWithColors[i];

                if (currentGroup.length === 0) {
                    currentGroup.push(current);
                    continue;
                }

                const last = currentGroup[currentGroup.length - 1];
                const sameLine = Math.abs(current.y - last.y) <= 2;
                const sameColor = current.color === last.color;
                const sameFontSize = Math.abs(current.fontSize - last.fontSize) < 0.5;

                // Check horizontal gap between items
                const lastItemEnd = last.x + last.item.width;
                const gap = current.x - lastItemEnd;
                const largeGap = gap > 50; // Split if gap is more than 50 pixels

                if (sameLine && sameColor && sameFontSize && !largeGap) {
                    currentGroup.push(current);
                } else {
                    // Create box for current group
                    const firstItem = currentGroup[0];
                    const lastItem = currentGroup[currentGroup.length - 1];

                    regions.push({
                        id: `region-${pageNumber}-${regionIndex}`,
                        x: firstItem.x,
                        y: firstItem.y - firstItem.fontSize,
                        width: (lastItem.x + lastItem.item.width) - firstItem.x,
                        height: firstItem.fontSize * 1.2,
                        pageNumber
                    });

                    regionIndex++;
                    currentGroup = [current];
                }
            }

            // Add final group
            if (currentGroup.length > 0) {
                const firstItem = currentGroup[0];
                const lastItem = currentGroup[currentGroup.length - 1];

                regions.push({
                    id: `region-${pageNumber}-${regionIndex}`,
                    x: firstItem.x,
                    y: firstItem.y - firstItem.fontSize,
                    width: (lastItem.x + lastItem.item.width) - firstItem.x,
                    height: firstItem.fontSize * 1.2,
                    pageNumber
                });
            }

            console.log(`Created ${regions.length} hover boxes for page ${pageNumber}`);
            return regions;
        } catch (error) {
            console.error(`Error extracting regions from page ${pageNumber}:`, error);
            return [];
        }
    }
}
