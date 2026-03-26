const { chromium } = require('playwright');

async function correctedVisualTest() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 375, height: 812 }
    });
    const page = await context.newPage();
    
    // Listen for console messages
    const consoleLogs = [];
    page.on('console', msg => {
        consoleLogs.push({ type: msg.type(), text: msg.text() });
        console.log(`${msg.type().toUpperCase()}: ${msg.text()}`);
    });
    
    console.log('🚨 CORRECTED VISUAL TEST - Production Site');
    console.log('Testing: https://bucketball-2028-d9wbibvuz-mintin.vercel.app');
    
    try {
        // Navigate to production site
        await page.goto('https://bucketball-2028-d9wbibvuz-mintin.vercel.app', { 
            waitUntil: 'networkidle' 
        });
        
        // Wait for loading to complete and game to initialize
        await page.waitForTimeout(5000);
        
        // Take initial screenshot
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const initialScreenshot = `corrected-test-${timestamp}-initial.png`;
        await page.screenshot({ path: initialScreenshot, fullPage: true });
        console.log(`✅ Initial screenshot: ${initialScreenshot}`);
        
        // Check canvas and game state with correct ID
        const gameState = await page.evaluate(() => {
            const canvas = document.getElementById('game-canvas'); // CORRECTED ID
            if (!canvas) return { error: 'No canvas found with id game-canvas' };
            
            const ctx = canvas.getContext('2d');
            const rect = canvas.getBoundingClientRect();
            
            // Check if canvas has actual visual content
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            
            let nonTransparent = 0;
            let coloredPixels = 0;
            
            for (let i = 0; i < pixels.length; i += 4) {
                const alpha = pixels[i + 3];
                if (alpha > 0) {
                    nonTransparent++;
                    // Check if it's not just black or white
                    const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
                    if (r !== g || g !== b || r > 20) {
                        coloredPixels++;
                    }
                }
            }
            
            return {
                canvas: {
                    width: canvas.width,
                    height: canvas.height,
                    displayWidth: rect.width,
                    displayHeight: rect.height,
                    visible: canvas.style.display !== 'none' && canvas.style.visibility !== 'hidden',
                    style: {
                        display: canvas.style.display || 'default',
                        visibility: canvas.style.visibility || 'default',
                        opacity: canvas.style.opacity || 'default'
                    }
                },
                pixels: {
                    total: pixels.length / 4,
                    nonTransparent,
                    coloredPixels,
                    percentage: (nonTransparent / (pixels.length / 4) * 100).toFixed(2),
                    colorPercentage: (coloredPixels / (pixels.length / 4) * 100).toFixed(2)
                },
                game: window.game ? {
                    state: window.game.state,
                    ballPosition: window.game.ball ? { x: window.game.ball.x, y: window.game.ball.y } : 'NO BALL',
                    bucketPosition: window.game.bucket ? { x: window.game.bucket.x, y: window.game.bucket.y } : 'NO BUCKET',
                    assetsLoaded: window.game.assets ? Object.keys(window.game.assets).length : 0
                } : 'NO GAME OBJECT'
            };
        });
        
        console.log('\n📊 DETAILED Game State Analysis:');
        console.log(JSON.stringify(gameState, null, 2));
        
        // Try to interact with the game - click on lower area where ball should be
        console.log('\n🖱️  Attempting to interact with game...');
        await page.click('#game-canvas', { position: { x: 187, y: 600 } }); 
        await page.waitForTimeout(1000);
        
        // Take screenshot after interaction
        const afterInteractionScreenshot = `corrected-test-${timestamp}-after-interaction.png`;
        await page.screenshot({ path: afterInteractionScreenshot, fullPage: true });
        console.log(`✅ After interaction screenshot: ${afterInteractionScreenshot}`);
        
        // Check game state after interaction
        const gameStateAfter = await page.evaluate(() => {
            return window.game ? {
                state: window.game.state,
                ballPosition: window.game.ball ? { x: window.game.ball.x, y: window.game.ball.y } : 'NO BALL',
                throwCount: window.game.throwCount || 0,
                score: window.game.score || 0
            } : 'NO GAME OBJECT';
        });
        
        console.log('\n📊 Game State After Interaction:');
        console.log(JSON.stringify(gameStateAfter, null, 2));
        
        return {
            success: true,
            gameState,
            gameStateAfter,
            screenshots: [initialScreenshot, afterInteractionScreenshot],
            consoleLogs
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        const errorScreenshot = `corrected-test-error-${Date.now()}.png`;
        await page.screenshot({ path: errorScreenshot, fullPage: true });
        return { 
            success: false, 
            error: error.message, 
            consoleLogs,
            errorScreenshot 
        };
    } finally {
        await browser.close();
    }
}

correctedVisualTest().then(result => {
    console.log('\n🔍 FINAL TEST RESULTS:');
    console.log(JSON.stringify(result, null, 2));
    
    if (result.success) {
        console.log('\n✅ VISUAL VERIFICATION COMPLETED');
        console.log(`📸 Screenshots taken: ${result.screenshots.join(', ')}`);
    } else {
        console.log('\n❌ VISUAL VERIFICATION FAILED');
    }
}).catch(console.error);