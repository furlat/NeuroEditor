# Coordinate System Refactor: Pixeloid-Based Architecture

## Current System Problems

### Complex Coordinate Interactions
The current system has convoluted interactions between multiple coordinate systems:

```typescript
// Current problematic flow
Grid Position → Isometric Coordinates → Screen Coordinates → WASD Offset → Zoom Scaling
```

**Issues:**
- **Circular Dependencies**: Zoom affects positioning, positioning affects rendering, rendering triggers zoom recalculation
- **Precision Loss**: Multiple coordinate transformations compound floating-point errors
- **Cognitive Overload**: Developers must mentally track 4+ coordinate systems simultaneously
- **Performance**: Runtime coordinate transformations on every frame

---

## New Pixeloid-Based Architecture

### Core Concept: Pixels vs Pixeloids

#### **PIXELS** 🖥️
- **Definition**: Actual screen coordinates (monitor pixels)
- **Usage**: Mouse position, DOM elements, final rendering
- **Origin**: Top-left corner of screen/canvas

#### **PIXELOIDS** 🎨
- **Definition**: Rescaled sprite/grid coordinates (design-time coordinates)
- **Usage**: Grid dimensions, sprite anchors, diamond positioning
- **Origin**: Configurable origin point in pixeloid canvas
- **Scaling**: Zoom factor = pixeloid-to-pixel scaling ratio

### Coordinate System Hierarchy

```
                    GLOBAL PIXELOID CANVAS (Entire Game World)
         ┌───────────────────────────────────────────────────────────────┐
         │                                                               │
         │  ┌─────────────────────────────────────────────────────────┐  │
         │  │            GRID COORDINATES (Logical Grid)              │  │
         │  │  ┌─────────────────────────────────────────────────┐    │  │
         │  │  │         DIAMOND LOCAL COORDINATES               │    │  │
         │  │  │                                               │    │  │
         │  │  └─────────────────────────────────────────────────┘    │  │
         │  └─────────────────────────────────────────────────────────┘  │
         │         ┌─────────────────────────────────────┐                │
         │         │    ON-SCREEN PIXELOID CANVAS        │ ◄── Camera View│
         │         │    (Currently Visible Pixeloids)    │                │
         │         └─────────────────────────────────────┘                │
         └───────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
                         ┌─────────────────────────────────────┐
                         │           SCREEN PIXELS             │
                         │        (Monitor Coordinates)        │
                         └─────────────────────────────────────┘
```

**Camera/WASD Movement**: Determines which portion of GLOBAL PIXELOID CANVAS is shown in ON-SCREEN PIXELOID CANVAS

---

## Coordinate System Definitions

### 1. **GLOBAL PIXELOID CANVAS** (Entire Game World)
```typescript
interface GlobalPixeloidCoord {
  x: number; // Pixeloid X in global canvas (can be negative, extends infinitely)
  y: number; // Pixeloid Y in global canvas (can be negative, extends infinitely)
}
```
- **Origin**: Arbitrary point in global space (not necessarily 0,0)
- **Extent**: Infinite canvas containing all game content
- **Purpose**: Master coordinate system for all game assets

### 2. **ON-SCREEN PIXELOID CANVAS** (Currently Visible)
```typescript
interface OnScreenPixeloidCoord {
  x: number; // Pixeloid X relative to current camera view (0 = left edge of screen)
  y: number; // Pixeloid Y relative to current camera view (0 = top edge of screen)
}
```
- **Origin**: Top-left of currently visible area
- **Extent**: Determined by screen size and pixeloid scale
- **Purpose**: Camera-relative coordinates for rendering

### 3. **GRID COORDINATES** (Logical Grid)
```typescript
interface GridCoord {
  gridX: number; // Grid column (0-based)
  gridY: number; // Grid row (0-based)
}
```
- **Origin**: Grid (0,0) position in global pixeloid space
- **Purpose**: Logical game grid positioning

