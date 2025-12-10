# Python Backend for Font Extraction

This backend extracts embedded fonts from PDFs using PyMuPDF.

## Setup

### 1. Install Python
Make sure Python 3.8+ is installed:
```bash
python --version
```

### 2. Create Virtual Environment (Recommended)
```bash
cd backend
python -m venv venv
```

### 3. Activate Virtual Environment

**Windows:**
```bash
venv\Scripts\activate
```

**Mac/Linux:**
```bash
source venv/bin/activate
```

### 4. Install Dependencies
```bash
pip install -r requirements.txt
```

### 5. Run the Server
```bash
python app.py
```

The server will start on `http://localhost:5000`

## API Endpoints

### Health Check
```
GET http://localhost:5000/health
```

### Extract Fonts
```
POST http://localhost:5000/extract-fonts
Content-Type: multipart/form-data

Body:
- pdf: <PDF file>
```

**Response:**
```json
{
  "success": true,
  "fonts": {
    "FontName1": "base64EncodedFontData...",
    "FontName2": "base64EncodedFontData..."
  },
  "metadata": {
    "FontName1": {
      "type": "TrueType",
      "ext": ".ttf",
      "size": 45678,
      "pages": [1, 2, 3]
    }
  },
  "total_fonts": 2
}
```

## Troubleshooting

### Port Already in Use
If port 5000 is already in use, change it in `app.py`:
```python
app.run(debug=True, port=5001)  # Use different port
```

### CORS Issues
CORS is enabled by default. If you still have issues, check the frontend is calling `http://localhost:5000`

## Development

The server runs in debug mode by default, which means:
- Auto-reload on code changes
- Detailed error messages
- Should NOT be used in production
