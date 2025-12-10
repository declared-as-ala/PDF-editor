/**
 * FontFallbackService - Web font lookups and fallback strategies
 * 
 * This service attempts to find web-based alternatives when fonts
 * can't be extracted from the PDF. It tries multiple sources:
 * 1. Google Fonts API
 * 2. CDN font databases
 * 3. Font similarity matching
 */

export interface FontFallbackResult {
    name: string;
    url: string;
    source: 'google' | 'cdn' | 'local';
    bytes?: Uint8Array;
}

export class FontFallbackService {
    // Extensive font CDN URL database
    private static readonly FONT_CDN_URLS: Record<string, string> = {
        // Serif fonts
        'centuryschoolbook': 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-6_RUAg.woff2',
        'centuryschoolbookbold': 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGFmQSNjdsmc35JDF1K5GRwUjcdlttVFm-rI7e8QI96WQ.woff2',
        'times': 'https://db.onlinewebfonts.com/t/32441506567156636049eb850b53f02a.woff2',
        'timesnewroman': 'https://db.onlinewebfonts.com/t/32441506567156636049eb850b53f02a.woff2',
        'georgia': 'https://db.onlinewebfonts.com/t/8ccf06bffd7d8775d70599cdbfad3fc9.woff2',
        'garamond': 'https://fonts.gstatic.com/s/ebgaramond/v27/SlGDmQSNjdsmc35JDF1K5E55YMjF_7DPuGi-6_RUAg.woff2',
        'baskerville': 'https://fonts.gstatic.com/s/librebaskerville/v14/kmKnZrc3Hgbbcjq75U4uslyuy4kn0qNcWx8QDO9k.woff2',
        'palatino': 'https://fonts.gstatic.com/s/librebaskerville/v14/kmKnZrc3Hgbbcjq75U4uslyuy4kn0qNcWx8QDO9k.woff2',

        // Sans-serif fonts
        'helvetica': 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
        'helveticabold': 'https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.woff2',
        'arial': 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
        'calibri': 'https://fonts.gstatic.com/s/opensans/v34/memSYaGs126MiZpBA-UvWbX2vVnXBbObj2OVZyOOSr4dVJWUgsjZ0C4n.woff2',
        'verdana': 'https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2',
        'futura': 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2',
        'avenir': 'https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wlhyw.woff2',

        // Monospace fonts  
        'courier': 'https://fonts.gstatic.com/s/courierprime/v7/u-450q2lgwslOqpF_6gQ8kELaw9pWt_-.woff2',
        'couriernew': 'https://fonts.gstatic.com/s/courierprime/v7/u-450q2lgwslOqpF_6gQ8kELaw9pWt_-.woff2',
        'consolas': 'https://fonts.gstatic.com/s/sourcecodepro/v22/HI_diYsKILxRpg3hIP6sJ7fM7PqPMcMnZFqUwX28DMyQtMlrTA.woff2',
        'monaco': 'https://fonts.gstatic.com/s/sourcecodepro/v22/HI_diYsKILxRpg3hIP6sJ7fM7PqPMcMnZFqUwX28DMyQtMlrTA.woff2',
    };

    // Font similarity mappings (if exact font not found, try similar alternatives)
    private static readonly FONT_SIMILARITY_MAP: Record<string, string[]> = {
        // Serif
        'centuryschoolbook': ['ebgaramond', 'librebaskerville', 'garamond', 'times'],
        'times': ['timesnewroman', 'librebaskerville', 'ebgaramond'],
        'timesnewroman': ['times', 'librebaskerville', 'ebgaramond'],
        'georgia': ['librebaskerville', 'ebgaramond', 'times'],
        'garamond': ['ebgaramond', 'librebaskerville', 'times'],
        'baskerville': ['librebaskerville', 'ebgaramond', 'times'],
        'palatino': ['librebaskerville', 'ebgaramond', 'times'],

        // Sans-serif
        'helvetica': ['arial', 'roboto', 'opensans'],
        'arial': ['helvetica', 'roboto', 'opensans'],
        'calibri': ['opensans', 'roboto', 'helvetica'],
        'verdana': ['roboto', 'opensans', 'helvetica'],
        'futura': ['montserrat', 'roboto', 'opensans'],
        'avenir': ['montserrat', 'roboto', 'opensans'],

        // Monospace
        'courier': ['courierprime', 'sourcecodepro', 'couriernew'],
        'couriernew': ['courier', 'courierprime', 'sourcecodepro'],
        'consolas': ['sourcecodepro', 'courierprime', 'courier'],
        'monaco': ['sourcecodepro', 'courierprime', 'courier'],
    };

