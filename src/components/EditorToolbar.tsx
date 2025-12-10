import React from 'react';

interface EditorToolbarProps {
    isEditMode: boolean;
    isExtracting: boolean;
    hasModifications: boolean;
    onToggleEditMode: () => void;
    onExtractText: () => void;
    onUndo: () => void;
    onReset: () => void;
    onExport: () => void;
    onAddTextBox?: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
    isEditMode,
    isExtracting,
    hasModifications,
    onToggleEditMode,
    onExtractText,
    onUndo,
    onReset,
    onExport,
    onAddTextBox,
}) => {
    return (
        <div className="editor-toolbar">
            <div className="toolbar-section">
                <button
                    onClick={onExtractText}
                    disabled={isExtracting}
                    className="toolbar-btn primary"
                    title="Extract text from PDF"
                >
                    {isExtracting ? '⏳ Extracting...' : '🔍 Extract Text'}
                </button>

                <button
                    onClick={onToggleEditMode}
                    className={`toolbar-btn ${isEditMode ? 'active' : ''}`}
                    title="Toggle edit mode"
                >
                    {isEditMode ? '✏️ Exit Edit Mode' : '✏️ Enter Edit Mode'}
                </button>

                {onAddTextBox && (
                    <button
                        onClick={onAddTextBox}
                        className="toolbar-btn"
                        title="Add new text box"
                    >
                        ➕ Add Text Box
                    </button>
                )}
            </div>

            <div className="toolbar-section">
                <button
                    onClick={onUndo}
                    disabled={!hasModifications}
                    className="toolbar-btn"
                    title="Undo last change"
                >
                    ↶ Undo
                </button>

                <button
                    onClick={onReset}
                    disabled={!hasModifications}
                    className="toolbar-btn"
                    title="Reset all changes"
                >
                    🔄 Reset
                </button>

                <button
                    onClick={onExport}
                    disabled={!hasModifications}
                    className="toolbar-btn success"
                    title="Export edited PDF"
                >
                    💾 Export PDF
                </button>
            </div>
        </div>
    );
};
