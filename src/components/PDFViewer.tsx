import React, { useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import '../lib/pdfConfig';
import { HoverBox } from './HoverBox';
import { EditableText } from './EditableText';
import { EditorToolbar } from './EditorToolbar';
import { TextExtractor } from '../lib/TextExtractor';
import { parseFontName, getCssFontFamily } from '../lib/FontParser';
import { FontSelector } from './FontSelector';
import { WordToolbar } from './WordToolbar';
import { PDFEditor } from '../lib/PDFEditor';
import type { TextItem } from '../types/types';

interface PDFViewerProps {
    file: File | null;
    onClose: () => void;
}

export const PDFViewer: React.FC<PDFViewerProps> = ({ file, onClose }) => {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState<number>(1);
    const [scale, setScale] = useState<number>(0.8);  // Start with smaller scale to fit screen
    const [pdfDocument, setPdfDocument] = useState<any>(null);
    const [originalPdfBytes, setOriginalPdfBytes] = useState<Uint8Array | null>(null);

    // Font selector position and dragging state
    const [fontSelectorPosition, setFontSelectorPosition] = useState({ 
        x: typeof window !== 'undefined' ? Math.max(20, window.innerWidth - 280) : 20, 
        y: 140 
    });
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    // Store PDF bytes immediately when file changes
    // This ensures we have the bytes available even if File.arrayBuffer() can't be called again
    useEffect(() => {
        if (file && !originalPdfBytes) {
            const storePdfBytes = async () => {
                try {
                    console.log('📥 Reading PDF file to store bytes...');
                    const arrayBuffer = await file.arrayBuffer();
                    const uint8Array = new Uint8Array(arrayBuffer);
                    
                    // Validate PDF header
                    if (uint8Array.length >= 4) {
                        const header = String.fromCharCode(...uint8Array.slice(0, 4));
                        if (header === '%PDF') {
                            // Create a copy to ensure it persists independently
                            const bytesCopy = new Uint8Array(uint8Array.length);
                            bytesCopy.set(uint8Array);
                            setOriginalPdfBytes(bytesCopy);
                            console.log(`✅ PDF bytes stored successfully (${bytesCopy.length} bytes)`);
                        } else {
                            console.warn(`⚠️ Invalid PDF header: "${header}"`);
                        }
                    } else {
                        console.warn('⚠️ PDF file is too small');
                    }
                } catch (error) {
                    console.error('❌ Error storing PDF bytes:', error);
                }
            };
            
            storePdfBytes();
        }
    }, [file, originalPdfBytes]);

    // Hover boxes state
    const [textRegions, setTextRegions] = useState<Array<{
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        pageNumber: number;
    }>>([]);

    // Edit state
    const [activeRegionId, setActiveRegionId] = useState<string | null>(null);
    const [extractedText, setExtractedText] = useState<Map<string, TextItem>>(new Map());
    const [isExtracting, setIsExtracting] = useState(false);
    const [isAddingTextBox, setIsAddingTextBox] = useState(false);

    const onDocumentLoadSuccess = async ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setCurrentPage(1);

        // Get the PDF document
        // Use stored bytes if available, otherwise read from file
        if (file) {
            try {
                let uint8Array: Uint8Array;
                
                // Prefer stored bytes to avoid reading file twice
                if (originalPdfBytes && originalPdfBytes.length > 0) {
                    uint8Array = originalPdfBytes;
                    console.log('✅ Using stored PDF bytes for rendering');
                } else {
                    // Read from file if bytes not stored yet
                    console.log('📥 Reading PDF file for rendering...');
                const arrayBuffer = await file.arrayBuffer();
                    uint8Array = new Uint8Array(arrayBuffer);
                    
                    // Store a copy for future use
                    if (uint8Array.length >= 4) {
                        const header = String.fromCharCode(...uint8Array.slice(0, 4));
                        if (header === '%PDF') {
                            const bytesCopy = new Uint8Array(uint8Array.length);
                            bytesCopy.set(uint8Array);
                            setOriginalPdfBytes(bytesCopy);
                        }
                    }
                }
                
                const loadingTask = (window as any).pdfjsLib.getDocument({ data: uint8Array });
                const pdf = await loadingTask.promise;
                setPdfDocument(pdf);

                // Extract regions for first page
                const regions = await TextExtractor.extractTextRegions(pdf, 1);
                setTextRegions(regions);

                console.log('✅ PDF loaded and ready for editing');
            } catch (error) {
                console.error('Error loading PDF document:', error);
            }
        }
    };

    // Load Google Fonts for browser display and PDF export
    useEffect(() => {
        const loadFonts = async () => {
            console.log('🌐 Loading Google Fonts for PDF display and editing...');

            const { fontLoader } = await import('../lib/FontLoader');

            // Google Fonts to preload (from FontSelector)
            const googleFontsToLoad = [
                'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 
                'Rubik', 'Inter', 'Playfair Display', 'Merriweather', 'Source Sans Pro'
            ];

            // Load Google Fonts with common weights
            const commonWeights = [300, 400, 500, 600, 700];
            for (const fontFamily of googleFontsToLoad) {
                try {
                    await fontLoader.loadGoogleFont(fontFamily, commonWeights);
                    console.log(`✅ Loaded Google Font: ${fontFamily}`);
                    } catch (error) {
                    console.warn(`⚠️ Failed to load Google Font ${fontFamily}:`, error);
                }
            }

            console.log(`✅ All fonts loaded for editing`);
        };

        loadFonts();
    }, []);

    // Extract regions when page changes
    useEffect(() => {
        if (pdfDocument) {
            TextExtractor.extractTextRegions(pdfDocument, currentPage).then(regions => {
                setTextRegions(regions);
                setActiveRegionId(null); // Clear active region on page change
            });
        }
    }, [currentPage, pdfDocument]);

    // Listen for edit completion
    useEffect(() => {
        const handleEditComplete = () => {
            setActiveRegionId(null); // Clear active region to show edited text
        };
        window.addEventListener('editComplete', handleEditComplete);
        return () => window.removeEventListener('editComplete', handleEditComplete);
    }, []);

    const handleBoxClick = async (regionId: string) => {
        if (extractedText.has(regionId)) {
            // Already extracted, just activate
            setActiveRegionId(regionId);
            return;
        }

        // Extract text for this region on-demand
        setIsExtracting(true);
        try {
            // Get ALL raw text items (ungrouped)
            const page = await pdfDocument.getPage(currentPage);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 1.0 });

            // Find the region
            const region = textRegions.find(r => r.id === regionId);
            console.log('🎯 Region bounds:', region);
            if (region) {
                // Find all text items within this specific region's bounds
                const items = textContent.items as any[];
                const itemsInRegion: any[] = [];

                for (const item of items) {
                    if (!item.str || item.str.trim() === '') continue;

                    const transform = item.transform;
                    const x = transform[4];

                    // Match the EXACT Y calculation from extractTextRegions
                    const y = viewport.height - transform[5];  // This gives us baseline Y
                    const fontSize = Math.sqrt(transform[2] ** 2 + transform[3] ** 2);
                    const width = item.width;

                    // Check if this item is within the region bounds
                    const itemRight = x + width;
                    const regionRight = region.x + region.width;

                    const xOverlap = !(x > regionRight || itemRight < region.x);

                    // Region.y is calculated as (y - fontSize) in extractTextRegions
                    // So to check if item matches region: item's (y - fontSize) should match region.y
                    const itemTopY = y - fontSize;
                    const yMatch = Math.abs(itemTopY - region.y) < 10;  // Within 10px tolerance

                    if (xOverlap && yMatch) {
                        console.log(`✅ Item in region: "${item.str}" ItemTop=${itemTopY}, RegionTop=${region.y}, Match=${yMatch}`);
                        itemsInRegion.push({ item, x, y, fontSize, width });
                    }
                }

                console.log(`📦 Found ${itemsInRegion.length} items in region`);

                if (itemsInRegion.length > 0) {
                    // Merge the text items in this region intelligently
                    const sortedItems = itemsInRegion.sort((a, b) => a.x - b.x);

                    // Join text items - only add space if there's a significant gap
                    let mergedText = '';
                    for (let i = 0; i < sortedItems.length; i++) {
                        const current = sortedItems[i];
                        if (i === 0) {
                            mergedText = current.item.str;
                        } else {
                            const prev = sortedItems[i - 1];
                            const gap = current.x - (prev.x + prev.width);
                            // Add space only if gap is larger than a typical character width
                            const needsSpace = gap > (prev.fontSize * 0.2);
                            mergedText += (needsSpace ? ' ' : '') + current.item.str;
                        }
                    }

                    // Trim to remove any leading/trailing whitespace
                    mergedText = mergedText.trim();

                    const firstItem = sortedItems[0];

                    console.log(`📍 Position comparison:
                        Region X: ${region.x}
                        First Item X: ${firstItem.x}
                        Difference: ${firstItem.x - region.x}px
                    `);

                    // Get full text item with all properties - match more precisely
                    const allText = await TextExtractor.extractTextFromPage(pdfDocument, currentPage);

                    // Try to find exact match based on position and text
                    let templateItem = allText.find(item =>
                        Math.abs(item.x - firstItem.x) < 5 &&
                        Math.abs(item.y - (firstItem.y - firstItem.fontSize)) < 2
                    );

                    // If not found, try matching by Y position only
                    if (!templateItem) {
                        templateItem = allText.find(item =>
                            Math.abs(item.y - (firstItem.y - firstItem.fontSize)) < 5
                        );
                    }

                    console.log('Template item found:', templateItem?.fontName, templateItem?.originalFontName, templateItem?.color);

                    // Ensure we preserve the exact font information
                    const regionTextItem: TextItem = {
                        id: `region-text-${regionId}`,
                        text: mergedText,
                        x: firstItem.x,  // Use first item's actual X, not region X
                        y: region.y,  // Use region Y for exact positioning
                        width: region.width,  // Use region width
                        height: region.height,  // Use region height
                        fontSize: firstItem.fontSize,
                        // Preserve exact fontName (CSS font-family) for display
                        fontName: templateItem?.fontName || firstItem.item.fontName || 'Arial, sans-serif',
                        // Preserve originalFontName for backend/PDF export
                        originalFontName: templateItem?.originalFontName || firstItem.item.fontName,
                        fontWeight: templateItem?.fontWeight || 400,
                        fontStyle: templateItem?.fontStyle || 'normal',
                        color: templateItem?.color || '#000',
                        pageNumber: currentPage,
                        transform: firstItem.item.transform,
                    };

                    console.log(`✅ Extracted text for region ${regionId}:`, regionTextItem.text);
                    console.log(`📝 Font preserved - fontName: "${regionTextItem.fontName}", originalFontName: "${regionTextItem.originalFontName}"`);
                    console.log(`🎨 Font weight: ${regionTextItem.fontWeight}, style: ${regionTextItem.fontStyle}, color: ${regionTextItem.color}`);
                    setExtractedText(prev => new Map(prev).set(regionId, regionTextItem));
                    setActiveRegionId(regionId);
                } else {
                    console.warn(`No text found for region ${regionId}`, region);
                }
            }
        } catch (error) {
            console.error('Error extracting text:', error);
        } finally {
            setIsExtracting(false);
        }
    };

    const goToPreviousPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));
    const goToNextPage = () => setCurrentPage(prev => Math.min(prev + 1, numPages));
    const zoomIn = () => setScale(prev => Math.min(prev + 0.2, 3.0));
    const zoomOut = () => setScale(prev => Math.max(prev - 0.2, 0.5));
    const resetZoom = () => setScale(1.0);

    // Font selector dragging handlers
    const handleMouseMove = (e: MouseEvent) => {
        if (isDragging) {
            const newX = e.clientX - dragOffset.x;
            const newY = e.clientY - dragOffset.y;
            
            // Keep within window bounds
            const maxX = window.innerWidth - 260;
            const maxY = window.innerHeight - 200;
            
            setFontSelectorPosition({
                x: Math.max(10, Math.min(newX, maxX)),
                y: Math.max(10, Math.min(newY, maxY)),
            });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    // Mouse move/up listeners for dragging
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    // Initialize font selector position on mount
    useEffect(() => {
        const initPosition = () => {
            const x = Math.max(20, window.innerWidth - 280);
            const y = 140;
            setFontSelectorPosition({ x, y });
        };
        
        initPosition();
        
        // Keep font selector within window bounds on resize
        const handleResize = () => {
            setFontSelectorPosition(prev => ({
                x: Math.max(10, Math.min(prev.x, window.innerWidth - 270)),
                y: Math.max(10, Math.min(prev.y, window.innerHeight - 210)),
            }));
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    if (!file) return null;

    const activeText: TextItem | null = activeRegionId ? (extractedText.get(activeRegionId) ?? null) : null;
    console.log('🎯 Active region ID:', activeRegionId);
    console.log('📝 Active text:', activeText);
    console.log('🎨 Font selector position:', fontSelectorPosition);

    const handleFontChange = (fontName: string, fontWeight: number, fontStyle: string) => {
        if (!activeRegionId) return;
        
        const textItem = extractedText.get(activeRegionId);
        if (textItem) {
            // Parse the font name to get the family for backend
            const parsed = parseFontName(fontName);
            
            const updated: TextItem = {
                ...textItem,
                fontName: fontName, // CSS font-family for display
                originalFontName: parsed.cleanName || fontName.split(',')[0].trim(), // For backend
                fontWeight: fontWeight,
                fontStyle: fontStyle as 'normal' | 'italic',
            };
            
            console.log('🎨 Font changed:', {
                fontName: updated.fontName,
                fontWeight: updated.fontWeight,
                fontStyle: updated.fontStyle,
            });
            
            setExtractedText(prev => new Map(prev).set(activeRegionId!, updated));
        }
    };

    const handleTextColorChange = (color: string) => {
        if (!activeRegionId) return;
        const textItem = extractedText.get(activeRegionId);
        if (textItem) {
            const updated: TextItem = {
                ...textItem,
                color: color,
            };
            setExtractedText(prev => new Map(prev).set(activeRegionId!, updated));
        }
    };

    const handleAlignmentChange = (alignment: 'left' | 'center' | 'right' | 'justify') => {
        if (!activeRegionId) return;
        const textItem = extractedText.get(activeRegionId);
        if (textItem) {
            const updated: TextItem = {
                ...textItem,
                textAlign: alignment,
            } as TextItem;
            setExtractedText(prev => new Map(prev).set(activeRegionId!, updated));
        }
    };

    const handleUnderlineChange = (underline: boolean) => {
        if (!activeRegionId) return;
        const textItem = extractedText.get(activeRegionId);
        if (textItem) {
            const updated: TextItem = {
                ...textItem,
                textDecoration: underline ? 'underline' : 'none',
            } as TextItem;
            setExtractedText(prev => new Map(prev).set(activeRegionId!, updated));
        }
    };

    const handleFontSizeChange = (size: number) => {
        if (!activeRegionId) return;
        const textItem = extractedText.get(activeRegionId);
        if (textItem) {
            const updated: TextItem = {
                ...textItem,
                fontSize: size,
            };
            setExtractedText(prev => new Map(prev).set(activeRegionId!, updated));
        }
    };

    const handleExportPDF = async () => {
        if (!file || extractedText.size === 0) {
            alert('No edits to export');
            return;
        }

        try {
            console.log('📦 Editing PDF with pdf-lib (frontend-only)...');

            // Always read from file object to ensure we have fresh bytes
            // File.arrayBuffer() can only be called once, so we need to handle this carefully
            let pdfBytes: Uint8Array;
            
            if (originalPdfBytes && originalPdfBytes.length > 0) {
                // Use stored bytes if available and valid
                pdfBytes = originalPdfBytes;
                console.log(`✅ Using stored PDF bytes (${pdfBytes.length} bytes)`);
            } else {
                // Re-read file if bytes not available
                console.log('⚠️ PDF bytes not stored, reading from file...');
                
                // Read file as array buffer
                const arrayBuffer = await file.arrayBuffer();
                
                if (!arrayBuffer || arrayBuffer.byteLength === 0) {
                    throw new Error('Failed to read PDF file: file is empty or could not be read');
                }
                
                pdfBytes = new Uint8Array(arrayBuffer);
                
                // Validate PDF header
                if (pdfBytes.length < 4) {
                    throw new Error('PDF file is too small or corrupted');
                }
                
                const header = String.fromCharCode(...pdfBytes.slice(0, 4));
                if (header !== '%PDF') {
                    throw new Error(`Invalid PDF file: Expected PDF header "%PDF", got "${header}"`);
                }
                
                // Create a copy to ensure it persists
                const bytesCopy = new Uint8Array(pdfBytes.length);
                bytesCopy.set(pdfBytes);
                pdfBytes = bytesCopy;
                
                // Store for future use
                setOriginalPdfBytes(bytesCopy);
                
                console.log(`✅ PDF file read successfully (${pdfBytes.length} bytes)`);
            }

            // Final validation before passing to pdf-lib
            if (!pdfBytes || pdfBytes.length === 0) {
                throw new Error('PDF bytes are empty or invalid. Please reload the PDF file.');
            }
            
            // Validate PDF header one more time
            const header = String.fromCharCode(...pdfBytes.slice(0, 4));
            if (header !== '%PDF') {
                throw new Error(`Invalid PDF data: Expected PDF header "%PDF", got "${header}". The file may have been corrupted.`);
            }

            // Edit PDF using pdf-lib
            console.log(`📝 Processing ${extractedText.size} text edits...`);
            const modifiedPdfBytes = await PDFEditor.editPDF(pdfBytes, extractedText);

            // Download the modified PDF
            const filename = `edited_${new Date().getTime()}.pdf`;
            PDFEditor.downloadPDF(modifiedPdfBytes, filename);

            console.log('✅ PDF exported successfully');
            alert('PDF exported successfully!');

        } catch (error) {
            console.error('❌ Error exporting PDF:', error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Error exporting PDF: ${errorMessage}\n\nCheck the browser console for more details.`);
        }
    };

    return (
        <div className="pdf-viewer-container">
            <div className="pdf-viewer-header">
                <div className="pdf-info">
                    <h2>{file.name}</h2>
                    <span className="page-info">
                        Page {currentPage} of {numPages}
                    </span>
                </div>
                <button className="close-btn" onClick={onClose}>
                    ✕
                </button>
            </div>

            <EditorToolbar
                isEditMode={false}
                isExtracting={isExtracting}
                hasModifications={extractedText.size > 0}
                onToggleEditMode={() => { }}
                onExtractText={() => { }}
                onUndo={() => { }}
                onReset={() => setExtractedText(new Map())}
                onExport={handleExportPDF}
            />

            {/* Word Toolbar - Microsoft Word style formatting toolbar */}
            {file && (
                <div className="word-toolbar-container">
                    <WordToolbar
                        textItem={activeText}
                        onFontChange={handleFontChange}
                        onTextColorChange={handleTextColorChange}
                        onAlignmentChange={handleAlignmentChange}
                        onUnderlineChange={handleUnderlineChange}
                        onFontSizeChange={handleFontSizeChange}
                    />
                </div>
            )}

            {/* Font Selector - draggable panel - Always visible when PDF is loaded */}
            {file && (
                <div 
                    className="font-selector-container"
                    style={{
                        position: 'fixed',
                        left: `${fontSelectorPosition.x}px`,
                        top: `${fontSelectorPosition.y}px`,
                        zIndex: 2000,
                        cursor: isDragging ? 'grabbing' : 'default',
                        display: 'block',
                        visibility: 'visible',
                    }}
                >
                    <FontSelector
                        textItem={activeText}
                        onFontChange={handleFontChange}
                        onDragStart={(e) => {
                            setIsDragging(true);
                            const container = document.querySelector('.font-selector-container') as HTMLElement;
                            if (container) {
                                const rect = container.getBoundingClientRect();
                                setDragOffset({
                                    x: e.clientX - rect.left,
                                    y: e.clientY - rect.top,
                                });
                            }
                        }}
                    />
                </div>
            )}

            <div className="pdf-controls">
                <div className="control-group">
                    <button onClick={goToPreviousPage} disabled={currentPage <= 1} className="control-btn">
                        ← Previous
                    </button>
                    <span className="page-display">{currentPage} / {numPages}</span>
                    <button onClick={goToNextPage} disabled={currentPage >= numPages} className="control-btn">
                        Next →
                    </button>
                </div>

                <div className="control-group">
                    <button onClick={zoomOut} className="control-btn" disabled={scale <= 0.5}>−</button>
                    <span className="zoom-display">{Math.round(scale * 100)}%</span>
                    <button onClick={zoomIn} className="control-btn" disabled={scale >= 3.0}>+</button>
                    <button onClick={resetZoom} className="control-btn">Reset</button>
                </div>
            </div>

            <div className="pdf-canvas-container">
                <div style={{ position: 'relative' }}>
                    <Document
                        file={file}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={<div className="loading-indicator"><div className="spinner"></div><p>Loading PDF...</p></div>}
                        error={<div className="error-message"><p>Failed to load PDF. Please try another file.</p></div>}
                    >
                        <Page
                            pageNumber={currentPage}
                            scale={scale}
                            renderTextLayer={false}
                            renderAnnotationLayer={false}
                        />
                    </Document>

                    {/* Click handler for adding new text boxes */}
                    {isAddingTextBox && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                cursor: 'crosshair',
                                zIndex: 1000,
                            }}
                            onClick={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const x = (e.clientX - rect.left) / scale;
                                const y = (e.clientY - rect.top) / scale;
                                
                                // Create new text box
                                const newId = `new-text-${Date.now()}`;
                                const newTextItem: TextItem = {
                                    id: newId,
                                    text: 'New Text',
                                    x: x,
                                    y: y,
                                    width: 200,
                                    height: 20,
                                    fontSize: 12,
                                    fontName: 'Arial, sans-serif',
                                    fontWeight: 400,
                                    fontStyle: 'normal',
                                    color: '#000000',
                                    pageNumber: currentPage,
                                    transform: [1, 0, 0, 1, 0, 0],
                                };
                                
                                setExtractedText(prev => new Map(prev).set(newId, newTextItem));
                                setActiveRegionId(newId);
                                setIsAddingTextBox(false);
                            }}
                        />
                    )}

                    {/* Hover boxes overlay */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: isAddingTextBox ? 'none' : 'none' }}>
                        {textRegions.map(region => (
                            // Hide the active box when editing
                            region.id === activeRegionId ? null : (
                                <HoverBox
                                    key={region.id}
                                    region={region}
                                    scale={scale}
                                    onClick={handleBoxClick}
                                />
                            )
                        ))}
                    </div>

                    {/* White overlays to hide original PDF text for edited regions */}
                    {textRegions.map(region => {
                        const editedText = extractedText.get(region.id);
                        if (editedText) {
                            return (
                                <div
                                    key={`overlay-${region.id}`}
                                    style={{
                                        position: 'absolute',
                                        left: `${region.x * scale}px`,
                                        top: `${region.y * scale}px`,
                                        width: `${region.width * scale}px`,
                                        height: `${region.height * scale}px`,
                                        backgroundColor: 'white',
                                        zIndex: 998,
                                        pointerEvents: 'auto',  // Block clicks to original PDF text
                                    }}
                                />
                            );
                        }
                        return null;
                    })}

                    {/* Active editable text - positioned exactly at the clicked region */}
                    {activeText && (
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            zIndex: 1000,
                            pointerEvents: 'auto'  // Allow interaction
                        }}>
                            {/* White overlay to hide original PDF text */}
                            <div style={{
                                position: 'absolute',
                                left: `${activeText.x * scale}px`,
                                top: `${(activeText.y - 2) * scale}px`,
                                width: `${(activeText.width + 20) * scale}px`,
                                height: `${(activeText.height + 4) * scale}px`,
                                backgroundColor: 'white',
                                zIndex: 998,  // Behind the input
                            }} />

                            <div style={{ position: 'relative', zIndex: 1001 }}>
                                <EditableText
                                    textItem={activeText}
                                    currentText={activeText.text}
                                    isEditMode={true}
                                    scale={scale}
                                    onTextChange={(_itemId, newText) => {
                                        const textItem = extractedText.get(activeRegionId!);
                                        if (textItem) {
                                            // Preserve ALL font properties when updating text
                                            const updated: TextItem = { 
                                                ...textItem, 
                                                text: newText,
                                                // Explicitly preserve font properties to prevent loss
                                                fontName: textItem.fontName,
                                                originalFontName: textItem.originalFontName,
                                                fontWeight: textItem.fontWeight,
                                                fontStyle: textItem.fontStyle,
                                                fontSize: textItem.fontSize,
                                                color: textItem.color,
                                            };
                                            console.log('📝 Updating text, preserving font:', {
                                                fontName: updated.fontName,
                                                originalFontName: updated.originalFontName,
                                                fontWeight: updated.fontWeight,
                                            });
                                            setExtractedText(prev => new Map(prev).set(activeRegionId!, updated));
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Render edited text (not currently being edited) */}
                    {textRegions.map(region => {
                        const editedText = extractedText.get(region.id);
                        if (editedText && region.id !== activeRegionId) {
                            // Parse font to get family name (without weight suffix) and weight/style
                            // Google Fonts loads fonts by family name only, weight is applied via fontWeight CSS
                            const parsed = parseFontName(editedText.fontName || 'Georgia', editedText.originalFontName);
                            const cssFontFamily = getCssFontFamily(parsed);
                            const fontInfo = {
                                family: cssFontFamily, // Family name only (matches Google Fonts)
                                weight: editedText.fontWeight || parsed.weight, // Weight applied via fontWeight CSS
                                style: editedText.fontStyle || parsed.style, // Style applied via fontStyle CSS
                            };

                            return (
                                <div
                                    key={`edited-${region.id}`}
                                    onClick={() => setActiveRegionId(region.id)}
                                    style={{
                                        position: 'absolute',
                                        left: `${editedText.x * scale}px`,
                                        top: `${editedText.y * scale}px`,
                                        fontSize: `${editedText.fontSize * scale}px`,
                                        fontFamily: fontInfo.family, // Exact fontName preserved
                                        fontWeight: fontInfo.weight,
                                        fontStyle: fontInfo.style, // Preserve font style
                                        color: editedText.color || '#000',
                                        cursor: 'pointer',
                                        padding: '2px',
                                        border: '1px solid transparent',
                                        borderRadius: '2px',
                                        zIndex: 999,
                                        pointerEvents: 'auto',
                                        whiteSpace: 'pre',
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.border = '1px solid rgba(99, 102, 241, 0.6)';
                                        e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.05)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.border = '1px solid transparent';
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    {editedText.text}
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            </div>
        </div>
    );
};
