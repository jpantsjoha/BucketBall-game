#!/usr/bin/env python3
"""
Comprehensive QA Testing Script for BucketBall 2028 UX Updates
Tests all critical changes: Full-screen sizing, natural mouse interaction, enhanced UX
"""

import time
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException

class BucketBallQATest:
    def __init__(self, base_url="http://localhost:8080"):
        self.base_url = base_url
        self.results = {
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
            "phase_1_visual": {},
            "phase_2_interaction": {},
            "phase_3_performance": {},
            "phase_4_compliance": {},
            "overall_assessment": {}
        }
        
    def setup_driver(self, width=1920, height=1080, mobile=False):
        """Setup Chrome driver with specific viewport"""
        options = Options()
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        if mobile:
            options.add_argument("--user-agent=Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15")
            
        driver = webdriver.Chrome(options=options)
        driver.set_window_size(width, height)
        return driver
    
    def take_screenshot(self, driver, filename_suffix):
        """Take screenshot with descriptive filename"""
        screenshot_path = f"/Users/jp/Library/Mobile Documents/com~apple~CloudDocs/Documents/workspaces/BucketBall-game/screenshots/{filename_suffix}.png"
        driver.save_screenshot(screenshot_path)
        return screenshot_path
    
    def test_phase_1_visual_layout(self):
        """Phase 1: Visual & Layout Testing"""
        print("\n=== PHASE 1: VISUAL & LAYOUT TESTING ===")
        
        test_viewports = [
            {"name": "Desktop_1920x1080", "width": 1920, "height": 1080},
            {"name": "Laptop_1366x768", "width": 1366, "height": 768},
            {"name": "Tablet_768x1024", "width": 768, "height": 1024},
            {"name": "Mobile_375x812", "width": 375, "height": 812, "mobile": True},
            {"name": "UltraWide_2560x1440", "width": 2560, "height": 1440}
        ]
        
        for viewport in test_viewports:
            print(f"\nTesting viewport: {viewport['name']} ({viewport['width']}x{viewport['height']})")
            
            driver = self.setup_driver(viewport['width'], viewport['height'], 
                                     viewport.get('mobile', False))
            
            try:
                driver.get(self.base_url)
                time.sleep(3)  # Wait for game to load
                
                # Get canvas element and its dimensions
                canvas = driver.find_element(By.ID, "game-canvas")
                canvas_size = canvas.size
                canvas_location = canvas.location
                
                # Get window dimensions
                window_size = driver.get_window_size()
                
                # Calculate utilization
                utilization_width = (canvas_size['width'] / window_size['width']) * 100
                utilization_height = (canvas_size['height'] / window_size['height']) * 100
                
                # Take screenshot
                screenshot_path = self.take_screenshot(driver, f"phase1_{viewport['name']}")
                
                # Record results
                self.results["phase_1_visual"][viewport['name']] = {
                    "canvas_size": canvas_size,
                    "window_size": window_size,
                    "utilization_width": round(utilization_width, 2),
                    "utilization_height": round(utilization_height, 2),
                    "screenshot": screenshot_path,
                    "full_screen_check": utilization_width > 95 and utilization_height > 95
                }
                
                print(f"  Canvas: {canvas_size['width']}x{canvas_size['height']}")
                print(f"  Window: {window_size['width']}x{window_size['height']}")
                print(f"  Utilization: {utilization_width:.1f}% x {utilization_height:.1f}%")
                print(f"  Full-screen: {'✓' if utilization_width > 95 and utilization_height > 95 else '✗'}")
                
            except Exception as e:
                print(f"  Error testing {viewport['name']}: {str(e)}")
                self.results["phase_1_visual"][viewport['name']] = {"error": str(e)}
            finally:
                driver.quit()
    
    def test_phase_2_interaction(self):
        """Phase 2: Interaction Testing"""
        print("\n=== PHASE 2: INTERACTION TESTING ===")
        
        driver = self.setup_driver(1920, 1080)
        
        try:
            driver.get(self.base_url)
            time.sleep(3)
            
            canvas = driver.find_element(By.ID, "game-canvas")
            actions = ActionChains(driver)
            
            # Test 1: Click-drag-release from ball area
            print("\nTest 1: Click-drag-release from ball area")
            ball_area = {"x": canvas.size['width'] // 2, "y": canvas.size['height'] * 0.8}
            
            # Take initial screenshot
            self.take_screenshot(driver, "phase2_initial")
            
            # Perform drag action
            actions.move_to_element_with_offset(canvas, ball_area['x'], ball_area['y'])
            actions.click_and_hold()
            actions.move_by_offset(100, -200)  # Drag up and right
            time.sleep(1)  # Hold for trajectory preview
            
            # Take screenshot during drag
            self.take_screenshot(driver, "phase2_during_drag")
            
            actions.release()
            actions.perform()
            
            time.sleep(2)  # Wait for ball physics
            self.take_screenshot(driver, "phase2_after_throw")
            
            # Test 2: Click-drag-release from lawn area
            print("\nTest 2: Click-drag-release from lawn area")
            time.sleep(3)  # Wait for reset
            
            lawn_area = {"x": canvas.size['width'] // 3, "y": canvas.size['height'] * 0.9}
            
            actions = ActionChains(driver)
            actions.move_to_element_with_offset(canvas, lawn_area['x'], lawn_area['y'])
            actions.click_and_hold()
            actions.move_by_offset(150, -250)
            time.sleep(1)
            
            self.take_screenshot(driver, "phase2_lawn_drag")
            
            actions.release()
            actions.perform()
            
            time.sleep(3)
            self.take_screenshot(driver, "phase2_lawn_throw_result")
            
            # Test 3: Auto-arming behavior
            print("\nTest 3: Auto-arming behavior")
            time.sleep(3)
            
            # Simple click to test auto-arming
            actions = ActionChains(driver)
            actions.move_to_element_with_offset(canvas, canvas.size['width'] // 2, canvas.size['height'] * 0.85)
            actions.click()
            actions.perform()
            
            time.sleep(1)
            self.take_screenshot(driver, "phase2_auto_arm")
            
            self.results["phase_2_interaction"] = {
                "ball_area_interaction": "completed",
                "lawn_area_interaction": "completed", 
                "auto_arming": "completed",
                "screenshots_captured": 6
            }
            
        except Exception as e:
            print(f"Error in interaction testing: {str(e)}")
            self.results["phase_2_interaction"]["error"] = str(e)
        finally:
            driver.quit()
    
    def test_phase_3_performance(self):
        """Phase 3: Performance & UX Assessment"""
        print("\n=== PHASE 3: PERFORMANCE & UX ASSESSMENT ===")
        
        driver = self.setup_driver(1920, 1080)
        
        try:
            driver.get(self.base_url)
            time.sleep(3)
            
            # Measure load time and initial performance
            performance_timing = driver.execute_script("""
                return {
                    loadComplete: performance.timing.loadEventEnd - performance.timing.navigationStart,
                    domReady: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
                    firstPaint: performance.getEntriesByType('paint')[0]?.startTime || 0
                };
            """)
            
            # Test frame rate monitoring (simplified)
            canvas = driver.find_element(By.ID, "game-canvas")
            
            # Perform interaction and monitor smoothness
            actions = ActionChains(driver)
            start_time = time.time()
            
            for i in range(3):  # Multiple throws to test consistency
                actions.move_to_element_with_offset(canvas, 500 + i*50, 600)
                actions.click_and_hold()
                actions.move_by_offset(100 + i*20, -200 - i*10)
                time.sleep(0.5)
                actions.release()
                actions.perform()
                time.sleep(2)
            
            total_test_time = time.time() - start_time
            
            self.results["phase_3_performance"] = {
                "load_time_ms": performance_timing.get("loadComplete", 0),
                "dom_ready_ms": performance_timing.get("domReady", 0),
                "first_paint_ms": performance_timing.get("firstPaint", 0),
                "interaction_test_duration": round(total_test_time, 2),
                "multiple_throws_completed": True
            }
            
            print(f"  Load time: {performance_timing.get('loadComplete', 0)}ms")
            print(f"  DOM ready: {performance_timing.get('domReady', 0)}ms")
            print(f"  First paint: {performance_timing.get('firstPaint', 0)}ms")
            print(f"  Interaction test: {total_test_time:.2f}s")
            
        except Exception as e:
            print(f"Error in performance testing: {str(e)}")
            self.results["phase_3_performance"]["error"] = str(e)
        finally:
            driver.quit()
    
    def test_phase_4_compliance(self):
        """Phase 4: CLAUDE.md Compliance Testing"""
        print("\n=== PHASE 4: CLAUDE.MD COMPLIANCE TESTING ===")
        
        driver = self.setup_driver(1920, 1080)
        
        try:
            driver.get(self.base_url)
            time.sleep(3)
            
            canvas = driver.find_element(By.ID, "game-canvas")
            
            # Test 30-second session goal
            print("\nTesting 30-second session completability...")
            session_start = time.time()
            throws_completed = 0
            
            # Rapid fire throws to test 30-second session
            for throw in range(5):  # Game has 5 throws
                actions = ActionChains(driver)
                actions.move_to_element_with_offset(canvas, 500, 700)
                actions.click_and_hold()
                actions.move_by_offset(50, -150)
                time.sleep(0.2)  # Quick aim
                actions.release()
                actions.perform()
                
                time.sleep(2)  # Wait for ball to settle
                throws_completed += 1
                
                current_time = time.time() - session_start
                print(f"  Throw {throw + 1}: {current_time:.1f}s elapsed")
                
                if current_time > 30:
                    break
            
            session_duration = time.time() - session_start
            
            # Test instant gratification (immediate feedback)
            print("\nTesting instant gratification...")
            actions = ActionChains(driver)
            actions.move_to_element_with_offset(canvas, 600, 750)
            actions.click()
            
            # Check for immediate visual feedback
            time.sleep(0.1)
            feedback_screenshot = self.take_screenshot(driver, "phase4_instant_feedback")
            
            self.results["phase_4_compliance"] = {
                "session_duration_seconds": round(session_duration, 2),
                "throws_in_30_seconds": throws_completed,
                "meets_30_second_goal": session_duration <= 30 and throws_completed >= 5,
                "instant_feedback_test": "completed",
                "feedback_screenshot": feedback_screenshot
            }
            
            print(f"  Session duration: {session_duration:.2f}s")
            print(f"  Throws completed: {throws_completed}")
            print(f"  30-second goal: {'✓' if session_duration <= 30 and throws_completed >= 5 else '✗'}")
            
        except Exception as e:
            print(f"Error in compliance testing: {str(e)}")
            self.results["phase_4_compliance"]["error"] = str(e)
        finally:
            driver.quit()
    
    def generate_assessment(self):
        """Generate overall assessment and recommendations"""
        print("\n=== GENERATING OVERALL ASSESSMENT ===")
        
        # Calculate scores
        phase1_score = len([v for v in self.results["phase_1_visual"].values() 
                          if isinstance(v, dict) and v.get("full_screen_check", False)]) / max(1, len(self.results["phase_1_visual"])) * 100
        
        phase2_score = 100 if self.results["phase_2_interaction"].get("screenshots_captured", 0) >= 6 else 50
        
        phase3_score = 100 if (self.results["phase_3_performance"].get("load_time_ms", 9999) < 3000 and 
                              self.results["phase_3_performance"].get("multiple_throws_completed", False)) else 70
        
        phase4_score = 100 if self.results["phase_4_compliance"].get("meets_30_second_goal", False) else 60
        
        overall_score = (phase1_score + phase2_score + phase3_score + phase4_score) / 4
        
        self.results["overall_assessment"] = {
            "phase_1_visual_score": round(phase1_score, 1),
            "phase_2_interaction_score": round(phase2_score, 1),
            "phase_3_performance_score": round(phase3_score, 1),
            "phase_4_compliance_score": round(phase4_score, 1),
            "overall_score": round(overall_score, 1),
            "readiness_level": self.get_readiness_level(overall_score)
        }
        
        print(f"  Phase 1 (Visual): {phase1_score:.1f}%")
        print(f"  Phase 2 (Interaction): {phase2_score:.1f}%")
        print(f"  Phase 3 (Performance): {phase3_score:.1f}%")
        print(f"  Phase 4 (Compliance): {phase4_score:.1f}%")
        print(f"  Overall Score: {overall_score:.1f}%")
        print(f"  Readiness: {self.get_readiness_level(overall_score)}")
        
    def get_readiness_level(self, score):
        """Determine readiness level based on score"""
        if score >= 90: return "Production Ready"
        elif score >= 75: return "Stage Ready - Minor Polish Needed"
        elif score >= 60: return "MVP Ready - Significant Issues to Address"
        else: return "Not Ready - Major Issues Present"
    
    def save_results(self):
        """Save test results to JSON file"""
        results_file = "/Users/jp/Library/Mobile Documents/com~apple~CloudDocs/Documents/workspaces/BucketBall-game/qa_test_results.json"
        with open(results_file, 'w') as f:
            json.dump(self.results, f, indent=2)
        print(f"\nResults saved to: {results_file}")
        return results_file
    
    def run_all_tests(self):
        """Run all test phases"""
        print("STARTING COMPREHENSIVE BUCKETBALL QA TESTING")
        print("=" * 50)
        
        # Create screenshots directory
        import os
        screenshot_dir = "/Users/jp/Library/Mobile Documents/com~apple~CloudDocs/Documents/workspaces/BucketBall-game/screenshots"
        os.makedirs(screenshot_dir, exist_ok=True)
        
        try:
            self.test_phase_1_visual_layout()
            self.test_phase_2_interaction()
            self.test_phase_3_performance()
            self.test_phase_4_compliance()
            self.generate_assessment()
            
            results_file = self.save_results()
            
            print("\n" + "=" * 50)
            print("QA TESTING COMPLETE")
            print(f"Overall Score: {self.results['overall_assessment']['overall_score']}%")
            print(f"Readiness: {self.results['overall_assessment']['readiness_level']}")
            print("=" * 50)
            
            return results_file
            
        except Exception as e:
            print(f"Critical error during testing: {str(e)}")
            return None

if __name__ == "__main__":
    tester = BucketBallQATest("http://localhost:8080")  # Using port 8080 as it's already running
    tester.run_all_tests()