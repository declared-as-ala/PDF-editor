/**
 * PDF Font Extractor V2 - Advanced extraction with private field access
 * Extracts embedded fonts from PDF files using deep object inspection
 */

export class PDFFontExtractor {
    private fontDataCache = new Map<string, Uint8Array>();

    /**
     * Extract font data from a PDF page
     */
    async extractFontFromPage(pdfPage: any, fontName: string): Promise<Uint8Array | null> {
        try {
            console.log(`🔍 Attempting to extract font: ${fontName}`);

            const operatorList = await pdfPage.getOperatorList();
            const OPS = (window as any).pdfjsLib.OPS;

            if (OPS && operatorList.fnArray) {
                for (let i = 0; i < operatorList.fnArray.length; i++) {
                    const fn = operatorList.fnArray[i];
                    if (fn === OPS.setFont) {
                        const fontId = operatorList.argsArray[i][0];

                        // Get font object
                        let fontObj = null;
                        if (pdfPage.commonObjs?.has(fontId)) {
                            fontObj = pdfPage.commonObjs.get(fontId);
                        } else if (pdfPage.objs?.has(fontId)) {
                            fontObj = pdfPage.objs.get(fontId);
                        }

                        if (fontObj) {
                            console.log(`📦 Found font object: ${fontId}`, fontObj);

                            // Extract font data using multiple methods
                            const fontData = await this.deepExtractFontData(fontObj, fontId);
                            if (fontData) {
                                this.fontDataCache.set(fontId, fontData);
                                return fontData;
                            }
                        }
                    }
                }
            }

            console.warn(`⚠️ Could not extract font data for: ${fontName}`);
            return null;
        } catch (error) {
            console.error(`Error extracting font:`, error);
            return null;
        }
    }

    /**
     * Deep extraction - tries every possible way to get font bytes
     */
    private async deepExtractFontData(fontObj: any, fontId: string): Promise<Uint8Array | null> {
        try {
            // Access private #fontData field (Chrome DevTools trick)
            const descriptors = Object.getOwnPropertyDescriptors(fontObj);
            console.log(`🔍 Property descriptors:`, descriptors);

            // Try to get all properties including private ones
            const allKeys = [
                ...Object.keys(fontObj),
                ...Object.getOwnPropertyNames(fontObj),
                ...Object.getOwnPropertySymbols(fontObj).map(s => s.toString())
            ];

            console.log(`🔑 All keys:`, allKeys);

            // Iterate through prototype chain
            let current = fontObj;
            while (current) {
                const props = Object.getOwnPropertyNames(current);
                for (const prop of props) {
                    try {
                        const value = current[prop];
                        if (value && typeof value === 'object') {
                            // Check if this looks like font data
                            if (value.data instanceof Uint8Array) {
                                console.log(`✅ Found Uint8Array in ${prop}:`, value.data.length);
                                return value.data;
                            }
                            if (value.bytes instanceof Uint8Array) {
                                console.log(`✅ Found bytes in ${prop}:`, value.bytes.length);
                                return value.bytes;
                            }
                        }
                    } catch (e) {
                        // Skip inaccessible properties
                    }
                }
                current = Object.getPrototypeOf(current);
            }

            // Try accessing through WeakMap/Symbol tricks
            const symbols = Object.getOwnPropertySymbols(fontObj);
            for (const symbol of symbols) {
                try {
                    const value = fontObj[symbol];
                    console.log(`🔣 Symbol property:`, symbol.toString(), value);
                    if (value?.data instanceof Uint8Array) {
                        return value.data;
                    }
                } catch (e) {
                    // Skip
                }
            }

            // Log the full object for manual inspection
            console.log(`📋 Full font object for ${fontId}:`, fontObj);

            // If compiledGlyphs exists, log it for analysis
            if (fontObj.compiledGlyphs) {
                console.log(`📦 CompiledGlyphs:`, Object.keys(fontObj.compiledGlyphs));
                // These are WebGL programs, not the actual font file
            }

            return null;
        } catch (error) {
            console.error(`Deep extraction error:`, error);
            return null;
        }
    }

    clearCache() {
        this.fontDataCache.clear();
    }
}
