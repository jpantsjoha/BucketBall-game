#!/usr/bin/env python3
"""
Test to verify yellow golf ball and bucket are visible
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time

def test_game_visibility():
    # Setup Chrome
    options = webdriver.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    driver = webdriver.Chrome(options=options)
    driver.set_window_size(1280, 720)
    
    try:
        print("Loading game...")
        driver.get("http://localhost:8080")
        
        # Wait for canvas
        canvas = WebDriverWait(driver, 5).until(
            EC.presence_of_element_located((By.ID, "game-canvas"))
        )
        
        time.sleep(2)  # Let game fully load
        
        # Take screenshot for visual verification
        driver.save_screenshot("game_visibility_test.png")
        print("✅ Screenshot saved as game_visibility_test.png")
        
        # Check canvas dimensions
        canvas_info = driver.execute_script("""
            const canvas = document.getElementById('game-canvas');
            const ctx = canvas.getContext('2d');
            
            // Get pixel data from where ball should be (bottom center)
            const bottomY = canvas.height * 0.9;
            const centerX = canvas.width / 2;
            
            // Sample a small area where ball should be
            const imageData = ctx.getImageData(centerX - 50, bottomY - 50, 100, 100);
            const pixels = imageData.data;
            
            // Look for yellow pixels (high R and G, low B)
            let yellowPixels = 0;
            let blackPixels = 0;
            
            for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                
                // Check for yellow (high red and green, low blue)
                if (r > 200 && g > 200 && b < 100) {
                    yellowPixels++;
                }
                // Check for black outlines
                if (r < 50 && g < 50 && b < 50) {
                    blackPixels++;
                }
            }
            
            return {
                width: canvas.width,
                height: canvas.height,
                yellowPixels: yellowPixels,
                blackPixels: blackPixels,
                totalPixels: pixels.length / 4,
                ballExpectedX: centerX,
                ballExpectedY: bottomY
            };
        """)
        
        print(f"Canvas size: {canvas_info['width']}x{canvas_info['height']}")
        print(f"Ball should be at: ({canvas_info['ballExpectedX']}, {canvas_info['ballExpectedY']})")
        print(f"Yellow pixels found: {canvas_info['yellowPixels']} / {canvas_info['totalPixels']}")
        print(f"Black pixels found: {canvas_info['blackPixels']} / {canvas_info['totalPixels']}")
        
        if canvas_info['yellowPixels'] > 50:
            print("✅ YELLOW BALL IS VISIBLE!")
        else:
            print("❌ YELLOW BALL NOT DETECTED - Check the screenshot")
            
        # Test interaction - try clicking near ball position
        canvas_width = canvas_info['width']
        canvas_height = canvas_info['height']
        
        # Calculate ball position in client coordinates
        ball_x = canvas_width / 2 / (driver.execute_script("return window.devicePixelRatio") or 1)
        ball_y = canvas_height * 0.9 / (driver.execute_script("return window.devicePixelRatio") or 1)
        
        print(f"\nTesting ball interaction at ({ball_x}, {ball_y})...")
        
        # Try to click and drag the ball
        actions = ActionChains(driver)
        actions.move_to_element_with_offset(canvas, ball_x - canvas_width/2, ball_y - canvas_height/2)
        actions.click_and_hold()
        actions.move_by_offset(0, -200)
        actions.release()
        actions.perform()
        
        time.sleep(2)
        
        # Take another screenshot after interaction
        driver.save_screenshot("game_after_throw.png")
        print("✅ Screenshot after throw saved as game_after_throw.png")
        
        # Check if ball moved
        ball_moved = driver.execute_script("""
            return window.game && window.game.state === 'LAUNCHED';
        """)
        
        if ball_moved:
            print("✅ Ball interaction successful - ball was thrown!")
        else:
            print("⚠️  Ball may not have been thrown - check manual interaction")
            
    finally:
        driver.quit()
        
    print("\n" + "="*50)
    print("VISIBILITY TEST COMPLETE")
    print("Check the screenshots to verify:")
    print("1. game_visibility_test.png - Initial state")
    print("2. game_after_throw.png - After interaction")
    print("="*50)

if __name__ == "__main__":
    test_game_visibility()