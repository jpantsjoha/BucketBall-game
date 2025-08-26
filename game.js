const CONFIG = {
    // Game mechanics - Dynamic sizing instead of fixed logical dimensions
    MIN_ASPECT_RATIO: 0.5,  // Minimum width/height ratio (very tall)
    MAX_ASPECT_RATIO: 2.0,   // Maximum width/height ratio (very wide)
    PREFERRED_ASPECT_RATIO: 1080/1920, // Original design ratio
    BASE_WIDTH: 1080,        // Base reference for scaling
    BASE_HEIGHT: 1920,
    THROW_COUNT: 5,
    
    // Auto-reset timing
    MISS_AUTO_RESET_DELAY: 2000, // 2 seconds after ball settles and misses

    // Physics
    GRAVITY: 2000, // px/s²
    WIND_RANGE: [-2.0, 2.0], // m/s
    WIND_FACTOR: 40, // Conversion factor from m/s to px/s²
    BALL_RESTITUTION: [0.55, 0.65], // min/max
    BALL_SPIN_JITTER: 0.05,
    LAWN_RESTITUTION: 0.35,
    LAWN_NORMAL_JITTER: 2, // degrees
    BUCKET_TILT_DAMPING: 0.95,
    BUCKET_TOPPLE_ANGLE: 18, // degrees

    // Input thresholds
    SWIPE_THRESHOLD: 60, // px
    ARMING_HOLD_DURATION: 100, // ms
    DISMISS_TO_THROW_DELAY: 150, // ms
    AUTO_DISARM_DELAY: 4000, // ms
    SETTLE_VELOCITY_THRESHOLD: 10, // px/s
    SETTLE_DURATION: 400, // ms
    
    // 3rd Person POV Physics
    POV_ANGLE: 25, // degrees - looking down at 25 degree angle
    PLAYER_HEIGHT: 60, // inches (5 feet)
    BUCKET_HEIGHT: 10, // inches
    REAL_DISTANCE: 196.85, // inches (5 meters)
    DEPTH_SCALE_FACTOR: 0.7, // Visual depth scaling for 3D effect

    // Colors
    COLORS: {
        BUCKET_MATTE_BLACK: '#111111',
        BALL_GOLD: '#FFD700',
        BALL_OUTLINE: '#8C6F00',
        GRASS_BASE: '#2ECC71',
        GRASS_TUFTS: '#27AE60',
        GRASS_OUTLINE: '#0E5A2C',
        ARMED_LAWN_OVERLAY: 'rgba(46, 111, 163, 0.6)', // #2E6FA3 with 0.6 alpha
        UI_ACCENTS: '#3498DB',
        BACKGROUND: '#FFFFFF',
        WHITE: '#FFFFFF'
    },

    // Layout
    LAWN_HEIGHT_PERCENT: 0.20, // 20% of screen height for player interaction area
    BUCKET_Y_PERCENT_RANGE: [0.1, 0.2], // 10-20% from top
    BUCKET_X_JITTER_PERCENT: 0.1, // ±10% of width

    // Assets - will be populated later
    ASSETS: {}
};

const GameState = {
    READY: 'READY',         // Waiting for first input
    ARMED: 'ARMED',         // Lawn is active, ready to throw
    LAUNCHED: 'LAUNCHED',   // Ball is in the air
    RESOLVING: 'RESOLVING', // Ball has landed, checking for score
    NEXT_THROW: 'NEXT_THROW',// Transitioning to the next throw
    END_GAME: 'END_GAME'      // Game over
};

class Ball {
    constructor(game) {
        this.game = game;
        this.baseRadius = 25;  // Golf ball size - increased for visibility
        this.reset();
        console.log("Ball created");
    }

    reset() {
        this.x = this.game.LOGICAL_WIDTH / 2;
        // Position ball in visible area - more towards center but still in bottom area
        this.y = this.game.LOGICAL_HEIGHT * 0.85; // 85% down to ensure visibility
        this.vx = 0;
        this.vy = 0;
        this.landed = false;
        this.firstCollision = null;
        console.log(`Ball reset to position: x=${this.x.toFixed(1)}, y=${this.y.toFixed(1)} on ${this.game.LOGICAL_WIDTH}x${this.game.LOGICAL_HEIGHT} canvas`);
    }
    
