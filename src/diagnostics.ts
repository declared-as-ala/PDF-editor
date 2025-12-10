/**
 * Diagnostic Script - Run this to check for common issues
 * 
 * Open browser console and run: window.fontManagerDiagnostics()
 */

// Add to window for easy access
(window as any).fontManagerDiagnostics = () => {
    console.log('🔍 Running Font Manager Diagnostics...\n');

    // Check 1: FontManager imported
    try {
        const { fontManager } = require('./lib/FontManager');
        console.log('✅ FontManager imported successfully');
        console.log(`   Registered fonts: ${fontManager.getAllFonts().length}`);
    } catch (e) {
        console.error('❌ FontManager import failed:', e);
    }

    // Check 2: FontFallbackService imported
    try {
        const { fontFallbackService } = require('./lib/FontFallbackService');
        console.log('✅ FontFallbackService imported successfully');
    } catch (e) {
        console.error('❌ FontFallbackService import failed:', e);
    }

    // Check 3: fontkit available
    try {
        const fontkit = require('@pdf-lib/fontkit');
        console.log('✅ @pdf-lib/fontkit available');
    } catch (e) {
        console.error('❌ @pdf-lib/fontkit not found:', e);
    }

    // Check 4: Backend health
    fetch('http://localhost:5000/health')
        .then(r => {
            if (r.ok) {
                console.log('✅ Backend is running');
            } else {
                console.warn('⚠️ Backend returned error:', r.status);
            }
        })
        .catch(e => {
            console.error('❌ Backend not reachable. Run: cd backend && python app.py');
        });

    console.log('\n📊 Diagnostics complete!');
};

console.log('Diagnostics loaded. Run: window.fontManagerDiagnostics()');
