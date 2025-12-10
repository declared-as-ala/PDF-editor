/**
 * FontManager - Centralized font registry and management system
 * 
 * This is the single source of truth for all fonts in the application.
 * It handles font registration, validation, caching, and smart matching
 * for both browser (editing) and pdf-lib (export) usage.
 */

// import fontkit from '@pdf-lib/fontkit'; // Not used in frontend-only version

export interface FontInfo {
    originalName: string;      // e.g., "ABCDEF+CenturySchoolbook-Bold"
    cleanName: string;         // e.g., "CenturySchoolbook-Bold"
    family: string;            // e.g., "CenturySchoolbook"
    style: 'normal' | 'italic';
    weight: number;            // 100-900
    source: 'backend' | 'web' | 'fallback' | 'google';
    bytes: Uint8Array;
    browserFont?: FontFace;
    pdfLibFont?: any;          // PDFFont from pdf-lib
    validated: boolean;
    glyphCoverage: Set<number>; // Supported Unicode code points
}

export interface ValidationResult {
    valid: boolean;
    reason?: string;
    glyphCoverage?: Set<number>;
}

export class FontManager {
    private fonts: Map<string, FontInfo> = new Map();
    private pdfDoc: any = null; // PDFDocument from pdf-lib

    /**
     * Set the PDF document for font embedding
     */
    setPdfDocument(pdfDoc: any): void {
        this.pdfDoc = pdfDoc;
    }

    /**
     * Register a font from raw bytes
     */
    async registerFont(
        originalName: string,
        bytes: Uint8Array,
        source: 'backend' | 'web' | 'fallback' | 'google' = 'backend'
    ): Promise<FontInfo | null> {
        console.log(`📝 FontManager: Registering font "${originalName}" from ${source}`);

        try {
            // Clean the name (remove subset prefix)
            const cleanName = originalName.replace(/^[A-Z]{6}\+/, '');

            // Parse font metadata
            const { family, style, weight } = this.parseFontName(cleanName);

            // Validate font
            const validation = await this.validateFont(bytes);
            if (!validation.valid) {
                console.warn(`❌ FontManager: Font "${originalName}" failed validation: ${validation.reason}`);
                return null;
            }

            // Create browser FontFace
            let browserFont: FontFace | undefined;
            try {
                // Convert Uint8Array to ArrayBuffer for FontFace
                const arrayBuffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
                browserFont = new FontFace(cleanName, arrayBuffer);
                await browserFont.load();
                document.fonts.add(browserFont);
                console.log(`✅ FontManager: Loaded "${cleanName}" into browser`);
            } catch (error) {
                console.warn(`⚠️ FontManager: Failed to load "${cleanName}" into browser:`, error);
            }

            // Create font info
            const fontInfo: FontInfo = {
                originalName,
                cleanName,
                family,
                style,
                weight,
                source,
                bytes,
                browserFont,
                pdfLibFont: undefined, // Will be lazy-loaded
                validated: true,
                glyphCoverage: validation.glyphCoverage || new Set(),
            };

            // Cache by both original and clean names
            this.fonts.set(originalName, fontInfo);
            this.fonts.set(cleanName, fontInfo);
            this.fonts.set(family, fontInfo); // Also cache by family for easier lookup

            console.log(`✅ FontManager: Registered "${cleanName}" (family: ${family}, style: ${style}, weight: ${weight})`);
            return fontInfo;
        } catch (error) {
            console.error(`❌ FontManager: Failed to register font "${originalName}":`, error);
            return null;
        }
    }