    /**
     * Try to find a web-based fallback for a font
     */
    async findFallback(fontName: string): Promise<FontFallbackResult | null> {
        console.log(`🔍 FontFallbackService: Searching for fallback for "${fontName}"`);

        // Normalize the font name
        const normalized = this.normalizeFontName(fontName);

        // Try 1: Direct CDN lookup
        const directUrl = FontFallbackService.FONT_CDN_URLS[normalized];
        if (directUrl) {
            console.log(`✅ FontFallbackService: Found direct CDN match for "${fontName}"`);
            const bytes = await this.downloadFont(directUrl);
            if (bytes) {
                return {
                    name: fontName,
                    url: directUrl,
                    source: 'cdn',
                    bytes,
                };
            }
        }

        // Try 2: Similar fonts
        const similarFonts = FontFallbackService.FONT_SIMILARITY_MAP[normalized] || [];
        for (const similarFont of similarFonts) {
            const similarUrl = FontFallbackService.FONT_CDN_URLS[similarFont];
            if (similarUrl) {
                console.log(`✅ FontFallbackService: Found similar font "${similarFont}" for "${fontName}"`);
                const bytes = await this.downloadFont(similarUrl);
                if (bytes) {
                    return {
                        name: similarFont,
                        url: similarUrl,
                        source: 'cdn',
                        bytes,
                    };
                }
            }
        }

        // Try 3: Google Fonts API
        const googleResult = await this.tryGoogleFonts(fontName);
        if (googleResult) {
            return googleResult;
        }

        console.warn(`❌ FontFallbackService: No fallback found for "${fontName}"`);
        return null;
    }

    /**
     * Download font from URL
     */
    private async downloadFont(url: string): Promise<Uint8Array | null> {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`❌ FontFallbackService: Failed to fetch ${url}: ${response.status}`);
                return null;
            }

            const arrayBuffer = await response.arrayBuffer();
            return new Uint8Array(arrayBuffer);
        } catch (error) {
            console.warn(`❌ FontFallbackService: Error fetching ${url}:`, error);
            return null;
        }
    }

    /**
     * Try to find font via Google Fonts API
     */
    private async tryGoogleFonts(fontName: string): Promise<FontFallbackResult | null> {
        try {
            // Google Fonts uses CSS API
            const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontName)}&display=swap`;

            const response = await fetch(cssUrl);
            if (!response.ok) {
                return null;
            }

            const css = await response.text();

            // Extract woff2 URL from CSS
            const urlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/);
            if (!urlMatch) {
                return null;
            }

            const fontUrl = urlMatch[1];
            const bytes = await this.downloadFont(fontUrl);

            if (bytes) {
                console.log(`✅ FontFallbackService: Found Google Font for "${fontName}"`);
                return {
                    name: fontName,
                    url: fontUrl,
                    source: 'google',
                    bytes,
                };
            }
        } catch (error) {
            console.warn(`❌ FontFallbackService: Google Fonts lookup failed for "${fontName}":`, error);
        }

        return null;
    }

    /**
     * Normalize font name for lookup
     */
    private normalizeFontName(fontName: string): string {
        return fontName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '') // Remove special characters
            .replace(/\s+/g, ''); // Remove spaces
    }

    /**
     * Get standard font bytes for common PDF fonts
     */
    async getStandardFontFallback(
        fontFamily: string,
        _style: 'normal' | 'italic' = 'normal',
        weight: number = 400
    ): Promise<FontFallbackResult | null> {
        console.log(`🔍 FontFallbackService: Getting standard fallback for family "${fontFamily}"`);

        const familyLower = fontFamily.toLowerCase();
        let targetFont: string;

        // Determine appropriate standard font
        if (familyLower.includes('serif') ||
            familyLower.includes('times') ||
            familyLower.includes('garamond') ||
            familyLower.includes('baskerville') ||
            familyLower.includes('schoolbook')) {
            // Serif fallback
            targetFont = weight >= 700 ? 'timesnewromanbold' : 'timesnewroman';
        } else if (familyLower.includes('mono') ||
            familyLower.includes('courier') ||
            familyLower.includes('consolas')) {
            // Monospace fallback
            targetFont = 'courier';
        } else {
            // Sans-serif fallback (default)
            targetFont = weight >= 700 ? 'helveticabold' : 'helvetica';
        }

        const url = FontFallbackService.FONT_CDN_URLS[targetFont];
        if (!url) {
            return null;
        }

        const bytes = await this.downloadFont(url);
        if (bytes) {
            console.log(`✅ FontFallbackService: Using standard fallback "${targetFont}"`);
            return {
                name: targetFont,
                url,
                source: 'cdn',
                bytes,
            };
        }

        return null;
    }
}

// Singleton instance
export const fontFallbackService = new FontFallbackService();
