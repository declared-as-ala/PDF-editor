"""
PDF Editor Backend - PyMuPDF-based PDF modification endpoint
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import fitz  # PyMuPDF
import base64
import io
import os
from datetime import datetime
from google_fonts_downloader import GoogleFontsDownloader

app = Flask(__name__)
CORS(app)

# Initialize Google Fonts downloader
font_downloader = GoogleFontsDownloader()

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

@app.route('/api/extract-fonts', methods=['POST'])
def extract_fonts():
    """Extract font information from PDF"""
    try:
        if 'pdf' not in request.files:
            return jsonify({'error': 'No PDF file provided'}), 400

        pdf_file = request.files['pdf']
        pdf_bytes = pdf_file.read()
        
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        fonts = {}
        metadata = {}
        
        for page_num in range(len(doc)):
            page = doc[page_num]
            font_list = page.get_fonts(full=True)
            
            for font_info in font_list:
                xref = font_info[0]
                font_name = font_info[3]
                font_type = font_info[1]
                
                if font_name not in fonts:
                    try:
                        font_buffer = doc.extract_font(xref)
                        if font_buffer and font_buffer[0]:
                            font_data = font_buffer[-1]
                            
                            if font_data:
                                font_base64 = base64.b64encode(font_data).decode('utf-8')
                                fonts[font_name] = font_base64
                                metadata[font_name] = {
                                    'type': font_type,
                                    'ext': font_buffer[1] if len(font_buffer) > 1 else 'bin',
                                    'size': len(font_data),
                                    'pages': [page_num + 1]
                                }
                    except Exception as e:
                        print(f"⚠️ Could not extract font {font_name}: {e}")
        
        doc.close()
        
        return jsonify({
            'fonts': fonts,
            'metadata': metadata
        })
        
    except Exception as e:
        print(f"❌ Error extracting fonts: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/edit-pdf', methods=['POST'])
def edit_pdf():
    """
    Edit PDF text using PyMuPDF
    Receives: PDF file + list of text edits
    Returns: Modified PDF
    """
    try:
        if 'pdf' not in request.files:
            return jsonify({'error': 'No PDF file provided'}), 400
        
        pdf_file = request.files['pdf']
        pdf_bytes = pdf_file.read()
        
        # Get edit instructions from request
        edits_json = request.form.get('edits')
        if not edits_json:
            return jsonify({'error': 'No edits provided'}), 400
        
        import json
        edits = json.loads(edits_json)
        
        print(f"📝 Received {len(edits)} text edits")
        
        # Open PDF
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        
        # Process each edit
        for edit in edits:
            page_num = edit['pageNumber'] - 1  # Convert to 0-indexed
            page = doc[page_num]
            
            # Get edit details
            old_text = edit.get('originalText', '')
            new_text = edit['newText']
            x = edit['x']
            y = edit['y']
            width = edit['width']
            height = edit['height']
            font_size = edit['fontSize']
            color_rgb = edit.get('color', 'rgb(0, 0, 0)')
            font_name = edit.get('fontName', '')
            
            print(f"  Editing: '{old_text}' → '{new_text}' at ({x}, {y})")
            
            # Parse RGB color
            import re
            color_match = re.match(r'rgb\((\d+),\s*(\d+),\s*(\d+)\)', color_rgb)
            if color_match:
                r = int(color_match.group(1)) / 255.0
                g = int(color_match.group(2)) / 255.0
                b = int(color_match.group(3)) / 255.0
                color = (r, g, b)
            else:
                color = (0, 0, 0)
            
            # Parse font family and weight from fontName
            # e.g., "Rubik-Bold, Georgia, serif" -> family="Rubik", weight=700
            font_name = edit.get('fontName', '')
            font_weight = edit.get('fontWeight', 400)
            
            print(f"  Raw fontName: '{font_name}', fontWeight: {font_weight}")
            
            # Extract family from font name (first part before comma)
            family = font_name.split(',')[0].split('-')[0].strip()
            
            print(f"  Parsed family: '{family}'")
            
            # Cover original text with white rectangle
            rect = fitz.Rect(x, y, x + width, y + height)
            page.draw_rect(rect, color=(1, 1, 1), fill=(1, 1, 1))
            
            # Insert new text
            # PyMuPDF uses bottom-left positioning, adjust Y coordinate
            text_y = y + height - (font_size * 0.2)  # Adjust for baseline
            
            # Try to download and use Google Font
            try:
                if family and family not in ['Georgia', 'serif', 'sans-serif', 'Arial', 'Helvetica']:
                    print(f"  Downloading Google Font: {family} {font_weight}")
                    font_path = font_downloader.download_font(family, font_weight)
                    
                    # Insert text with downloaded Google Font
                    page.insert_text(
                        (x, text_y),
                        new_text,
                        fontsize=font_size,
                        fontfile=str(font_path),
                        color=color,
                        render_mode=0
                    )
                    print(f"  ✅ Used Google Font: {family} {font_weight}")
                else:
                    # Use Base14 font for generic fonts
                    fontname = "Helvetica-Bold" if font_weight >= 700 else "Helvetica"
                    page.insert_text(
                        (x, text_y),
                        new_text,
                        fontsize=font_size,
                        fontname=fontname,
                        color=color,
                        render_mode=0
                    )
                    print(f"  ✅ Used Base14 font: {fontname}")
                    
            except Exception as e:
                # Fallback to Helvetica if Google Font download fails
                print(f"  ⚠️ Font download failed, using Helvetica: {e}")
                fontname = "Helvetica-Bold" if font_weight >= 700 else "Helvetica"
                page.insert_text(
                    (x, text_y),
                    new_text,
                    fontsize=font_size,
                    fontname=fontname,
                    color=color,
                    render_mode=0
                )

        
        # Save modified PDF to bytes
        output_buffer = io.BytesIO()
        doc.save(output_buffer)
        doc.close()
        output_buffer.seek(0)
        
        print(f"✅ PDF modified successfully")
        
        # Return modified PDF
        return send_file(
            output_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'edited_{datetime.now().strftime("%Y%m%d_%H%M%S")}.pdf'
        )
        
    except Exception as e:
        print(f"❌ Error editing PDF: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
