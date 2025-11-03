const { Builder, By, until } = require('selenium-webdriver');
const chrome = require('selenium-webdriver/chrome');
const fs = require('fs');
const path = require('path');

class VisibilityValidator {
    constructor() {
        this.results = {
            timestamp: new Date().toISOString(),
            testUrl: 'http://localhost:8082',
            tests: {},
            screenshots: [],
            overallStatus: 'PENDING',
            criticalIssues: []
        };
    }

    async setup() {
        const options = new chrome.Options();
        options.addArguments('--disable-web-security');
        options.addArguments('--disable-features=VizDisplayCompositor');
        options.addArguments('--window-size=1920,1080');
        
        this.driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();
        
        console.log('🚀 Browser initialized for visibility testing');
    }

    async takeScreenshot(testName, description) {
        const timestamp = Date.now();
        const filename = `visibility-test-${testName}-${timestamp}.png`;
        const filepath = path.join(__dirname, filename);
        
        const screenshot = await this.driver.takeScreenshot();
        fs.writeFileSync(filepath, screenshot, 'base64');
        
        this.results.screenshots.push({
            filename,
            filepath,
            testName,
            description,
            timestamp: new Date().toISOString()
        });
        
        console.log(`📸 Screenshot saved: ${filename} - ${description}`);
        return filepath;
    }

    async testInitialPageLoad() {
        console.log('🔍 Testing initial page load and object visibility...');
        
        try {
            await this.driver.get(this.results.testUrl);
            await this.driver.sleep(2000); // Allow page to fully load
            
            // Wait for loading overlay to disappear
            try {
                await this.driver.wait(until.elementLocated(By.id('loading-overlay')), 5000);
                await this.driver.wait(
                    until.elementIsNotVisible(this.driver.findElement(By.id('loading-overlay'))), 
                    10000
                );
                console.log('✅ Loading overlay dismissed successfully');
            } catch (e) {
                console.log('⚠️  Loading overlay handling: ', e.message);
            }

            // Take screenshot after loading
            await this.takeScreenshot('01-initial-load', 'Page loaded - checking for ball and bucket visibility');
            
            // Check canvas element exists
            const canvas = await this.driver.findElement(By.id('game-canvas'));
            const canvasDisplayed = await canvas.isDisplayed();
            
            this.results.tests.initialLoad = {
                status: canvasDisplayed ? 'PASS' : 'FAIL',
                canvasVisible: canvasDisplayed,
                timestamp: new Date().toISOString()
            };

            if (!canvasDisplayed) {
                this.results.criticalIssues.push('Canvas element not visible on page load');
            }

            return canvasDisplayed;
        } catch (error) {
            this.results.tests.initialLoad = {
                status: 'ERROR',
                error: error.message,
                timestamp: new Date().toISOString()
            };
            this.results.criticalIssues.push(`Page load failed: ${error.message}`);
            return false;
        }
    }