    getPerspectiveFactor() {
        // Ball appears smaller when higher on screen (farther away in 3D space)
        // At lawn level (bottom): factor = 1.0 (normal size)
        // At bucket level (top): factor = CONFIG.DEPTH_SCALE_FACTOR (smaller)
        const lawnY = this.game.LOGICAL_HEIGHT * (1 - CONFIG.LAWN_HEIGHT_PERCENT);
        const bucketY = this.game.LOGICAL_HEIGHT * 0.15; // Approximate bucket position
        
        const relativePosition = Math.max(0, Math.min(1, (lawnY - this.y) / (lawnY - bucketY)));
        return 1.0 - relativePosition * (1.0 - CONFIG.DEPTH_SCALE_FACTOR);
    }
    
    // Get effective radius for collision detection (accounts for perspective)
    getEffectiveRadius(scale) {
        return this.baseRadius * scale * this.getPerspectiveFactor();
    }

    update(deltaTime, wind) {
        if (this.landed) return;

        // Apply gravity and wind
        this.vy += CONFIG.GRAVITY * deltaTime;
        this.vx += wind * CONFIG.WIND_FACTOR * deltaTime;

        // Update position
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
    }

    draw(ctx, scale) {
        // Always use full size for visibility - no perspective scaling
        const radius = Math.max(25, this.baseRadius * scale); // Large golf ball size
        
        // Draw shadow first
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(this.x + 4, this.y + 6, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
        // Main ball - BRIGHT YELLOW
        ctx.save();
        ctx.fillStyle = '#FFFF00';  // Pure bright yellow
        ctx.beginPath();
        ctx.arc(this.x, this.y, radius, 0, Math.PI * 2);
        ctx.fill();
        
        // Black outline for contrast
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
        
        // White highlight for 3D effect
        ctx.save();
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        ctx.arc(this.x - radius * 0.25, this.y - radius * 0.25, radius * 0.15, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        
    }
}

class Bucket {
    constructor(assetManager, game) {
        this.assetManager = assetManager;
        this.game = game;
        this.baseWidth = 204; // Base width increased by 20% (was 170)
        this.baseHeight = 192; // Base height increased by 20% (was 160)
        this.reset();
        console.log("Bucket created");
    }

    reset() {
        // Set anchor point to be the bottom-center of the bucket
        this.x = this.game.LOGICAL_WIDTH / 2;

        const yRange = CONFIG.BUCKET_Y_PERCENT_RANGE;
        const yPercent = yRange[0] + Math.random() * (yRange[1] - yRange[0]);
        // this.y is the BOTTOM of the bucket
        this.y = this.game.LOGICAL_HEIGHT * yPercent;

        const jitter = (Math.random() - 0.5) * 2 * CONFIG.BUCKET_X_JITTER_PERCENT * this.game.LOGICAL_WIDTH;
        this.x += jitter;
        
        // Apply 3rd person perspective scaling - bucket appears smaller due to distance
        this.width = this.baseWidth * CONFIG.DEPTH_SCALE_FACTOR;
        this.height = this.baseHeight * CONFIG.DEPTH_SCALE_FACTOR;

        this.tilt = 0; // degrees
        this.tiltVelocity = 0;
        this.isToppled = false;
    }

    getBounds() {
        const topWidth = this.width * 0.9; // Rim is slightly narrower
        return {
            left: this.x - this.width / 2,
            right: this.x + this.width / 2,
            top: this.y - this.height,
            bottom: this.y,
            rimTop: this.y - this.height,
            rimLeftX: this.x - topWidth / 2,
            rimRightX: this.x + topWidth / 2,
        };
    }

    checkCollision(ball) {
        if (this.isToppled) return;

        const bounds = this.getBounds();
        const ballRestitution = CONFIG.BALL_RESTITUTION[0] + Math.random() * (CONFIG.BALL_RESTITUTION[1] - CONFIG.BALL_RESTITUTION[0]);
        let collided = false;

        // Quick check if ball is near the bucket at all
        if (ball.y + ball.radius < bounds.top || ball.y - ball.radius > bounds.bottom ||
            ball.x + ball.radius < bounds.left || ball.x - ball.radius > bounds.right) {
            return;
        }

        const isInsideHorizontally = ball.x > bounds.rimLeftX && ball.x < bounds.rimRightX;

        // Floor collision
        if (isInsideHorizontally && ball.y + ball.radius >= bounds.bottom && ball.vy > 0) {
            collided = true;
            ball.y = bounds.bottom - ball.radius;
            ball.vy *= -ballRestitution * 0.8;
            ball.vx *= 0.8;
        }

        // Inner wall collisions
        else if (ball.y > bounds.rimTop && isInsideHorizontally) {
            if (ball.x - ball.radius <= bounds.rimLeftX && ball.vx < 0) {
                collided = true;
                ball.vx *= -ballRestitution;
                ball.x = bounds.rimLeftX + ball.radius;
            }
            if (ball.x + ball.radius >= bounds.rimRightX && ball.vx > 0) {
                collided = true;
                ball.vx *= -ballRestitution;
                ball.x = bounds.rimRightX - ball.radius;
            }
        }

        // Rim collisions
        else {
            const hitLeftRim = Math.hypot(ball.x - bounds.rimLeftX, ball.y - bounds.rimTop) < ball.radius;
            const hitRightRim = Math.hypot(ball.x - bounds.rimRightX, ball.y - bounds.rimTop) < ball.radius;
            if (hitLeftRim || hitRightRim) {
                collided = true;
                ball.vy *= -ballRestitution;
                ball.vx *= 0.9;
                this.tiltVelocity += ball.vx * 0.05; // Add tilt velocity on rim hits
            }
        }

        if (collided && ball.firstCollision === null) {
            ball.firstCollision = 'bucket';
        }
    }

    update(deltaTime) {
        if (this.isToppled) return;

        // Apply tilt velocity and damping
        this.tilt += this.tiltVelocity * deltaTime;
        this.tiltVelocity *= CONFIG.BUCKET_TILT_DAMPING;

        // Check for topple
        if (Math.abs(this.tilt) > CONFIG.BUCKET_TOPPLE_ANGLE) {
            this.isToppled = true;
            this.tilt = this.tilt > 0 ? CONFIG.BUCKET_TOPPLE_ANGLE : -CONFIG.BUCKET_TOPPLE_ANGLE;
        }
    }

    draw(ctx) {
        let bucketImage;
        const dpr = window.devicePixelRatio || 1;
        const scale = this.game.scale;

        // Choose the correct sprite based on the bucket's state
        if (this.isToppled) {
            bucketImage = this.assetManager.get('toppled');
        } else if (this.tilt > 1) { // Use a small threshold for tilting
             bucketImage = this.assetManager.get('tilt_right');
        } else if (this.tilt < -1) {
             bucketImage = this.assetManager.get('tilt_left');
        } else {
            // Default upright bucket, choosing based on DPR
            if (dpr > 2) {
                bucketImage = this.assetManager.get('upright_3x');
            } else if (dpr > 1) {
                bucketImage = this.assetManager.get('upright_2x');
            } else {
                bucketImage = this.assetManager.get('upright_1x');
            }
        }

        if (bucketImage && bucketImage.complete && bucketImage.naturalWidth > 0) {
            // Apply perspective scaling and slight vertical offset for 3D effect
            const perspectiveWidth = this.width * scale;
            const perspectiveHeight = this.height * scale;
            const drawX = this.x - perspectiveWidth / 2;
            const drawY = this.y - perspectiveHeight;
            
            // No shadow - removed per requirement
            
            ctx.drawImage(bucketImage, drawX, drawY, perspectiveWidth, perspectiveHeight);
        } else {
            // Professional 3D bucket rendering when sprites aren't available
            const perspectiveWidth = this.width * scale;
            const perspectiveHeight = this.height * scale;
            const drawX = this.x - perspectiveWidth / 2;
            const drawY = this.y - perspectiveHeight;
            
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.tilt * Math.PI / 180);
            ctx.translate(-this.x, -this.y);
            
            // Draw 3D bucket with gradients instead of flat rectangle
            const gradient = ctx.createLinearGradient(drawX, drawY, drawX + perspectiveWidth, drawY + perspectiveHeight);
            gradient.addColorStop(0, '#333333');
            gradient.addColorStop(0.3, '#111111');
            gradient.addColorStop(0.7, '#000000');
            gradient.addColorStop(1, '#111111');
            
            ctx.fillStyle = gradient;
            ctx.strokeStyle = '#555555';
            ctx.lineWidth = 2;
            
            // Draw bucket shape
            ctx.beginPath();
            ctx.moveTo(drawX, drawY + perspectiveHeight);
            ctx.lineTo(drawX + perspectiveWidth, drawY + perspectiveHeight);
            ctx.lineTo(drawX + perspectiveWidth * 0.9, drawY);
            ctx.lineTo(drawX + perspectiveWidth * 0.1, drawY);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // Add rim highlight
            ctx.strokeStyle = '#666666';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(drawX + perspectiveWidth * 0.1, drawY);
            ctx.lineTo(drawX + perspectiveWidth * 0.9, drawY);
            ctx.stroke();
            
            ctx.restore();
        }
    }

    drawFallback(ctx) {
        // This method is now replaced with enhanced 3D rendering in draw() method
        // Keeping for backward compatibility but not used
        ctx.fillStyle = CONFIG.COLORS.BUCKET_MATTE_BLACK;
        const bounds = this.getBounds();
        ctx.beginPath();
        ctx.moveTo(bounds.left, bounds.bottom);
        ctx.lineTo(bounds.right, bounds.bottom);
        ctx.lineTo(bounds.rimRightX, bounds.rimTop);
        ctx.lineTo(bounds.rimLeftX, bounds.rimTop);
        ctx.closePath();
        ctx.fill();
    }
}

class Lawn {
    constructor(game) {
        this.game = game;
        this.height = this.game.LOGICAL_HEIGHT * CONFIG.LAWN_HEIGHT_PERCENT;
        this.y = this.game.LOGICAL_HEIGHT - this.height;
        console.log("Lawn created");
    }

