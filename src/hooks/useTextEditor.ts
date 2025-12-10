import { useState, useCallback } from 'react';
import type { TextItem, EditorState } from '../types/types';
import { pdfjs } from 'react-pdf';
import { TextExtractor } from '../lib/TextExtractor';
import { PDFEditor } from '../lib/PDFEditor';

/**
 * Custom hook for managing PDF text editor state and operations
 */
export const useTextEditor = (file: File | null) => {
    const [editorState, setEditorState] = useState<EditorState>({
        isEditMode: false,
        extractedText: new Map(),
        modifications: [],
        currentPage: 1,
    });

    const [isExtracting, setIsExtracting] = useState(false);
    const [textOnlyPdf, setTextOnlyPdf] = useState<File | null>(null);
    const [textOnlyPdfBytes, setTextOnlyPdfBytes] = useState<Uint8Array | null>(null);

    /**
     * Extract text from the PDF and generate text-only PDF
     */
    const extractText = useCallback(async () => {
        if (!file) return;

        setIsExtracting(true);
        try {
            // Load PDF using pdfjs
            const loadingTask = pdfjs.getDocument(URL.createObjectURL(file));
            const pdfDocument = await loadingTask.promise;

            // Extract text from all pages
            const extractedText = await TextExtractor.extractTextFromAllPages(pdfDocument);

            // Convert array to Map grouped by page
            const textByPage = new Map<number, TextItem[]>();
            for (const item of extractedText) {
                const pageItems = textByPage.get(item.pageNumber) || [];
                pageItems.push(item);
                textByPage.set(item.pageNumber, pageItems);
            }

            // Generate text-only PDF
            const fileBytes = await PDFEditor.readFileAsBytes(file);
            const textOnlyBytes = await PDFEditor.createTextOnlyPDF(textByPage, fileBytes);
            setTextOnlyPdfBytes(textOnlyBytes);

            // Create File object from bytes for react-pdf
            const textOnlyFile = PDFEditor.createFileFromBytes(textOnlyBytes, 'text-only.pdf');
            setTextOnlyPdf(textOnlyFile);

            setEditorState(prev => ({
                ...prev,
                extractedText: textByPage,
            }));
        } catch (error) {
            console.error('Error extracting text:', error);
            alert('Failed to extract text. Please try a different PDF.');
        } finally {
            setIsExtracting(false);
        }
    }, [file]);

    /**
     * Toggle edit mode
     */
    const toggleEditMode = useCallback(() => {
        setEditorState(prev => ({
            ...prev,
            isEditMode: !prev.isEditMode,
        }));
    }, []);

    /**
     * Modify text item
     */
    const modifyText = useCallback((itemId: string, newText: string) => {
        setEditorState(prev => {
            const existingMod = prev.modifications.find(m => m.itemId === itemId);

            if (existingMod) {
                // Update existing modification
                return {
                    ...prev,
                    modifications: prev.modifications.map(m =>
                        m.itemId === itemId
                            ? { ...m, newText, timestamp: Date.now() }
                            : m
                    ),
                };
            } else {
                // Find original text
                let originalText = '';
                for (const items of prev.extractedText.values()) {
                    const item = items.find(i => i.id === itemId);
                    if (item) {
                        originalText = item.text;
                        break;
                    }
                }

                // Add new modification
                return {
                    ...prev,
                    modifications: [
                        ...prev.modifications,
                        {
                            itemId,
                            originalText,
                            newText,
                            timestamp: Date.now(),
                        },
                    ],
                };
            }
        });
    }, []);

    /**
     * Undo last modification
     */
    const undo = useCallback(() => {
        setEditorState(prev => ({
            ...prev,
            modifications: prev.modifications.slice(0, -1),
        }));
    }, []);

    /**
     * Reset all modifications
     */
    const resetModifications = useCallback(() => {
        setEditorState(prev => ({
            ...prev,
            modifications: [],
        }));
    }, []);

    /**
     * Export modified PDF
     */
    const exportPDF = useCallback(async (filename?: string) => {
        if (!textOnlyPdfBytes || editorState.modifications.length === 0) {
            alert('No modifications to export');
            return;
        }

        try {
            // Convert extractedText Map to the format expected by editPDF
            const textItemsMap = new Map<string, any>();
            for (const items of editorState.extractedText.values()) {
                for (const item of items) {
                    textItemsMap.set(item.id, item);
                }
            }
            
            const modifiedPdfBytes = await PDFEditor.editPDF(
                textOnlyPdfBytes,
                textItemsMap
            );

            const exportFilename = filename || file?.name.replace('.pdf', '_edited.pdf') || 'edited.pdf';
            PDFEditor.downloadPDF(modifiedPdfBytes, exportFilename);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Failed to export PDF. Please try again.');
        }
    }, [textOnlyPdfBytes, editorState.modifications, editorState.extractedText, file]);

    /**
     * Get current text for an item (with modifications applied)
     */
    const getCurrentText = useCallback((itemId: string): string => {
        const mod = editorState.modifications.find(m => m.itemId === itemId);
        if (mod) return mod.newText;

        // Find original text
        for (const items of editorState.extractedText.values()) {
            const item = items.find(i => i.id === itemId);
            if (item) return item.text;
        }

        return '';
    }, [editorState.modifications, editorState.extractedText]);

    return {
        editorState,
        isExtracting,
        textOnlyPdf,
        extractText,
        toggleEditMode,
        modifyText,
        undo,
        resetModifications,
        exportPDF,
        getCurrentText,
    };
};
