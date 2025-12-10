import React from 'react';
import type { TextItem } from '../types/types';

interface FontSelectorProps {
    textItem: TextItem | null;
    onFontChange: (fontName: string, fontWeight: number, fontStyle: string) => void;
    onDragStart?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

// Popular Google Fonts available
const AVAILABLE_FONTS = [
    { name: 'Arial', family: 'Arial, Helvetica, sans-serif' },
    { name: 'Helvetica', family: 'Arial, Helvetica, sans-serif' },
    { name: 'Times New Roman', family: '"Times New Roman", Times, serif' },
    { name: 'Georgia', family: 'Georgia, serif' },
    { name: 'Calibri', family: 'Calibri, "Segoe UI", Arial, sans-serif' },
    { name: 'Roboto', family: 'Roboto, sans-serif' },
    { name: 'Open Sans', family: '"Open Sans", sans-serif' },
    { name: 'Lato', family: 'Lato, sans-serif' },
    { name: 'Montserrat', family: 'Montserrat, sans-serif' },
    { name: 'Poppins', family: 'Poppins, sans-serif' },
    { name: 'Rubik', family: 'Rubik, sans-serif' },
    { name: 'Inter', family: 'Inter, sans-serif' },
    { name: 'Playfair Display', family: '"Playfair Display", serif' },
    { name: 'Merriweather', family: 'Merriweather, serif' },
    { name: 'Source Sans Pro', family: '"Source Sans Pro", sans-serif' },
];

const FONT_WEIGHTS = [
    { label: 'Thin', value: 100 },
    { label: 'Light', value: 300 },
    { label: 'Regular', value: 400 },
    { label: 'Medium', value: 500 },
    { label: 'Semi Bold', value: 600 },
    { label: 'Bold', value: 700 },
    { label: 'Extra Bold', value: 800 },
    { label: 'Black', value: 900 },
];

const FONT_STYLES = [
    { label: 'Normal', value: 'normal' },
    { label: 'Italic', value: 'italic' },
];

export const FontSelector: React.FC<FontSelectorProps> = ({ textItem, onFontChange, onDragStart }) => {
    if (!textItem) {
        return (
            <div className="font-selector">
                <div className="font-selector-placeholder">
                    Select text to edit font
                </div>
            </div>
        );
    }

    // Parse current font to get family name
    const getCurrentFontFamily = (): string => {
        if (!textItem.fontName) return 'Arial';
        
        // Extract family name from CSS font-family string
        const fontName = textItem.fontName.split(',')[0].trim();
        // Remove quotes
        const cleanName = fontName.replace(/^["']|["']$/g, '');
        
        // Find matching font in our list
        const matched = AVAILABLE_FONTS.find(f => 
            f.name.toLowerCase() === cleanName.toLowerCase() ||
            f.family.toLowerCase().includes(cleanName.toLowerCase())
        );
        
        return matched ? matched.name : cleanName;
    };

    const currentFontFamily = getCurrentFontFamily();
    const currentWeight = textItem.fontWeight || 400;
    const currentStyle = textItem.fontStyle || 'normal';

    const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedFont = AVAILABLE_FONTS.find(f => f.name === e.target.value);
        if (selectedFont) {
            onFontChange(selectedFont.family, currentWeight, currentStyle);
        }
    };

    const handleWeightChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const weight = parseInt(e.target.value);
        onFontChange(textItem.fontName, weight, currentStyle);
    };

    const handleStyleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const style = e.target.value;
        onFontChange(textItem.fontName, currentWeight, style);
    };

    const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
        // Only start dragging if clicking on the header itself, not on child elements like selects
        const target = e.target as HTMLElement;
        if (target.closest('select') || target.closest('option') || target.closest('button')) {
            return; // Don't drag if clicking on interactive elements
        }
        e.preventDefault();
        if (onDragStart) {
            onDragStart(e);
        }
    };

    return (
        <div className="font-selector">
            <div 
                className="font-selector-header"
                onMouseDown={handleHeaderMouseDown}
            >
                <span className="font-selector-title">🎨 Font Style</span>
                <span className="font-selector-drag-icon" title="Drag to move">⋮⋮</span>
            </div>
            
            <div className="font-selector-controls">
                <div className="font-control-group">
                    <label className="font-control-label">Family</label>
                    <select
                        className="font-select"
                        value={currentFontFamily}
                        onChange={handleFontFamilyChange}
                    >
                        {AVAILABLE_FONTS.map(font => (
                            <option key={font.name} value={font.name}>
                                {font.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="font-control-group" style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem' }}>
                    <div style={{ flex: 1 }}>
                        <label className="font-control-label">Weight</label>
                        <select
                            className="font-select"
                            value={currentWeight}
                            onChange={handleWeightChange}
                        >
                            {FONT_WEIGHTS.map(weight => (
                                <option key={weight.value} value={weight.value}>
                                    {weight.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div style={{ flex: 1 }}>
                        <label className="font-control-label">Style</label>
                        <select
                            className="font-select"
                            value={currentStyle}
                            onChange={handleStyleChange}
                        >
                            {FONT_STYLES.map(style => (
                                <option key={style.value} value={style.value}>
                                    {style.label}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="font-preview">
                <div 
                    className="font-preview-text"
                    style={{
                        fontFamily: textItem.fontName || 'Arial, sans-serif',
                        fontWeight: currentWeight,
                        fontStyle: currentStyle,
                        fontSize: `${Math.min(textItem.fontSize, 16)}px`,
                        color: textItem.color || '#fff',
                    }}
                >
                    {textItem.text.substring(0, 30) || 'Preview'}...
                </div>
            </div>
        </div>
    );
};