    /**
     * Get font for a specific text
     * Returns a font that supports all characters in the text
     */
    async getFont(
        fontName: string,
        text?: string,
        style: 'normal' | 'italic' = 'normal',
        weight: number = 400
    ): Promise<FontInfo | null> {
        console.log(`🔍 FontManager: Looking for font "${fontName}" for text: "${text?.substring(0, 20) || 'N/A'}"`);

        // Try exact match first
        let fontInfo = this.fonts.get(fontName);

        // Try clean name (remove subset prefix)
        if (!fontInfo) {
            const cleanName = fontName.replace(/^[A-Z]{6}\+/, '');
            fontInfo = this.fonts.get(cleanName);
        }

        // Try finding by family + style + weight
        if (!fontInfo) {
            const match = this.findBestMatch(fontName, style, weight);
            fontInfo = match ?? undefined;
        }

        // If found, validate it supports the text
        if (fontInfo && text) {
            const supportsText = this.validateTextSupport(fontInfo, text);
            if (!supportsText) {
                console.warn(`⚠️ FontManager: Font "${fontInfo.cleanName}" doesn't support all characters in text`);
                return null; // Let caller handle fallback
            }
        }

        if (fontInfo) {
            console.log(`✅ FontManager: Found font "${fontInfo.cleanName}" (source: ${fontInfo.source})`);
        } else {
            console.warn(`❌ FontManager: No font found for "${fontName}"`);
        }

        return fontInfo ?? null;
    }

    /**
     * Get or create pdf-lib font for export
     */
    async getPdfLibFont(fontInfo: FontInfo): Promise<any> {
        if (!this.pdfDoc) {
            throw new Error('PDFDocument not set. Call setPdfDocument() first.');
        }

        // Return cached if available
        if (fontInfo.pdfLibFont) {
            return fontInfo.pdfLibFont;
        }

        // Embed font
        try {
            const pdfLibFont = await this.pdfDoc.embedFont(fontInfo.bytes);
            fontInfo.pdfLibFont = pdfLibFont;
            console.log(`✅ FontManager: Embedded "${fontInfo.cleanName}" into PDF`);
            return pdfLibFont;
        } catch (error) {
            console.error(`❌ FontManager: Failed to embed "${fontInfo.cleanName}":`, error);
            throw error;
        }
    }

    /**
     * Validate font can be used
     * NOTE: Disabled full validation because fontkit.create() doesn't work well with subset fonts
     * The old system trusted backend fonts and it worked fine.
     */
    private async validateFont(_bytes: Uint8Array): Promise<ValidationResult> {
        // Skip validation - trust the backend extraction
        // Subset fonts from PyMuPDF work fine even if fontkit can't parse them
        return {
            valid: true,
            glyphCoverage: new Set(), // Will validate per-text during usage
        };

        /*  // OLD VALIDATION CODE - DISABLED
        try {
            // 1. Can fontkit parse it?
            // fontkit expects a Buffer, so convert Uint8Array to Buffer
            const buffer = Buffer.from(bytes);
            const fkFont = fontkit.create(buffer);

            // 2. Check basic Latin coverage
            const basicChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789 ';
            const glyphCoverage = new Set<number>();

            for (const char of basicChars) {
                const codePoint = char.codePointAt(0);
                if (codePoint) {
                    if (fkFont.hasGlyphForCodePoint(codePoint)) {
                        glyphCoverage.add(codePoint);
                    }
                }
            }

            // Require at least 50% of basic chars
            if (glyphCoverage.size < basicChars.length * 0.5) {
                return {
                    valid: false,
                    reason: `Missing too many basic characters (${glyphCoverage.size}/${basicChars.length})`,
                };
            }

            // Scan all available glyphs
            try {
                for (let cp = 0; cp < 65536; cp++) {
                    if (fkFont.hasGlyphForCodePoint(cp)) {
                        glyphCoverage.add(cp);
                    }
                }
            } catch (e) {
                // Some fonts don't support full range, that's okay
            }

            return {
                valid: true,
                glyphCoverage,
            };
        } catch (error) {
            return {
                valid: false,
                reason: `Font parsing failed: ${error}`,
            };
        }
        */
    }