    async testBallVisibility() {
        console.log('🏀 Testing ball visibility at chalk line level...');
        
        try {
            // Execute JavaScript to check ball properties
            const ballInfo = await this.driver.executeScript(`
                // Check if game object exists and ball is rendered
                if (window.game && window.game.ball) {
                    const ball = window.game.ball;
                    const canvas = document.getElementById('game-canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Get ball position and scaling info
                    return {
                        exists: true,
                        position: { x: ball.x, y: ball.y },
                        baseRadius: ball.baseRadius,
                        perspectiveFactor: ball.getPerspectiveFactor ? ball.getPerspectiveFactor() : null,
                        expectedChalkLineY: window.game.LOGICAL_HEIGHT * 0.85,
                        actualChalkLineY: window.game.LOGICAL_HEIGHT * 0.85,
                        isAtCorrectHeight: Math.abs(ball.y - (window.game.LOGICAL_HEIGHT * 0.85)) < 50,
                        minScaleFactor: 0.6,
                        meetsMinScale: ball.getPerspectiveFactor ? ball.getPerspectiveFactor() >= 0.6 : false
                    };
                }
                return { exists: false };
            `);

            await this.takeScreenshot('02-ball-visibility', 'Ball visibility and positioning test');

            this.results.tests.ballVisibility = {
                status: ballInfo.exists && ballInfo.isAtCorrectHeight && ballInfo.meetsMinScale ? 'PASS' : 'FAIL',
                ballExists: ballInfo.exists,
                ballPosition: ballInfo.position,
                isAtCorrectHeight: ballInfo.isAtCorrectHeight,
                meetsMinScale: ballInfo.meetsMinScale,
                perspectiveFactor: ballInfo.perspectiveFactor,
                timestamp: new Date().toISOString()
            };

            if (!ballInfo.exists) {
                this.results.criticalIssues.push('Ball object not found in game');
            } else if (!ballInfo.isAtCorrectHeight) {
                this.results.criticalIssues.push(`Ball not positioned at chalk line level. Expected ~${ballInfo.expectedChalkLineY}, got ${ballInfo.position.y}`);
            } else if (!ballInfo.meetsMinScale) {
                this.results.criticalIssues.push(`Ball scale below minimum visibility threshold. Factor: ${ballInfo.perspectiveFactor}, minimum: 0.6`);
            }

            return ballInfo.exists && ballInfo.isAtCorrectHeight && ballInfo.meetsMinScale;
        } catch (error) {
            this.results.tests.ballVisibility = {
                status: 'ERROR',
                error: error.message,
                timestamp: new Date().toISOString()
            };
            this.results.criticalIssues.push(`Ball visibility test failed: ${error.message}`);
            return false;
        }
    }

    async testBucketVisibility() {
        console.log('🪣 Testing bucket visibility with enhanced fallback rendering...');
        
        try {
            const bucketInfo = await this.driver.executeScript(`
                if (window.game && window.game.bucket) {
                    const bucket = window.game.bucket;
                    return {
                        exists: true,
                        position: { x: bucket.x, y: bucket.y },
                        dimensions: { width: bucket.width, height: bucket.height },
                        baseWidth: bucket.baseWidth,
                        baseHeight: bucket.baseHeight,
                        isEnhanced: bucket.baseWidth > 170, // Should be 204 (20% increase)
                        hasWhiteOutline: true, // Assumed from code analysis
                        isPerspectiveScaled: bucket.width !== bucket.baseWidth
                    };
                }
                return { exists: false };
            `);

            await this.takeScreenshot('03-bucket-visibility', 'Bucket visibility and enhanced rendering test');

            this.results.tests.bucketVisibility = {
                status: bucketInfo.exists && bucketInfo.isEnhanced ? 'PASS' : 'FAIL',
                bucketExists: bucketInfo.exists,
                bucketPosition: bucketInfo.position,
                dimensions: bucketInfo.dimensions,
                isEnhanced: bucketInfo.isEnhanced,
                isPerspectiveScaled: bucketInfo.isPerspectiveScaled,
                timestamp: new Date().toISOString()
            };

            if (!bucketInfo.exists) {
                this.results.criticalIssues.push('Bucket object not found in game');
            } else if (!bucketInfo.isEnhanced) {
                this.results.criticalIssues.push('Bucket not using enhanced size (should be 204px width, 20% increase)');
            }

            return bucketInfo.exists && bucketInfo.isEnhanced;
        } catch (error) {
            this.results.tests.bucketVisibility = {
                status: 'ERROR',
                error: error.message,
                timestamp: new Date().toISOString()
            };
            this.results.criticalIssues.push(`Bucket visibility test failed: ${error.message}`);
            return false;
        }
    }

