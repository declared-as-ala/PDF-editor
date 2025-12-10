# PDF Editor

A modern, full-featured PDF editor built with React and TypeScript. Edit text in PDFs with accurate font preservation, style customization, and seamless export functionality - **100% frontend-only, no backend required!**

![PDF Editor](https://img.shields.io/badge/PDF-Editor-blue)
![React](https://img.shields.io/badge/React-19.2.0-61dafb)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9.3-3178c6)
![Frontend Only](https://img.shields.io/badge/Frontend-Only-green)

## ✨ Features

### Core Functionality
- ✅ **PDF Text Editing** - Click and edit any text in your PDF
- ✅ **Font Preservation** - Maintains original fonts and styles accurately
- ✅ **Font Selector** - Choose from 15+ fonts with customizable weights and styles
- ✅ **Real-time Preview** - See your changes instantly as you type
- ✅ **PDF Export** - Export edited PDFs with preserved formatting (frontend-only)
- ✅ **Multi-page Support** - Navigate and edit across multiple pages
- ✅ **Zoom Controls** - Zoom from 50% to 300% for precise editing
- ✅ **No Backend Required** - Everything runs in your browser!

### Advanced Features
- 🎨 **Smart Font Matching** - Automatically detects and preserves PDF fonts
- 🔤 **Google Fonts Integration** - Loads fonts dynamically for editing
- 📝 **Text Extraction** - Accurate text extraction with position and style data
- 🎯 **Hover Boxes** - Visual indicators for editable text regions
- 💾 **Client-side Processing** - All PDF editing happens in the browser
- 🌐 **Cross-platform** - Works on Windows, macOS, and Linux

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/declared-as-ala/PDF-editor.git
cd pdf-editor
```

2. **Install dependencies**
```bash
npm install
```

### Running the Application

**Start the development server**
```bash
npm run dev
```

**Open your browser**
Navigate to `http://localhost:5173` and start editing PDFs!

That's it! No backend setup needed - everything runs in your browser.

## 📖 Usage Guide

### Editing Text
1. Upload a PDF file using the upload button
2. Click on any text region you want to edit
3. The text becomes editable - type your changes
4. Use the Font Selector panel (appears on the right) to change:
   - Font family (Arial, Times New Roman, Roboto, etc.)
   - Font weight (Thin to Black)
   - Font style (Normal or Italic)
5. Click outside the text or press Enter to finish editing

### Exporting PDF
1. Make your edits
2. Click the "Export PDF" button in the toolbar
3. Your edited PDF will download automatically

## 🏗️ Project Structure

```
pdf-editor/
├── src/
│   ├── components/
│   │   ├── PDFViewer.tsx      # Main PDF viewer and editor
│   │   ├── PDFUploader.tsx    # File upload component
│   │   ├── EditableText.tsx   # Text editing component
│   │   ├── FontSelector.tsx   # Font customization panel
│   │   ├── EditorToolbar.tsx  # Toolbar with controls
│   │   └── HoverBox.tsx       # Hover indicators
│   ├── lib/
│   │   ├── FontParser.ts      # Font name parsing utility
│   │   ├── FontManager.ts     # Font registry and management
│   │   ├── FontLoader.ts      # Google Fonts loader
│   │   ├── TextExtractor.ts   # PDF text extraction
│   │   └── PDFEditor.ts       # PDF manipulation (pdf-lib)
│   ├── types/
│   │   └── types.ts           # TypeScript type definitions
│   └── App.tsx                # Main application component
└── README.md                  # This file
```

## 🛠️ Tech Stack

### Frontend
- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **react-pdf** - PDF rendering
- **pdfjs-dist** - PDF.js library for text extraction
- **pdf-lib** - PDF manipulation (client-side)

## 🎨 Available Fonts

The editor supports 15+ fonts including:
- **Serif**: Times New Roman, Georgia, Playfair Display, Merriweather
- **Sans-serif**: Arial, Helvetica, Roboto, Open Sans, Lato, Montserrat, Poppins, Rubik, Inter, Source Sans Pro
- **System**: Calibri

All fonts support multiple weights (100-900) and styles (normal/italic).

## 🔧 Configuration

### Development
The app runs on `http://localhost:5173` by default. To change the port, edit `vite.config.ts`:
```typescript
server: {
  port: 5173
}
```

### Build for Production
```bash
npm run build
```

The built files will be in the `dist` directory, ready to deploy to any static hosting service.

## 🐛 Troubleshooting

### Fonts not displaying correctly
- Check browser console for font loading errors
- Verify Google Fonts are accessible (check internet connection)
- Try refreshing the page

### PDF export fails
- Check browser console for errors
- Verify the PDF file is not corrupted
- Make sure you have made at least one edit before exporting

### Text not editable
- Click directly on the text region
- Ensure the PDF has selectable text (not scanned images)
- Check browser console for errors

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👨‍💻 Author

**Ala**
- GitHub: [@declared-as-ala](https://github.com/declared-as-ala)

## 🙏 Acknowledgments

- [react-pdf](https://github.com/wojtekmaj/react-pdf) - PDF rendering library
- [pdf-lib](https://github.com/Hopding/pdf-lib) - PDF manipulation library
- [Google Fonts](https://fonts.google.com/) - Font library

## 📞 Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

Made with ❤️ using React, TypeScript, and pdf-lib - **100% frontend, zero backend!**
