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
    
    console.log('=== DOM STRUCTURE ANALYSIS ===');
    
    // Get all elements in the game container
    const gameContainer = await page.$('#gameContainer, .game-container, canvas, body');
    if (gameContainer) {
      const innerHTML = await page.evaluate((container) => container.innerHTML, gameContainer);
      console.log('Game container HTML:', innerHTML.substring(0, 1000));
    }
    
    // Check for ANY elements with ball-related classes or IDs
    const ballElements = await page.$$eval('*', (elements) => {
      return elements.filter(el => 
        el.className.includes('ball') || 
        el.id.includes('ball') ||
        el.className.includes('Ball') ||
        el.id.includes('Ball')
      ).map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        styles: window.getComputedStyle(el)
      }));
    });
    console.log('Ball elements found:', ballElements);
    
    // Check for bucket elements
    const bucketElements = await page.$$eval('*', (elements) => {
      return elements.filter(el => 
        el.className.includes('bucket') || 
        el.id.includes('bucket') ||
        el.className.includes('Bucket') ||
        el.id.includes('Bucket')
      ).map(el => ({
        tagName: el.tagName,
        className: el.className,
        id: el.id,
        styles: window.getComputedStyle(el)
      }));
    });
    console.log('Bucket elements found:', bucketElements);
    
    // Get ALL elements with computed styles
    const allElements = await page.$$eval('*', (elements) => {
      return elements.map(el => {
        const styles = window.getComputedStyle(el);
        return {
          tagName: el.tagName,
          className: el.className,
          id: el.id,
          width: styles.width,
          height: styles.height,
          position: styles.position,
          backgroundColor: styles.backgroundColor,
          borderRadius: styles.borderRadius,
          opacity: styles.opacity,
          visibility: styles.visibility
        };
      }).filter(el => 
        (el.width !== 'auto' && el.width !== '0px') || 
        (el.height !== 'auto' && el.height !== '0px')
      );
    });
    
    console.log('Elements with defined dimensions:');
    allElements.slice(0, 20).forEach((el, i) => {
      console.log(`${i + 1}. ${el.tagName}.${el.className}#${el.id} - ${el.width}x${el.height}`);
    });
    
    // Check CSS files loaded
    const cssFiles = await page.$$eval('link[rel="stylesheet"]', (links) => 
      links.map(link => link.href)
    );
    console.log('CSS files loaded:', cssFiles);
    
    // Check for JavaScript errors
    const jsErrors = [];
    page.on('pageerror', error => jsErrors.push(error.message));
    
    await page.waitForTimeout(5000);
    
    if (jsErrors.length > 0) {
      console.log('JavaScript errors:', jsErrors);
    }
    
    // Take final screenshot
    await page.screenshot({ path: 'production-debug.png' });
    
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await browser.close();
  }
})();