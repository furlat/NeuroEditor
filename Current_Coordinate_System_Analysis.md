# Current Coordinate System Analysis: Functions & Input Handlers

## Overview
This document maps all current coordinate system functions, input handlers, and their interactions to guide the refactor to the new pixeloid-based architecture.

---

## Core Coordinate Functions

### **`ui/src/utils/isometricUtils.ts`** (Primary Coordinate Engine)

#### **Grid ↔ Isometric Conversions**
```typescript
// FUNCTION: gridToIsometric(gridX, gridY, gridDiamondWidth)
// PURPOSE: Convert grid coordinates to isometric screen coordinates  
// USES: Diamond width parameter, 2:1 aspect ratio
// CALLED BY: IsometricRenderingUtils, grid renderers
```

```typescript
// FUNCTION: isometricToGrid(isoX, isoY, gridDiamondWidth)  
// PURPOSE: Inverse transformation from isometric to grid
// USES: Solves linear equation system for precise conversion
// CALLED BY: Less frequently used, mainly for validation
```

#### **Screen ↔ Grid Conversions (Mouse Interaction)**
```typescript
// FUNCTION: screenToGrid(screenX, screenY, offsetX, offsetY, scaleFactor, gridWidth, gridHeight, gridDiamondWidth)
// PURPOSE: Critical function for mouse highlighting/interaction
// PARAMETERS:
//   - screenX/Y: Raw mouse pixel coordinates
//   - offsetX/Y: WASD camera offset  
//   - scaleFactor: Zoom level
//   - gridWidth/Height: Grid bounds
//   - gridDiamondWidth: Base diamond size
// FLOW: Screen → Relative → Scaled → Isometric → Grid
// CALLED BY: IsometricRenderingUtils.screenToGrid()
```

#### **Grid Positioning & Centering**
```typescript
// FUNCTION: calculateIsometricGridOffset(containerWidth, containerHeight, gridWidth, gridHeight, gridDiamondWidth, offsetX, offsetY, entityPanelWidth, zoomLevel)
// PURPOSE: Master positioning function - calculates where grid appears on screen
// COMPLEXITY: Handles centering, WASD offset, zoom scaling, entity panel accommodation
// PARAMETERS:
//   - containerWidth/Height: Screen/canvas dimensions
//   - gridWidth/Height: Grid size in tiles
//   - gridDiamondWidth: Base diamond size  
//   - offsetX/Y: WASD camera position
//   - entityPanelWidth: UI panel width offset
//   - zoomLevel: Zoom factor
// RETURNS: { offsetX, offsetY, tileSize, gridPixelWidth, gridPixelHeight, gridWidth, gridHeight }
// CALLED BY: Almost every rendering function
```

#### **Diamond Geometry**
```typescript
// FUNCTION: calculateIsometricDiamondCorners(centerX, centerY, gridDiamondWidth, strokeOffset)
// PURPOSE: Calculate diamond corner points for rendering
// USES: 2:1 aspect ratio, stroke offset for grid lines
// CALLED BY: Grid rendering, tile rendering
```

---

## Coordinate Parameter Sources

### **Store Parameters** (`ui/src/store/battlemap/core.ts`)

#### **View State**
```typescript
view: {
  offset: { x: number; y: number };        // WASD camera position
  showZLevel: number;                      // Active Z layer
  zoomLevel: number;                       // Zoom factor (default: 1.0)
  gridDiamondWidth: number;               // Base diamond size (default: 401)
  isRatioLocked: boolean;                 // Aspect ratio lock
  spriteScale: number;                    // Sprite scaling
  zLayerHeights: ZLayerConfig[];          // Vertical layer offsets
}
```

#### **Grid State**
```typescript
grid: {
  width: number;                          // Grid width in tiles
  height: number;                         // Grid height in tiles
}
```

#### **Actions**
```typescript
// WASD Movement
setOffset(x: number, y: number)

// Zoom Control  
setZoomLevel(zoom: number)               // Clamped to 0.1-5.0 range

// Grid Sizing
setGridDiamondWidth(width: number)
```

---

## Rendering Integration Layer

### **`ui/src/game/renderers/utils/IsometricRenderingUtils.ts`** (Wrapper Layer)

#### **Store-Integrated Coordinate Functions**
```typescript
// FUNCTION: calculateIsometricGridOffset(engine)
// PURPOSE: Wrapper that calls main function with store parameters
// ACCESSES: battlemapStore directly - PROBLEMATIC
// PARAMETERS: Extracted from store + engine.containerSize
// RETURNS: Same as core function
```

