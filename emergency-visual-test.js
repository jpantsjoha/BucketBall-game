const { chromium } = require('playwright');

async function emergencyVisualTest() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 375, height: 812 }
    });
    const page = await context.newPage();
    
    console.log('🚨 EMERGENCY VISUAL TEST - Production Site');
    console.log('Testing: https://bucketball-2028-d9wbibvuz-mintin.vercel.app');
    
    try {
        // Navigate to production site
        await page.goto('https://bucketball-2028-d9wbibvuz-mintin.vercel.app', { 
            waitUntil: 'networkidle' 
        });
        
        // Wait for game to initialize
        await page.waitForTimeout(3000);
        
        // Take initial screenshot
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const initialScreenshot = `emergency-test-${timestamp}-initial.png`;
        await page.screenshot({ path: initialScreenshot, fullPage: true });
        console.log(`✅ Initial screenshot: ${initialScreenshot}`);
        
        // Check canvas and game state
        const gameState = await page.evaluate(() => {
            const canvas = document.getElementById('gameCanvas');
            if (!canvas) return { error: 'No canvas found' };
            
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const pixels = imageData.data;
            
            let nonTransparent = 0;
            for (let i = 3; i < pixels.length; i += 4) {
                if (pixels[i] > 0) nonTransparent++;
            }
            
            return {
                canvas: {
                    width: canvas.width,
                    height: canvas.height,
                    displayWidth: canvas.style.width,
                    displayHeight: canvas.style.height,
                    visible: canvas.style.display !== 'none' && canvas.style.visibility !== 'hidden'
                },
                pixels: {
                    total: pixels.length / 4,
                    nonTransparent,
                    percentage: (nonTransparent / (pixels.length / 4) * 100).toFixed(2)
                },
                game: window.game ? {
                    state: window.game.state,
                    ballPosition: window.game.ball ? { x: window.game.ball.x, y: window.game.ball.y } : null,
                    bucketPosition: window.game.bucket ? { x: window.game.bucket.x, y: window.game.bucket.y } : null
                } : null
            };
        });
        
        console.log('📊 Game State Analysis:', JSON.stringify(gameState, null, 2));
        
        // Try to interact with the game
        await page.click('#gameCanvas', { position: { x: 187, y: 600 } }); // Click on ball area
        await page.waitForTimeout(500);
        
        // Take screenshot after interaction
        const afterInteractionScreenshot = `emergency-test-${timestamp}-after-interaction.png`;
        await page.screenshot({ path: afterInteractionScreenshot, fullPage: true });
        console.log(`✅ After interaction screenshot: ${afterInteractionScreenshot}`);
        
        // Check console for any errors
        const consoleLogs = [];
        page.on('console', msg => {
            consoleLogs.push({ type: msg.type(), text: msg.text() });
        });
        
        return {
            success: true,
            gameState,
            screenshots: [initialScreenshot, afterInteractionScreenshot],
            consoleLogs
        };
        
    } catch (error) {
        console.error('❌ Test failed:', error);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

emergencyVisualTest().then(result => {
    console.log('\n🔍 EMERGENCY TEST RESULTS:');
    console.log(JSON.stringify(result, null, 2));
}).catch(console.error);