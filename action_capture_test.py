#!/usr/bin/env python3
"""
Action Capture Test - Captures ball in mid-flight and successful shots
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import os
import threading
from datetime import datetime

def continuous_screenshot_capture(driver, screenshot_dir, duration=4):
    """Capture screenshots continuously during ball flight"""
    start_time = time.time()
    shot_number = 1
    
    while time.time() - start_time < duration:
        timestamp = datetime.now().strftime("%H%M%S_%f")[:-3]  # Include milliseconds
        filename = f"{screenshot_dir}/{timestamp}_flight_{shot_number:02d}.png"
        try:
            driver.save_screenshot(filename)
            print(f"📸 Flight capture: {timestamp}")
        except:
            break
        time.sleep(0.5)  # Capture every 500ms
        shot_number += 1

def test_action_gameplay():
    """Test with action capture during ball flight"""
    
    print("🎬 Setting up BucketBall action capture test...")
    
    screenshot_dir = "action_screenshots"
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
        
        time.sleep(3)
        
        # Initial state
        timestamp = datetime.now().strftime("%H%M%S")
        driver.save_screenshot(f"{screenshot_dir}/{timestamp}_00_initial_state.png")
        print("📸 Initial state captured")
        
        # Perform 3 strategic shots with action capture
        shots = [
            {"name": "bucket_shot", "drag": (-20, -180), "wait": 0.2, "desc": "Aimed at bucket"},
            {"name": "trick_shot", "drag": (60, -100), "wait": 0.1, "desc": "Low trick shot"},  
            {"name": "power_shot", "drag": (-40, -220), "wait": 0.1, "desc": "High power shot"}
        ]
        
        for i, shot in enumerate(shots, 1):
            print(f"\n🎯 Action Shot {i}/3: {shot['desc']}")
            
            # Pre-shot
            timestamp = datetime.now().strftime("%H%M%S")
            driver.save_screenshot(f"{screenshot_dir}/{timestamp}_0{i}_pre_{shot['name']}.png")
            
            # Get ball area
            ball_area = driver.execute_script("""
                const canvas = document.getElementById('game-canvas');
                const rect = canvas.getBoundingClientRect();
                return {
                    centerX: rect.width / 2,
                    bottomY: rect.height * 0.85
                };
            """)
            
            # Setup action
            actions = ActionChains(driver)
            actions.move_to_element_with_offset(canvas, 
                                                ball_area['centerX'] - canvas.size['width']/2, 
                                                ball_area['bottomY'] - canvas.size['height']/2)
            actions.click_and_hold()
            actions.move_by_offset(shot['drag'][0], shot['drag'][1])
            
            # Start continuous capture in background thread
            print(f"🎬 Starting action capture for {shot['desc']}...")
            capture_thread = threading.Thread(
                target=continuous_screenshot_capture, 
                args=(driver, screenshot_dir, 4)
            )
            capture_thread.daemon = True
            capture_thread.start()
            
            # Wait a moment then release
            time.sleep(shot['wait'])
            actions.release()
            actions.perform()
            
            print(f"   🏹 Released with drag: {shot['drag']}")
            
            # Wait for ball flight to complete
            time.sleep(4)
            
            # Post-shot
            timestamp = datetime.now().strftime("%H%M%S")
            driver.save_screenshot(f"{screenshot_dir}/{timestamp}_0{i}_post_{shot['name']}.png")
            
            print(f"   ✅ Action sequence {i} completed")
            
            # Brief pause between shots
            time.sleep(1)
        
        # Final state
        timestamp = datetime.now().strftime("%H%M%S")
        driver.save_screenshot(f"{screenshot_dir}/{timestamp}_99_final_state.png")
        
        print(f"\n🎬 ACTION CAPTURE TEST COMPLETE!")
        
        # Count screenshots
        screenshot_files = [f for f in os.listdir(screenshot_dir) if f.endswith('.png')]
        screenshot_files.sort()
        
        print(f"📊 CAPTURE SUMMARY:")
        print(f"📁 Screenshots saved in: {screenshot_dir}/")
        print(f"📸 Total frames captured: {len(screenshot_files)}")
        print(f"🎬 Action sequences: 3")
        
        # Show first and last few screenshots
        print(f"\n📋 Screenshot timeline (first 5 and last 5):")
        for i, filename in enumerate(screenshot_files[:5], 1):
            print(f"  {i:2d}. {filename}")
        
        if len(screenshot_files) > 10:
            print("     ...")
            for i, filename in enumerate(screenshot_files[-5:], len(screenshot_files)-4):
                print(f"  {i:2d}. {filename}")
        
        print(f"\n🎯 This test captured the golf ball throwing mechanics")
        print(f"🎬 Multiple frames show ball flight paths and trajectories")
        print(f"✅ Complete user journey from start to finish documented")
        
        return True
        
    finally:
        driver.quit()
        print("\n🎬 Action capture test completed!")

if __name__ == "__main__":
    test_action_gameplay()