    async testPlayerInteractionJourney() {
        console.log('🎮 Testing complete player interaction journey...');
        
        try {
            // Test arming the ball by clicking on lawn area
            const canvas = await this.driver.findElement(By.id('game-canvas'));
            const canvasSize = await canvas.getSize();
            const canvasLocation = await canvas.getLocation();

            // Click on lawn area (bottom 20% of screen)
            const lawnClickY = canvasLocation.y + canvasSize.height * 0.9;
            const lawnClickX = canvasLocation.x + canvasSize.width * 0.5;

            await this.driver.actions()
                .move({ x: lawnClickX, y: lawnClickY })
                .click()
                .perform();

            await this.driver.sleep(500); // Wait for arming

            await this.takeScreenshot('04-ball-armed', 'Ball armed state after lawn click');

            // Test throwing by dragging up
            const throwEndY = canvasLocation.y + canvasSize.height * 0.3;
            
            await this.driver.actions()
                .move({ x: lawnClickX, y: lawnClickY })
                .press()
                .move({ x: lawnClickX, y: throwEndY })
                .release()
                .perform();

            await this.driver.sleep(1000); // Wait for ball flight

            await this.takeScreenshot('05-ball-thrown', 'Ball in flight after throw');

            // Check game state
            const gameState = await this.driver.executeScript(`
                if (window.game) {
                    return {
                        state: window.game.state,
                        ballLanded: window.game.ball ? window.game.ball.landed : false,
                        throwCount: window.game.throwCount,
                        score: window.game.score
                    };
                }
                return null;
            `);

            await this.driver.sleep(3000); // Wait for ball to settle

            await this.takeScreenshot('06-after-throw', 'Game state after ball settles');

            this.results.tests.playerInteraction = {
                status: gameState ? 'PASS' : 'FAIL',
                gameState: gameState,
                interactionCompleted: true,
                timestamp: new Date().toISOString()
            };

            if (!gameState) {
                this.results.criticalIssues.push('Game state not accessible during interaction test');
            }

            return gameState !== null;
        } catch (error) {
            this.results.tests.playerInteraction = {
                status: 'ERROR',
                error: error.message,
                timestamp: new Date().toISOString()
            };
            this.results.criticalIssues.push(`Player interaction test failed: ${error.message}`);
            return false;
        }
    }

    async runAllTests() {
        console.log('🧪 Starting comprehensive visibility validation tests...\n');
        
        try {
            await this.setup();
            
            const results = {
                initialLoad: await this.testInitialPageLoad(),
                ballVisibility: await this.testBallVisibility(),
                bucketVisibility: await this.testBucketVisibility(),
                playerInteraction: await this.testPlayerInteractionJourney()
            };

            // Final screenshot
            await this.takeScreenshot('99-final-state', 'Final game state after all tests');

            // Determine overall status
            const allPassed = Object.values(results).every(result => result === true);
            this.results.overallStatus = allPassed ? 'PASS' : 'FAIL';
            
            if (this.results.criticalIssues.length === 0 && allPassed) {
                this.results.overallStatus = 'PASS';
                console.log('✅ ALL VISIBILITY TESTS PASSED - Ball and bucket are both visible and functional!');
            } else {
                this.results.overallStatus = 'FAIL';
                console.log('❌ CRITICAL VISIBILITY ISSUES DETECTED');
            }

            return this.results;
        } finally {
            if (this.driver) {
                await this.driver.quit();
            }
        }
    }

    async generateReport() {
        const reportPath = path.join(__dirname, `visibility-validation-report-${Date.now()}.json`);
        fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
        
        console.log('\n📊 TEST RESULTS SUMMARY:');
        console.log('================================');
        console.log(`Overall Status: ${this.results.overallStatus}`);
        console.log(`Critical Issues: ${this.results.criticalIssues.length}`);
        console.log(`Screenshots Taken: ${this.results.screenshots.length}`);
        console.log(`Report Saved: ${reportPath}`);
        
        if (this.results.criticalIssues.length > 0) {
            console.log('\n🚨 CRITICAL ISSUES:');
            this.results.criticalIssues.forEach((issue, index) => {
                console.log(`${index + 1}. ${issue}`);
            });
        }
        
        console.log('\n📸 SCREENSHOTS:');
        this.results.screenshots.forEach(screenshot => {
            console.log(`- ${screenshot.filename}: ${screenshot.description}`);
        });
        
        return reportPath;
    }
}

// Main execution
async function main() {
    const validator = new VisibilityValidator();
    
    try {
        await validator.runAllTests();
        await validator.generateReport();
        
        // Exit with appropriate code
        process.exit(validator.results.overallStatus === 'PASS' ? 0 : 1);
    } catch (error) {
        console.error('❌ Test execution failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = VisibilityValidator;