# ADR-003: Physics Engine and Game Balance

## Status
**ACCEPTED** - August 25, 2025

## Context
BucketBall requires realistic physics simulation to create engaging, skill-based gameplay that rewards practice and creates satisfying "trick shot" moments.

## Decision
Implement comprehensive physics system with following parameters:

### Core Physics Constants
```javascript
GRAVITY: 2000,              // px/s² - Realistic fall acceleration
WIND_RANGE: [-2.0, 2.0],   // m/s - Variable challenge per throw
WIND_FACTOR: 40,           // Conversion: m/s to px/s²
BALL_RESTITUTION: [0.55, 0.65], // Bounce variability for organic feel
LAWN_RESTITUTION: 0.35,    // Grass dampening effect
```

### Game Balance Mechanics

#### 1. Trick Shot System
- **Lawn-First Collision**: +2 points (double reward)
- **Direct Bucket**: +1 point (standard)
- **Miss/Bounce-Out**: 0 points

#### 2. Wind Dynamics
- **Random per throw**: -2.0 to +2.0 m/s
- **Horizontal force**: Affects ball trajectory
- **Skill element**: Players must compensate for wind

#### 3. Bucket Physics
- **Tilt mechanics**: Rim impacts cause bucket wobble
- **Topple threshold**: 18° angle causes bucket overturn
- **Damping factor**: 0.95 for realistic settling

#### 4. Collision System
- **Multi-surface detection**: Lawn, bucket rim, inner walls, floor
- **First collision tracking**: Enables trick shot detection
- **Bounce randomization**: ±5% restitution variation

## Implementation Architecture

### Physics Loop
```javascript
update(deltaTime) {
    // Apply gravity
    this.vy += CONFIG.GRAVITY * deltaTime;
    
    // Apply wind force  
    this.vx += wind * CONFIG.WIND_FACTOR * deltaTime;
    
    // Update position
    this.x += this.vx * deltaTime;
    this.y += this.vy * deltaTime;
}
```

### Collision Detection Hierarchy
1. **Lawn collision** - First priority, enables trick shots
2. **Side walls** - Prevent ball leaving play area
3. **Bucket collision** - Complex multi-surface detection
4. **Settle detection** - 400ms under velocity threshold

## Game Balance Rationale

### Scoring System
- **Maximum 10 points** (5 trick shots) creates clear target
- **2:1 trick shot bonus** encourages skill development
- **Risk/reward balance** - Lawn bounce is harder but worth more

### Physics Tuning
- **Gravity 2000 px/s²** - Fast enough for mobile attention spans
- **Wind ±2.0 m/s** - Noticeable but not overwhelming challenge
- **Restitution 0.55-0.65** - Bouncy enough for multiple chances

### Difficulty Progression
- **Session-based randomization** - Each throw has unique challenge
- **Skill-based mastery** - Physics consistency rewards practice
- **No artificial difficulty** - Pure skill determines success

## Consequences

### Positive
- ✅ **Realistic feel** - Physics match player expectations
- ✅ **Skill-based gameplay** - Practice improves performance
- ✅ **Engaging challenge** - Wind and bounce create variety
- ✅ **Satisfying trick shots** - Lawn bounces feel earned
- ✅ **Consistent mechanics** - Deterministic physics build trust

### Negative
- ⚠️ **Complexity** - Multiple collision surfaces increase bugs
- ⚠️ **Tuning sensitivity** - Small changes affect game feel
- ⚠️ **Device variance** - Different screens may feel different

### Mitigations
- Extensive playtesting validates physics feel
- Scalable parameters allow post-launch tuning
- Cross-device testing ensures consistency

## Performance Considerations
- **60 FPS target** maintained with efficient collision detection
- **Spatial optimization** - Early rejection for distant objects
- **Minimal state tracking** - Only essential physics properties

## Future Enhancements
- **Particle effects** for collision feedback
- **Sound integration** for impact audio
- **Advanced wind** - Gusts and direction changes
- **Power-ups** - Temporary physics modifications

## Related Decisions
- [ADR-001: Dynamic Screen Sizing](./001-dynamic-screen-sizing.md) - Physics scaling
- [ADR-002: Natural Mouse Interaction](./002-natural-mouse-interaction.md) - Input velocity mapping

---
**Author**: Development Team  
**Game Designer**: Physics balance aligned with CLAUDE.md objectives  
**Testing Requirements**: Cross-device physics consistency validation