### 4. **SCREEN PIXELS** (Monitor Coordinates)
```typescript
interface ScreenPixelCoord {
  x: number; // Screen pixel X (0 = left edge of monitor)
  y: number; // Screen pixel Y (0 = top edge of monitor)
}
```
- **Origin**: Top-left corner of screen/canvas
- **Purpose**: Final rendering coordinates, mouse interaction

---

## Coordinate Transformation Chain

### **Clarified Mapping Flow**
```
Screen Pixels ↔ On-Screen Pixeloids ↔ Global Pixeloids ↔ Grid Coordinates
```

**Key Insight**: WASD/Camera movement changes the relationship between Global Pixeloids and On-Screen Pixeloids, but doesn't affect Grid Coordinates or Screen Pixels directly.

### **Transformation Functions**
```typescript
class CoordinateSystem {
  constructor(
    private pixeloidScale: number,           // Zoom factor (pixeloids per pixel)
    private cameraOffset: GlobalPixeloidCoord // WASD camera position in global space
  ) {}

  // Screen Pixels ↔ On-Screen Pixeloids
  screenToOnScreen(screen: ScreenPixelCoord): OnScreenPixeloidCoord {
    return {
      x: screen.x / this.pixeloidScale,
      y: screen.y / this.pixeloidScale
    };
  }
  
  onScreenToScreen(onScreen: OnScreenPixeloidCoord): ScreenPixelCoord {
    return {
      x: onScreen.x * this.pixeloidScale,
      y: onScreen.y * this.pixeloidScale
    };
  }

  // On-Screen Pixeloids ↔ Global Pixeloids (Camera/WASD affects this)
  onScreenToGlobal(onScreen: OnScreenPixeloidCoord): GlobalPixeloidCoord {
    return {
      x: onScreen.x + this.cameraOffset.x,
      y: onScreen.y + this.cameraOffset.y
    };
  }
  
  globalToOnScreen(global: GlobalPixeloidCoord): OnScreenPixeloidCoord {
    return {
      x: global.x - this.cameraOffset.x,
      y: global.y - this.cameraOffset.y
    };
  }

  // Global Pixeloids ↔ Grid Coordinates (Static relationship)
  gridToGlobal(grid: GridCoord): GlobalPixeloidCoord {
    // Isometric transformation in global pixeloid space
    const isoX = (grid.gridX - grid.gridY) * (this.gridDiamondWidth / 2);
    const isoY = (grid.gridX + grid.gridY) * (this.gridDiamondHeight / 2);
    
    return {
      x: this.gridOrigin.x + isoX,
      y: this.gridOrigin.y + isoY
    };
  }
  
  globalToGrid(global: GlobalPixeloidCoord): GridCoord {
    // Inverse isometric transformation
    const relativeX = global.x - this.gridOrigin.x;
    const relativeY = global.y - this.gridOrigin.y;
    
    const gridX = (relativeX / (this.gridDiamondWidth / 2) + relativeY / (this.gridDiamondHeight / 2)) / 2;
    const gridY = (relativeY / (this.gridDiamondHeight / 2) - relativeX / (this.gridDiamondWidth / 2)) / 2;
    
    return {
      gridX: Math.round(gridX),
      gridY: Math.round(gridY)
    };
  }

  // Convenience: Direct Screen ↔ Global transformations
  screenToGlobal(screen: ScreenPixelCoord): GlobalPixeloidCoord {
    const onScreen = this.screenToOnScreen(screen);
    return this.onScreenToGlobal(onScreen);
  }
  
  globalToScreen(global: GlobalPixeloidCoord): ScreenPixelCoord {
    const onScreen = this.globalToOnScreen(global);
    return this.onScreenToScreen(onScreen);
  }
}
```

---

## Implementation Phases

### **Phase 1: Coordinate System Foundation**

#### 1.1 **Core Coordinate Classes**
```typescript
// ui/src/utils/coordinates/CoordinateSystem.ts
export class CoordinateSystem {
  constructor(
    private pixeloidScale: number,    // Zoom factor (pixeloids per pixel)
    private cameraOffset: ScreenPixelCoord,  // WASD camera position
    private gridDimensions: { width: number; height: number }, // In pixeloids
    private gridOrigin: GlobalPixeloidCoord  // Grid origin in pixeloid canvas
  ) {}
}
```

