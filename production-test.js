const { chromium } = require('playwright');

(async () => {
  // Launch browser
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();
  
  console.log('🚀 Navigating to production URL...');
  
  try {
    // Navigate to production URL
    await page.goto('https://bucketball-2028-46p0wugdh-mintin.vercel.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Page loaded successfully');
    
    // Wait for game elements to load
    await page.waitForTimeout(3000);
    
    // Take full page screenshot
    await page.screenshot({ 
      path: 'production-full-page.png',
      fullPage: true
    });
    console.log('📸 Full page screenshot captured');
    
    // Take focused screenshot of game area
    await page.screenshot({ 
      path: 'production-game-area.png',
      clip: { x: 0, y: 0, width: 1200, height: 800 }
    });
    console.log('📸 Game area screenshot captured');
    
    // Check for game elements
    const ballElement = await page.$('.ball');
    const bucketElement = await page.$('.bucket');
    
    console.log('🏀 Ball element found:', ballElement ? 'YES' : 'NO');
    console.log('🪣 Bucket element found:', bucketElement ? 'YES' : 'NO');
    
    // Get computed styles
    if (ballElement) {
      const ballStyles = await page.evaluate((ball) => {
        const styles = window.getComputedStyle(ball);
        return {
          width: styles.width,
          height: styles.height,
          backgroundColor: styles.backgroundColor,
          borderRadius: styles.borderRadius,
          position: styles.position,
          left: styles.left,
          top: styles.top,
          opacity: styles.opacity,
          visibility: styles.visibility
        };
      }, ballElement);
      console.log('🏀 Ball styles:', ballStyles);
    }
    
    if (bucketElement) {
      const bucketStyles = await page.evaluate((bucket) => {
        const styles = window.getComputedStyle(bucket);
        return {
          width: styles.width,
          height: styles.height,
          backgroundColor: styles.backgroundColor,
          position: styles.position,
          left: styles.left,
          bottom: styles.bottom,
          opacity: styles.opacity,
          visibility: styles.visibility
        };
      }, bucketElement);
      console.log('🪣 Bucket styles:', bucketStyles);
    }
    
    // Test basic interaction
    console.log('🎯 Testing ball click interaction...');
    if (ballElement) {
      await ballElement.click();
      await page.waitForTimeout(1000);
      console.log('✅ Ball click registered');
    }
    
    // Keep browser open for manual inspection
    console.log('🔍 Browser will remain open for 30 seconds for manual inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error during testing:', error.message);
    await page.screenshot({ path: 'production-error.png' });
  } finally {
    await browser.close();
    console.log('🏁 Test completed');
  }
})();