/**
 * Backend Font Extraction Service
 * Communicates with Python backend to extract fonts from PDFs
 */

const BACKEND_URL = 'http://localhost:5000';

export interface ExtractedFont {
    base64Data: string;
    metadata: {
        type: string;
        ext: string;
        size: number;
        pages: number[];
    };
}

export interface FontExtractionResponse {
    success: boolean;
    fonts: Record<string, string>;  // fontName -> base64 data
    metadata: Record<string, {
        type: string;
        ext: string;
        size: number;
        pages: number[];
    }>;
    total_fonts: number;
}

export class BackendFontService {
    /**
     * Extract fonts from a PDF file using the backend
     */
    async extractFonts(pdfFile: File): Promise<Map<string, Uint8Array>> {
        try {
            console.log(`🔄 Sending PDF to backend for font extraction...`);

            // Create form data
            const formData = new FormData();
            formData.append('pdf', pdfFile);

            // Call backend API
            const response = await fetch(`${BACKEND_URL}/extract-fonts`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
            }

            const data: FontExtractionResponse = await response.json();

            if (!data.success) {
                throw new Error('Font extraction failed');
            }

            console.log(`✅ Backend extracted ${data.total_fonts} fonts`);

            // Convert base64 fonts to Uint8Array
            const fontsMap = new Map<string, Uint8Array>();

            for (const [fontName, base64Data] of Object.entries(data.fonts)) {
                try {
                    // Decode base64 to binary
                    const binaryString = atob(base64Data);
                    const fontBytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        fontBytes[i] = binaryString.charCodeAt(i);
                    }

                    fontsMap.set(fontName, fontBytes);

                    const meta = data.metadata[fontName];
                    console.log(`✅ Loaded font: ${fontName} (${meta.type}, ${meta.size} bytes)`);
                } catch (e) {
                    console.warn(`Failed to decode font ${fontName}:`, e);
                }
            }

            return fontsMap;

        } catch (error) {
            console.error('❌ Backend font extraction failed:', error);

            // Provide helpful error messages
            if (error instanceof TypeError && error.message.includes('fetch')) {
                console.error('💡 Make sure the Python backend is running on http://localhost:5000');
                console.error('💡 Run: cd backend && python app.py');
            }

            throw error;
        }
    }

    /**
     * Check if backend is available
     */
    async checkBackendHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${BACKEND_URL}/health`);
            return response.ok;
        } catch {
            return false;
        }
    }
}
