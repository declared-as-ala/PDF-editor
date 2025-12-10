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
        import('./lib/FontManager').then(({ fontManager }) => {
            console.log('✅ FontManager imported successfully');
            console.log(`   Registered fonts: ${fontManager.getAllFonts().length}`);
        }).catch((e) => {
            console.error('❌ FontManager import failed:', e);
        });
    } catch (e) {
        console.error('❌ FontManager import failed:', e);
    }

    // Check 2: FontFallbackService imported
    try {
        import('./lib/FontFallbackService').then(() => {
            console.log('✅ FontFallbackService imported successfully');
        }).catch((e) => {
            console.error('❌ FontFallbackService import failed:', e);
        });
    } catch (e) {
        console.error('❌ FontFallbackService import failed:', e);
    }

    // Check 3: fontkit available
    try {
        import('@pdf-lib/fontkit').then(() => {
            console.log('✅ @pdf-lib/fontkit available');
        }).catch((e) => {
            console.error('❌ @pdf-lib/fontkit not found:', e);
        });
    } catch (e) {
        console.error('❌ @pdf-lib/fontkit not found:', e);
    }

    // Check 4: PDF.js available
    try {
        const pdfjs = (window as any).pdfjsLib;
        if (pdfjs) {
            console.log('✅ PDF.js is available');
        } else {
            console.warn('⚠️ PDF.js not loaded');
        }
    } catch (e) {
        console.error('❌ PDF.js check failed:', e);
    }

    console.log('\n📊 Diagnostics complete!');
};

console.log('Diagnostics loaded. Run: window.fontManagerDiagnostics()');
