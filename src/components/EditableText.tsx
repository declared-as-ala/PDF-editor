import React, { useState, useRef, useEffect } from 'react';
import type { TextItem } from '../types/types';
import { parseFontName, getCssFontFamily } from '../lib/FontParser';

interface EditableTextProps {
    textItem: TextItem;
    currentText: string;
    scale: number;
    isEditMode: boolean;
    onTextChange: (itemId: string, newText: string) => void;
}

export const EditableText: React.FC<EditableTextProps> = ({
    textItem,
    currentText,
    scale,
    isEditMode,
    onTextChange,
}) => {
    const [isEditing, setIsEditing] = useState(true);
    const [editValue, setEditValue] = useState(currentText);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setEditValue(currentText);
    }, [currentText]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.select();
        }
    }, [isEditing]);

    const handleClick = () => {
        if (isEditMode && !isEditing) {
            setIsEditing(true);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setEditValue(newValue);
        onTextChange(textItem.id, newValue);
    };

    const handleBlur = () => {
        setIsEditing(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            setIsEditing(false);
        } else if (e.key === 'Escape') {
            setEditValue(currentText);
            setIsEditing(false);
        }
    };

    // Parse font to get family name (without weight suffix) and weight/style
    // Google Fonts loads fonts by family name only, weight is applied via fontWeight CSS
    const fontInfo = React.useMemo(() => {
        const parsed = parseFontName(textItem.fontName || 'Georgia', textItem.originalFontName);
        
        // Get CSS font-family using only the family name (e.g., "Rubik" not "Rubik-Medium")
        // This matches how Google Fonts loads fonts
        const cssFontFamily = getCssFontFamily(parsed);
        
        const info = {
            family: cssFontFamily, // Family name only (matches Google Fonts)
            weight: textItem.fontWeight || parsed.weight, // Weight applied via fontWeight CSS
            style: textItem.fontStyle || parsed.style, // Style applied via fontStyle CSS
        };
        
        // Debug log to verify font preservation
        if (import.meta.env.DEV) {
            console.log('🎨 EditableText font info:', {
                fontName: textItem.fontName,
                originalFontName: textItem.originalFontName,
                parsedFamily: parsed.family,
                displayFamily: info.family,
                weight: info.weight,
                style: info.style,
            });
        }
        
        return info;
    }, [textItem.fontName, textItem.originalFontName, textItem.fontWeight, textItem.fontStyle]);

    return (
        <div
            style={{
                position: 'absolute',
                left: `${textItem.x * scale}px`,
                top: `${textItem.y * scale}px`,
                width: `${textItem.width * scale}px`,
                height: `${textItem.height * scale}px`,
                cursor: isEditMode ? 'text' : 'default',
                pointerEvents: isEditMode ? 'all' : 'none',
            }}
            onClick={handleClick}
        >
            <input
                ref={inputRef}
                type="text"
                value={editValue}
                onChange={handleChange}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    outline: isEditing ? '2px solid #4285f4' : 'none',
                    background: isEditing ? 'rgba(66, 133, 244, 0.1)' : 'transparent',
                    fontFamily: fontInfo.family, // Exact fontName preserved
                    fontWeight: fontInfo.weight,
                    fontStyle: fontInfo.style, // Preserve font style
                    fontSize: `${textItem.fontSize * scale}px`,
                    color: textItem.color || 'rgb(0, 0, 0)',
                    padding: 0,
                    margin: 0,
                    resize: 'none',
                    boxSizing: 'border-box',
                }}
            />
        </div>
    );
};
