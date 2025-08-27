const { chromium } = require('playwright');

async function checkHtmlStructure() {
    const browser = await chromium.launch({ headless: false });
    const context = await browser.newContext();
    const page = await context.newPage();
    
    try {
        await page.goto('https://bucketball-2028-d9wbibvuz-mintin.vercel.app', { 
            waitUntil: 'networkidle' 
        });
        
        // Get the entire HTML structure
        const htmlContent = await page.content();
        console.log('📄 FULL HTML CONTENT:');
        console.log(htmlContent);
        
        // Check specifically for canvas and script elements
        const elements = await page.evaluate(() => {
            return {
                canvas: document.querySelector('#gameCanvas') ? 'EXISTS' : 'MISSING',
                canvasAll: Array.from(document.querySelectorAll('canvas')).map(c => ({ id: c.id, class: c.className })),
                scripts: Array.from(document.querySelectorAll('script')).map(s => ({ src: s.src, hasContent: s.textContent.length > 0 })),
                body: document.body ? document.body.innerHTML : 'NO BODY',
                gameObject: typeof window.game !== 'undefined' ? 'EXISTS' : 'MISSING'
            };
        });
        
        console.log('\n🔍 ELEMENT ANALYSIS:');
        console.log(JSON.stringify(elements, null, 2));
        
        // Take a screenshot
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const screenshot = `html-structure-check-${timestamp}.png`;
        await page.screenshot({ path: screenshot, fullPage: true });
        console.log(`📸 Screenshot saved: ${screenshot}`);
        
        return { success: true, htmlContent, elements, screenshot };
        
    } catch (error) {
        console.error('❌ Error:', error);
        return { success: false, error: error.message };
    } finally {
        await browser.close();
    }
}

checkHtmlStructure().then(result => {
    if (result.success) {
        console.log('\n✅ HTML structure check completed');
    } else {
        console.log('❌ HTML structure check failed:', result.error);
    }
}).catch(console.error);