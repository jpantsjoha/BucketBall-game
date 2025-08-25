# ADR-002: Natural Mouse/Touch Interaction System

## Status
**ACCEPTED** - August 25, 2025

## Context
Original implementation required a rigid two-stage interaction:
1. Tap lawn area to arm
2. Swipe to throw (restricted to lawn area only)

This created friction for desktop users expecting natural drag interactions and limited the intuitive feel of the game.

## Problem
- **Desktop UX**: Mouse users expect click-drag-release interaction
- **Mobile UX**: Touch users want to interact with the ball directly
- **Interaction Zones**: Limited to lawn area reduced natural feel
- **Learning Curve**: Two-stage process added unnecessary complexity

## Decision
Implement unified natural interaction system supporting:

### 1. Direct Ball Interaction
```javascript
// Allow clicking near ball for direct drag
const ballDistance = Math.hypot(pos.x - this.ball.x, pos.y - this.ball.y);
const interactionRadius = this.ball.radius * this.scale * 3;
```

### 2. Expanded Interaction Zones
- **Ball proximity**: 3x ball radius for generous targeting
- **Lawn area**: Traditional touch zone maintained for mobile users
- **Auto-arming**: Immediate arming on interaction start

### 3. Responsive Velocity Scaling
```javascript
// Adaptive velocity based on screen size and drag distance
const velocityScale = 3.0 + (this.scale * 2.0);
this.ball.vx = -dx * velocityScale;
this.ball.vy = -dy * velocityScale;
```

### 4. Enhanced Visual Feedback
- **Trajectory Preview**: Dotted path showing predicted ball movement
- **Dynamic Aiming Line**: From ball to cursor/finger position
- **Contextual UI**: "ARMED – Drag to throw" messaging

## Implementation Details

### Cross-Platform Input Handling
```javascript
handlePointerDown(pos) {
    // Support both ball-drag and lawn-tap interactions
    const ballDistance = Math.hypot(pos.x - this.ball.x, pos.y - this.ball.y);
    const interactionRadius = this.ball.radius * this.scale * 3;
    
    if (ballDistance <= interactionRadius || pos.y > this.lawn.y) {
        this.input.isDragMode = ballDistance <= interactionRadius;
        // Auto-arm on interaction
        this.state = GameState.ARMED;
    }
}
```

### Responsive Throw Mechanics
- **Lower threshold**: 30px minimum drag (down from 60px)
- **Velocity scaling**: Adapts to screen size for consistent feel
- **Visual feedback**: Real-time trajectory preview

## Consequences

### Positive
- ✅ **Intuitive desktop experience** - Natural click-drag-release
- ✅ **Enhanced mobile UX** - Direct ball manipulation
- ✅ **Reduced friction** - Single interaction paradigm  
- ✅ **Visual clarity** - Trajectory preview improves aim
- ✅ **Cross-platform consistency** - Same mechanics everywhere

### Negative
- ⚠️ **Complexity increase** - More interaction modes to test
- ⚠️ **Accidental throws** - Lower threshold may increase mistakes
- ⚠️ **Learning curve** - Existing users need to adapt

### Mitigations
- Generous interaction radius prevents frustration
- Visual feedback guides users to correct interaction
- Maintained backward compatibility with lawn-area interaction

## Testing Requirements
- [ ] Desktop mouse drag-and-drop functionality
- [ ] Mobile touch interaction across different screen sizes
- [ ] Trajectory preview accuracy
- [ ] Velocity scaling consistency across devices
- [ ] Accidental interaction prevention

## Related Decisions
- [ADR-001: Dynamic Screen Sizing](./001-dynamic-screen-sizing.md)
- [ADR-003: Physics and Game Balance](./003-physics-and-game-balance.md)

---
**Author**: Development Team  
**Stakeholder**: CEO/Product Owner - Natural interaction critical for $1M+ market opportunity  
**Performance Impact**: Minimal - Input handling optimization maintains 60 FPS target