# ADR-001: Dynamic Full-Screen Sizing Architecture

## Status
**ACCEPTED** - August 25, 2025

## Context
The original BucketBall implementation used fixed logical dimensions (1080×1920) with letterboxing, resulting in unused screen real estate and poor user experience across different device sizes.

## Problem
- Game not utilizing full screen on various device orientations and sizes
- Poor user experience on wide screens and tablets
- Fixed aspect ratio limiting responsive design potential
- Wasted screen space affecting game immersion

## Decision
Implement dynamic screen sizing that:
1. **Uses full screen dimensions** for all device types
2. **Maintains aspect ratio constraints** (0.5 to 2.0 width/height ratio)
3. **Scales game elements proportionally** based on screen size
4. **Updates logical dimensions** in real-time during resize events

### Technical Implementation
```javascript
// Dynamic logical dimensions
this.LOGICAL_WIDTH = window.innerWidth (with constraints)
this.LOGICAL_HEIGHT = window.innerHeight (with constraints)
this.scale = Math.min(width/BASE_WIDTH, height/BASE_HEIGHT)

// Full canvas utilization
canvas.width = displayWidth * dpr
canvas.height = displayHeight * dpr
canvas.style.width = displayWidth + 'px'
canvas.style.height = displayHeight + 'px'
```

## Consequences

### Positive
- ✅ **Full screen utilization** across all devices
- ✅ **Improved user experience** with larger interaction areas
- ✅ **Better mobile engagement** with optimal screen usage
- ✅ **Responsive design** that adapts to orientation changes
- ✅ **Future-proof** for new device form factors

### Negative
- ⚠️ **Increased complexity** in coordinate calculations
- ⚠️ **Testing overhead** for multiple screen sizes
- ⚠️ **Game balance** may need adjustment for different aspect ratios

## Implementation Notes
- All game objects now receive `game` instance for dynamic dimensions
- Drawing methods accept `scale` parameter for proportional rendering
- Collision detection updated for scaled coordinates
- UI elements scale with screen size for consistent usability

## Related Decisions
- [ADR-002: Natural Mouse Interaction](./002-natural-mouse-interaction.md)
- Physics scaling considerations documented in game specifications

---
**Author**: Development Team  
**Reviewed By**: Product Owner, Technical Lead  
**Next Review**: Performance testing with various device sizes