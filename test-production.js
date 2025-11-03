const { chromium } = require('playwright');

async function testProductionSite() {
    console.log('🚀 Starting production verification test...');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        console.log('📍 Navigating to production site...');
        await page.goto('https://bucketball-2028-auyzjh1np-mintin.vercel.app', { 
            waitUntil: 'networkidle',
            timeout: 30000 
        });
        
        // Wait for page to fully load
        await page.waitForTimeout(3000);
        
        console.log('📸 Taking initial screenshot...');
        await page.screenshot({ 
            path: 'production-verification.png', 
            fullPage: true 
        });
        
        // Check for canvas element (where game renders)
        const canvas = await page.$('canvas');
        if (canvas) {
            console.log('✅ Canvas element found');
            
            // Get canvas dimensions
            const canvasBox = await canvas.boundingBox();
            console.log('📏 Canvas dimensions:', canvasBox);
            
            // Take a focused screenshot of the game area
            await page.screenshot({ 
                path: 'game-area-close-up.png',
                clip: canvasBox
            });
        } else {
            console.log('❌ Canvas element NOT found');
        }
        
        // Check for any visible game elements
        const gameElements = await page.evaluate(() => {
            const canvas = document.querySelector('canvas');
            if (!canvas) return { canvasFound: false };
            
            const ctx = canvas.getContext('2d');
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            
            // Check if canvas has any non-transparent pixels
            let hasContent = false;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] > 0) { // Alpha channel > 0
                    hasContent = true;
                    break;
                }
            }
            
            return {
                canvasFound: true,
                canvasWidth: canvas.width,
                canvasHeight: canvas.height,
                hasVisibleContent: hasContent
            };
        });
        
        console.log('🎮 Game elements analysis:', gameElements);
        
        // Wait a bit longer to ensure all game objects are loaded
        await page.waitForTimeout(5000);
        
        // Take final verification screenshot
        console.log('📸 Taking final verification screenshot...');
        await page.screenshot({ 
            path: 'final-verification.png', 
            fullPage: true 
        });
        
        console.log('✅ Production verification test completed');
        
    } catch (error) {
        console.error('❌ Error during production test:', error);
    } finally {
        await browser.close();
    }
}

testProductionSite();