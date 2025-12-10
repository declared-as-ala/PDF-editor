// Type definitions for PDF editing functionality

export interface TextItem {
    id: string;
    text: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize: number;
    fontName: string;  // CSS font-family for browser display
    originalFontName?: string;  // Original subset font name for PDF export (e.g., "MUFUZY+Rubik-Medium")
    fontWeight?: number;   // 300, 400, 700, 900
    fontStyle?: string;    // 'normal' or 'italic'
    letterSpacing?: string; // CSS letter-spacing value
    pageNumber: number;
    transform: number[]; // PDF transformation matrix
    color?: string; // RGB color in CSS format
    textAlign?: 'left' | 'center' | 'right' | 'justify'; // Text alignment
    textDecoration?: string; // 'none' | 'underline' | 'line-through' | 'overline'
}

export interface TextModification {
    itemId: string;
    originalText: string;
    newText: string;
    timestamp: number;
}

export interface EditorState {
    isEditMode: boolean;
    extractedText: Map<number, TextItem[]>; // page number -> text items
    modifications: TextModification[];
    currentPage: number;
}

export interface TextContentItem {
    str: string;
    dir: string;
    width: number;
    height: number;
    transform: number[];
    fontName?: string;
}

export interface TextContent {
    items: TextContentItem[];
    styles: Record<string, any>;
}