```typescript  
// FUNCTION: screenToGrid(screenX, screenY, engine)
// PURPOSE: Wrapper for screen-to-grid conversion
// ACCESSES: battlemapStore directly - PROBLEMATIC
// FLOW: 
//   1. Get grid offset from store
//   2. Get Z layer offset from store  
//   3. Call core screenToGrid() function
```

```typescript
// FUNCTION: renderIsometricDiamond(graphics, gridX, gridY, engine, strokeOptions)
// PURPOSE: Render single diamond with proper positioning
// ACCESSES: battlemapStore for all parameters
// FLOW:
//   1. Calculate grid offset
//   2. Convert grid → isometric  
//   3. Apply Z layer offset
//   4. Calculate diamond corners
//   5. Render diamond shape
```

```typescript
// FUNCTION: renderIsometricDiamonds(graphics, positions, engine, strokeOptions, zOffset)  
// PURPOSE: Batch render multiple diamonds with Z-offset support
// OPTIMIZATION: Single store access, batch rendering
```

---

## Input Handling System

### **Mouse Input** (`ui/src/game/IsometricInteractionsManager.ts`)

#### **PixiJS Event Setup**
```typescript
// EVENT SETUP:
this.hitArea = new Graphics();           // Transparent overlay
this.hitArea.eventMode = 'static';       // Enable interactions
this.hitArea.cursor = 'crosshair';

// EVENT HANDLERS:
this.hitArea.on('pointerdown', this.handlePointerDown);
this.hitArea.on('pointermove', this.handlePointerMove);  
this.hitArea.on('pointerup', this.handlePointerUp);
this.hitArea.on('pointerleave', this.handlePointerLeave);
```

#### **Mouse Position Processing**
```typescript
// FUNCTION: handlePointerMove(event: FederatedPointerEvent)
// FLOW:
//   1. Get pixel position from PixiJS event
//   2. Call screenToGrid() via IsometricGridRenderer
//   3. Update grid highlighting if in bounds
//   4. Handle tile editing if enabled

// FUNCTION: screenToGrid(pixelX: number, pixelY: number)  
// PURPOSE: Convert mouse pixels to grid coordinates
// DELEGATES: To isometricGridRenderer.screenToGrid()
```

#### **Hit Area Management**
```typescript
// FUNCTION: updateHitAreaSize()
// PURPOSE: Resize transparent overlay when container changes
// ACCESSES: engine.containerSize
// CREATES: Full-screen transparent rectangle for event capture
```

### **Keyboard Input** (`ui/src/game/MapMovementController.ts`)

#### **WASD Movement System**
```typescript
// INITIALIZATION:
initialize(ticker: Ticker): void         // PixiJS ticker integration
setupKeyboardListeners(): void          // DOM event listeners
setupTickerUpdate(): void              // Frame-based movement

// EVENT LISTENERS:
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', handleBlur);       // Reset on focus loss
```

#### **Movement Processing**
```typescript
// FUNCTION: updateMovement(ticker: Ticker)
// PURPOSE: Smooth frame-based WASD movement
// FREQUENCY: Every frame via PixiJS ticker
// FLOW:
//   1. Check if movement keys pressed
//   2. Calculate movement delta based on frame time
//   3. Apply acceleration/deceleration
//   4. Update store offset via battlemapActions.setOffset()
//   5. Trigger re-render through store updates

// MOVEMENT PARAMETERS:
BASE_SPEED = 200;                       // Base movement speed
MAX_SPEED_MULTIPLIER = 3.0;            // Maximum speed boost
ACCELERATION = 8.0;                     // Acceleration rate
```

---

## Renderer Integration

### **Grid Renderer** (`ui/src/game/renderers/IsometricGridRenderer.ts`)
```typescript
// DELEGATION PATTERN:
public screenToGrid(screenX: number, screenY: number) {
  return IsometricRenderingUtils.screenToGrid(screenX, screenY, this.engine);
}

// USAGE: Primary interface for mouse interaction coordinate conversion
```

### **Engine Integration** (`ui/src/game/BattlemapEngine.ts`)
```typescript
// CONTAINER SIZE TRACKING:
containerSize: { width: number; height: number } = { width: 0, height: 0 };

// TICKER SYSTEM:
app.ticker.add(this.updateRenderers, this);        // Frame-based updates
registerRenderer(name: string, renderer): void     // Renderer registration
```

---

## Hook Layer

### **Map Controls** (`ui/src/hooks/battlemap/useMapControls.ts`)

#### **Zoom Controls**
```typescript
// ZOOM FUNCTIONS:
const zoomIn = () => {
  const newZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
  battlemapActions.setZoomLevel(newZoom);
};

const zoomOut = () => {
  const newZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);  
  battlemapActions.setZoomLevel(newZoom);
};

// CONSTANTS:
ZOOM_STEP = 0.1;
MIN_ZOOM = 0.1;
MAX_ZOOM = 5.0;
```

