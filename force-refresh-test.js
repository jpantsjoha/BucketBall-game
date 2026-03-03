const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();
  
  try {
    console.log('🔄 FORCE REFRESH PRODUCTION TEST');
    
    // Clear all caches
    await context.clearCookies();
    await page.goto('about:blank');
    
    // Navigate with cache-busting
    const timestamp = Date.now();
    await page.goto(`https://bucketball-2028-46p0wugdh-mintin.vercel.app/?v=${timestamp}`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Force reload the page
    await page.reload({ waitUntil: 'networkidle' });
    
    // Wait extra time for initialization
    await page.waitForTimeout(5000);
    
    // Force trigger a manual resize to activate our fix
    await page.evaluate(() => {
      // Manually trigger resize event to force the fix to run
      if (window.game && typeof window.game.resizeToFullScreen === 'function') {
        console.log('Manually triggering resize...');
        window.game.resizeToFullScreen();
        
        // Also manually call the reset functions if they exist
        if (window.game.ball && typeof window.game.ball.reset === 'function') {
          console.log('Manually resetting ball...');
          window.game.ball.reset();
        }
        
        if (window.game.bucket && typeof window.game.bucket.reset === 'function') {
          console.log('Manually resetting bucket...');
          window.game.bucket.reset();
        }
        
        // Force a redraw
        if (typeof window.game.draw === 'function') {
          console.log('Forcing redraw...');
          window.game.draw();
        }
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Get game state after manual fix
    const gameInfo = await page.evaluate(() => {
      const info = {
        gameExists: typeof window.game !== 'undefined',
        gameState: null,
        ballPosition: null,
        bucketPosition: null,
        logicalDimensions: null
      };
      
      if (window.game) {
        info.gameState = window.game.state;
        info.logicalDimensions = {
          width: window.game.LOGICAL_WIDTH,
          height: window.game.LOGICAL_HEIGHT,
          scale: window.game.scale
        };
        
        if (window.game.ball) {
          info.ballPosition = {
            x: window.game.ball.x,
            y: window.game.ball.y,
            radius: window.game.ball.baseRadius
          };
        }
        
        if (window.game.bucket) {
          info.bucketPosition = {
            x: window.game.bucket.x,
            y: window.game.bucket.y,
            width: window.game.bucket.width,
            height: window.game.bucket.height
          };
        }
      }
      
      return info;
    });
    
    console.log('📊 AFTER MANUAL FIXES:');
    console.log('  Canvas dimensions:', gameInfo.logicalDimensions);
    
    if (gameInfo.ballPosition) {
      const ballInBounds = gameInfo.ballPosition.y >= 0 && gameInfo.ballPosition.y <= 800;
      console.log(`🏀 BALL: (${gameInfo.ballPosition.x.toFixed(1)}, ${gameInfo.ballPosition.y.toFixed(1)}) - ${ballInBounds ? '✅ VISIBLE' : '❌ OFF-SCREEN'}`);
    }
    
    if (gameInfo.bucketPosition) {
      const bucketInBounds = gameInfo.bucketPosition.y >= 0 && gameInfo.bucketPosition.y <= 800;
      console.log(`🪣 BUCKET: (${gameInfo.bucketPosition.x.toFixed(1)}, ${gameInfo.bucketPosition.y.toFixed(1)}) - ${bucketInBounds ? '✅ VISIBLE' : '❌ OFF-SCREEN'}`);
    }
    
    await page.screenshot({ path: 'force-refresh-result.png' });
    console.log('📸 Screenshot saved: force-refresh-result.png');
    
    // Final result
    const ballVisible = gameInfo.ballPosition && gameInfo.ballPosition.y <= 800;
    const bucketVisible = gameInfo.bucketPosition && gameInfo.bucketPosition.y <= 800;
    
    console.log('\n🎯 MANUAL FIX RESULT:');
    console.log(`Overall status: ${ballVisible && bucketVisible ? '🎉 WORKING' : '🚨 STILL BROKEN'}`);
    
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Error in force refresh test:', error);
  } finally {
    await browser.close();
  }
})();