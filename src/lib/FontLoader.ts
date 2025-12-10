/**
 * FontLoader - Injects Google Fonts CSS for browser display
 */

class FontLoader {
    private loadedFonts: Set<string> = new Set();

    /**
     * Inject Google Fonts CSS link for a font family
     */
    async loadGoogleFont(fontFamily: string, weights: number[] = [400, 500, 700]): Promise<boolean> {
        try {
            const cacheKey = fontFamily;

            // Check if already loaded
            if (this.loadedFonts.has(cacheKey)) {
                console.log(`✓ Font "${fontFamily}" already loaded`);
                return true;
            }

            console.log(`🔍 Loading Google Font: "${fontFamily}" with weights ${weights.join(', ')}`);

            // Create Google Fonts URL with all weights
            const weightsParam = weights.join(';');
            const fontUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@${weightsParam}&display=swap`;

            // Check if link already exists
            const existingLink = document.querySelector(`link[href*="${fontFamily}"]`);
            if (existingLink) {
                console.log(`✓ Font link already exists for "${fontFamily}"`);
                this.loadedFonts.add(cacheKey);
                return true;
            }

            // Inject CSS link into document head
            const linkElement = document.createElement('link');
            linkElement.rel = 'stylesheet';
            linkElement.href = fontUrl;

            // Wait for font to load
            await new Promise<void>((resolve, reject) => {
                linkElement.onload = () => {
                    console.log(`✅ Font "${fontFamily}" loaded successfully`);
                    resolve();
                };
                linkElement.onerror = () => {
                    reject(new Error(`Failed to load font ${fontFamily}`));
                };
                document.head.appendChild(linkElement);
            });

            this.loadedFonts.add(cacheKey);
            return true;

        } catch (error) {
            console.warn(`⚠️ Failed to load font "${fontFamily}":`, error);
            return false;
        }
    }

    /**
     * Download Google Font file as ArrayBuffer for PDF embedding
     */
    async downloadGoogleFontFile(fontFamily: string, weight: number = 400): Promise<Uint8Array | null> {
        try {
            console.log(`📥 Downloading Google Font file: "${fontFamily}" ${weight}...`);

            // Step 1: Get CSS from Google Fonts
            const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily)}:wght@${weight}&display=swap`;
            const cssResponse = await fetch(cssUrl, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });

            if (!cssResponse.ok) {
                throw new Error(`HTTP ${cssResponse.status}`);
            }

            const cssText = await cssResponse.text();

            // Step 2: Extract font file URL from CSS
            const urlMatch = cssText.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
            if (!urlMatch) {
                throw new Error('Could not find font URL in CSS');
            }

            const fontUrl = urlMatch[1];

            // Step 3: Download actual font file
            const fontResponse = await fetch(fontUrl);
            if (!fontResponse.ok) {
                throw new Error(`HTTP ${fontResponse.status}`);
            }

            const fontBuffer = await fontResponse.arrayBuffer();
            const fontBytes = new Uint8Array(fontBuffer);

            console.log(`✅ Downloaded Google Font "${fontFamily}" ${weight}: ${fontBytes.length} bytes`);
            return fontBytes;

        } catch (error) {
            console.warn(`⚠️ Failed to download Google Font file "${fontFamily}" ${weight}:`, error);
            return null;
        }
    }

    /**
     * Parse font name and weight from font-family string
     */
    parseFontInfo(fontName: string): { family: string; weights: number[] } {
        // Remove subset prefix (e.g., "MUFUZY+Rubik-Bold" -> "Rubik-Bold")
        let cleanName = fontName.replace(/^[A-Z]{6}\+/, '');

        // Extract weight from name
        const weights: number[] = [];
        if (cleanName.includes('Bold')) {
            weights.push(700);
            cleanName = cleanName.replace(/[-\s]?Bold/i, '');
        } else if (cleanName.includes('Medium')) {
            weights.push(500);
            cleanName = cleanName.replace(/[-\s]?Medium/i, '');
        } else if (cleanName.includes('Light')) {
            weights.push(300);
            cleanName = cleanName.replace(/[-\s]?Light/i, '');
        } else if (cleanName.includes('Regular')) {
            weights.push(400);
            cleanName = cleanName.replace(/[-\s]?Regular/i, '');
        }

        // If no weight found, include all common weights
        if (weights.length === 0) {
            weights.push(300, 400, 500, 700);
        }

        return { family: cleanName.trim(), weights };
    }

    /**
     * Load font for a given font name (handles subset fonts)
     */
    async downloadFont(fontName: string): Promise<boolean> {
        const { family, weights } = this.parseFontInfo(fontName);
        return await this.loadGoogleFont(family, weights);
    }
}

export const fontLoader = new FontLoader();
