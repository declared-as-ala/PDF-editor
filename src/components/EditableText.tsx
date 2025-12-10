import React, { useState, useRef, useEffect } from 'react';
import type { TextItem } from '../types/types';

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

    // Parse font name to get clean family and weight (memoized to prevent changes)
    const fontInfo = React.useMemo(() => {
        const parseFontName = (fontName: string): { family: string; weight: number } => {
            // Remove subset prefix (e.g., "MUFUZY+Rubik-Medium" -> "Rubik-Medium")
            let cleanName = fontName.replace(/^[A-Z]{6}\+/, '');

            // Extract weight from name
            let weight = 400;
            if (cleanName.includes('Bold')) {
                weight = 700;
                cleanName = cleanName.replace(/[-\s]?Bold/i, '');
            } else if (cleanName.includes('Medium')) {
                weight = 500;
                cleanName = cleanName.replace(/[-\s]?Medium/i, '');
            } else if (cleanName.includes('Light')) {
                weight = 300;
                cleanName = cleanName.replace(/[-\s]?Light/i, '');
            } else if (cleanName.includes('Regular')) {
                cleanName = cleanName.replace(/[-\s]?Regular/i, '');
            }

            return { family: cleanName.trim(), weight };
        };

        return parseFontName(textItem.fontName || 'Georgia');
    }, [textItem.fontName]);

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
                    fontFamily: fontInfo.family,
                    fontWeight: fontInfo.weight,
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