#### 1.2 **Coordinate Type Definitions**
```typescript
// ui/src/types/coordinates.ts
export interface ScreenPixelCoord { x: number; y: number; }
export interface GlobalPixeloidCoord { x: number; y: number; }
export interface GridCoord { gridX: number; gridY: number; }
export interface DiamondLocalCoord { x: number; y: number; }
```

#### 1.3 **Store Integration**
```typescript
// ui/src/store/battlemap/coordinates.ts
export interface CoordinateStore {
  // Core parameters
  pixeloidScale: number;           // Zoom factor
  cameraOffset: ScreenPixelCoord;  // WASD position
  gridDimensions: { width: number; height: number }; // In pixeloids
  gridOrigin: GlobalPixeloidCoord; // Grid origin
  
  // Visualization
  showPixeloidGrid: boolean;       // Show checkmark pattern
  pixeloidGridSize: number;        // Checkmark square size (in pixeloids)
}
```

### **Phase 2: Pixeloid Checkmark Layer**

#### 2.1 **Pixeloid Grid Renderer**
```typescript
// ui/src/game/renderers/PixeloidGridRenderer.ts
export class PixeloidGridRenderer {
  private container: Container;
  
  constructor(private coordinateSystem: CoordinateSystem) {
    this.container = new Container();
  }
  
  renderPixeloidGrid(visible: boolean, gridSize: number): void {
    // Render photoshop-style checkmark pattern
    // Each square = 1 pixeloid minimum
    // Scaling based on current pixeloidScale
  }
}
```

#### 2.2 **Layer Integration**
```typescript
// ui/src/game/BattlemapEngine.ts
private layerContainers: Record<LayerName, Container> = {
  pixeloid_grid: new Container(),  // NEW: Below everything
  tiles: new Container(),
  grid: new Container(),
  // ... existing layers
}
```

### **Phase 3: Diamond Positioning Integration**

#### 3.1 **Diamond Coordinate System**
```typescript
// ui/src/game/positioning/DiamondPositioning.ts
export class DiamondPositioning {
  constructor(private coordinateSystem: CoordinateSystem) {}
  
  // Convert diamond analysis data to global pixeloid positions
  getDiamondGlobalPosition(
    analysis: AssetAnalysis, 
    gridPos: GridCoord
  ): GlobalPixeloidCoord {
    const gridPixeloid = this.coordinateSystem.gridToPixeloid(gridPos);
    const diamondCenter = analysis.diamond_info.lower_diamond.center;
    
    return {
      x: gridPixeloid.x + diamondCenter.x,
      y: gridPixeloid.y + diamondCenter.y
    };
  }
}
```

#### 3.2 **Asset Analysis Integration**
```typescript
// ui/src/services/AssetAnalysisManager.ts
export class AssetAnalysisManager {
  async loadAnalysis(spriteName: string): Promise<AssetAnalysis> {
    // Load pre-computed diamond analysis
    // All coordinates in analysis files are in pixeloids
  }
}
```

### **Phase 4: Position Info Component**

