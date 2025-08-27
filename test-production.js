const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🚀 Testing production deployment...');
    
    // Navigate to production URL
    await page.goto('https://bucketball-2028-d9wbibvuz-mintin.vercel.app');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Wait a bit for loading animation
    await page.waitForTimeout(2000);
    
    // Take screenshot to verify white ball visibility
    await page.screenshot({ 
      path: 'production-verification.png', 
      fullPage: true 
    });
    
    console.log('✅ Screenshot taken: production-verification.png');
    
    // Check if ball element exists and get its computed style
    const ballElement = await page.$('.ball');
    if (ballElement) {
      const ballColor = await page.evaluate((ball) => {
        const styles = window.getComputedStyle(ball);
        return {
          backgroundColor: styles.backgroundColor,
          background: styles.background,
          color: styles.color
        };
      }, ballElement);
      console.log('🎾 Ball element styles:', ballColor);
    }
    
    // Test basic functionality - click to aim
    const gameArea = await page.$('#gameArea');
    if (gameArea) {
      await gameArea.click({ position: { x: 200, y: 150 } });
      console.log('🎯 Clicked to aim - testing basic interaction');
    }
    
    console.log('✅ Production verification complete');
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await browser.close();
  }
})();