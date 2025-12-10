import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { TextItem } from '../types/types';
import { parseFontName } from './FontParser';

/**
 * PDF Editor for applying text modifications and exporting
 * Frontend-only implementation using pdf-lib
 */
export class PDFEditor {
    /**
     * Create a new PDF with only the extracted text
     * @param extractedText Map of page number to text items
     * @param originalPdfBytes Original PDF file as Uint8Array
     * @returns Text-only PDF as Uint8Array
     */
    static async createTextOnlyPDF(
        extractedText: Map<number, TextItem[]>,
        originalPdfBytes: Uint8Array
    ): Promise<Uint8Array> {
        try {
            // Load original PDF to get page dimensions
            const originalPdf = await PDFDocument.load(originalPdfBytes);

            // Create new PDF
            const pdfDoc = await PDFDocument.create();
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

            // Get number of pages
            const numPages = originalPdf.getPageCount();

            // Create pages with text
            for (let pageNum = 1; pageNum <= numPages; pageNum++) {
                const originalPage = originalPdf.getPage(pageNum - 1);
                const { width, height } = originalPage.getSize();

                // Add page with same dimensions
                const page = pdfDoc.addPage([width, height]);

                // Get text items for this page
                const textItems = extractedText.get(pageNum) || [];

                // Draw each text item
                for (const item of textItems) {
                    try {
                        page.drawText(item.text, {
                            x: item.x,
                            y: height - item.y - item.fontSize,
                            size: item.fontSize,
                            font: font,
                            color: rgb(0, 0, 0),
                        });
                    } catch (error) {
                        console.error(`Error drawing text item ${item.id}:`, error);
                    }
                }
            }

            // Serialize the PDF
            const pdfBytes = await pdfDoc.save();
            return pdfBytes;
        } catch (error) {
            console.error('Error creating text-only PDF:', error);
            throw error;
        }
    }

    /**
     * Apply text modifications to original PDF and return the modified PDF bytes
     * Frontend-only implementation using pdf-lib
     * @param originalPdfBytes Original PDF file bytes
     * @param textItems Map of text items with edits
     * @returns Modified PDF as Uint8Array
     */
    static async editPDF(
        originalPdfBytes: Uint8Array,
        textItems: Map<string, TextItem>
    ): Promise<Uint8Array> {
        try {
            console.log('📝 Editing PDF with pdf-lib (frontend-only)...');
            
            // Validate PDF bytes
            if (!originalPdfBytes || originalPdfBytes.length === 0) {
                throw new Error('PDF bytes are empty or invalid');
            }
            
            // Validate PDF header
            const header = String.fromCharCode(...originalPdfBytes.slice(0, 4));
            if (header !== '%PDF') {
                throw new Error(`Invalid PDF file: Expected PDF header, got "${header}"`);
            }
            
            console.log(`📄 PDF size: ${originalPdfBytes.length} bytes`);
            
            // Load the original PDF
            const pdfDoc = await PDFDocument.load(originalPdfBytes);
            
            // Group text items by page
            const itemsByPage = new Map<number, TextItem[]>();
            for (const item of textItems.values()) {
                const pageNum = item.pageNumber;
                if (!itemsByPage.has(pageNum)) {
                    itemsByPage.set(pageNum, []);
                }
                itemsByPage.get(pageNum)!.push(item);
            }

            // Process each page
            for (const [pageNum, items] of itemsByPage.entries()) {
                const page = pdfDoc.getPage(pageNum - 1);
                const { height } = page.getSize();

                for (const item of items) {
                    // Parse color
                    const colorMatch = item.color?.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                    const color = colorMatch
                        ? rgb(
                            parseInt(colorMatch[1]) / 255,
                            parseInt(colorMatch[2]) / 255,
                            parseInt(colorMatch[3]) / 255
                          )
                        : rgb(0, 0, 0);

                    // Parse font
                    const parsed = parseFontName(item.fontName || 'Helvetica', item.originalFontName);
                    const fontFamily = parsed.family;
                    const fontWeight = item.fontWeight || parsed.weight || 400;

                    // Draw white rectangle to cover original text
                    page.drawRectangle({
                        x: item.x,
                        y: height - item.y - item.height,
                        width: item.width + 5,
                        height: item.height + 2,
                        color: rgb(1, 1, 1),
                        borderWidth: 0,
                    });

                    // Try to use custom font, fallback to standard font
                    try {
                        // Try to load Google Font
                        const { fontLoader } = await import('./FontLoader');
                        const fontBytes = await fontLoader.downloadGoogleFontFile(fontFamily, fontWeight);
                        
                        if (fontBytes) {
                            const customFont = await pdfDoc.embedFont(fontBytes);
                            page.drawText(item.text, {
                                x: item.x,
                                y: height - item.y - item.fontSize,
                                size: item.fontSize,
                                font: customFont,
                                color: color,
                            });
                            console.log(`✅ Used custom font: ${fontFamily} ${fontWeight}`);
                            continue;
                        }
                    } catch (error) {
                        console.warn(`⚠️ Could not load custom font ${fontFamily}, using standard font:`, error);
                    }

                    // Fallback to standard font
                    let standardFont;
                    if (fontFamily.toLowerCase().includes('times') || fontFamily.toLowerCase().includes('serif')) {
                        standardFont = fontWeight >= 700 
                            ? await pdfDoc.embedFont(StandardFonts.TimesRomanBold)
                            : await pdfDoc.embedFont(StandardFonts.TimesRoman);
                    } else if (fontFamily.toLowerCase().includes('courier') || fontFamily.toLowerCase().includes('mono')) {
                        standardFont = fontWeight >= 700
                            ? await pdfDoc.embedFont(StandardFonts.CourierBold)
                            : await pdfDoc.embedFont(StandardFonts.Courier);
                    } else {
                        standardFont = fontWeight >= 700
                            ? await pdfDoc.embedFont(StandardFonts.HelveticaBold)
                            : await pdfDoc.embedFont(StandardFonts.Helvetica);
                    }

                    page.drawText(item.text, {
                        x: item.x,
                        y: height - item.y - item.fontSize,
                        size: item.fontSize,
                        font: standardFont,
                        color: color,
                    });
                }
            }

            // Serialize the PDF
            const pdfBytes = await pdfDoc.save();
            console.log('✅ PDF edited successfully');
            return pdfBytes;
        } catch (error) {
            console.error('❌ Error editing PDF:', error);
            throw error;
        }
    }

    /**
     * Download the modified PDF
     * @param pdfBytes PDF bytes
     * @param filename Filename for download
     */
    static downloadPDF(pdfBytes: Uint8Array, filename: string = 'edited.pdf') {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.click();
        URL.revokeObjectURL(url);
    }

    /**
     * Read file as Uint8Array
     * @param file File object
     * @returns Promise<Uint8Array>
     */
    static async readFileAsBytes(file: File): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const arrayBuffer = event.target?.result as ArrayBuffer;
                resolve(new Uint8Array(arrayBuffer));
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Create a File object from Uint8Array
     * @param pdfBytes PDF bytes
     * @param filename Filename
     * @returns File object
     */
    static createFileFromBytes(pdfBytes: Uint8Array, filename: string = 'text-only.pdf'): File {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        return new File([blob], filename, { type: 'application/pdf' });
    }
}
