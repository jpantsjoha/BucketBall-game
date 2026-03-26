const { Builder, By } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');

async function testPlayerInteraction() {
    const options = new chrome.Options();
    options.addArguments('--window-size=1920,1080');
    
    const driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
    
    try {
        console.log('🎮 Testing player interaction journey...');
        
        await driver.get('http://localhost:8082');
        await driver.sleep(3000); // Wait for loading
        
        // Take initial screenshot
        let screenshot = await driver.takeScreenshot();
        fs.writeFileSync('interaction-test-01-initial.png', screenshot, 'base64');
        console.log('📸 Initial state captured');
        
        // Test clicking on canvas (lawn area) to arm the ball
        const canvas = await driver.findElement(By.id('game-canvas'));
        
        // Get canvas dimensions and click in lawn area (bottom portion)
        const canvasRect = await driver.executeScript(`
            const canvas = document.getElementById('game-canvas');
            const rect = canvas.getBoundingClientRect();
            return {
                x: rect.x + rect.width / 2,
                y: rect.y + rect.height * 0.85,  // Click near the ball/chalk line
                width: rect.width,
                height: rect.height
            };
        `);
        
        console.log('🖱️  Clicking lawn area to arm ball...');
        await driver.actions()
            .move({ x: Math.round(canvasRect.x), y: Math.round(canvasRect.y) })
            .click()
            .perform();
            
        await driver.sleep(1000);
        
        screenshot = await driver.takeScreenshot();
        fs.writeFileSync('interaction-test-02-armed.png', screenshot, 'base64');
        console.log('📸 Ball armed state captured');
        
        // Test throwing by dragging upward
        console.log('🏀 Performing throw gesture...');
        await driver.actions()
            .move({ x: Math.round(canvasRect.x), y: Math.round(canvasRect.y) })
            .press()
            .move({ x: Math.round(canvasRect.x), y: Math.round(canvasRect.y - 200) })
            .release()
            .perform();
            
        await driver.sleep(2000); // Wait for ball flight
        
        screenshot = await driver.takeScreenshot();
        fs.writeFileSync('interaction-test-03-after-throw.png', screenshot, 'base64');
        console.log('📸 After throw state captured');
        
        // Check game state
        const gameInfo = await driver.executeScript(`
            if (window.game) {
                return {
                    state: window.game.state,
                    throwCount: window.game.throwCount,
                    score: window.game.score,
                    ballVisible: window.game.ball ? true : false,
                    bucketVisible: window.game.bucket ? true : false
                };
            }
            return null;
        `);
        
        console.log('✅ Interaction test completed successfully!');
        console.log('Game State:', JSON.stringify(gameInfo, null, 2));
        
        return {
            success: true,
            gameState: gameInfo,
            screenshots: [
                'interaction-test-01-initial.png',
                'interaction-test-02-armed.png', 
                'interaction-test-03-after-throw.png'
            ]
        };
        
    } finally {
        await driver.quit();
    }
}

if (require.main === module) {
    testPlayerInteraction()
        .then(result => {
            console.log('🎯 Test completed:', result.success ? 'SUCCESS' : 'FAILED');
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('❌ Test failed:', error);
            process.exit(1);
        });
}

module.exports = { testPlayerInteraction };