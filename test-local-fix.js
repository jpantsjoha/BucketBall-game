const { chromium } = require('playwright');

async function testLocalFix() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 375, height: 812 }, // Mobile viewport like user's screenshot
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
    });
    
    const page = await context.newPage();
    
    // Set up console logging
    page.on('console', msg => {
        console.log(`Console [${msg.type()}]: ${msg.text()}`);
    });
    
    try {
        console.log('Testing LOCAL fix...');
        await page.goto('http://localhost:8080', { waitUntil: 'networkidle' });
        
        // Wait for loading to complete
        await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 10000 });
        
        // Take screenshot to verify ball and bucket are visible
        await page.screenshot({ 
            path: 'local-test-after-fix.png',
            fullPage: true
        });
        console.log('Local test screenshot saved');
        
        // Check game object positions
        const gameInfo = await page.evaluate(() => {
            if (typeof window.game !== 'undefined') {
                return {
                    ballVisible: true,
                    ballPosition: { x: window.game.ball.x, y: window.game.ball.y },
                    bucketPosition: { x: window.game.bucket.x, y: window.game.bucket.y },
                    canvasSize: { width: window.game.canvas.width, height: window.game.canvas.height },
                    logicalSize: { width: window.game.LOGICAL_WIDTH, height: window.game.LOGICAL_HEIGHT },
                    scale: window.game.scale
                };
            }
            return { error: 'Game not found' };
        });
        
        console.log('Local Game Info:', JSON.stringify(gameInfo, null, 2));
        
        // Test interaction
        console.log('Testing interaction...');
        await page.click('#game-canvas', { force: true });
        await page.waitForTimeout(1000);
        
        await page.screenshot({ 
            path: 'local-test-after-interaction.png',
            fullPage: true
        });
        
        console.log('Local test completed successfully!');
        
    } catch (error) {
        console.error('Local test failed:', error);
        await page.screenshot({ path: 'local-test-error.png' });
    } finally {
        await browser.close();
    }
}

testLocalFix().catch(console.error);