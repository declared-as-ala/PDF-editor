"""
Google Fonts Downloader
Downloads Google Fonts TTF files for use in PyMuPDF PDF editing
"""

import requests
import os
from pathlib import Path
import re


class GoogleFontsDownloader:
    """Download and cache Google Fonts TTF files"""
    
    def __init__(self, cache_dir='fonts_cache'):
        self.cache_dir = Path(cache_dir)
        self.cache_dir.mkdir(exist_ok=True)
        print(f"📁 Font cache directory: {self.cache_dir.absolute()}")
    
    def download_font(self, family: str, weight: int = 400) -> Path:
        """
        Download Google Font TTF file
        
        Args:
            family: Font family name (e.g., "Rubik")
            weight: Font weight (e.g., 400, 500, 700)
            
        Returns:
            Path to cached TTF file
            
        Raises:
            ValueError: If font cannot be downloaded
        """
        # Normalize family name
        family = family.strip().replace(' ', '+')
        
        # Check cache first
        cache_path = self.cache_dir / f"{family}-{weight}.ttf"
        if cache_path.exists():
            print(f"✅ Using cached font: {cache_path.name}")
            return cache_path
        
        print(f"📥 Downloading Google Font: {family} {weight}...")
        
        try:
            # Get CSS from Google Fonts
            css_url = f"https://fonts.googleapis.com/css2?family={family}:wght@{weight}&display=swap"
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
            
            css_response = requests.get(css_url, headers=headers, timeout=10)
            css_response.raise_for_status()
            css_text = css_response.text
            
            # Extract TTF URL from CSS
            # Look for url(...) in @font-face rules
            url_match = re.search(r'url\((https://fonts\.gstatic\.com/[^)]+)\)', css_text)
            
            if not url_match:
                raise ValueError(f"Could not find font URL in CSS for {family} {weight}")
            
            font_url = url_match.group(1)
            print(f"  Found font URL: {font_url}")
            
            # Download TTF file
            font_response = requests.get(font_url, timeout=10)
            font_response.raise_for_status()
            
            # Save to cache
            cache_path.write_bytes(font_response.content)
            print(f"✅ Downloaded and cached: {cache_path.name} ({len(font_response.content)} bytes)")
            
            return cache_path
            
        except requests.RequestException as e:
            raise ValueError(f"Failed to download font {family} {weight}: {e}")
        except Exception as e:
            raise ValueError(f"Error processing font {family} {weight}: {e}")
    
    def get_font_path(self, family: str, weight: int = 400) -> Path:
        """
        Get path to font file, downloading if necessary
        
        Args:
            family: Font family name
            weight: Font weight
            
        Returns:
            Path to TTF file
        """
        return self.download_font(family, weight)