    update(deltaTime) { /* State changes will go here */ }

    draw(ctx, gameState) {
        // Don't draw grass - background image handles that
        // Only draw the armed overlay when needed
        if (gameState === GameState.ARMED) {
            ctx.fillStyle = CONFIG.COLORS.ARMED_LAWN_OVERLAY;
            ctx.fillRect(0, this.y, this.game.LOGICAL_WIDTH, this.height);
        }
    }
}

// Simple toast function - no UI manager needed
function showToast(message, duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('visible'), 10);

    setTimeout(() => {
        toast.classList.remove('visible');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}


class AssetManager {
    constructor() {
        this.assets = {};
        this.promises = [];
    }

    loadImage(name, src) {
        const promise = new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                this.assets[name] = img;
                resolve(img);
            };
            img.onerror = () => {
                // Resolve instead of reject so the game can start with fallback assets
                console.warn(`Could not load image: ${src}. Using fallback.`);
                resolve(null);
            };
            img.src = src;
        });
        this.promises.push(promise);
    }

    loadAll() {
        return Promise.all(this.promises);
    }

    get(name) {
        return this.assets[name];
    }
}


/**
 * Main game class for BucketBall 2028
 */
class BucketBallGame {
    constructor(canvas, assetManager) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.assetManager = assetManager;

