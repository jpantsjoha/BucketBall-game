const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    console.log('🔍 Checking if production has the fix...');
    
    // Get the game.js source from production
    const response = await page.goto('https://bucketball-2028-46p0wugdh-mintin.vercel.app/game.js');
    const sourceCode = await response.text();
    
    // Check if our fix is present
    const hasResizeFix = sourceCode.includes('CRITICAL FIX: Reset ball and bucket positions after resize');
    const hasBallReset = sourceCode.includes('this.ball.reset();') && sourceCode.includes('this.bucket.reset();');
    
    console.log('Fix markers in production:');
    console.log(`- CRITICAL FIX comment: ${hasResizeFix ? '✅ FOUND' : '❌ MISSING'}`);
    console.log(`- ball.reset() and bucket.reset() calls: ${hasBallReset ? '✅ FOUND' : '❌ MISSING'}`);
    
    if (!hasResizeFix || !hasBallReset) {
      console.log('🚨 PRODUCTION NOT UPDATED! The fix is not deployed yet.');
      
      // Check for any cache-busting timestamp
      const timestamp = Date.now();
      console.log(`Trying cache-busted URL: game.js?v=${timestamp}`);
      
      const cachedResponse = await page.goto(`https://bucketball-2028-46p0wugdh-mintin.vercel.app/game.js?v=${timestamp}`);
      const cachedSource = await cachedResponse.text();
      
      const hasCachedFix = cachedSource.includes('CRITICAL FIX: Reset ball and bucket positions after resize');
      console.log(`Cache-busted version has fix: ${hasCachedFix ? '✅ YES' : '❌ NO'}`);
    } else {
      console.log('✅ Production source contains the fix!');
    }
    
  } catch (error) {
    console.error('Error checking production source:', error);
  } finally {
    await browser.close();
  }
})();