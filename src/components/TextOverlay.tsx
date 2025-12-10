import React from 'react';
import type { TextItem } from '../types/types';
import { EditableText } from './EditableText';

interface TextOverlayProps {
    textItems: TextItem[];
    scale: number;
    isEditMode: boolean;
    getCurrentText: (itemId: string) => string;
    onTextChange: (itemId: string, newText: string) => void;
}

export const TextOverlay: React.FC<TextOverlayProps> = ({
    textItems,
    scale,
    isEditMode,
    getCurrentText,
    onTextChange,
}) => {
    return (
        <div
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: isEditMode ? 'auto' : 'none',
                zIndex: isEditMode ? 10 : 1,
            }}
            className="text-overlay"
        >
            {textItems.map((item) => (
                <EditableText
                    key={item.id}
                    textItem={item}
                    currentText={getCurrentText(item.id)}
                    scale={scale}
                    isEditMode={isEditMode}
                    onTextChange={onTextChange}
                />
            ))}
        </div>
    );
};
