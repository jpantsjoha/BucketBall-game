#!/usr/bin/env python3
"""
Manual QA Test - Simple browser automation for BucketBall
Focus on measurable aspects that work reliably
"""

import time
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains

def test_basic_functionality():
    """Basic functionality test with manual verification points"""
    
    options = Options()
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    
    driver = webdriver.Chrome(options=options)
    driver.set_window_size(1920, 1080)
    
    results = {
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        "tests": []
    }
    
    try:
        print("Opening BucketBall game...")
        driver.get("http://localhost:8080")
        time.sleep(3)
        
        # Test 1: Page loads successfully
        title = driver.title
        print(f"Page title: {title}")
        results["tests"].append({
            "test": "Page Load",
            "result": "PASS" if "BucketBall" in title else "FAIL",
            "details": f"Title: {title}"
        })
        
        # Test 2: Canvas element exists and has proper size
        canvas = driver.find_element(By.ID, "game-canvas")
        canvas_size = canvas.size
        window_size = driver.get_window_size()
        
        print(f"Canvas size: {canvas_size}")
        print(f"Window size: {window_size}")
        
        width_utilization = (canvas_size['width'] / window_size['width']) * 100
        height_utilization = (canvas_size['height'] / window_size['height']) * 100
        
        results["tests"].append({
            "test": "Canvas Sizing",
            "result": "PASS" if width_utilization > 80 and height_utilization > 70 else "FAIL",
            "details": {
                "canvas_size": canvas_size,
                "window_size": window_size,
                "width_utilization": round(width_utilization, 1),
                "height_utilization": round(height_utilization, 1)
            }
        })
        
        # Test 3: Game UI elements present
        help_banner = driver.find_element(By.ID, "help-banner")
        toast_container = driver.find_element(By.ID, "toast-container")
        
        results["tests"].append({
            "test": "UI Elements Present",
            "result": "PASS",
            "details": "Help banner and toast container found"
        })
        
        # Test 4: Take screenshot for manual review
        screenshot_path = "/Users/jp/Library/Mobile Documents/com~apple~CloudDocs/Documents/workspaces/BucketBall-game/manual_test_screenshot.png"
        driver.save_screenshot(screenshot_path)
        
        results["tests"].append({
            "test": "Screenshot Captured",
            "result": "PASS",
            "details": f"Screenshot saved to: {screenshot_path}"
        })
        
        # Test 5: Simple click test (within canvas bounds)
        print("Testing simple click interaction...")
        canvas_center_x = canvas_size['width'] // 2
        canvas_center_y = canvas_size['height'] // 2
        
        # Click in center of canvas
        actions = ActionChains(driver)
        actions.move_to_element_with_offset(canvas, canvas_center_x, canvas_center_y)
        actions.click()
        actions.perform()
        
        time.sleep(1)
        
        results["tests"].append({
            "test": "Basic Click Interaction",
            "result": "PASS",
            "details": f"Clicked at canvas center ({canvas_center_x}, {canvas_center_y})"
        })
        
        # Test 6: Performance timing
        perf_timing = driver.execute_script("""
            return {
                loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
                domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart
            };
        """)
        
        results["tests"].append({
            "test": "Load Performance",
            "result": "PASS" if perf_timing["loadComplete"] < 5000 else "FAIL",
            "details": {
                "load_time_ms": perf_timing["loadComplete"],
                "dom_ready_ms": perf_timing["domReady"]
            }
        })
        
        print("\n=== TEST RESULTS ===")
        for test in results["tests"]:
            print(f"{test['test']}: {test['result']}")
            
        # Save results
        with open("/Users/jp/Library/Mobile Documents/com~apple~CloudDocs/Documents/workspaces/BucketBall-game/manual_test_results.json", "w") as f:
            json.dump(results, f, indent=2)
            
        passed = len([t for t in results["tests"] if t["result"] == "PASS"])
        total = len(results["tests"])
        print(f"\nOverall: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
        
        return results
        
    except Exception as e:
        print(f"Error during testing: {str(e)}")
        results["error"] = str(e)
        return results
        
    finally:
        time.sleep(2)  # Let user see final state
        driver.quit()

if __name__ == "__main__":
    test_basic_functionality()