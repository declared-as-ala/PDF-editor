import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import type { TextItem, TextModification } from '../types/types';

/**
 * PDF Editor for applying text modifications and exporting
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
     * Apply text modifications to a PDF and return the modified PDF bytes
     * @param textOnlyPdfBytes Text-only PDF bytes
     * @param modifications Array of text modifications
     * @param allTextItems All extracted text items (for positioning)
     * @returns Modified PDF as Uint8Array
     */
    static async applyModifications(
        textOnlyPdfBytes: Uint8Array,
        modifications: TextModification[],
        allTextItems: Map<number, TextItem[]>
    ): Promise<Uint8Array> {
        try {
            // Load the text-only PDF
            const pdfDoc = await PDFDocument.load(textOnlyPdfBytes);

            // Load standard font
            const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

            // Group modifications by page
            const modsByPage = new Map<number, TextModification[]>();
            modifications.forEach(mod => {
                // Find which page this modification belongs to
                for (const [pageNum, items] of allTextItems.entries()) {
                    const item = items.find(i => i.id === mod.itemId);
                    if (item) {
                        if (!modsByPage.has(pageNum)) {
                            modsByPage.set(pageNum, []);
                        }
                        modsByPage.get(pageNum)!.push(mod);
                        break;
                    }
                }
            });

            // Apply modifications to each page
            for (const [pageNum, pageMods] of modsByPage.entries()) {
                const page = pdfDoc.getPage(pageNum - 1);
                const { height } = page.getSize();
                const textItems = allTextItems.get(pageNum) || [];

                for (const mod of pageMods) {
                    // Find the text item
                    const textItem = textItems.find(item => item.id === mod.itemId);
                    if (!textItem) continue;

                    // Only process if text actually changed
                    if (mod.originalText === mod.newText) continue;

                    // Draw white rectangle to cover original text
                    page.drawRectangle({
                        x: textItem.x,
                        y: height - textItem.y - textItem.height,
                        width: textItem.width + 10,
                        height: textItem.height + 4,
                        color: rgb(1, 1, 1),
                        borderWidth: 0,
                    });

                    // Draw new text
                    page.drawText(mod.newText, {
                        x: textItem.x,
                        y: height - textItem.y - textItem.fontSize,
                        size: textItem.fontSize,
                        font: font,
                        color: rgb(0, 0, 0),
                    });
                }
            }

            // Serialize the PDF
            const pdfBytes = await pdfDoc.save();
            return pdfBytes;
        } catch (error) {
            console.error('Error applying modifications:', error);
            throw error;
        }
    }

    /**
     * Download the modified PDF
     * @param pdfBytes PDF bytes
     * @param filename Filename for download
     */
    static downloadPDF(pdfBytes: Uint8Array, filename: string = 'edited.pdf') {
        const blob = new Blob([pdfBytes.buffer], { type: 'application/pdf' });
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
        const blob = new Blob([pdfBytes.buffer], { type: 'application/pdf' });
        return new File([blob], filename, { type: 'application/pdf' });
    }
}