#### **Offset Access**
```typescript
// PERFORMANCE OPTIMIZATION: Direct store access to avoid re-renders
const getOffset = () => battlemapStore.view.offset;
```

### **Grid Hook** (`ui/src/hooks/battlemap/useGrid.ts`)
```typescript
// CONTAINER SIZE MANAGEMENT:
const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

// USED BY: BattleMapCanvas for engine initialization
```

---

## Component Integration

### **Canvas Controls** (`ui/src/components/battlemap/canvas/CanvasControls.tsx`)
```typescript
// UI ACTIONS THAT TRIGGER COORDINATE UPDATES:
onClick={zoomIn}                        // Zoom controls
onClick={zoomOut}
onClick={resetView}                     // Reset camera/zoom
onClick={toggleGridVisibility}          // Grid rendering
```

### **Configuration Panel** (`ui/src/components/battlemap/canvas/IsometricConfigurationPanel.tsx`)
```typescript
// ACTIONS AFFECTING COORDINATE SYSTEM:
onClick={generateSampleTiles}           // Tile generation
onClick={clearAllTiles}                 // Tile clearing  
onClick={() => initializeGrid(30, 20)} // Grid resizing
onClick={() => battlemapActions.resetZLayerHeights()}  // Z-layer reset
```

---

## Current System Problems

### **1. Scattered Parameter Passing**
```typescript
// SAME PARAMETERS PASSED EVERYWHERE:
containerSize.width, containerSize.height,
snap.grid.width, snap.grid.height,
snap.view.gridDiamondWidth,
snap.view.offset.x, snap.view.offset.y,
ENTITY_PANEL_WIDTH,
snap.view.zoomLevel
```

### **2. Store Dependencies in Rendering**
```typescript
// PROBLEMATIC: Rendering utils directly access store
const snap = battlemapStore;  // IsometricRenderingUtils.ts line 23
```

### **3. Complex Transformation Chains**
```typescript
// CURRENT FLOW:
Screen Pixels → Relative Coords → Scaled Coords → Isometric Coords → Grid Coords
// WITH: Multiple zoom applications, offset calculations, centering logic
```

### **4. Circular Dependencies**
```typescript
// PROBLEMATIC FLOW:
Mouse Move → screenToGrid() → Store Access → Re-render → Position Recalculation
WASD Move → Store Update → Re-render → All coordinate functions called
Zoom Change → Store Update → Re-render → All coordinate functions recalculate
```

---

## Functions Requiring Refactor

### **High Priority - Core Functions**
1. **`gridToIsometric()`** - Convert to pixeloid-based
2. **`isometricToGrid()`** - Convert to pixeloid-based  
3. **`screenToGrid()`** - Simplify transformation chain
4. **`calculateIsometricGridOffset()`** - Replace with pixeloid camera system

### **Medium Priority - Wrappers**
1. **`IsometricRenderingUtils.calculateIsometricGridOffset()`** - Replace with CoordinateSystem
2. **`IsometricRenderingUtils.screenToGrid()`** - Use new coordinate system
3. **`IsometricGridRenderer.screenToGrid()`** - Update delegation

### **Low Priority - Integration**
1. **`MapMovementController.updateMovement()`** - Update to modify camera position
2. **`IsometricInteractionsManager.handlePointerMove()`** - Use new coordinate system
3. **Store actions** (`setOffset`, `setZoomLevel`) - Update for pixeloid system

### **Components Requiring Updates**
1. **`useMapControls`** - New zoom/camera controls
2. **`CanvasControls`** - Updated control handlers  
3. **Position display components** - New coordinate display

---

## Migration Strategy

### **Phase 1: New Coordinate System Foundation**
- Implement `CoordinateSystem` class
- Add pixeloid type definitions  
- Create pixeloid ↔ screen transformations

### **Phase 2: Core Function Replacement**
- Replace `calculateIsometricGridOffset()` with camera system
- Update `screenToGrid()` to use new transformation chain
- Modify rendering utils to use `CoordinateSystem`

### **Phase 3: Input Handler Updates**  
- Update mouse position processing
- Modify WASD movement to control camera
- Update zoom controls for pixeloid scaling

### **Phase 4: Store & Component Integration**
- Update store structure for new coordinate system
- Modify hooks to use new coordinate system
- Add position info component

This analysis provides the complete map of current coordinate system complexity and identifies exactly what needs to be refactored for the new pixeloid-based architecture.