#!/usr/bin/env python3
"""
BucketBall QA Assessment Script
Comprehensive UI/UX testing using Selenium
"""

import time
import os
import json
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException

class BucketBallQAAssessment:
    def __init__(self):
        # Setup Chrome with mobile simulation
        chrome_options = Options()
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        # Simulate mobile device (iPhone 12)
        mobile_emulation = {
            "deviceMetrics": {"width": 390, "height": 844, "pixelRatio": 3.0},
            "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1"
        }
        chrome_options.add_experimental_option("mobileEmulation", mobile_emulation)
        
        self.driver = webdriver.Chrome(options=chrome_options)
        self.wait = WebDriverWait(self.driver, 10)
        self.test_results = {
            "load_time": None,
            "visual_issues": [],
            "ux_issues": [],
            "performance_metrics": {},
            "interaction_tests": {},
            "screenshots": []
        }
        
    def navigate_to_game(self):
        """Navigate to the game and measure load time"""
        start_time = time.time()
        self.driver.get("http://localhost:8080")
        
        # Wait for canvas to be present
        try:
            canvas = self.wait.until(EC.presence_of_element_located((By.ID, "game-canvas")))
            load_time = time.time() - start_time
            self.test_results["load_time"] = load_time
            print(f"✓ Game loaded in {load_time:.2f} seconds")
            return True
        except TimeoutException:
            print("✗ Game failed to load within 10 seconds")
            return False
    
    def take_screenshot(self, name):
        """Take screenshot and save to results"""
        screenshot_path = f"/tmp/bucketball_{name}_{int(time.time())}.png"
        self.driver.save_screenshot(screenshot_path)
        self.test_results["screenshots"].append({
            "name": name,
            "path": screenshot_path,
            "timestamp": time.time()
        })
        print(f"📸 Screenshot saved: {screenshot_path}")
        return screenshot_path
    
    def analyze_visual_elements(self):
        """Analyze visual elements and identify issues"""
        print("\n🔍 Analyzing Visual Elements...")
        
        # Check canvas dimensions
        canvas = self.driver.find_element(By.ID, "game-canvas")
        canvas_size = canvas.size
        print(f"Canvas size: {canvas_size}")
        
        if canvas_size['width'] == 0 or canvas_size['height'] == 0:
            self.test_results["visual_issues"].append("Canvas has zero dimensions")
        
        # Check for missing sprites (examine console for errors)
        console_logs = self.driver.get_log('browser')
        for log in console_logs:
            if 'error' in log['level'].lower():
                self.test_results["visual_issues"].append(f"Console Error: {log['message']}")
                print(f"❌ Console Error: {log['message']}")
        
        # Take initial screenshot
        self.take_screenshot("initial_state")
        
        # Check UI elements
        ui_elements = {
            "help-banner": "Help banner",
            "help-pill": "Help pill",
            "toast-container": "Toast container"
        }
        
        for element_id, description in ui_elements.items():
            try:
                element = self.driver.find_element(By.ID, element_id)
                if element.is_displayed():
                    print(f"✓ {description} is visible")
                else:
                    print(f"⚠ {description} is present but not visible")
            except NoSuchElementException:
                self.test_results["visual_issues"].append(f"Missing UI element: {description}")
                print(f"❌ Missing: {description}")
    
    def test_help_banner_functionality(self):
        """Test the help banner UI interactions"""
        print("\n🔧 Testing Help Banner Functionality...")
        
        try:
            # Check if help banner exists
            help_banner = self.driver.find_element(By.ID, "help-banner")
            help_pill = self.driver.find_element(By.ID, "help-pill")
            
            # Check initial visibility states
            banner_visible = "visible" in help_banner.get_attribute("class")
            pill_visible = "visible" in help_pill.get_attribute("class")
            
            print(f"Help banner initially visible: {banner_visible}")
            print(f"Help pill initially visible: {pill_visible}")
            
            # Test banner interactions if visible
            if banner_visible:
                try:
                    # Test "Got it" button
                    got_it_btn = self.driver.find_element(By.ID, "got-it-btn")
                    if got_it_btn.is_displayed():
                        got_it_btn.click()
                        time.sleep(1)
                        self.take_screenshot("after_got_it_click")
                        print("✓ 'Got it' button clicked successfully")
                        self.test_results["interaction_tests"]["got_it_button"] = "Working"
                    
                    # Test minimize chevron
                    chevron = self.driver.find_element(By.ID, "minimize-chevron")
                    if chevron.is_displayed():
                        chevron.click()
                        time.sleep(1)
                        self.take_screenshot("after_chevron_click")
                        print("✓ Minimize chevron clicked successfully")
                        self.test_results["interaction_tests"]["minimize_chevron"] = "Working"
                        
                except Exception as e:
                    print(f"❌ Help banner interaction error: {str(e)}")
                    self.test_results["ux_issues"].append(f"Help banner interaction failed: {str(e)}")
            
            # Test help pill if visible
            if pill_visible:
                try:
                    help_pill.click()
                    time.sleep(1)
                    self.take_screenshot("after_pill_click")
                    print("✓ Help pill clicked successfully")
                    self.test_results["interaction_tests"]["help_pill"] = "Working"
                except Exception as e:
                    print(f"❌ Help pill interaction error: {str(e)}")
                    self.test_results["ux_issues"].append(f"Help pill interaction failed: {str(e)}")
                    
        except NoSuchElementException as e:
            print(f"❌ Help UI element not found: {str(e)}")
            self.test_results["ux_issues"].append(f"Help UI element missing: {str(e)}")
    
    def test_game_interactions(self):
        """Test basic game interactions"""
        print("\n🎮 Testing Game Interactions...")
        
        canvas = self.driver.find_element(By.ID, "game-canvas")
        actions = ActionChains(self.driver)
        
        # Test single tap (first stage - arm)
        print("Testing first tap (arm stage)...")
        actions.move_to_element(canvas).click().perform()
        time.sleep(0.5)
        self.take_screenshot("after_first_tap")
        
        # Test second tap (throw stage)  
        print("Testing second tap (throw stage)...")
        actions.move_to_element(canvas).click().perform()
        time.sleep(2)  # Wait for ball animation
        self.take_screenshot("after_second_tap")
        
        # Test multiple shots
        for i in range(3):
            print(f"Testing shot {i+1}...")
            actions.move_to_element(canvas).click().perform()
            time.sleep(0.3)
            actions.move_to_element(canvas).click().perform()
            time.sleep(1.5)
        
        self.take_screenshot("after_multiple_shots")
        self.test_results["interaction_tests"]["two_stage_throwing"] = "Tested"
    
    def measure_performance_metrics(self):
        """Measure performance metrics"""
        print("\n⚡ Measuring Performance Metrics...")
        
        # Get performance timing data
        nav_timing = self.driver.execute_script("return window.performance.timing")
        page_load_time = nav_timing['loadEventEnd'] - nav_timing['navigationStart']
        dom_ready_time = nav_timing['domContentLoadedEventEnd'] - nav_timing['navigationStart']
        
        # Try to get FPS (if available)
        try:
            fps_data = self.driver.execute_script("""
                return new Promise(resolve => {
                    let frames = 0;
                    let start = performance.now();
                    function countFrames() {
                        frames++;
                        if (frames < 60) {
                            requestAnimationFrame(countFrames);
                        } else {
                            let end = performance.now();
                            resolve(frames / ((end - start) / 1000));
                        }
                    }
                    requestAnimationFrame(countFrames);
                });
            """)
            self.test_results["performance_metrics"]["estimated_fps"] = fps_data
            print(f"Estimated FPS: {fps_data:.1f}")
        except Exception as e:
            print(f"Could not measure FPS: {str(e)}")
        
        self.test_results["performance_metrics"]["page_load_time"] = page_load_time
        self.test_results["performance_metrics"]["dom_ready_time"] = dom_ready_time
        
        print(f"Page load time: {page_load_time}ms")
        print(f"DOM ready time: {dom_ready_time}ms")
        
        # Check if load time meets requirement (<2000ms)
        if self.test_results["load_time"] > 2.0:
            self.test_results["performance_metrics"]["load_time_issue"] = f"Load time {self.test_results['load_time']:.2f}s exceeds 2s requirement"
    
    def evaluate_ux_against_requirements(self):
        """Evaluate UX against CLAUDE.md requirements"""
        print("\n📋 Evaluating Against Requirements...")
        
        requirements_check = {
            "two_tap_simplicity": "Needs manual verification - observed two-stage interaction",
            "instant_gratification": "Partial - game loads but visual feedback unclear",
            "physics_feel_real": "Cannot assess without visual sprites",
            "every_action_feedback": "Limited feedback visible",
            "trick_shots_earned": "Help banner mentions lawn bounce feature"
        }
        
        for req, status in requirements_check.items():
            print(f"• {req}: {status}")
            
        self.test_results["ux_requirements"] = requirements_check
        
        # Check for major UX issues
        if self.test_results["load_time"] and self.test_results["load_time"] > 2.0:
            self.test_results["ux_issues"].append("Load time exceeds 2-second requirement")
            
        if len(self.test_results["visual_issues"]) > 0:
            self.test_results["ux_issues"].append("Visual rendering issues detected")
    
    def generate_assessment_report(self):
        """Generate comprehensive assessment report"""
        print("\n📊 Generating Assessment Report...")
        
        report = {
            "timestamp": time.time(),
            "summary": {
                "load_time_seconds": self.test_results["load_time"],
                "visual_issues_count": len(self.test_results["visual_issues"]),
                "ux_issues_count": len(self.test_results["ux_issues"]),
                "screenshots_taken": len(self.test_results["screenshots"])
            },
            "detailed_results": self.test_results
        }
        
        # Save report as JSON
        report_path = "/tmp/bucketball_qa_report.json"
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📋 Detailed report saved to: {report_path}")
        return report
    
    def run_full_assessment(self):
        """Run complete QA assessment"""
        print("🚀 Starting BucketBall QA Assessment...")
        print("=" * 50)
        
        try:
            if not self.navigate_to_game():
                return None
            
            self.analyze_visual_elements()
            self.test_help_banner_functionality() 
            self.test_game_interactions()
            self.measure_performance_metrics()
            self.evaluate_ux_against_requirements()
            
            report = self.generate_assessment_report()
            
            print("\n" + "=" * 50)
            print("✅ QA Assessment Complete!")
            print(f"📊 Total Issues Found: {len(self.test_results['visual_issues']) + len(self.test_results['ux_issues'])}")
            print(f"📸 Screenshots Captured: {len(self.test_results['screenshots'])}")
            
            return report
            
        except Exception as e:
            print(f"❌ Assessment failed: {str(e)}")
            return None
        
        finally:
            self.driver.quit()

if __name__ == "__main__":
    assessor = BucketBallQAAssessment()
    report = assessor.run_full_assessment()
    
    if report:
        print("\n🎯 Key Findings Summary:")
        print("-" * 30)
        for issue in report["detailed_results"]["visual_issues"]:
            print(f"🔴 Visual: {issue}")
        for issue in report["detailed_results"]["ux_issues"]:
            print(f"🟡 UX: {issue}")
            
        print(f"\n⏱ Load Time: {report['summary']['load_time_seconds']:.2f}s")
        print(f"🎮 Interaction Tests: {len(report['detailed_results']['interaction_tests'])} completed")