const CONFIG = {
    // Game mechanics
    LOGICAL_WIDTH: 1080,
    LOGICAL_HEIGHT: 1920,
    THROW_COUNT: 5,

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
    LAWN_HEIGHT_PERCENT: 0.25, // 25% of screen height
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
    constructor() {
        this.radius = (CONFIG.LOGICAL_WIDTH / 1080) * 15;
        this.reset();
        console.log("Ball created");
    }

    reset() {
        this.x = CONFIG.LOGICAL_WIDTH / 2;
        this.y = CONFIG.LOGICAL_HEIGHT * (1 - CONFIG.LAWN_HEIGHT_PERCENT / 2);
        this.vx = 0;
        this.vy = 0;
        this.landed = false;
        this.firstCollision = null;
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

    draw(ctx) {
        ctx.fillStyle = CONFIG.COLORS.BALL_GOLD;
        ctx.strokeStyle = CONFIG.COLORS.BALL_OUTLINE;
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
}

class Bucket {
    constructor(assetManager) {
        this.assetManager = assetManager;
        this.width = 170; // Logical width from spec
        this.height = 160; // Logical height based on typical asset proportions
        this.reset();
        console.log("Bucket created");
    }

    reset() {
        // Set anchor point to be the bottom-center of the bucket
        this.x = CONFIG.LOGICAL_WIDTH / 2;

        const yRange = CONFIG.BUCKET_Y_PERCENT_RANGE;
        const yPercent = yRange[0] + Math.random() * (yRange[1] - yRange[0]);
        // this.y is the BOTTOM of the bucket
        this.y = CONFIG.LOGICAL_HEIGHT * yPercent;

        const jitter = (Math.random() - 0.5) * 2 * CONFIG.BUCKET_X_JITTER_PERCENT * CONFIG.LOGICAL_WIDTH;
        this.x += jitter;

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

        if (bucketImage) {
            const drawX = this.x - this.width / 2;
            const drawY = this.y - this.height;
            ctx.drawImage(bucketImage, drawX, drawY, this.width, this.height);
        } else {
            // Fallback drawing if any image fails to load
            // Still apply rotation for the fallback to show tilt/topple
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.tilt * Math.PI / 180);
            ctx.translate(-this.x, -this.y);
            this.drawFallback(ctx);
            ctx.restore();
        }
    }

    drawFallback(ctx) {
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
    constructor() {
        this.height = CONFIG.LOGICAL_HEIGHT * CONFIG.LAWN_HEIGHT_PERCENT;
        this.y = CONFIG.LOGICAL_HEIGHT - this.height;
        console.log("Lawn created");
    }

    update(deltaTime) { /* State changes will go here */ }

    draw(ctx, gameState) {
        // Base grass color
        ctx.fillStyle = CONFIG.COLORS.GRASS_BASE;
        ctx.fillRect(0, this.y, CONFIG.LOGICAL_WIDTH, this.height);

        // Add some "tufts" for texture
        ctx.fillStyle = CONFIG.COLORS.GRASS_TUFTS;
        for (let i = 0; i < 100; i++) {
            const x = Math.random() * CONFIG.LOGICAL_WIDTH;
            const y = this.y + Math.random() * this.height;
            ctx.beginPath();
            ctx.arc(x, y, Math.random() * 5 + 2, 0, Math.PI);
            ctx.fill();
        }

        // Draw armed overlay if needed
        if (gameState === GameState.ARMED) {
            ctx.fillStyle = CONFIG.COLORS.ARMED_LAWN_OVERLAY;
            ctx.fillRect(0, this.y, CONFIG.LOGICAL_WIDTH, this.height);
        }
    }
}

class UIManager {
    constructor(game) {
        this.game = game;
        this.helpBanner = document.getElementById('help-banner');
        this.helpPill = document.getElementById('help-pill');
        this.gotItBtn = document.getElementById('got-it-btn');
        this.remindLaterBtn = document.getElementById('remind-later-btn');
        this.minimizeChevron = document.getElementById('minimize-chevron');
        this.toastContainer = document.getElementById('toast-container');

        this.isBannerPermanentlyDismissed = localStorage.getItem('bucketball_banner_dismissed') === 'true';

        this.setupListeners();

        if (!this.isBannerPermanentlyDismissed) {
            this.showBanner();
        } else {
            this.showPill();
        }
    }

    setupListeners() {
        this.gotItBtn.addEventListener('click', (e) => { e.stopPropagation(); this.dismissBanner(true); });
        this.remindLaterBtn.addEventListener('click', (e) => { e.stopPropagation(); this.dismissBanner(false); });
        this.minimizeChevron.addEventListener('click', (e) => { e.stopPropagation(); this.minimizeBanner(); });
        this.helpPill.addEventListener('click', (e) => { e.stopPropagation(); this.showBanner(); });
    }

    showBanner() {
        this.helpBanner.classList.add('visible');
        this.helpPill.classList.remove('visible');
        this.helpPill.classList.add('hidden');
        this.game.isBannerVisible = true;
        this.minimizeChevron.innerHTML = '⌄';
    }

    dismissBanner(isPermanent) {
        this.helpBanner.classList.remove('visible');
        this.showPill();
        this.minimizeChevron.innerHTML = '⌃';
        if (isPermanent) {
            localStorage.setItem('bucketball_banner_dismissed', 'true');
            this.isBannerPermanentlyDismissed = true;
        }
        this.game.onBannerDismissed();
    }

    minimizeBanner() {
        this.helpBanner.classList.remove('visible');
        this.showPill();
        this.minimizeChevron.innerHTML = '⌃';
        this.game.onBannerDismissed();
    }

    showPill() {
        this.helpPill.classList.remove('hidden');
        this.helpPill.classList.add('visible');
    }

    showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        this.toastContainer.appendChild(toast);

        setTimeout(() => toast.classList.add('visible'), 10);

        setTimeout(() => {
            toast.classList.remove('visible');
            toast.addEventListener('transitionend', () => toast.remove());
        }, duration);
    }
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
        this.lawn = new Lawn();
        this.bucket = new Bucket(this.assetManager);
        this.ball = new Ball();

        this.score = 0;
        this.throwCount = 1;
        this.isBannerVisible = false;
        this.canArm = true;

        this.input = {
            isPointerDown: false,
            startPos: null,
            currentPos: null,
            startTime: 0,
        };
        this.disarmTimer = null;
        this.settleTimer = 0;

        this.resetGame();

        this.uiManager = new UIManager(this);

        console.log('Game initialized. State:', this.state);
        this.setupInputListeners();
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    /**
     * Handles window resizing to keep the game looking correct.
     * Scales the canvas based on DPR and maintains a logical aspect ratio.
     */
    resize() {
        this.dpr = window.devicePixelRatio || 1;

        // The actual size of the canvas element on the page
        const displayWidth = window.innerWidth;
        const displayHeight = window.innerHeight;

        // Set the canvas backing store size to match the display size scaled by DPR
        this.canvas.width = displayWidth * this.dpr;
        this.canvas.height = displayHeight * this.dpr;

        // Calculate the scale factor to fit the logical game size into the display area
        this.scale = Math.min(
            displayWidth / CONFIG.LOGICAL_WIDTH,
            displayHeight / CONFIG.LOGICAL_HEIGHT
        );

        // The rendered size of the game content on the canvas
        this.renderWidth = CONFIG.LOGICAL_WIDTH * this.scale;
        this.renderHeight = CONFIG.LOGICAL_HEIGHT * this.scale;

        // Center the canvas element itself if the container is larger
        this.canvas.style.width = `${this.renderWidth}px`;
        this.canvas.style.height = `${this.renderHeight}px`;

        console.log(`Resized. DPR: ${this.dpr}, Scale: ${this.scale.toFixed(3)}`);
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

    onBannerDismissed() {
        this.isBannerVisible = false;
        this.canArm = false;
        setTimeout(() => {
            this.canArm = true;
        }, CONFIG.DISMISS_TO_THROW_DELAY);
    }

    handlePointerDown(pos) {
        if (this.isBannerVisible && pos.y > this.lawn.y) {
            this.uiManager.minimizeBanner();
            return;
        }

        if (!this.canArm) return;

        if ((this.state === GameState.READY || this.state === GameState.ARMED) && pos.y > this.lawn.y) {
            this.input.isPointerDown = true;
            this.input.startPos = pos;
            this.input.currentPos = pos;
            this.input.startTime = performance.now();
            if (this.state === GameState.ARMED) {
                clearTimeout(this.disarmTimer);
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

        if (this.state === GameState.READY) {
            if (swipeLength < 20) { // It's a tap
                this.state = GameState.ARMED;
                if (navigator.vibrate) {
                    navigator.vibrate(50); // Optional haptic tick
                }
                this.disarmTimer = setTimeout(() => {
                    if (this.state === GameState.ARMED) {
                        this.state = GameState.READY;
                    }
                }, CONFIG.AUTO_DISARM_DELAY);
            }
        } else if (this.state === GameState.ARMED) {
            const dy = endPos.y - this.input.startPos.y;
            if (swipeLength >= CONFIG.SWIPE_THRESHOLD && holdDuration >= CONFIG.ARMING_HOLD_DURATION && dy < 0) {
                const dx = endPos.x - this.input.startPos.x;
                this.ball.vx = -dx * 4.5; // Velocity scaling factor
                this.ball.vy = -dy * 4.5;
                this.state = GameState.LAUNCHED;
                this.ball.landed = false;
            } else {
                this.state = GameState.READY;
            }
        }
        this.input.startPos = null;
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
        this.isBannerVisible = this.uiManager ? !this.uiManager.isBannerPermanentlyDismissed : false;
        this.settleTimer = 0;
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
        if ((ball.x - ball.radius <= 0 && ball.vx < 0) || (ball.x + ball.radius >= CONFIG.LOGICAL_WIDTH && ball.vx > 0)) {
            ball.vx *= -0.8; // Bouncy walls
            ball.x = Math.max(ball.radius, Math.min(CONFIG.LOGICAL_WIDTH - ball.radius, ball.x));
        }

        // 3. Bucket collision
        this.bucket.checkCollision(ball);
    }

    draw() {
        // --- Clear and setup canvas for new frame ---
        this.ctx.save();
        this.ctx.scale(this.dpr * this.scale, this.dpr * this.scale);
        this.ctx.fillStyle = CONFIG.COLORS.BACKGROUND;
        this.ctx.fillRect(0, 0, CONFIG.LOGICAL_WIDTH, CONFIG.LOGICAL_HEIGHT);

        // --- Draw game objects ---
        this.lawn.draw(this.ctx, this.state);
        this.bucket.draw(this.ctx);

        // Draw ball only if it's not landed inside the bucket (visual tweak)
        if(this.state !== GameState.RESOLVING) {
            this.ball.draw(this.ctx);
        }

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
            this.uiManager.showToast("Bucket overturned!");
        } else {
            const bucketBounds = bucket.getBounds();
            const isInside = ball.x > bucketBounds.rimLeftX &&
                             ball.x < bucketBounds.rimRightX &&
                             ball.y > bucketBounds.rimTop &&
                             ball.y + ball.radius >= bucketBounds.bottom - 20;

            if (isInside) {
                if (ball.firstCollision === 'lawn') {
                    this.score += 2;
                    this.uiManager.showToast("TRICK SHOT! +2");
                } else {
                    this.score += 1;
                    this.uiManager.showToast("In the bucket! +1");
                }
            } else if (ball.firstCollision === 'bucket') {
                this.uiManager.showToast("Bounced out!");
            } else {
                this.uiManager.showToast("Missed!");
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
        this.uiManager.showToast(`Final Score: ${this.score} / 10`, 5000);
        setTimeout(() => this.resetGame(), 5000);
    }

    drawHUD() {
        this.ctx.fillStyle = '#111111';
        this.ctx.font = 'bold 48px sans-serif';

        // Score
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score} / 10`, 40, 80);

        // Throw count
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`Throw ${this.throwCount} of ${CONFIG.THROW_COUNT}`, CONFIG.LOGICAL_WIDTH / 2, 80);

        // Wind
        this.ctx.textAlign = 'right';
        const windSpeed = Math.abs(this.wind).toFixed(1);
        const windArrow = this.wind > 0 ? '→' : (this.wind < 0 ? '←' : '·');
        this.ctx.fillText(`${windArrow} ${windSpeed}m/s`, CONFIG.LOGICAL_WIDTH - 40, 80);
    }

    draw5mLine() {
        const isPulsing = this.state === GameState.ARMED;
        const pulse = isPulsing ? (Math.sin(performance.now() / 200) + 1) / 2 : 0;

        // Default is grey, turns white and pulses when armed
        const baseColor = isPulsing ? '255, 255, 255' : '200, 200, 200';
        const baseAlpha = isPulsing ? 0.7 + pulse * 0.3 : 0.5;

        this.ctx.strokeStyle = `rgba(${baseColor}, ${baseAlpha})`;
        this.ctx.lineWidth = isPulsing ? 5 + pulse * 5 : 5;
        this.ctx.setLineDash([20, 15]);
        this.ctx.beginPath();
        this.ctx.moveTo(0, this.lawn.y);
        this.ctx.lineTo(CONFIG.LOGICAL_WIDTH, this.lawn.y);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    drawArmedUI() {
        this.ctx.fillStyle = CONFIG.COLORS.WHITE;
        this.ctx.font = "bold 60px sans-serif";
        this.ctx.textAlign = "center";
        const yPos = CONFIG.LOGICAL_HEIGHT - (this.lawn.height / 2) + 20;
        this.ctx.fillText("ARMED – Flick to throw", CONFIG.LOGICAL_WIDTH / 2, yPos);
    }

    drawAimingLine() {
        this.ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
        this.ctx.lineWidth = 10;
        this.ctx.lineCap = "round";
        this.ctx.beginPath();
        this.ctx.moveTo(this.input.startPos.x, this.input.startPos.y);
        this.ctx.lineTo(this.input.currentPos.x, this.input.currentPos.y);
        this.ctx.stroke();
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
