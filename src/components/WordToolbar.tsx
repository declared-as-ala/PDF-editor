import React, { useState } from 'react';
import type { TextItem } from '../types/types';

interface WordToolbarProps {
    textItem: TextItem | null;
    onFontChange: (fontName: string, fontWeight: number, fontStyle: string) => void;
    onTextColorChange: (color: string) => void;
    onAlignmentChange: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
    onUnderlineChange: (underline: boolean) => void;
    onFontSizeChange: (size: number) => void;
}

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

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 72];

const COLORS = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
    '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0', '#808080',
    '#FFA500', '#FFC0CB', '#A52A2A', '#FFD700', '#ADFF2F', '#FF1493', '#00CED1', '#1E90FF',
];

export const WordToolbar: React.FC<WordToolbarProps> = ({
    textItem,
    onFontChange,
    onTextColorChange,
    onAlignmentChange,
    onUnderlineChange,
    onFontSizeChange,
}) => {
    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showAlignmentMenu, setShowAlignmentMenu] = useState(false);

    if (!textItem) {
        return (
            <div className="word-toolbar">
                <div className="word-toolbar-placeholder">Select text to format</div>
            </div>
        );
    }

    const getCurrentFontFamily = (): string => {
        if (!textItem.fontName) return 'Arial';
        const fontName = textItem.fontName.split(',')[0].trim();
        const cleanName = fontName.replace(/^["']|["']$/g, '');
        const matched = AVAILABLE_FONTS.find(f => 
            f.name.toLowerCase() === cleanName.toLowerCase() ||
            f.family.toLowerCase().includes(cleanName.toLowerCase())
        );
        return matched ? matched.name : cleanName;
    };

    const currentFontFamily = getCurrentFontFamily();
    const currentSize = textItem.fontSize || 12;
    const currentWeight = textItem.fontWeight || 400;
    const currentStyle = textItem.fontStyle || 'normal';
    const isBold = currentWeight >= 700;
    const isItalic = currentStyle === 'italic';
    const isUnderline = textItem.textDecoration === 'underline';
    const currentColor = textItem.color || '#000000';
    const currentAlign = textItem.textAlign || 'left';

    const handleFontFamilyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedFont = AVAILABLE_FONTS.find(f => f.name === e.target.value);
        if (selectedFont) {
            onFontChange(selectedFont.family, currentWeight, currentStyle);
        }
    };

    const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const size = parseInt(e.target.value);
        onFontSizeChange(size);
    };

    const handleBoldClick = () => {
        onFontChange(textItem.fontName || 'Arial', isBold ? 400 : 700, currentStyle);
    };

    const handleItalicClick = () => {
        onFontChange(textItem.fontName || 'Arial', currentWeight, isItalic ? 'normal' : 'italic');
    };

    const handleUnderlineClick = () => {
        onUnderlineChange(!isUnderline);
    };

    const handleColorSelect = (color: string) => {
        onTextColorChange(color);
        setShowColorPicker(false);
    };

    const handleAlignmentSelect = (alignment: 'left' | 'center' | 'right' | 'justify') => {
        onAlignmentChange(alignment);
        setShowAlignmentMenu(false);
    };

    return (
        <div className="word-toolbar">
            {/* Font Family */}
            <div className="word-toolbar-group">
                <select
                    className="word-toolbar-select word-toolbar-font"
                    value={currentFontFamily}
                    onChange={handleFontFamilyChange}
                >
                    {AVAILABLE_FONTS.map(font => (
                        <option key={font.name} value={font.name}>{font.name}</option>
                    ))}
                </select>
            </div>

            <div className="word-toolbar-separator" />

            {/* Font Size */}
            <div className="word-toolbar-group">
                <select
                    className="word-toolbar-select word-toolbar-size"
                    value={currentSize}
                    onChange={handleFontSizeChange}
                >
                    {FONT_SIZES.map(size => (
                        <option key={size} value={size}>{size}</option>
                    ))}
                </select>
            </div>

            <div className="word-toolbar-separator" />

            {/* Bold, Italic, Underline */}
            <div className="word-toolbar-group">
                <button
                    className={`word-toolbar-btn ${isBold ? 'active' : ''}`}
                    onClick={handleBoldClick}
                    title="Bold (Ctrl+B)"
                >
                    <strong>B</strong>
                </button>
                <button
                    className={`word-toolbar-btn ${isItalic ? 'active' : ''}`}
                    onClick={handleItalicClick}
                    title="Italic (Ctrl+I)"
                >
                    <em>I</em>
                </button>
                <button
                    className={`word-toolbar-btn ${isUnderline ? 'active' : ''}`}
                    onClick={handleUnderlineClick}
                    title="Underline (Ctrl+U)"
                >
                    <u>U</u>
                </button>
            </div>

            <div className="word-toolbar-separator" />

            {/* Text Color */}
            <div className="word-toolbar-group word-toolbar-color-wrapper">
                <button
                    className="word-toolbar-btn word-toolbar-color-btn"
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    title="Text Color"
                >
                    <span className="color-icon">A</span>
                    <div
                        className="color-indicator"
                        style={{ backgroundColor: currentColor }}
                    />
                </button>
                {showColorPicker && (
                    <div className="word-toolbar-color-picker">
                        <div className="color-grid">
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    className="color-swatch"
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleColorSelect(color)}
                                    title={color}
                                />
                            ))}
                        </div>
                        <input
                            type="color"
                            className="color-input"
                            value={currentColor}
                            onChange={(e) => handleColorSelect(e.target.value)}
                        />
                    </div>
                )}
            </div>

            <div className="word-toolbar-separator" />

            {/* Alignment */}
            <div className="word-toolbar-group word-toolbar-alignment-wrapper">
                <button
                    className="word-toolbar-btn"
                    onClick={() => setShowAlignmentMenu(!showAlignmentMenu)}
                    title="Alignment"
                >
                    {currentAlign === 'left' && '☰'}
                    {currentAlign === 'center' && '☷'}
                    {currentAlign === 'right' && '☱'}
                    {currentAlign === 'justify' && '☲'}
                </button>
                {showAlignmentMenu && (
                    <div className="word-toolbar-alignment-menu">
                        <button
                            onClick={() => handleAlignmentSelect('left')}
                            title="Align Left"
                            className={currentAlign === 'left' ? 'active' : ''}
                        >
                            ☰
                        </button>
                        <button
                            onClick={() => handleAlignmentSelect('center')}
                            title="Align Center"
                            className={currentAlign === 'center' ? 'active' : ''}
                        >
                            ☷
                        </button>
                        <button
                            onClick={() => handleAlignmentSelect('right')}
                            title="Align Right"
                            className={currentAlign === 'right' ? 'active' : ''}
                        >
                            ☱
                        </button>
                        <button
                            onClick={() => handleAlignmentSelect('justify')}
                            title="Justify"
                            className={currentAlign === 'justify' ? 'active' : ''}
                        >
                            ☲
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

