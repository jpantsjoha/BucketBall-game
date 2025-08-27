# ADR-007: Realistic Physics with Randomness and Visual Feedback

## Status
Accepted

## Date
2025-08-27

## Context
The game was missing crucial visual feedback for ball flight animation and lacked realistic physics randomness that would make each throw unique and more interesting. Players need to see the ball's trajectory and experience variation in bounces to enhance gameplay depth.

## Decision

### Visual Ball Animation System
- **Flight Trail**: 15-point trailing effect showing ball's path through the air
- **Ball Rotation**: Realistic spinning based on velocity and surface contact
- **Golf Ball Texture**: Dimple pattern and rotation animation for authentic feel
- **Trail Transparency**: Fade effect from 30% opacity (newest) to 0% (oldest)

### Enhanced Physics Randomness

#### 1. Ball Physics
- **Gravity Variation**: ±1% random variation per frame for micro air currents
- **Trail Tracking**: Ball position stored only when speed > 50 units for clean trails
- **Spin Effects**: Surface contact generates random spin rate (-1.5 to +1.5 radians/sec)

#### 2. Grass Surface Simulation
- **Uneven Terrain**: 30 random height points across lawn width (±6px variation)
- **Bounce Randomness**: Restitution multiplier varies 0.8x to 1.2x per bounce
- **Angle Variation**: ±0.15 radian deflection for uneven grass contact
- **Spin Generation**: Grass contact creates spin rate of ±3.0 radians/sec

#### 3. Bucket Stability System
- **Variable Stability**: Each game, bucket has random stability 0.85-1.15
- **Wobble Physics**: Bucket can wobble and settle after ball impact
- **Position Randomness**: Slight X-axis jitter maintains game variety

### Implementation Details

#### Ball Trail System
```javascript
// Trail tracking during flight
if (speed > 50) {
    this.trail.push({ 
        x: this.x, 
        y: this.y, 
        size: this.getPerspectiveFactor() 
    });
    if (this.trail.length > 15) this.trail.shift();
}

// Visual trail rendering
for (let i = 0; i < this.trail.length; i++) {
    const opacity = (i / this.trail.length) * 0.3;
    const trailRadius = baseRadius * point.size * 0.5 * (i / length);
}
```

#### Grass Physics Randomness
```javascript
generateSurfaceNoise() {
    const variations = [];
    for (let i = 0; i < 30; i++) {
        variations.push((Math.random() - 0.5) * 12); // ±6px
    }
    return variations;
}

// Variable bounce characteristics
const bounceRandomness = 0.8 + (Math.random() * 0.4); // 0.8-1.2x
const angleRandomness = (Math.random() - 0.5) * 0.3; // ±0.15 rad
ball.vy = -ball.vy * LAWN_RESTITUTION * bounceRandomness;
ball.vx += ball.vy * angleRandomness; // Deflection
ball.spinRate = (Math.random() - 0.5) * 3.0; // Spin
```

#### Bucket Stability
```javascript
// Random bucket characteristics per game
this.stability = 0.85 + (Math.random() * 0.3);  // 0.85-1.15
this.wobble = 0;  // Current wobble angle
this.wobbleVelocity = 0;  // Wobble momentum
```

## Consequences

### Positive Effects
- **Visual Engagement**: Players see ball's complete flight path
- **Authentic Feel**: Golf ball rotation and trail effects
- **Gameplay Variety**: No two throws are exactly the same
- **Skill Development**: Players learn to account for randomness
- **Trick Shot Appeal**: Grass bounces have variable outcomes
- **Realistic Physics**: Matches real-world unpredictability

### Technical Benefits
- **Animation Feedback**: Clear visual indication of ball movement
- **Performance Optimized**: Trail only tracks during fast movement
- **Realistic Simulation**: Multiple randomness layers create believable physics

### Potential Challenges
- **Learning Curve**: Players must adapt to physics variations
- **Debugging**: Random elements make issue reproduction harder
- **Performance**: Additional trail rendering and physics calculations

## Validation Criteria

### Visual Requirements
- ✅ Ball trail visible during flight
- ✅ Ball rotation matches velocity and direction
- ✅ Golf ball dimple pattern visible
- ✅ Trail fades smoothly from new to old

### Physics Requirements
- ✅ Each grass bounce has unique characteristics
- ✅ Bucket stability varies between games
- ✅ Ball spin affects trajectory realistically
- ✅ Surface height variations create micro-bounces

### Performance Requirements
- ✅ 60 FPS maintained with trail rendering
- ✅ Trail length limited to prevent memory issues
- ✅ Physics calculations remain fast

## Rationale
This system transforms BucketBall from a predictable physics simulation into a dynamic game with authentic golf-like unpredictability. The visual trail system provides essential feedback for player skill development, while the randomness factors ensure each throw feels unique and engaging. This balances skill development with the natural variation that makes real sports exciting.

## Related ADRs
- ADR-003: Physics Engine Design
- ADR-006: Ball Interaction and 3D Perspective