#### 4.1 **Position Display Component**
```typescript
// ui/src/components/battlemap/debug/PositionInfoPanel.tsx
export const PositionInfoPanel: React.FC = () => {
  const [currentPosition, setCurrentPosition] = useState<{
    screen: ScreenPixelCoord;
    pixeloid: GlobalPixeloidCoord;
    grid: GridCoord;
    diamondLocal: DiamondLocalCoord;
  }>();
  
  // Real-time coordinate tracking
  useEffect(() => {
    const updatePosition = (mouseEvent: MouseEvent) => {
      const coordinateSystem = new CoordinateSystem(/* ... */);
      
      const screen = { x: mouseEvent.clientX, y: mouseEvent.clientY };
      const pixeloid = coordinateSystem.screenToPixeloid(screen);
      const grid = coordinateSystem.pixeloidToGrid(pixeloid);
      const diamondLocal = coordinateSystem.globalToDiamondLocal(pixeloid, grid);
      
      setCurrentPosition({ screen, pixeloid, grid, diamondLocal });
    };
    
    // Mouse tracking
  }, []);
  
  return (
    <Box sx={{ position: 'fixed', top: 16, right: 16, bgcolor: 'rgba(0,0,0,0.8)' }}>
      <Typography variant="h6">Position Info</Typography>
      <Typography>Grid: ({currentPosition?.grid.gridX}, {currentPosition?.grid.gridY})</Typography>
      <Typography>Global Pixeloid: ({currentPosition?.pixeloid.x}, {currentPosition?.pixeloid.y})</Typography>
      <Typography>Diamond Local: ({currentPosition?.diamondLocal.x}, {currentPosition?.diamondLocal.y})</Typography>
      <Typography>Screen: ({currentPosition?.screen.x}, {currentPosition?.screen.y})</Typography>
    </Box>
  );
};
```

---

## Technical Specifications

### **Pixeloid Scale Calculation**
```typescript
// Zoom factor = how many pixeloids fit in one screen pixel
// zoom = 1.0 → 1 pixeloid = 1 screen pixel
// zoom = 2.0 → 2 pixeloids = 1 screen pixel (zoomed out)
// zoom = 0.5 → 1 pixeloid = 2 screen pixels (zoomed in)

const pixeloidScale = zoom; // Direct mapping
```

### **Camera Position Mapping**
```typescript
// WASD offset affects which pixeloids are visible
class CameraSystem {
  getVisiblePixeloidBounds(): {
    min: GlobalPixeloidCoord;
    max: GlobalPixeloidCoord;
  } {
    const topLeft = this.coordinateSystem.screenToPixeloid({ x: 0, y: 0 });
    const bottomRight = this.coordinateSystem.screenToPixeloid({ 
      x: this.screenWidth, 
      y: this.screenHeight 
    });
    
    return { min: topLeft, max: bottomRight };
  }
}
```

### **Grid-to-Pixeloid Mapping**
```typescript
// Grid coordinates map to pixeloid canvas positions
class GridPixeloidMapping {
  gridToPixeloid(grid: GridCoord): GlobalPixeloidCoord {
    // Isometric transformation in pixeloid space
    const isoX = (grid.gridX - grid.gridY) * (this.gridDiamondWidth / 2);
    const isoY = (grid.gridX + grid.gridY) * (this.gridDiamondHeight / 2);
    
    return {
      x: this.gridOrigin.x + isoX,
      y: this.gridOrigin.y + isoY
    };
  }
}
```

---

## Benefits of Pixeloid Architecture

### **1. Simplified Mental Model**
- **Before**: Track 4+ coordinate systems with complex transformations
- **After**: Linear chain of simple transformations

### **2. Zoom as Scaling**
- **Before**: Zoom affects positioning calculations
- **After**: Zoom is pure pixeloid-to-pixel scaling

### **3. Performance Optimization**
- **Before**: Runtime coordinate transformations
- **After**: Pre-computed pixeloid positions, simple scaling

### **4. Developer Experience**
- **Before**: Trial-and-error positioning
- **After**: Visual pixeloid grid + real-time coordinate display

### **5. Asset Integration**
- **Before**: Manual margin calculations
- **After**: Direct pixeloid anchor points from analysis data

---

## Migration Strategy

### **Phase 1**: Foundation (Week 1)
- Implement coordinate system classes
- Add pixeloid grid visualization
- Create position info component

### **Phase 2**: Integration (Week 2)  
- Replace existing coordinate calculations
- Integrate with diamond positioning
- Update rendering pipeline

### **Phase 3**: Optimization (Week 3)
- Performance optimization
- Visual polish
- Testing and refinement

This pixeloid-based architecture will dramatically simplify the coordinate system while providing a solid foundation for the diamond positioning system.