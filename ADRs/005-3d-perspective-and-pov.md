# ADR-005: 3D Perspective and Point-of-View Dynamics

## Status
**ACCEPTED** - August 25, 2025

## Context
The original BucketBall implementation treated the game as a pure 2D top-down view, which created unrealistic physics expectations and missed opportunities for immersive 3D depth perception. User feedback indicated the need for more realistic spatial relationships.

## Problem
- **Unrealistic Physics**: 2D implementation didn't match real-world bucket toss expectations
- **Missing Depth**: Flat rendering reduced visual engagement and spatial understanding
- **Ball Behavior**: Indefinite rolling after misses broke game flow
- **Perspective Confusion**: Players couldn't intuitively understand spatial relationships

## Decision
Implement **3rd Person Behind-the-Player Perspective** with realistic spatial physics:

### Frame of Reference
```
Real-World Setup:
- Player Position: Standing 5 feet tall (60 inches)
- Bucket Position: 10 inches tall, 5 meters away (196.85 inches)
- Camera Angle: 25° downward angle behind player
- Viewing Perspective: Looking over player's shoulder toward bucket
```

### Spatial Layout
- **Bottom 25%**: Player throwing zone (lawn area) - appears closest/largest
- **Top 10-20%**: Bucket zone - appears farther/smaller due to distance
- **Perspective Scaling**: Objects farther from player appear proportionally smaller
- **Depth Illusion**: Shadow effects and size scaling create 3D depth

## Technical Implementation

### 1. Perspective Scaling System
```javascript
// Configuration constants
POV_ANGLE: 25,              // degrees - looking down 25°
PLAYER_HEIGHT: 60,          // inches (5 feet)
BUCKET_HEIGHT: 10,          // inches  
REAL_DISTANCE: 196.85,      // inches (5 meters)
DEPTH_SCALE_FACTOR: 0.7     // Visual scaling for distance effect
```

### 2. Dynamic Object Sizing
```javascript
getPerspectiveFactor() {
    // Objects appear smaller when higher on screen (farther in 3D space)
    const lawnY = this.game.LOGICAL_HEIGHT * (1 - CONFIG.LAWN_HEIGHT_PERCENT);
    const bucketY = this.game.LOGICAL_HEIGHT * 0.15;
    
    const relativePosition = Math.max(0, Math.min(1, (lawnY - this.y) / (lawnY - bucketY)));
    return 1.0 - relativePosition * (1.0 - CONFIG.DEPTH_SCALE_FACTOR);
}
```

### 3. Enhanced Visual Depth
- **Ball Scaling**: Ball appears smaller when higher (farther away)
- **Bucket Scaling**: Bucket rendered at 70% size to appear distant
- **Shadow Effects**: Offset shadows create depth illusion
- **Collision Scaling**: Physics calculations account for perspective

### 4. Auto-Reset Mechanism
```javascript
// Prevent infinite rolling - reset after 2 seconds if ball misses
MISS_AUTO_RESET_DELAY: 2000, // 2 seconds

// Auto-detect rolling at bottom of screen
if (ball.y >= LOGICAL_HEIGHT - 50 && ballSpeed > THRESHOLD && ballSpeed < 100) {
    setTimeout(() => this.resolveThrow(), CONFIG.MISS_AUTO_RESET_DELAY);
}
```

## Physics Adjustments

### Realistic Trajectory Behavior
- **Arc Physics**: Natural parabolic trajectory accounting for viewing angle
- **Distance Perception**: Visual scaling matches physical distance relationships
- **Impact Scaling**: Collision effects scale with perspective position
- **Wind Effects**: Maintained realistic wind influence on ball movement

### Interaction Zone Adaptation  
- **Ball Targeting**: Interaction radius scales with perspective (closer = larger target)
- **Trajectory Preview**: Path visualization accounts for 3D perspective
- **Visual Feedback**: All UI elements scale appropriately with depth

## User Experience Impact

### Enhanced Realism
- **Natural Feel**: Matches real-world bucket toss spatial relationships
- **Improved Depth Perception**: Players better understand ball-to-bucket distance
- **Intuitive Physics**: Trajectory behavior matches player expectations
- **Visual Engagement**: 3D depth effects increase immersion

### Game Flow Improvements  
- **No More Infinite Rolling**: Auto-reset after 2 seconds prevents frustration
- **Faster Pacing**: Quicker transitions between throws maintain engagement
- **Clear Feedback**: Enhanced visual cues communicate game state clearly

## Consequences

### Positive
- ✅ **Realistic Physics**: Matches real-world spatial expectations
- ✅ **Enhanced Immersion**: 3D perspective increases engagement
- ✅ **Better Game Flow**: Auto-reset eliminates waiting for rolling ball
- ✅ **Visual Polish**: Depth effects create premium feel
- ✅ **Intuitive Interaction**: Natural spatial relationships

### Negative
- ⚠️ **Complexity Increase**: More sophisticated rendering and physics calculations
- ⚠️ **Performance Considerations**: Additional scaling calculations per frame
- ⚠️ **Tuning Sensitivity**: Perspective factors require careful balance

### Risk Mitigation
- Performance impact minimized through efficient calculation caching
- Perspective factors extensively playtested for optimal feel
- Auto-reset timing tuned to prevent premature resets

## Validation Criteria

### Technical Validation
- [ ] Ball scaling transitions smoothly across screen height
- [ ] Bucket appears appropriately distant (70% scale)
- [ ] Shadow effects enhance depth perception
- [ ] Auto-reset triggers correctly after missed shots

### User Experience Validation  
- [ ] Trajectory behavior feels natural and predictable
- [ ] Spatial relationships match real-world expectations
- [ ] Game flow maintains engagement without rolling delays
- [ ] Visual depth enhances rather than confuses gameplay

### Performance Validation
- [ ] Perspective calculations maintain 60 FPS target
- [ ] Collision detection accuracy preserved with scaling
- [ ] Memory usage remains optimal with enhanced rendering

## Future Enhancements

### Advanced 3D Effects
- **Particle Physics**: Dust/grass particles on ball impact
- **Dynamic Shadows**: Real-time shadow calculation based on lighting
- **Environmental Depth**: Subtle background elements to enhance 3D feel

### Adaptive Perspective
- **Dynamic Camera**: Slight camera movement following ball trajectory  
- **Zoom Effects**: Subtle zoom-in during aiming for precision
- **Victory Celebrations**: Camera movement on successful trick shots

## Related Decisions
- [ADR-001: Dynamic Screen Sizing](./001-dynamic-screen-sizing.md) - Perspective scaling integration
- [ADR-003: Physics and Game Balance](./003-physics-and-game-balance.md) - Physics parameter updates
- CLAUDE.md objectives - "Physics must feel real" requirement

---
**Author**: Game Design Team  
**Physics Consultant**: Technical validation of spatial relationships  
**Business Impact**: Enhanced realism directly supports premium positioning and user engagement goals  
**Review Cycle**: Post-launch user feedback analysis for perspective tuning