        this.state = GameState.READY;
        this.LOGICAL_WIDTH = 1080;  // Will be updated in resize
        this.LOGICAL_HEIGHT = 1920; // Will be updated in resize
        this.lawn = new Lawn(this);
        this.bucket = new Bucket(this.assetManager, this);
        this.ball = new Ball(this);

        this.score = 0;
        this.throwCount = 1;
        this.canArm = true;

        this.input = {
            isPointerDown: false,
            startPos: null,
            currentPos: null,
            startTime: 0,
        };
        this.disarmTimer = null;
        this.settleTimer = 0;
        this.missResetTimer = null; // Timer for auto-reset after miss

        this.resetGame();

        console.log('Game initialized. State:', this.state);
        this.setupInputListeners();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Handles window resizing to use full screen real estate dynamically.
     * Adapts to any screen size while maintaining playable proportions.
     */
    resize() {
        this.dpr = window.devicePixelRatio || 1;

        // Use full screen dimensions
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;
        const aspectRatio = displayWidth / displayHeight;

        // Set canvas to full screen
        this.canvas.width = displayWidth * this.dpr;
        this.canvas.height = displayHeight * this.dpr;
        this.canvas.style.width = `${displayWidth}px`;
        this.canvas.style.height = `${displayHeight}px`;

        // Calculate logical game dimensions based on screen
        if (aspectRatio < CONFIG.MIN_ASPECT_RATIO) {
            // Very tall screen - use minimum width
            this.LOGICAL_WIDTH = displayHeight * CONFIG.MIN_ASPECT_RATIO;
            this.LOGICAL_HEIGHT = displayHeight;
        } else if (aspectRatio > CONFIG.MAX_ASPECT_RATIO) {
            // Very wide screen - use maximum height
            this.LOGICAL_WIDTH = displayWidth;
            this.LOGICAL_HEIGHT = displayWidth / CONFIG.MAX_ASPECT_RATIO;
        } else {
            // Normal screen - use actual dimensions
            this.LOGICAL_WIDTH = displayWidth;
            this.LOGICAL_HEIGHT = displayHeight;
        }

        // Calculate scale relative to base design
        this.scale = Math.min(
            this.LOGICAL_WIDTH / CONFIG.BASE_WIDTH,
            this.LOGICAL_HEIGHT / CONFIG.BASE_HEIGHT
        );

        // Update lawn and bucket positioning based on new dimensions
        this.lawn.height = this.LOGICAL_HEIGHT * CONFIG.LAWN_HEIGHT_PERCENT;
        this.lawn.y = this.LOGICAL_HEIGHT - this.lawn.height;
        
        console.log(`Resized to full screen: ${displayWidth}x${displayHeight}, Logical: ${this.LOGICAL_WIDTH.toFixed(0)}x${this.LOGICAL_HEIGHT.toFixed(0)}, Scale: ${this.scale.toFixed(3)}`);
        this.draw(); // Redraw immediately on resize
    }

