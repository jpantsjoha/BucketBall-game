# ADR-006: Ball Interaction and 3D Perspective Scaling

## Status
Accepted

## Date
2025-08-27

## Context
The game requires intuitive ball interaction mechanics that work seamlessly on both desktop and mobile devices, while maintaining realistic 3D perspective that enhances the gameplay experience.

## Decision

### Interaction Zone
- **Drag Area**: Entire bottom 20% of screen (below chalk line)
- **Launch Position**: Ball ALWAYS launches from chalk line (y = 80% of screen height)
- **Horizontal Freedom**: User can drag anywhere horizontally, ball X position adjusts slightly based on drag
- **Vertical Consistency**: Regardless of where user drags in bottom 20%, ball launches from chalk line Y position

### Ball Sizing and Perspective
- **Base Size**: 20px radius (golf ball size)
- **Starting Size**: 100% at chalk line (28px visible radius with 1.4x multiplier)
- **Bucket Size**: 40% at bucket position (11.2px visible radius)
- **Progressive Scaling**: Linear interpolation from 100% to 40% based on Y position
- **Perspective Formula**: `factor = 1.0 - (relativePosition * 0.6)`

### Visual Hierarchy
1. **At Rest**: Ball sits below chalk line, full size for easy visibility
2. **During Drag**: Ball remains in place, drag gesture shown with aiming line
3. **On Release**: Ball jumps to chalk line position and launches
4. **In Flight**: Ball progressively shrinks as it approaches bucket (5 meters away)
5. **Near Bucket**: Ball is appropriately sized to fit inside bucket

## Consequences

### Positive
- **Generous Touch Target**: Entire bottom 20% is draggable - no precision required
- **Consistent Physics**: Ball always launches from same Y position - predictable trajectory
- **Realistic Depth**: Progressive scaling creates believable 3D perspective
- **Mobile Friendly**: Large drag area works well with finger input
- **Visual Clarity**: Ball is large enough to see at start, small enough to fit in bucket

### Negative
- **Learning Curve**: Users might expect ball to launch from exact drag position
- **Visual Jump**: Ball teleports to chalk line on release (acceptable for gameplay)

## Implementation Details

```javascript
// Interaction Detection
if (pos.y > this.LOGICAL_HEIGHT * 0.8) {  // Anywhere below chalk line
    // Allow drag interaction
}

// Launch Position
const chalkLineY = this.LOGICAL_HEIGHT * 0.8;
this.ball.y = chalkLineY;  // Always launch from chalk line

// Perspective Scaling
getPerspectiveFactor() {
    const chalkLineY = this.game.LOGICAL_HEIGHT * 0.8;
    const bucketY = this.game.LOGICAL_HEIGHT * 0.15;
    const relativePosition = Math.max(0, Math.min(1, 
        (chalkLineY - this.y) / (chalkLineY - bucketY)
    ));
    return 1.0 - (relativePosition * 0.6);  // 60% size reduction at bucket
}
```

## Rationale
This approach balances ease of use with realistic physics simulation. The generous drag area ensures the game is accessible on all devices, while the consistent launch position and progressive scaling create a believable 3D throwing experience that matches the "5 meters away" game premise.