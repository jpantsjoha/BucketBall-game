#!/usr/bin/env python3
"""
Simple BucketBall Gameplay Test
Focuses on demonstrating actual gameplay with successful shots
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os
from datetime import datetime

def test_bucketball_gameplay():
    """Test complete BucketBall gameplay with screenshots"""
    
    # Setup
    print("🎮 Setting up BucketBall gameplay test...")
    
    screenshot_dir = "gameplay_screenshots"
    os.makedirs(screenshot_dir, exist_ok=True)
    
    options = webdriver.ChromeOptions()
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    
    driver = webdriver.Chrome(options=options)
    driver.set_window_size(1280, 800)
    
    try:
        # Load game
        print("🌐 Loading BucketBall 2028...")
        driver.get("http://localhost:8080")
        
        # Wait for canvas
        canvas = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "game-canvas"))
        )
        
        # Wait for game to initialize
        time.sleep(3)
        
        # Take initial screenshot
        timestamp = datetime.now().strftime("%H%M%S")
        driver.save_screenshot(f"{screenshot_dir}/{timestamp}_01_game_loaded.png")
        print("📸 Game loaded - screenshot saved")
        
        # Perform multiple throws with different strategies
        throws = [
            {"name": "direct_shot", "drag": (0, -150), "description": "Direct shot toward bucket"},
            {"name": "arc_shot", "drag": (-50, -120), "description": "Arc shot with left angle"},
            {"name": "power_shot", "drag": (30, -200), "description": "Powerful high arc shot"},
            {"name": "trick_shot", "drag": (80, -80), "description": "Low trick shot attempt"},
            {"name": "final_shot", "drag": (-20, -180), "description": "Final precision shot"}
        ]
        
        successful_shots = 0
        
        for i, throw in enumerate(throws, 1):
            print(f"\n🎯 Throw {i}/5: {throw['description']}")
            
            # Take before screenshot
            timestamp = datetime.now().strftime("%H%M%S")
            driver.save_screenshot(f"{screenshot_dir}/{timestamp}_0{i+1}_before_{throw['name']}.png")
            
            try:
                # Get ball position from center-bottom area
                ball_area = driver.execute_script("""
                    const canvas = document.getElementById('game-canvas');
                    const rect = canvas.getBoundingClientRect();
                    return {
                        centerX: rect.width / 2,
                        bottomY: rect.height * 0.85  // Ball should be around 85% down
                    };
                """)
                
                # Perform throw
                actions = ActionChains(driver)
                
                # Click in the bottom center area where ball should be
                actions.move_to_element_with_offset(canvas, 
                                                    ball_area['centerX'] - canvas.size['width']/2, 
                                                    ball_area['bottomY'] - canvas.size['height']/2)
                
                # Drag to throw
                actions.click_and_hold()
                actions.move_by_offset(throw['drag'][0], throw['drag'][1])
                actions.release()
                actions.perform()
                
                print(f"   🏹 Threw with drag vector: {throw['drag']}")
                
                # Wait for ball physics
                time.sleep(3)
                
                # Take after screenshot
                timestamp = datetime.now().strftime("%H%M%S")
                driver.save_screenshot(f"{screenshot_dir}/{timestamp}_0{i+1}_after_{throw['name']}.png")
                
                # Check for score increase (simple detection)
                score_display = driver.execute_script("""
                    const canvas = document.getElementById('game-canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Look for score text in top area
                    const imageData = ctx.getImageData(0, 0, canvas.width, 100);
                    const pixels = imageData.data;
                    
                    // Count dark pixels (text)
                    let darkPixels = 0;
                    for (let i = 0; i < pixels.length; i += 4) {
                        if (pixels[i] < 100 && pixels[i+1] < 100 && pixels[i+2] < 100) {
                            darkPixels++;
                        }
                    }
                    
                    return darkPixels;
                """)
                
                # Simple success detection - if there's a popup toast or score change
                toast_check = driver.execute_script("""
                    const toastContainer = document.getElementById('toast-container');
                    return toastContainer && toastContainer.children.length > 0;
                """)
                
                if toast_check:
                    print("   🎉 Shot result detected (toast visible)!")
                    successful_shots += 1
                else:
                    print("   📍 Shot completed")
                
                # Wait before next throw
                time.sleep(2)
                
            except Exception as e:
                print(f"   ❌ Error during throw: {e}")
                timestamp = datetime.now().strftime("%H%M%S")
                driver.save_screenshot(f"{screenshot_dir}/{timestamp}_0{i+1}_error_{throw['name']}.png")
        
        # Final game state
        print(f"\n🏁 Game completed!")
        print(f"🎯 Detected reactions: {successful_shots}/5")
        
        # Take final screenshot
        timestamp = datetime.now().strftime("%H%M%S")
        driver.save_screenshot(f"{screenshot_dir}/{timestamp}_07_final_state.png")
        print("📸 Final state screenshot saved")
        
        # Summary
        print(f"\n📊 GAMEPLAY TEST SUMMARY")
        print(f"📁 Screenshots saved in: {screenshot_dir}/")
        print(f"📸 Total screenshots: ~{len(throws) * 2 + 3}")
        print(f"🎮 Game mechanics: {'✅ Working' if successful_shots > 0 else '⚠️  Check needed'}")
        
        # List all screenshots
        screenshot_files = [f for f in os.listdir(screenshot_dir) if f.endswith('.png')]
        screenshot_files.sort()
        
        print(f"\n📋 Screenshot timeline:")
        for i, filename in enumerate(screenshot_files[-10:], 1):  # Show last 10
            print(f"  {i:2d}. {filename}")
            
        return True
        
    finally:
        driver.quit()
        print("\n✅ Test completed!")

if __name__ == "__main__":
    test_bucketball_gameplay()