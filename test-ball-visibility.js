const { chromium } = require('playwright');

async function testBallVisibility() {
    console.log('🔍 Testing BucketBall production deployment for ball visibility...');
    
    const browser = await chromium.launch({ 
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 2 // High resolution for better screenshot quality
    });
    
    const page = await context.newPage();
    
    try {
        console.log('📡 Navigating to production URL...');
        await page.goto('https://bucketball-2028-a8iwths4m-mintin.vercel.app', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        console.log('⏱️ Waiting for game to fully load...');
        // Wait for canvas and game initialization
        await page.waitForSelector('#game-canvas', { timeout: 15000 });
        
        // Wait for loading overlay to disappear
        await page.waitForFunction(() => {
            const overlay = document.getElementById('loading-overlay');
            return !overlay || overlay.style.display === 'none';
        }, { timeout: 20000 });
        
        // Additional wait for game rendering
        await page.waitForTimeout(3000);
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        console.log('📸 Taking initial screenshot...');
        await page.screenshot({ 
            path: `screenshots/ball-visibility-${timestamp}-initial.png`,
            fullPage: false
        });
        
        // Get canvas dimensions and take focused screenshot of game area
        const canvas = await page.locator('#game-canvas');
        await canvas.screenshot({
            path: `screenshots/ball-visibility-${timestamp}-canvas.png`
        });
        
        console.log('🔍 Analyzing game canvas for ball visibility...');
        
        // Get canvas element and evaluate ball visibility
        const ballAnalysis = await page.evaluate(() => {
            const canvas = document.getElementById('game-canvas');
            if (!canvas) return { error: 'Canvas not found' };
            
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Look for yellow pixels (bright yellow should be close to #FFFF00)
            let yellowPixels = 0;
            let grayPixels = 0;
            let totalPixels = data.length / 4;
            
            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                const a = data[i + 3];
                
                // Skip transparent pixels
                if (a < 128) continue;
                
                // Check for yellow-ish colors (high R and G, low B)
                if (r > 200 && g > 200 && b < 100) {
                    yellowPixels++;
                }
                
                // Check for gray-ish colors (R, G, B similar values)
                if (Math.abs(r - g) < 50 && Math.abs(g - b) < 50 && Math.abs(r - b) < 50 && r > 100) {
                    grayPixels++;
                }
            }
            
            return {
                canvas: {
                    width: canvas.width,
                    height: canvas.height
                },
                pixelAnalysis: {
                    totalPixels,
                    yellowPixels,
                    grayPixels,
                    yellowPercentage: (yellowPixels / totalPixels * 100).toFixed(4),
                    grayPercentage: (grayPixels / totalPixels * 100).toFixed(4)
                }
            };
        });
        
        console.log('📊 Ball Analysis Results:', JSON.stringify(ballAnalysis, null, 2));
        
        // Try to interact with the bottom area where ball should be
        console.log('🖱️ Testing interaction with ball area...');
        
        const canvasBox = await canvas.boundingBox();
        if (canvasBox) {
            // Click near bottom of canvas where ball should be
            const ballAreaX = canvasBox.x + canvasBox.width / 2;
            const ballAreaY = canvasBox.y + canvasBox.height - 100; // Near bottom
            
            await page.mouse.move(ballAreaX, ballAreaY);
            await page.waitForTimeout(1000);
            
            // Take screenshot showing mouse position
            await page.screenshot({ 
                path: `screenshots/ball-visibility-${timestamp}-interaction.png`
            });
            
            // Try clicking and dragging
            await page.mouse.down();
            await page.waitForTimeout(500);
            await page.mouse.move(ballAreaX, ballAreaY - 100); // Drag upward
            await page.waitForTimeout(500);
            await page.mouse.up();
            
            // Take screenshot after interaction
            await page.waitForTimeout(1000);
            await page.screenshot({ 
                path: `screenshots/ball-visibility-${timestamp}-after-interaction.png`
            });
        }
        
        console.log('✅ Testing completed successfully!');
        return ballAnalysis;
        
    } catch (error) {
        console.error('❌ Error during testing:', error);
        
        // Take error screenshot
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        await page.screenshot({ 
            path: `screenshots/ball-visibility-${timestamp}-error.png`,
            fullPage: true
        });
        
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the test
testBallVisibility()
    .then(result => {
        console.log('🎯 Test completed with results:', JSON.stringify(result, null, 2));
        process.exit(0);
    })
    .catch(error => {
        console.error('💥 Test failed:', error);
        process.exit(1);
    });