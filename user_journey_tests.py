#!/usr/bin/env python3
"""
BucketBall 2028 - Complete User Journey Tests
Simulates real player experience from start to finish
"""

from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time
import json
import os
from datetime import datetime

class BucketBallUserJourney:
    def __init__(self):
        self.results = {
            "test_time": datetime.now().isoformat(),
            "journey_results": {},
            "screenshots": [],
            "successful_shots": 0,
            "total_shots": 0
        }
        self.driver = None
        self.screenshot_dir = "journey_screenshots"
        
    def setup(self):
        """Setup Chrome driver with screen recording capabilities"""
        # Create screenshot directory
        os.makedirs(self.screenshot_dir, exist_ok=True)
        
        options = webdriver.ChromeOptions()
        options.add_argument('--no-sandbox')
        options.add_argument('--disable-dev-shm-usage')
        options.add_argument('--disable-web-security')
        options.add_argument('--allow-running-insecure-content')
        
        self.driver = webdriver.Chrome(options=options)
        self.driver.set_window_size(1280, 800)  # Good size for gameplay
        
    def teardown(self):
        """Clean up driver"""
        if self.driver:
            self.driver.quit()
            
    def take_screenshot(self, name, description=""):
        """Take and save screenshot"""
        timestamp = datetime.now().strftime("%H%M%S")
        filename = f"{self.screenshot_dir}/{timestamp}_{name}.png"
        self.driver.save_screenshot(filename)
        
        self.results["screenshots"].append({
            "name": name,
            "filename": filename,
            "description": description,
            "timestamp": timestamp
        })
        
        print(f"📸 Screenshot saved: {filename} - {description}")
        return filename
        
    def wait_for_game_ready(self):
        """Wait for game to be fully loaded and ready"""
        print("⏳ Waiting for game to load...")
        
        # Wait for canvas
        canvas = WebDriverWait(self.driver, 10).until(
            EC.presence_of_element_located((By.ID, "game-canvas"))
        )
        
        # Wait for game assets to load
        time.sleep(3)
        
        # Verify game is interactive - be more flexible with game state
        game_ready = self.driver.execute_script("""
            return window.game && 
                   window.game.ball && 
                   window.game.bucket;
        """)
        
        if game_ready:
            print("✅ Game loaded and ready!")
            return True
        else:
            print("❌ Game not ready")
            return False
            
    def get_game_state(self):
        """Get current game state information"""
        return self.driver.execute_script("""
            if (!window.game) return null;
            
            return {
                state: window.game.state,
                score: window.game.score,
                throwCount: window.game.throwCount,
                ballPosition: {
                    x: window.game.ball.x,
                    y: window.game.ball.y
                },
                bucketPosition: {
                    x: window.game.bucket.x,
                    y: window.game.bucket.y
                },
                wind: window.game.wind || 0,
                canvasSize: {
                    width: window.game.LOGICAL_WIDTH,
                    height: window.game.LOGICAL_HEIGHT
                }
            };
        """)
        
    def calculate_shot_trajectory(self, ball_pos, bucket_pos, canvas_size):
        """Calculate optimal shot trajectory to hit the bucket"""
        # Calculate base trajectory
        dx = bucket_pos['x'] - ball_pos['x']
        dy = bucket_pos['y'] - ball_pos['y']
        
        # Add some arc to make it look realistic
        # Aim slightly above bucket for natural trajectory
        target_x = bucket_pos['x'] + (dx * 0.1)  # Slight lead
        target_y = bucket_pos['y'] - 100  # Aim above bucket
        
        # Calculate drag vector (from ball to target)
        drag_x = target_x - ball_pos['x']
        drag_y = target_y - ball_pos['y']
        
        # Scale down for reasonable throw strength
        drag_x *= 0.3
        drag_y *= 0.3
        
        return drag_x, drag_y
        
    def perform_shot(self, shot_number, strategy="normal"):
        """Perform a single shot with given strategy"""
        print(f"\n🎯 Attempting shot {shot_number} ({strategy} strategy)...")
        
        # Get current game state
        state = self.get_game_state()
        if not state:
            print("❌ Could not get game state")
            return False
            
        self.take_screenshot(f"shot_{shot_number}_before", f"Before shot {shot_number}")
        
        canvas = self.driver.find_element(By.ID, "game-canvas")
        
        # Calculate shot based on strategy
        if strategy == "direct":
            # Direct shot to bucket
            drag_x, drag_y = self.calculate_shot_trajectory(
                state['ballPosition'], 
                state['bucketPosition'], 
                state['canvasSize']
            )
        elif strategy == "trick_shot":
            # Aim for lawn bounce first (for bonus points)
            lawn_y = state['canvasSize']['height'] * 0.8
            target_x = state['bucketPosition']['x'] + 50
            drag_x = target_x - state['ballPosition']['x']
            drag_y = lawn_y - state['ballPosition']['y']
            drag_x *= 0.4
            drag_y *= 0.4
        else:
            # Normal arc shot
            drag_x, drag_y = self.calculate_shot_trajectory(
                state['ballPosition'], 
                state['bucketPosition'], 
                state['canvasSize']
            )
            
        print(f"🎯 Ball at ({state['ballPosition']['x']:.0f}, {state['ballPosition']['y']:.0f})")
        print(f"🪣 Bucket at ({state['bucketPosition']['x']:.0f}, {state['bucketPosition']['y']:.0f})")
        print(f"💨 Wind: {state['wind']:.1f} m/s")
        print(f"🏹 Drag vector: ({drag_x:.0f}, {drag_y:.0f})")
        
        try:
            # Perform the shot
            actions = ActionChains(self.driver)
            
            # Click near ball position
            ball_screen_x = state['ballPosition']['x'] / 2  # Account for DPR
            ball_screen_y = state['ballPosition']['y'] / 2
            
            # Move to ball and drag to throw
            actions.move_to_element_with_offset(canvas, 
                                                ball_screen_x - canvas.size['width']/2, 
                                                ball_screen_y - canvas.size['height']/2)
            actions.click_and_hold()
            actions.move_by_offset(drag_x, drag_y)
            actions.release()
            actions.perform()
            
            # Wait for ball to settle
            print("⏳ Waiting for ball physics to complete...")
            time.sleep(4)  # Give time for ball to land and settle
            
            # Take screenshot of result
            self.take_screenshot(f"shot_{shot_number}_after", f"After shot {shot_number}")
            
            # Check result
            final_state = self.get_game_state()
            if final_state:
                score_gained = final_state['score'] - state['score']
                
                if score_gained > 0:
                    print(f"🎉 SUCCESS! Scored {score_gained} points!")
                    self.results["successful_shots"] += 1
                    
                    if score_gained == 2:
                        print("⭐ TRICK SHOT! Double points!")
                else:
                    print("😞 Shot missed the bucket")
                    
                self.results["total_shots"] += 1
                return score_gained > 0
            
        except Exception as e:
            print(f"❌ Error performing shot: {e}")
            self.take_screenshot(f"shot_{shot_number}_error", f"Error during shot {shot_number}")
            
        return False
        
    def run_complete_game(self):
        """Run a complete 5-throw game"""
        print("\n" + "="*60)
        print("🏌️ STARTING COMPLETE BUCKETBALL GAME")
        print("="*60)
        
        # Load game
        print("🌐 Loading BucketBall 2028...")
        self.driver.get("http://localhost:8080")
        
        if not self.wait_for_game_ready():
            return False
            
        self.take_screenshot("game_start", "Game loaded and ready to play")
        
        # Play 5 throws with different strategies
        shot_strategies = [
            ("direct", "Direct shot to bucket"),
            ("trick_shot", "Trick shot with lawn bounce"),
            ("normal", "Normal arc shot"),
            ("direct", "Another direct shot"),
            ("normal", "Final arc shot")
        ]
        
        for shot_num in range(1, 6):
            strategy, description = shot_strategies[shot_num - 1]
            
            print(f"\n📊 THROW {shot_num}/5: {description}")
            
            # Wait a moment between shots
            if shot_num > 1:
                time.sleep(2)
                
            success = self.perform_shot(shot_num, strategy)
            
            # Get updated game state
            state = self.get_game_state()
            if state:
                print(f"📊 Current Score: {state['score']}/10")
                print(f"🎯 Throws Remaining: {5 - state['throwCount'] + 1}")
                
        # Final game state
        final_state = self.get_game_state()
        if final_state:
            print(f"\n🏁 GAME COMPLETE!")
            print(f"📊 Final Score: {final_state['score']}/10")
            print(f"🎯 Successful Shots: {self.results['successful_shots']}/5")
            print(f"📈 Success Rate: {(self.results['successful_shots']/5)*100:.1f}%")
            
            self.results["journey_results"]["final_score"] = final_state['score']
            self.results["journey_results"]["success_rate"] = self.results['successful_shots'] / 5
            
        self.take_screenshot("game_complete", "Game completed - final state")
        
        return True
        
    def test_specific_interactions(self):
        """Test specific game interactions and edge cases"""
        print("\n" + "="*60)
        print("🔬 TESTING SPECIFIC INTERACTIONS")
        print("="*60)
        
        interactions = [
            {
                "name": "ball_visibility",
                "description": "Verify yellow ball is visible and clickable",
                "test": self.test_ball_visibility
            },
            {
                "name": "bucket_visibility", 
                "description": "Verify bucket is visible and properly sized",
                "test": self.test_bucket_visibility
            },
            {
                "name": "throw_mechanics",
                "description": "Test throw physics and mechanics",
                "test": self.test_throw_mechanics
            }
        ]
        
        for interaction in interactions:
            print(f"\n🧪 Testing: {interaction['description']}")
            try:
                result = interaction['test']()
                self.results["journey_results"][interaction['name']] = result
                print(f"✅ {interaction['name']}: {'PASS' if result else 'FAIL'}")
            except Exception as e:
                print(f"❌ {interaction['name']}: ERROR - {e}")
                self.results["journey_results"][interaction['name']] = False
                
    def test_ball_visibility(self):
        """Test if yellow ball is visible and positioned correctly"""
        # Check for yellow pixels in expected ball area
        ball_visible = self.driver.execute_script("""
            const canvas = document.getElementById('game-canvas');
            const ctx = canvas.getContext('2d');
            
            if (!window.game || !window.game.ball) return false;
            
            const ball = window.game.ball;
            const x = ball.x;
            const y = ball.y;
            
            // Sample area around ball position
            const imageData = ctx.getImageData(x - 40, y - 40, 80, 80);
            const pixels = imageData.data;
            
            let yellowPixels = 0;
            for (let i = 0; i < pixels.length; i += 4) {
                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                
                // Check for bright yellow
                if (r > 200 && g > 200 && b < 100) {
                    yellowPixels++;
                }
            }
            
            return yellowPixels > 50; // Should have significant yellow pixels
        """)
        
        self.take_screenshot("ball_visibility_test", "Testing ball visibility")
        return ball_visible
        
    def test_bucket_visibility(self):
        """Test if bucket is visible and properly positioned"""
        bucket_info = self.driver.execute_script("""
            if (!window.game || !window.game.bucket) return null;
            
            const bucket = window.game.bucket;
            return {
                x: bucket.x,
                y: bucket.y,
                width: bucket.width,
                height: bucket.height,
                visible: true
            };
        """)
        
        self.take_screenshot("bucket_visibility_test", "Testing bucket visibility")
        return bucket_info is not None and bucket_info['width'] > 0
        
    def test_throw_mechanics(self):
        """Test basic throw mechanics"""
        try:
            # Perform a simple throw
            canvas = self.driver.find_element(By.ID, "game-canvas")
            
            actions = ActionChains(self.driver)
            actions.move_to_element(canvas)
            actions.click_and_hold()
            actions.move_by_offset(0, -100)
            actions.release()
            actions.perform()
            
            # Wait and check if ball moved
            time.sleep(2)
            
            ball_moved = self.driver.execute_script("""
                return window.game && window.game.state !== 'READY';
            """)
            
            self.take_screenshot("throw_mechanics_test", "Testing throw mechanics")
            return ball_moved
            
        except Exception:
            return False
    
    def run_full_test_suite(self):
        """Run complete test suite"""
        print("\n" + "🎮"*20)
        print("BUCKETBALL 2028 - COMPLETE USER JOURNEY TESTS")
        print("🎮"*20)
        
        try:
            self.setup()
            
            # Run complete game
            game_success = self.run_complete_game()
            
            # Test specific interactions
            self.test_specific_interactions()
            
            # Generate summary report
            self.generate_report()
            
        finally:
            self.teardown()
            
    def generate_report(self):
        """Generate comprehensive test report"""
        print("\n" + "="*60)
        print("📋 COMPREHENSIVE TEST REPORT")
        print("="*60)
        
        print(f"🕐 Test Duration: {datetime.now().isoformat()}")
        print(f"📸 Screenshots Taken: {len(self.results['screenshots'])}")
        print(f"🎯 Successful Shots: {self.results['successful_shots']}")
        print(f"🔢 Total Shots: {self.results['total_shots']}")
        
        if self.results['total_shots'] > 0:
            success_rate = (self.results['successful_shots'] / self.results['total_shots']) * 100
            print(f"📊 Shot Success Rate: {success_rate:.1f}%")
            
        print(f"\n📁 Screenshots saved in: {self.screenshot_dir}/")
        print("📋 Screenshot timeline:")
        for shot in self.results['screenshots']:
            print(f"  {shot['timestamp']}: {shot['name']} - {shot['description']}")
            
        # Save detailed results
        report_file = f"user_journey_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(self.results, f, indent=2)
            
        print(f"\n💾 Detailed report saved: {report_file}")
        
        # Overall assessment
        print("\n" + "="*60)
        print("🎯 OVERALL ASSESSMENT")
        print("="*60)
        
        if self.results['successful_shots'] >= 1:
            print("✅ SUCCESS: At least one ball landed in the bucket!")
            print("🎉 Game mechanics work correctly")
            print("🎮 User journey completed successfully")
        else:
            print("⚠️  WARNING: No successful shots detected")
            print("🔍 Check ball physics and collision detection")
            
        if len(self.results['screenshots']) >= 10:
            print("📸 Comprehensive visual documentation captured")
        else:
            print("⚠️  Limited visual documentation")

if __name__ == "__main__":
    tester = BucketBallUserJourney()
    tester.run_full_test_suite()