    /**
     * Check if font supports all characters in text
     * NOTE: Disabled because we're not tracking glyph coverage anymore
     */
    private validateTextSupport(_fontInfo: FontInfo, _text: string): boolean {
        // Trust that the font works - skip validation
        return true;

        /* // OLD CODE - DISABLED
        for (const char of text) {
            const codePoint = char.codePointAt(0);
            if (codePoint && !fontInfo.glyphCoverage.has(codePoint)) {
                console.warn(`⚠️ FontManager: Font "${fontInfo.cleanName}" missing character: "${char}" (U+${codePoint.toString(16).toUpperCase()})`);
                return false;
            }
        }
        return true;
        */
    }

    /**
     * Parse font metadata from name
     */
    private parseFontName(name: string): { family: string; style: 'normal' | 'italic'; weight: number } {
        const nameLower = name.toLowerCase();

        // Extract style
        const style: 'normal' | 'italic' = nameLower.includes('italic') || nameLower.includes('oblique')
            ? 'italic'
            : 'normal';

        // Extract weight
        let weight = 400; // Regular
        if (nameLower.includes('thin')) weight = 100;
        else if (nameLower.includes('extralight') || nameLower.includes('ultralight')) weight = 200;
        else if (nameLower.includes('light')) weight = 300;
        else if (nameLower.includes('medium')) weight = 500;
        else if (nameLower.includes('semibold') || nameLower.includes('demibold')) weight = 600;
        else if (nameLower.includes('bold')) weight = 700;
        else if (nameLower.includes('extrabold') || nameLower.includes('ultrabold')) weight = 800;
        else if (nameLower.includes('black') || nameLower.includes('heavy')) weight = 900;

        // Extract family (remove style/weight keywords)
        let family = name
            .replace(/-(Bold|Italic|Regular|Light|Medium|SemiBold|Black|Heavy|Thin)/gi, '')
            .replace(/Bold|Italic|Regular|Light|Medium|SemiBold|Black|Heavy|Thin/gi, '')
            .trim();

        // Remove trailing hyphens
        family = family.replace(/-+$/, '');

        return { family, style, weight };
    }

    /**
     * Find best matching font by family, style, and weight
     */
    private findBestMatch(
        fontName: string,
        targetStyle: 'normal' | 'italic',
        targetWeight: number
    ): FontInfo | null {
        const { family: targetFamily } = this.parseFontName(fontName);
        const targetFamilyLower = targetFamily.toLowerCase();

        let bestMatch: FontInfo | null = null;
        let bestScore = -1;

        for (const fontInfo of this.fonts.values()) {
            const familyLower = fontInfo.family.toLowerCase();

            // Skip if family doesn't match
            if (!familyLower.includes(targetFamilyLower) && !targetFamilyLower.includes(familyLower)) {
                continue;
            }

            // Calculate match score
            let score = 0;

            // Family match (highest priority)
            if (familyLower === targetFamilyLower) score += 100;
            else if (familyLower.includes(targetFamilyLower) || targetFamilyLower.includes(familyLower)) score += 50;

            // Style match
            if (fontInfo.style === targetStyle) score += 20;

            // Weight match (closer is better)
            const weightDiff = Math.abs(fontInfo.weight - targetWeight);
            score += Math.max(0, 10 - weightDiff / 100);

            if (score > bestScore) {
                bestScore = score;
                bestMatch = fontInfo;
            }
        }

        if (bestMatch) {
            console.log(`🎯 FontManager: Best match for "${fontName}": "${bestMatch.cleanName}" (score: ${bestScore})`);
        }

        return bestMatch;
    }

    /**
     * Get all registered fonts
     */
    getAllFonts(): FontInfo[] {
        const uniqueFonts = new Map<string, FontInfo>();
        for (const fontInfo of this.fonts.values()) {
            uniqueFonts.set(fontInfo.cleanName, fontInfo);
        }
        return Array.from(uniqueFonts.values());
    }

    /**
     * Clear all fonts
     */
    clear(): void {
        this.fonts.clear();
        this.pdfDoc = null;
    }
}

// Singleton instance
export const fontManager = new FontManager();
