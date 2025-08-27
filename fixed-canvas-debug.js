const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    viewport: { width: 1200, height: 800 }
  });
  const page = await context.newPage();
  
  try {
    await page.goto('https://bucketball-2028-46p0wugdh-mintin.vercel.app', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('=== CANVAS DEBUG ANALYSIS ===');
    
    // Wait for game to initialize
    await page.waitForTimeout(3000);
    
    // Check if JavaScript loaded properly and game object exists
    const gameInfo = await page.evaluate(() => {
      const info = {
        gameObjectExists: typeof window.game !== 'undefined',
        configExists: typeof CONFIG !== 'undefined',
        gameStateValue: null,
        ballData: null,
        bucketData: null,
        logicalDimensions: null,
        errors: []
      };
      
      try {
        if (window.game) {
          info.gameStateValue = window.game.state;
          info.logicalDimensions = {
            width: window.game.LOGICAL_WIDTH,
            height: window.game.LOGICAL_HEIGHT,
            scale: window.game.scale
          };
          
          if (window.game.ball) {
            info.ballData = {
              x: window.game.ball.x,
              y: window.game.ball.y,
              baseRadius: window.game.ball.baseRadius
            };
          }
          
          if (window.game.bucket) {
            info.bucketData = {
              x: window.game.bucket.x,
              y: window.game.bucket.y,
              width: window.game.bucket.width,
              height: window.game.bucket.height
            };
          }
        }
      } catch (e) {
        info.errors.push(e.message);
      }
      
      return info;
    });
    
    console.log('Game state:', gameInfo);
    
    // Draw test shapes and take screenshot
    await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        
        // Clear canvas first
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw test shapes to verify canvas is working
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(100, 100, 50, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(200, 200, 100, 100);
        
        // Draw what should be ball and bucket positions if game exists
        if (window.game && window.game.ball && window.game.bucket) {
          // Ball position test
          ctx.fillStyle = '#FFFF00';  // Yellow
          ctx.beginPath();
          ctx.arc(window.game.ball.x, window.game.ball.y, 30, 0, Math.PI * 2);
          ctx.fill();
          
          // Bucket position test
          ctx.fillStyle = '#00FFFF';  // Cyan
          ctx.fillRect(window.game.bucket.x - 50, window.game.bucket.y - 50, 100, 50);
        }
        
        console.log('Test shapes and game position markers drawn');
      }
    });
    
    await page.screenshot({ path: 'canvas-test-positions.png' });
    console.log('Screenshot saved: canvas-test-positions.png');
    
    // Manually trigger a game render if possible
    const manualRenderResult = await page.evaluate(() => {
      try {
        if (window.game && typeof window.game.render === 'function') {
          window.game.render();
          return 'Game render called successfully';
        } else {
          return 'Game render function not available';
        }
      } catch (e) {
        return `Error calling render: ${e.message}`;
      }
    });
    
    console.log('Manual render result:', manualRenderResult);
    
    await page.screenshot({ path: 'canvas-after-manual-render.png' });
    console.log('Screenshot after manual render: canvas-after-manual-render.png');
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Error during canvas debug:', error);
  } finally {
    await browser.close();
  }
})();