import React, { useState, useEffect } from 'react';
import { Document, Page } from 'react-pdf';
import '../lib/pdfConfig';
import { HoverBox } from './HoverBox';
import { EditableText } from './EditableText';
import { EditorToolbar } from './EditorToolbar';
import { TextExtractor } from '../lib/TextExtractor';
import { BackendFontService } from '../lib/BackendFontService';
import { fontManager } from '../lib/FontManager';
import { parseFontName, getCssFontFamily, getBackendFontName } from '../lib/FontParser';
import { FontSelector } from './FontSelector';
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
    const [extractedFonts, setExtractedFonts] = useState<Map<string, Uint8Array>>(new Map());  // Fonts from backend

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

    const onDocumentLoadSuccess = async ({ numPages }: { numPages: number }) => {
        setNumPages(numPages);
        setCurrentPage(1);

        // Get the PDF document
        if (file) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const uint8Array = new Uint8Array(arrayBuffer);
                const loadingTask = (window as any).pdfjsLib.getDocument({ data: uint8Array });
                const pdf = await loadingTask.promise;
                setPdfDocument(pdf);

                // Extract regions for first page
                const regions = await TextExtractor.extractTextRegions(pdf, 1);
                setTextRegions(regions);

                // Extract fonts from backend
                console.log('🔄 Extracting fonts from PDF via backend...');
                const backendService = new BackendFontService();

                const isBackendAvailable = await backendService.checkBackendHealth();
                if (!isBackendAvailable) {
                    console.warn('⚠️ Backend is not available. Run: cd backend && python app.py');
                } else {
                    try {
                        const fonts = await backendService.extractFonts(file);
                        setExtractedFonts(fonts);
                        console.log(`✅ Extracted ${fonts.size} fonts from backend`);
                    } catch (error) {
                        console.error('❌ Font extraction failed:', error);
                    }
                }
            } catch (error) {
                console.error('Error loading PDF document:', error);
            }
        }
    };

    // Download full fonts from Google Fonts for browser display AND PDF export
    useEffect(() => {
        const loadFonts = async () => {
            console.log('🌐 Loading fonts for PDF display and editing...');

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

            // Also load fonts from extracted PDF fonts
            if (extractedFonts.size > 0) {
                console.log('🌐 Loading fonts from PDF...');
                
                // Get unique font families and collect all weights
                const fontFamilies = new Map<string, Set<number>>();

                for (const [name] of extractedFonts.entries()) {
                    const { family, weights } = fontLoader.parseFontInfo(name);
                    if (!fontFamilies.has(family)) {
                        fontFamilies.set(family, new Set());
                    }
                    weights.forEach(w => fontFamilies.get(family)!.add(w));
                }

                // Load each family once with all its weights for browser display
                for (const [family, weightsSet] of fontFamilies.entries()) {
                    const weights = Array.from(weightsSet).sort((a, b) => a - b);
                    try {
                        await fontLoader.loadGoogleFont(family, weights);
                        console.log(`✅ Loaded PDF font: ${family}`);

                        // Download full font files from Google Fonts for PDF export
                        for (const weight of weights) {
                            try {
                                const fontBytes = await fontLoader.downloadGoogleFontFile(family, weight);
                                if (fontBytes) {
                                    const fontName = `${family}-${weight}`;
                                    await fontManager.registerFont(fontName, fontBytes, 'google');
                                    console.log(`✅ Registered Google Font "${fontName}" for PDF export`);
                                }
                            } catch (error) {
                                console.warn(`⚠️ Failed to download/register ${family} ${weight}:`, error);
                            }
                        }
                    } catch (error) {
                        console.warn(`⚠️ Failed to load PDF font ${family}:`, error);
                    }
                }
            }

            console.log(`✅ All fonts loaded for editing and PDF export`);
        };

        loadFonts();
    }, [extractedFonts]);

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

    if (!file) return null;

    const activeText: TextItem | null = activeRegionId ? (extractedText.get(activeRegionId) ?? null) : null;
    console.log('🎯 Active region ID:', activeRegionId);
    console.log('📝 Active text:', activeText);

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

    const handleExportPDF = async () => {
        if (!file || extractedText.size === 0) {
            alert('No edits to export');
            return;
        }

        try {
            console.log('📦 Sending edits to backend for PDF modification...');

            // Prepare edit instructions
            const edits = Array.from(extractedText.values()).map(textItem => {
                // Parse font to get proper backend font name
                const parsed = parseFontName(textItem.fontName || 'Georgia', textItem.originalFontName);
                const backendFontName = getBackendFontName(parsed);
                
                return {
                    pageNumber: textItem.pageNumber,
                    originalText: '', // Not needed for backend
                    newText: textItem.text,
                    x: textItem.x,
                    y: textItem.y,
                    width: textItem.width,
                    height: textItem.height,
                    fontSize: textItem.fontSize,
                    fontName: backendFontName, // Use originalFontName if available, otherwise cleanName
                    fontWeight: parsed.weight || textItem.fontWeight || 400,
                    color: textItem.color
                };
            });

            console.log(`📝 Sending ${edits.length} edits to backend`);

            // Send to backend
            const formData = new FormData();
            formData.append('pdf', file);
            formData.append('edits', JSON.stringify(edits));

            const response = await fetch('http://localhost:5000/api/edit-pdf', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error(`Backend error: ${response.statusText}`);
            }

            // Download the modified PDF
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `edited_${new Date().getTime()}.pdf`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            console.log('✅ PDF exported successfully');
            alert('PDF exported successfully!');

        } catch (error) {
            console.error('❌ Error exporting PDF:', error);
            alert(`Error exporting PDF: ${error}`);
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

            {/* Font Selector - shows when text is selected */}
            <div className="font-selector-container">
                <FontSelector
                    textItem={activeText}
                    onFontChange={handleFontChange}
                />
            </div>

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

                    {/* Hover boxes overlay */}
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
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
