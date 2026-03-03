const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();
  
  try {
    console.log('🚀 FINAL PRODUCTION VERIFICATION');
    console.log('Testing: https://bucketball-2028-46p0wugdh-mintin.vercel.app');
    
    await page.goto('https://bucketball-2028-46p0wugdh-mintin.vercel.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Wait for game to fully initialize
    await page.waitForTimeout(4000);
    
    // Get final game state
    const gameInfo = await page.evaluate(() => {
      const info = {
        gameExists: typeof window.game !== 'undefined',
        gameState: null,
        ballPosition: null,
        bucketPosition: null,
        canvasDimensions: null,
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
        
        const canvas = document.getElementById('game-canvas');
        if (canvas) {
          info.canvasDimensions = {
            width: canvas.width,
            height: canvas.height,
            clientWidth: canvas.clientWidth,
            clientHeight: canvas.clientHeight
          };
        }
      }
      
      return info;
    });
    
    console.log('📊 PRODUCTION GAME STATE:');
    console.log('  Game exists:', gameInfo.gameExists ? '✅' : '❌');
    console.log('  Game state:', gameInfo.gameState);
    console.log('  Canvas:', gameInfo.canvasDimensions);
    console.log('  Logical dims:', gameInfo.logicalDimensions);
    
    if (gameInfo.ballPosition) {
      const ballInBounds = gameInfo.ballPosition.x >= 0 && 
                          gameInfo.ballPosition.x <= (gameInfo.canvasDimensions?.width || 1200) && 
                          gameInfo.ballPosition.y >= 0 && 
                          gameInfo.ballPosition.y <= (gameInfo.canvasDimensions?.height || 800);
      console.log(`🏀 BALL: (${gameInfo.ballPosition.x.toFixed(1)}, ${gameInfo.ballPosition.y.toFixed(1)}) - ${ballInBounds ? '✅ VISIBLE' : '❌ OFF-SCREEN'}`);
    } else {
      console.log('🏀 BALL: ❌ NOT FOUND');
    }
    
    if (gameInfo.bucketPosition) {
      const bucketInBounds = gameInfo.bucketPosition.x >= 0 && 
                            gameInfo.bucketPosition.x <= (gameInfo.canvasDimensions?.width || 1200) && 
                            gameInfo.bucketPosition.y >= 0 && 
                            gameInfo.bucketPosition.y <= (gameInfo.canvasDimensions?.height || 800);
      console.log(`🪣 BUCKET: (${gameInfo.bucketPosition.x.toFixed(1)}, ${gameInfo.bucketPosition.y.toFixed(1)}) - ${bucketInBounds ? '✅ VISIBLE' : '❌ OFF-SCREEN'}`);
    } else {
      console.log('🪣 BUCKET: ❌ NOT FOUND');
    }
    
    // Take final production screenshot
    await page.screenshot({ 
      path: 'final-production-verification.png',
      fullPage: false
    });
    console.log('📸 Final production screenshot: final-production-verification.png');
    
    // Test basic interaction
    console.log('🎯 Testing ball interaction...');
    try {
      if (gameInfo.ballPosition) {
        await page.mouse.click(gameInfo.ballPosition.x, gameInfo.ballPosition.y);
        await page.waitForTimeout(1000);
        console.log('✅ Ball click successful');
      }
    } catch (e) {
      console.log('⚠️ Ball interaction test failed:', e.message);
    }
    
    // Final verdict
    const ballVisible = gameInfo.ballPosition && 
                       gameInfo.ballPosition.y >= 0 && 
                       gameInfo.ballPosition.y <= 800;
    const bucketVisible = gameInfo.bucketPosition && 
                         gameInfo.bucketPosition.y >= 0 && 
                         gameInfo.bucketPosition.y <= 800;
    
    console.log('\n🏁 FINAL PRODUCTION VERDICT:');
    console.log(`Ball visibility: ${ballVisible ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Bucket visibility: ${bucketVisible ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Overall status: ${ballVisible && bucketVisible ? '🎉 PRODUCTION READY' : '🚨 NEEDS FIXING'}`);
    
    // Keep browser open for 10 seconds for manual verification
    console.log('Browser staying open for 10 seconds for visual confirmation...');
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('❌ Production test error:', error);
    await page.screenshot({ path: 'production-error-final.png' });
  } finally {
    await browser.close();
    console.log('🔚 Production verification complete');
  }
})();