    setupInputListeners() {
        this.canvas.addEventListener('mousedown', (e) => this.handlePointerDown(this.getLogicalCoords(e)));
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.handlePointerDown(this.getLogicalCoords(e.touches[0]));
        });

        this.canvas.addEventListener('mousemove', (e) => this.handlePointerMove(this.getLogicalCoords(e)));
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            this.handlePointerMove(this.getLogicalCoords(e.touches[0]));
        });

        this.canvas.addEventListener('mouseup', (e) => this.handlePointerUp(this.getLogicalCoords(e)));
        this.canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            this.handlePointerUp(this.getLogicalCoords(e.changedTouches[0]));
        });
    }

    getLogicalCoords(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) / this.scale,
            y: (e.clientY - rect.top) / this.scale,
        };
    }


    handlePointerDown(pos) {
        if (!this.canArm) return;

        // Allow interaction anywhere on screen for more natural feel
        if (this.state === GameState.READY || this.state === GameState.ARMED) {
            // Check if clicking within 10px of ball (as requested)
            const ballDistance = Math.hypot(pos.x - this.ball.x, pos.y - this.ball.y);
            const clickRadius = 10 / this.scale; // 10px click radius adjusted for scale
            
            // Allow interaction within 10px of ball OR in bottom 20% area
            const bottomAreaY = this.LOGICAL_HEIGHT * 0.8;
            if (ballDistance <= clickRadius || pos.y > bottomAreaY) {
                this.input.isPointerDown = true;
                this.input.startPos = pos;
                this.input.currentPos = pos;
                this.input.startTime = performance.now();
                this.input.isDragMode = ballDistance <= interactionRadius; // Track if dragging ball directly
                
                // Auto-arm when starting interaction
                if (this.state === GameState.READY) {
                    this.state = GameState.ARMED;
                    if (navigator.vibrate) {
                        navigator.vibrate(50);
                    }
                }
                
                if (this.disarmTimer) {
                    clearTimeout(this.disarmTimer);
                }
            }
        }
    }

    handlePointerMove(pos) {
        if (this.input.isPointerDown) {
            this.input.currentPos = pos;
        }
    }

    handlePointerUp(endPos) {
        if (!this.input.isPointerDown) return;
        this.input.isPointerDown = false;

        const swipeLength = Math.hypot(endPos.x - this.input.startPos.x, endPos.y - this.input.startPos.y);
        const holdDuration = performance.now() - this.input.startTime;
        const dx = endPos.x - this.input.startPos.x;
        const dy = endPos.y - this.input.startPos.y;

        if (this.state === GameState.ARMED) {
            // More natural throwing - any significant drag launches the ball
            if (swipeLength >= 30) {  // Lower threshold for more responsive feel
                // Scale velocity based on drag distance and screen size
                const velocityScale = 3.0 + (this.scale * 2.0); // Adjust for screen size
                this.ball.vx = -dx * velocityScale;
                this.ball.vy = -dy * velocityScale;
                this.state = GameState.LAUNCHED;
                this.ball.landed = false;
                console.log(`Ball launched: vx=${this.ball.vx.toFixed(1)}, vy=${this.ball.vy.toFixed(1)}`);
            } else if (swipeLength < 10 && !this.input.isDragMode) {
                // Small tap when not dragging ball - just stay armed
                this.disarmTimer = setTimeout(() => {
                    if (this.state === GameState.ARMED) {
                        this.state = GameState.READY;
                    }
                }, CONFIG.AUTO_DISARM_DELAY);
            } else {
                // Insufficient drag - disarm
                this.state = GameState.READY;
            }
        }
        
        // Clear interaction state
        this.input.startPos = null;
        this.input.isDragMode = false;
    }

    start() {
        this.lastTime = performance.now();
        requestAnimationFrame((time) => this.gameLoop(time));
        console.log('Game loop started');
    }

    gameLoop(currentTime) {
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;

        this.update(deltaTime);
        this.draw();

        requestAnimationFrame((time) => this.gameLoop(time));
    }

    resetGame() {
        this.score = 0;
        this.throwCount = 1;
        this.resetThrow();
    }

    resetThrow() {
        this.ball.reset();
        this.bucket.reset();
        const windRange = CONFIG.WIND_RANGE;
        this.wind = windRange[0] + Math.random() * (windRange[1] - windRange[0]);
        this.state = GameState.READY;
        this.canArm = true;
        this.settleTimer = 0;
        
        // Clear any pending timers
        if (this.missResetTimer) {
            clearTimeout(this.missResetTimer);
            this.missResetTimer = null;
        }
        
        console.log(`Throw ${this.throwCount}/${CONFIG.THROW_COUNT}. Wind: ${this.wind.toFixed(2)} m/s`);
    }

    update(deltaTime) {
        if (this.state === GameState.LAUNCHED) {
            this.ball.update(deltaTime, this.wind);
            this.checkCollisions();

            const ballSpeed = Math.hypot(this.ball.vx, this.ball.vy);
            if (ballSpeed < CONFIG.SETTLE_VELOCITY_THRESHOLD) {
                this.settleTimer += deltaTime;
                if (this.settleTimer > CONFIG.SETTLE_DURATION) {
                    this.state = GameState.RESOLVING;
                    this.ball.landed = true;
                    this.resolveThrow();
                }
            } else {
                this.settleTimer = 0;
            }
            
            // Auto-reset if ball is rolling indefinitely at bottom of screen
            if (this.ball.y >= this.LOGICAL_HEIGHT - 50 && ballSpeed > CONFIG.SETTLE_VELOCITY_THRESHOLD && ballSpeed < 100) {
                if (!this.missResetTimer) {
                    this.missResetTimer = setTimeout(() => {
                        if (this.state === GameState.LAUNCHED) {
                            this.state = GameState.RESOLVING;
                            this.ball.landed = true;
                            this.resolveThrow();
                        }
                    }, CONFIG.MISS_AUTO_RESET_DELAY);
                }
            } else {
                if (this.missResetTimer) {
                    clearTimeout(this.missResetTimer);
                    this.missResetTimer = null;
                }
            }
        }
        this.bucket.update(deltaTime);
        this.lawn.update(deltaTime);
    }

    checkCollisions() {
        const ball = this.ball;

        // 1. Lawn collision
        if (ball.y + ball.radius >= this.lawn.y && ball.vy > 0) {
            if (ball.firstCollision === null) ball.firstCollision = 'lawn';
            ball.y = this.lawn.y - ball.radius;
            const restitution = CONFIG.BALL_RESTITUTION[0] + Math.random() * (CONFIG.BALL_RESTITUTION[1] - CONFIG.BALL_RESTITUTION[0]);
            ball.vy *= -restitution * CONFIG.LAWN_RESTITUTION;
            ball.vx *= 0.9;
        }

        // 2. Side wall collisions
        if ((ball.x - ball.radius * this.scale <= 0 && ball.vx < 0) || (ball.x + ball.radius * this.scale >= this.LOGICAL_WIDTH && ball.vx > 0)) {
            ball.vx *= -0.8; // Bouncy walls
            ball.x = Math.max(ball.radius * this.scale, Math.min(this.LOGICAL_WIDTH - ball.radius * this.scale, ball.x));
        }

        // 3. Bucket collision
        this.bucket.checkCollision(ball);
    }

    draw() {
        // --- Clear and setup canvas for new frame ---
        this.ctx.save();
        this.ctx.scale(this.dpr, this.dpr);  // Only scale by DPR, use full screen
        // Clear canvas without filling with background color to show grass background
        this.ctx.clearRect(0, 0, this.LOGICAL_WIDTH, this.LOGICAL_HEIGHT);

        // --- Draw game objects ---
        this.lawn.draw(this.ctx, this.state);
        this.bucket.draw(this.ctx);

        // Always draw ball - it should be visible for player interaction
        this.ball.draw(this.ctx, this.scale);

        // --- Draw UI elements ---
        this.drawHUD();
        this.draw5mLine();
        if (this.state === GameState.ARMED) {
            this.drawArmedUI();
        }
        if (this.state === GameState.ARMED && this.input.isPointerDown && this.input.currentPos) {
            this.drawAimingLine();
        }

        this.ctx.restore();
    }

    resolveThrow() {
        const ball = this.ball;
        const bucket = this.bucket;

        if (bucket.isToppled) {
            showToast("Bucket overturned!");
        } else {
            const bucketBounds = bucket.getBounds();
            const isInside = ball.x > bucketBounds.rimLeftX &&
                             ball.x < bucketBounds.rimRightX &&
                             ball.y > bucketBounds.rimTop &&
                             ball.y + ball.radius >= bucketBounds.bottom - 20;

            if (isInside) {
                if (ball.firstCollision === 'lawn') {
                    this.score += 2;
                    showToast("TRICK SHOT! +2");
                } else {
                    this.score += 1;
                    showToast("In the bucket! +1");
                }
            } else if (ball.firstCollision === 'bucket') {
                showToast("Bounced out!");
            } else {
                showToast("Missed!");
            }
        }

        this.advanceToNextThrow();
    }

    advanceToNextThrow() {
        setTimeout(() => {
            if (this.throwCount >= CONFIG.THROW_COUNT) {
                this.state = GameState.END_GAME;
                this.endGame();
            } else {
                this.throwCount++;
                this.state = GameState.NEXT_THROW;
                this.resetThrow();
            }
        }, 1500);
    }

    endGame() {
        showToast(`Final Score: ${this.score} / 10`, 5000);
        setTimeout(() => this.resetGame(), 5000);
    }

    drawHUD() {
        this.ctx.fillStyle = '#111111';
        this.ctx.font = `bold ${48 * this.scale}px sans-serif`;

        // Score
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score} / 10`, 40 * this.scale, 80 * this.scale);

        // Throw count
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Throw ${this.throwCount} of ${CONFIG.THROW_COUNT}`, this.LOGICAL_WIDTH / 2, 80 * this.scale);

        // Wind
        this.ctx.textAlign = 'right';
        const windSpeed = Math.abs(this.wind).toFixed(1);
        const windArrow = this.wind > 0 ? '→' : (this.wind < 0 ? '←' : '·');
        this.ctx.fillText(`${windArrow} ${windSpeed}m/s`, this.LOGICAL_WIDTH - 40 * this.scale, 80 * this.scale);
    }

    draw5mLine() {
        // Draw chalk line at bottom 20% of screen
        const chalkLineY = this.LOGICAL_HEIGHT * 0.8; // 80% down = top of bottom 20%
        
        const isPulsing = this.state === GameState.ARMED;
        const pulse = isPulsing ? (Math.sin(performance.now() / 200) + 1) / 2 : 0;

        // Chalk white color
        const baseAlpha = isPulsing ? 0.8 + pulse * 0.2 : 0.6;

        this.ctx.strokeStyle = `rgba(255, 255, 255, ${baseAlpha})`;
        this.ctx.lineWidth = isPulsing ? 3 + pulse * 2 : 3;
        this.ctx.setLineDash([20, 10]); // Dashed pattern for chalk look
        this.ctx.beginPath();
        this.ctx.moveTo(0, chalkLineY);
        this.ctx.lineTo(this.LOGICAL_WIDTH, chalkLineY);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawArmedUI() {
        this.ctx.fillStyle = CONFIG.COLORS.WHITE;
        this.ctx.font = `bold ${60 * this.scale}px sans-serif`;
        this.ctx.textAlign = "center";
        const yPos = this.LOGICAL_HEIGHT - (this.lawn.height / 2) + 20 * this.scale;
        this.ctx.fillText("ARMED – Drag to throw", this.LOGICAL_WIDTH / 2, yPos);
    }

    drawAimingLine() {
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
        this.ctx.lineWidth = 8 * this.scale;
        this.ctx.lineCap = "round";
        
        // Draw from ball position to current drag position for more intuitive feedback
        const startX = this.input.isDragMode ? this.ball.x : this.input.startPos.x;
        const startY = this.input.isDragMode ? this.ball.y : this.input.startPos.y;
        
        this.ctx.beginPath();
        this.ctx.moveTo(startX, startY);
        this.ctx.lineTo(this.input.currentPos.x, this.input.currentPos.y);
        this.ctx.stroke();
        
        // Add trajectory preview dots
        const dx = this.input.currentPos.x - startX;
        const dy = this.input.currentPos.y - startY;
        const velocityScale = 3.0 + (this.scale * 2.0);
        const previewVx = -dx * velocityScale * 0.3; // Scaled down for preview
        const previewVy = -dy * velocityScale * 0.3;
        
        this.ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        for (let i = 1; i <= 5; i++) {
            const t = i * 0.1; // Time steps
            const previewX = this.ball.x + previewVx * t;
            const previewY = this.ball.y + previewVy * t + 0.5 * CONFIG.GRAVITY * t * t * 0.3;
            
            this.ctx.beginPath();
            this.ctx.arc(previewX, previewY, 4 * this.scale, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
}

window.addEventListener('load', () => {
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
        const assetManager = new AssetManager();
        // Define all assets to load
        assetManager.loadImage('upright_1x', 'assets/bucket_upright@1x.png');
        assetManager.loadImage('upright_2x', 'assets/bucket_upright@2x.png');
        assetManager.loadImage('upright_3x', 'assets/bucket_upright@3x.png');
        assetManager.loadImage('tilt_left', 'assets/bucket_tilt_left@2x.png');
        assetManager.loadImage('tilt_right', 'assets/bucket_tilt_right@2x.png');
        assetManager.loadImage('toppled', 'assets/bucket_toppled_side@2x.png');

        assetManager.loadAll().then(() => {
            console.log("Asset loading complete.");
            const game = new BucketBallGame(canvas, assetManager);
            game.start();
        });
    } else {
        console.error('Canvas element not found!');
    }
});
