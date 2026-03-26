const { chromium } = require('playwright');

async function testProductionRendering() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext({
        viewport: { width: 375, height: 812 }, // Mobile viewport like user's screenshot
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
    });
    
    const page = await context.newPage();
    
    // Set up console logging to catch errors
    const consoleMessages = [];
    const networkErrors = [];
    
    page.on('console', msg => {
        consoleMessages.push({
            type: msg.type(),
            text: msg.text(),
            location: msg.location()
        });
        console.log(`Console [${msg.type()}]: ${msg.text()}`);
    });
    
    page.on('response', response => {
        if (!response.ok()) {
            networkErrors.push({
                url: response.url(),
                status: response.status(),
                statusText: response.statusText()
            });
            console.log(`Network Error: ${response.url()} - ${response.status()} ${response.statusText()}`);
        }
    });
    
    try {
        console.log('Navigating to production site...');
        await page.goto('https://bucketball-2028-d9wbibvuz-mintin.vercel.app', { 
            waitUntil: 'networkidle' 
        });
        
        // Wait for loading overlay to disappear
        console.log('Waiting for loading overlay to disappear...');
        await page.waitForSelector('#loading-overlay', { state: 'hidden', timeout: 10000 });
        
        // Take initial screenshot
        await page.screenshot({ 
            path: 'production-test-initial.png',
            fullPage: true
        });
        console.log('Initial screenshot taken');
        
        // Check if canvas exists and get its properties
        const canvasInfo = await page.evaluate(() => {
            const canvas = document.getElementById('game-canvas');
            if (!canvas) return { exists: false };
            
            const rect = canvas.getBoundingClientRect();
            const ctx = canvas.getContext('2d');
            
            return {
                exists: true,
                width: canvas.width,
                height: canvas.height,
                displayWidth: rect.width,
                displayHeight: rect.height,
                contextExists: !!ctx,
                visible: canvas.offsetParent !== null,
                style: {
                    display: getComputedStyle(canvas).display,
                    visibility: getComputedStyle(canvas).visibility,
                    opacity: getComputedStyle(canvas).opacity
                }
            };
        });
        
        console.log('Canvas Info:', JSON.stringify(canvasInfo, null, 2));
        
        // Check for game objects
        const gameInfo = await page.evaluate(() => {
            // Try to access global game object if it exists
            if (typeof window.game !== 'undefined') {
                return {
                    gameExists: true,
                    state: window.game.state,
                    ballPosition: window.game.ball ? { x: window.game.ball.x, y: window.game.ball.y } : null,
                    bucketPosition: window.game.bucket ? { x: window.game.bucket.x, y: window.game.bucket.y } : null,
                    canvasSize: { width: window.game.canvas.width, height: window.game.canvas.height },
                    logicalSize: { width: window.game.LOGICAL_WIDTH, height: window.game.LOGICAL_HEIGHT }
                };
            }
            return { gameExists: false };
        });
        
        console.log('Game Info:', JSON.stringify(gameInfo, null, 2));
        
        // Check for assets loading
        const assetInfo = await page.evaluate(() => {
            if (typeof window.game !== 'undefined' && window.game.bucket && window.game.bucket.assetManager) {
                const assetManager = window.game.bucket.assetManager;
                const assets = {};
                
                // Check various bucket assets
                const assetNames = ['upright_1x', 'upright_2x', 'upright_3x', 'tilt_left', 'tilt_right', 'toppled'];
                assetNames.forEach(name => {
                    const asset = assetManager.get(name);
                    if (asset) {
                        assets[name] = {
                            exists: true,
                            loaded: asset.complete,
                            naturalWidth: asset.naturalWidth,
                            naturalHeight: asset.naturalHeight,
                            src: asset.src
                        };
                    } else {
                        assets[name] = { exists: false };
                    }
                });
                
                return { assetsAvailable: true, assets };
            }
            return { assetsAvailable: false };
        });
        
        console.log('Asset Info:', JSON.stringify(assetInfo, null, 2));
        
        // Try to interact with the game area to trigger rendering
        console.log('Attempting to interact with game area...');
        await page.click('#game-canvas', { force: true });
        await page.waitForTimeout(1000);
        
        // Take screenshot after interaction
        await page.screenshot({ 
            path: 'production-test-after-interaction.png',
            fullPage: true
        });
        console.log('Post-interaction screenshot taken');
        
        // Check canvas content by getting image data
        const canvasContent = await page.evaluate(() => {
            const canvas = document.getElementById('game-canvas');
            if (!canvas) return null;
            
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            
            // Check if canvas has any non-transparent pixels
            let hasContent = false;
            let nonTransparentPixels = 0;
            
            for (let i = 3; i < imageData.data.length; i += 4) {
                if (imageData.data[i] > 0) { // Alpha channel
                    hasContent = true;
                    nonTransparentPixels++;
                }
            }
            
            return {
                hasContent,
                nonTransparentPixels,
                totalPixels: imageData.data.length / 4,
                percentage: (nonTransparentPixels / (imageData.data.length / 4) * 100).toFixed(2)
            };
        });
        
        console.log('Canvas Content Analysis:', JSON.stringify(canvasContent, null, 2));
        
        // Generate comprehensive report
        const report = {
            timestamp: new Date().toISOString(),
            url: 'https://bucketball-2028-d9wbibvuz-mintin.vercel.app',
            viewport: { width: 375, height: 812 },
            canvasInfo,
            gameInfo,
            assetInfo,
            canvasContent,
            consoleMessages: consoleMessages.slice(-10), // Last 10 messages
            networkErrors,
            screenshots: ['production-test-initial.png', 'production-test-after-interaction.png']
        };
        
        // Save report
        const fs = require('fs');
        fs.writeFileSync('production-rendering-report.json', JSON.stringify(report, null, 2));
        
        console.log('\n=== PRODUCTION RENDERING DIAGNOSIS ===');
        console.log(`Canvas Exists: ${canvasInfo.exists}`);
        console.log(`Canvas Visible: ${canvasInfo.visible}`);
        console.log(`Game Object Exists: ${gameInfo.gameExists}`);
        console.log(`Canvas Has Content: ${canvasContent?.hasContent || false}`);
        console.log(`Non-transparent Pixels: ${canvasContent?.percentage || 0}%`);
        console.log(`Console Errors: ${consoleMessages.filter(m => m.type === 'error').length}`);
        console.log(`Network Errors: ${networkErrors.length}`);
        
        if (consoleMessages.filter(m => m.type === 'error').length > 0) {
            console.log('\nERRORS FOUND:');
            consoleMessages.filter(m => m.type === 'error').forEach(msg => {
                console.log(`- ${msg.text}`);
            });
        }
        
        if (networkErrors.length > 0) {
            console.log('\nNETWORK ERRORS:');
            networkErrors.forEach(err => {
                console.log(`- ${err.url}: ${err.status} ${err.statusText}`);
            });
        }
        
        console.log('\nReport saved to production-rendering-report.json');
        console.log('Screenshots saved: production-test-initial.png, production-test-after-interaction.png');
        
    } catch (error) {
        console.error('Test failed:', error);
        await page.screenshot({ path: 'production-test-error.png' });
    } finally {
        await browser.close();
    }
}

testProductionRendering().catch(console.error);