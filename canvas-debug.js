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
    
    // Get canvas element and its properties
    const canvasInfo = await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      if (!canvas) return { error: 'Canvas not found' };
      
      const ctx = canvas.getContext('2d');
      return {
        canvasElement: !!canvas,
        width: canvas.width,
        height: canvas.height,
        styleWidth: canvas.style.width,
        styleHeight: canvas.style.height,
        computedWidth: window.getComputedStyle(canvas).width,
        computedHeight: window.getComputedStyle(canvas).height,
        clientWidth: canvas.clientWidth,
        clientHeight: canvas.clientHeight,
        offsetWidth: canvas.offsetWidth,
        offsetHeight: canvas.offsetHeight,
        hasContext: !!ctx,
        devicePixelRatio: window.devicePixelRatio,
        isVisible: window.getComputedStyle(canvas).visibility !== 'hidden',
        isDisplayed: window.getComputedStyle(canvas).display !== 'none',
        opacity: window.getComputedStyle(canvas).opacity
      };
    });
    
    console.log('Canvas info:', JSON.stringify(canvasInfo, null, 2));
    
    // Check if JavaScript loaded properly and game object exists
    const gameInfo = await page.evaluate(() => {
      return {
        gameObjectExists: typeof window.game !== 'undefined',
        gameState: window.game ? window.game.state : 'undefined',
        ballExists: window.game && window.game.ball,
        bucketExists: window.game && window.game.bucket,
        configExists: typeof CONFIG !== 'undefined',
        ballPosition: window.game && window.game.ball ? 
          { x: window.game.ball.x, y: window.game.ball.y, radius: window.game.ball.baseRadius } : 
          null,
        bucketPosition: window.game && window.game.bucket ? 
          { x: window.game.bucket.x, y: window.game.bucket.y, width: window.game.bucket.width, height: window.game.bucket.height } : 
          null,
        logicalDimensions: window.game ? 
          { width: window.game.LOGICAL_WIDTH, height: window.game.LOGICAL_HEIGHT, scale: window.game.scale } : 
          null
      };
    });
    
    console.log('Game info:', JSON.stringify(gameInfo, null, 2));
    
    // Take a screenshot and test canvas drawing by drawing a test shape
    await page.evaluate(() => {
      const canvas = document.getElementById('game-canvas');
      if (canvas) {
        const ctx = canvas.getContext('2d');
        
        // Draw test elements to verify canvas is working
        ctx.fillStyle = '#FF0000';  // Red test circle
        ctx.beginPath();
        ctx.arc(100, 100, 50, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#00FF00';  // Green test rectangle
        ctx.fillRect(200, 200, 100, 100);
        
        console.log('Test shapes drawn to canvas');
      }
    });
    
    await page.screenshot({ path: 'canvas-debug-with-test.png' });
    
    // Wait a moment and check if the game render loop is running
    const renderInfo = await page.evaluate(() => {
      let frameCount = 0;
      const startTime = performance.now();
      
      return new Promise((resolve) => {
        function checkFrames() {
          frameCount++;
          if (frameCount > 10 || performance.now() - startTime > 2000) {
            resolve({
              framesDetected: frameCount,
              timeElapsed: performance.now() - startTime,
              avgFPS: frameCount / ((performance.now() - startTime) / 1000)
            });
          } else {
            requestAnimationFrame(checkFrames);
          }
        }
        requestAnimationFrame(checkFrames);
      });
    });
    
    console.log('Render loop info:', renderInfo);
    
    await page.waitForTimeout(5000);
    
  } catch (error) {
    console.error('Error during canvas debug:', error);
  } finally {
    await browser.close();
  }
})();