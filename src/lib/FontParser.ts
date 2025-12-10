/**
 * FontParser - Unified font name parsing utility
 * 
 * This provides consistent font parsing across the entire application.
 * Handles various font name formats:
 * - PDF subset names: "MUFUZY+Rubik-Medium"
 * - CSS font-family: "Rubik-Medium, Georgia, serif"
 * - Clean names: "Rubik-Medium"
 */

export interface ParsedFont {
    /** Clean font family name (e.g., "Rubik") */
    family: string;
    /** Font weight (100-900) */
    weight: number;
    /** Font style */
    style: 'normal' | 'italic';
    /** Original font name if available (e.g., "MUFUZY+Rubik-Medium") */
    originalName?: string;
    /** Clean font name without subset prefix (e.g., "Rubik-Medium") */
    cleanName: string;
    /** CSS font-family string if provided (preserves exact display font) */
    cssFontFamily?: string;
}

/**
 * Parse a font name into its components
 * Handles multiple formats consistently
 */
export function parseFontName(fontName: string, originalFontName?: string): ParsedFont {
    if (!fontName || fontName.trim() === '') {
        return {
            family: 'Georgia',
            weight: 400,
            style: 'normal',
            originalName: originalFontName,
            cleanName: 'Georgia',
        };
    }

    // Strategy:
    // 1. Use originalFontName for backend/PDF matching (most reliable)
    // 2. Use fontName (CSS font-family) for browser display if it's a CSS string
    // 3. Parse both to extract family, weight, style
    
    let nameToParse: string;
    let cssFontFamily: string | undefined;
    
    // If fontName is a CSS font-family string (has commas), preserve it for display
    if (fontName.includes(',')) {
        cssFontFamily = fontName;
    }
    
    // Use originalFontName if available (more reliable for PDF matching)
    if (originalFontName) {
        nameToParse = originalFontName;
    } else {
        nameToParse = fontName;
    }
    
    // Remove subset prefix (e.g., "MUFUZY+" or "ABCDEF+")
    let cleanName = nameToParse.replace(/^[A-Z]{6}\+/, '');
    
    // Extract clean name (remove CSS fallbacks if present)
    if (cleanName.includes(',')) {
        cleanName = cleanName.split(',')[0].trim();
    }
    
    // Normalize: remove quotes
    cleanName = cleanName.replace(/^["']|["']$/g, '');
    
    // Extract style
    const nameLower = cleanName.toLowerCase();
    const style: 'normal' | 'italic' = 
        nameLower.includes('italic') || nameLower.includes('oblique') 
            ? 'italic' 
            : 'normal';
    
    // Extract weight
    let weight = 400; // Default to regular
    if (nameLower.includes('thin')) {
        weight = 100;
    } else if (nameLower.includes('extralight') || nameLower.includes('ultralight')) {
        weight = 200;
    } else if (nameLower.includes('light')) {
        weight = 300;
    } else if (nameLower.includes('medium')) {
        weight = 500;
    } else if (nameLower.includes('semibold') || nameLower.includes('demibold')) {
        weight = 600;
    } else if (nameLower.includes('bold')) {
        weight = 700;
    } else if (nameLower.includes('extrabold') || nameLower.includes('ultrabold')) {
        weight = 800;
    } else if (nameLower.includes('black') || nameLower.includes('heavy')) {
        weight = 900;
    }
    
    // Extract family name (remove weight/style keywords)
    let family = cleanName
        .replace(/-(Bold|Italic|Regular|Light|Medium|SemiBold|Demibold|Black|Heavy|Thin|ExtraLight|UltraLight|ExtraBold|UltraBold)/gi, '')
        .replace(/(Bold|Italic|Regular|Light|Medium|SemiBold|Demibold|Black|Heavy|Thin|ExtraLight|UltraLight|ExtraBold|UltraBold)/gi, '')
        .trim();
    
    // Remove trailing hyphens and clean up
    family = family.replace(/-+$/, '').replace(/^["']|["']$/g, '').trim();
    
    // Fallback to cleanName if family is empty
    if (!family || family === '') {
        family = cleanName.split('-')[0].trim() || 'Georgia';
    }
    
    return {
        family,
        weight,
        style,
        originalName: originalFontName || (nameToParse !== fontName ? nameToParse : undefined),
        cleanName: cleanName,
        cssFontFamily: cssFontFamily, // Preserve CSS font-family for display
    };
}

/**
 * Get font family name for CSS (with fallbacks)
 * IMPORTANT: Uses only the family name (e.g., "Rubik") not the full name (e.g., "Rubik-Medium")
 * This matches how Google Fonts loads fonts - weight is applied via fontWeight CSS property
 */
export function getCssFontFamily(parsed: ParsedFont): string {
    // If we have a CSS font-family string, check if it's already correct format
    if (parsed.cssFontFamily) {
        // Extract just the family name (first part before comma or weight suffix)
        const cssParts = parsed.cssFontFamily.split(',');
        const firstPart = cssParts[0].trim();
        // Remove weight suffixes like "-Medium", "-Bold" etc.
        const familyOnly = firstPart.replace(/-(Bold|Medium|Light|Regular|Thin|Black|Heavy|SemiBold|Demibold|ExtraLight|UltraLight|ExtraBold|UltraBold)/i, '').trim();
        // Return with fallbacks
        return `${familyOnly}, ${cssParts.slice(1).join(', ').trim() || 'Georgia, serif'}`;
    }
    
    // Use family name (not cleanName) - this is the base font name without weight suffix
    // e.g., "Rubik" not "Rubik-Medium" - weight is applied via fontWeight CSS property
    const fontFamily = parsed.family;
    
    // Map common fonts to web-safe alternatives (only for display)
    const fontMap: Record<string, string> = {
        'centuryschoolbook': '"Century Schoolbook", Georgia, "Book Antiqua", serif',
        'calibri': 'Calibri, "Segoe UI", Arial, sans-serif',
        'times': '"Times New Roman", Times, serif',
        'helvetica': 'Arial, Helvetica, sans-serif',
        'arial': 'Arial, Helvetica, sans-serif',
    };
    
    const fontLower = fontFamily.toLowerCase();
    
    // Check font map
    if (fontMap[fontLower]) {
        return fontMap[fontLower];
    }
    
    // For custom fonts, use just the family name with fallbacks
    // Weight will be applied via fontWeight CSS property
    return `${fontFamily}, Georgia, serif`;
}

/**
 * Get font name for backend (prefer originalFontName)
 */
export function getBackendFontName(parsed: ParsedFont): string {
    // Prefer originalFontName if available (more reliable for PDF matching)
    if (parsed.originalName) {
        return parsed.originalName;
    }
    
    // Otherwise use cleanName
    return parsed.cleanName;
}
