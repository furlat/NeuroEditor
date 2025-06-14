import { proxy } from 'valtio';
import { TileSummary, WallSummary } from '../types/battlemap_types';
import type { DeepReadonly } from '../types/common';
import { TileType } from '../hooks/battlemap';
import { IsometricDirection, SpriteCategory } from '../game/managers/IsometricSpriteManager';
import { isometricSpriteManager } from '../game/managers/IsometricSpriteManager';

// Z-layer configuration - NOW MUTABLE for user control
export const Z_LAYER_CONFIG = {
  maxLayers: 3
} as const;

// Layer visibility modes
export enum LayerVisibilityMode {
  SHADOW = 'shadow',     // All tiles visible, inactive layers dimmed/tinted
  INVISIBLE = 'invisible', // Only active layer tiles visible
  NORMAL = 'normal'      // All tiles visible with full opacity
}

// NEW: Vertical bias computation modes
export enum VerticalBiasComputationMode {
  ROUND_DOWN = 'round_down',    // Math.floor (original)
  ROUND_UP = 'round_up',        // Math.ceil  
  SNAP_TO_NEAREST = 'snap_to_nearest' // Compute then snap to nearest value between 36-196
}

// Default Z-layer settings (moved to store for user control)
export const DEFAULT_Z_LAYER_SETTINGS = [
  { z: 0, verticalOffset: 0, name: 'Ground', color: 0x444444 },
  { z: 1, verticalOffset: 36, name: 'Level 1', color: 0x666666 },
  { z: 2, verticalOffset: 196, name: 'Level 2', color: 0x888888 },
];

// Enhanced types for isometric editing
export interface IsometricEditorState {
  selectedSpriteName: string | null;
  selectedSpriteDirection: IsometricDirection;
  selectedZLevel: number;
  selectedSpriteCategory: SpriteCategory;
  brushSize: number; // For painting multiple tiles at once
  isDirectionalMode: boolean; // Whether to auto-select direction based on neighbors
  // EXACT USER SPECIFICATION: Per-sprite-type positioning settings
  spriteTypeSettings: Record<string, {
    // 4-directional invisible margins
    invisibleMarginUp: number;
    invisibleMarginDown: number;
    invisibleMarginLeft: number;
    invisibleMarginRight: number;
    // Auto-computed vertical bias (from width/2 and normalized height formula)
    autoComputedVerticalBias: number;
    // Whether to use auto-computed or manual
    useAutoComputed: boolean;
    // User provided manual bias (shown in menu, initially set to auto-computed)
    manualVerticalBias: number;
    // NEW: Per-direction configuration support
    useSharedSettings?: boolean; // Whether to use shared settings for all directions
    directionalSettings?: {
      [IsometricDirection.NORTH]?: {
        invisibleMarginUp: number;
        invisibleMarginDown: number;
        invisibleMarginLeft: number;
        invisibleMarginRight: number;
        autoComputedVerticalBias: number;
        useAutoComputed: boolean;
        manualVerticalBias: number;
        spriteBoundingBox?: {
          originalWidth: number;
          originalHeight: number; 
          boundingX: number;
          boundingY: number;
          boundingWidth: number;
          boundingHeight: number;
          anchorOffsetX: number;
          anchorOffsetY: number;
        };
      };
      [IsometricDirection.EAST]?: {
        invisibleMarginUp: number;
        invisibleMarginDown: number;
        invisibleMarginLeft: number;
        invisibleMarginRight: number;
        autoComputedVerticalBias: number;
        useAutoComputed: boolean;
        manualVerticalBias: number;
        spriteBoundingBox?: {
          originalWidth: number;
          originalHeight: number; 
          boundingX: number;
          boundingY: number;
          boundingWidth: number;
          boundingHeight: number;
          anchorOffsetX: number;
          anchorOffsetY: number;
        };
      };
      [IsometricDirection.SOUTH]?: {
        invisibleMarginUp: number;
        invisibleMarginDown: number;
        invisibleMarginLeft: number;
        invisibleMarginRight: number;
        autoComputedVerticalBias: number;
        useAutoComputed: boolean;
        manualVerticalBias: number;
        spriteBoundingBox?: {
          originalWidth: number;
          originalHeight: number; 
          boundingX: number;
          boundingY: number;
          boundingWidth: number;
          boundingHeight: number;
          anchorOffsetX: number;
          anchorOffsetY: number;
        };
      };
      [IsometricDirection.WEST]?: {
        invisibleMarginUp: number;
        invisibleMarginDown: number;
        invisibleMarginLeft: number;
        invisibleMarginRight: number;
        autoComputedVerticalBias: number;
        useAutoComputed: boolean;
        manualVerticalBias: number;
        spriteBoundingBox?: {
          originalWidth: number;
          originalHeight: number; 
          boundingX: number;
          boundingY: number;
          boundingWidth: number;
          boundingHeight: number;
          anchorOffsetX: number;
          anchorOffsetY: number;
        };
      };
    };
  }>;
  // NEW: Wall-specific settings
  wallMode: boolean; // Toggle between block and wall editing modes
  selectedWallType: 'brick' | 'stone' | 'wood' | 'custom';
  wallPlacementDirection: IsometricDirection; // Which edge to place wall on
  wallSpriteDirection: IsometricDirection; // Which direction the wall sprite faces
  // NEW: Remember last selected sprites for each mode
  lastSelectedBlockSprite: string | null; // Last selected sprite in block mode
  lastSelectedWallSprite: string | null; // Last selected sprite in wall mode
  // Wall positioning settings (SAME SYSTEM AS BLOCKS - wall sprites are just positioned relative to edges instead of centers)
  wallPositioningSettings: Record<string, {
    // 4-directional invisible margins (same as blocks)
    invisibleMarginUp: number;
    invisibleMarginDown: number;
    invisibleMarginLeft: number;
    invisibleMarginRight: number;
    // Auto-computed vertical bias (same calculation as blocks)
    autoComputedVerticalBias: number;
    // Whether to use auto-computed or manual
    useAutoComputed: boolean;
    // User provided manual bias (same as blocks)
    manualVerticalBias: number;
    // Manual horizontal offset for fine-tuning wall X position
    manualHorizontalOffset: number;
    // Manual diagonal offsets along diamond border axes
    manualDiagonalNorthEastOffset: number; // Along NE-SW diagonal axis
    manualDiagonalNorthWestOffset: number; // Along NW-SE diagonal axis
    // Wall-relative positioning offsets (relative to wall's edge and orientation)
    relativeAlongEdgeOffset: number;       // Parallel to wall's edge (left/right along edge)
    relativeTowardCenterOffset: number;    // Perpendicular to edge (into/out of diamond)
    relativeDiagonalAOffset: number;       // First 45° diagonal relative to wall's edge
    relativeDiagonalBOffset: number;       // Second 45° diagonal relative to wall's edge
    // NEW: Sprite-specific positioning behavior flags
    useADivisionForNorthEast: boolean;     // Whether North/East walls divide A diagonal by 2
    useSpriteTrimmingForWalls: boolean;    // Whether to trim transparent pixels and adjust anchor to bounding box
    // NEW: Per-direction configuration support (SAME AS BLOCKS)
    useSharedSettings?: boolean; // Whether to use shared settings for all directions
    directionalSettings?: {
      [IsometricDirection.NORTH]?: {
        invisibleMarginUp: number;
        invisibleMarginDown: number;
        invisibleMarginLeft: number;
        invisibleMarginRight: number;
        autoComputedVerticalBias: number;
        useAutoComputed: boolean;
        manualVerticalBias: number;
        manualHorizontalOffset: number;
        manualDiagonalNorthEastOffset: number;
        manualDiagonalNorthWestOffset: number;
        relativeAlongEdgeOffset: number;
        relativeTowardCenterOffset: number;
        relativeDiagonalAOffset: number;
        relativeDiagonalBOffset: number;
        useADivisionForNorthEast: boolean;
        useSpriteTrimmingForWalls: boolean;
        spriteBoundingBox?: {
          originalWidth: number;
          originalHeight: number; 
          boundingX: number;
          boundingY: number;
          boundingWidth: number;
          boundingHeight: number;
          anchorOffsetX: number;
          anchorOffsetY: number;
        };
      };
      [IsometricDirection.EAST]?: {
        invisibleMarginUp: number;
        invisibleMarginDown: number;
        invisibleMarginLeft: number;
        invisibleMarginRight: number;
        autoComputedVerticalBias: number;
        useAutoComputed: boolean;
        manualVerticalBias: number;
        manualHorizontalOffset: number;
        manualDiagonalNorthEastOffset: number;
        manualDiagonalNorthWestOffset: number;
        relativeAlongEdgeOffset: number;
        relativeTowardCenterOffset: number;
        relativeDiagonalAOffset: number;
        relativeDiagonalBOffset: number;
        useADivisionForNorthEast: boolean;
        useSpriteTrimmingForWalls: boolean;
        spriteBoundingBox?: {
          originalWidth: number;
          originalHeight: number; 
          boundingX: number;
          boundingY: number;
          boundingWidth: number;
          boundingHeight: number;
          anchorOffsetX: number;
          anchorOffsetY: number;
        };
      };
      [IsometricDirection.SOUTH]?: {
        invisibleMarginUp: number;
        invisibleMarginDown: number;
        invisibleMarginLeft: number;
        invisibleMarginRight: number;
        autoComputedVerticalBias: number;
        useAutoComputed: boolean;
        manualVerticalBias: number;
        manualHorizontalOffset: number;
        manualDiagonalNorthEastOffset: number;
        manualDiagonalNorthWestOffset: number;
        relativeAlongEdgeOffset: number;
        relativeTowardCenterOffset: number;
        relativeDiagonalAOffset: number;
        relativeDiagonalBOffset: number;
        useADivisionForNorthEast: boolean;
        useSpriteTrimmingForWalls: boolean;
        spriteBoundingBox?: {
          originalWidth: number;
          originalHeight: number; 
          boundingX: number;
          boundingY: number;
          boundingWidth: number;
          boundingHeight: number;
          anchorOffsetX: number;
          anchorOffsetY: number;
        };
      };
      [IsometricDirection.WEST]?: {
        invisibleMarginUp: number;
        invisibleMarginDown: number;
        invisibleMarginLeft: number;
        invisibleMarginRight: number;
        autoComputedVerticalBias: number;
        useAutoComputed: boolean;
        manualVerticalBias: number;
        manualHorizontalOffset: number;
        manualDiagonalNorthEastOffset: number;
        manualDiagonalNorthWestOffset: number;
        relativeAlongEdgeOffset: number;
        relativeTowardCenterOffset: number;
        relativeDiagonalAOffset: number;
        relativeDiagonalBOffset: number;
        useADivisionForNorthEast: boolean;
        useSpriteTrimmingForWalls: boolean;
        spriteBoundingBox?: {
          originalWidth: number;
          originalHeight: number; 
          boundingX: number;
          boundingY: number;
          boundingWidth: number;
          boundingHeight: number;
          anchorOffsetX: number;
          anchorOffsetY: number;
        };
      };
    };
    // NEW: Stored bounding box relationship (computed once, reused always)
    spriteBoundingBox?: {
      originalWidth: number;
      originalHeight: number; 
      boundingX: number;
      boundingY: number;
      boundingWidth: number;
      boundingHeight: number;
      anchorOffsetX: number;  // Normalized anchor offset (0-1)
      anchorOffsetY: number;  // Normalized anchor offset (0-1)
    };
  }>;
}

// Types for the local-only store
export interface GridState {
  width: number;
  height: number;
  tiles: Record<string, TileSummary>;
  // NEW: Wall storage with 4D keys: x,y,z,direction
  walls: Record<string, WallSummary>;
  maxZLevel: number; // Track the highest Z level in use
}

export interface ViewState {
  offset: { x: number; y: number };
  hoveredCell: { x: number; y: number };
  wasd_moving: boolean;
  // Enhanced view controls for isometric rendering
  showZLevel: number; // Which Z level to display (-1 for all) - DEPRECATED in favor of individual flags
  zoomLevel: number; // Separate zoom tracking
  // Manual grid and sprite controls
  gridDiamondWidth: number; // Width of the diamond grid in pixels (default reference)
  spriteScale: number; // Scale multiplier for sprites (independent of grid)
  // NEW: Ratio lock for keeping grid and sprite scale in sync
  isRatioLocked: boolean; // When true, changing grid or sprite scale maintains their ratio
  // NEW: Base values for ratio lock scaling
  baseGridDiamondWidth: number; // Original grid width for ratio calculations
  baseSpriteScale: number; // Original sprite scale for ratio calculations
  baseZLayerHeights: Array<{ z: number; verticalOffset: number; name: string; color: number }>; // Original Z-layer heights for ratio calculations
  // REFACTORED: 4-directional invisible margins (default reference values)
  invisibleMarginUp: number;    // Top margin for sprite positioning
  invisibleMarginDown: number;  // Bottom margin for sprite positioning  
  invisibleMarginLeft: number;  // Left margin for sprite positioning
  invisibleMarginRight: number; // Right margin for sprite positioning
  // Z-layer system
  activeZLayer: number; // Currently active Z layer for editing (0, 1, 2)
  // Layer visual effects
  layerVisibilityMode: LayerVisibilityMode; // How layers are displayed
  // NEW: Independent grid layer visibility flags
  gridLayerVisibility: { [zLayer: number]: boolean }; // Individual visibility for each grid layer
  // NEW: User-configurable Z-layer heights
  zLayerHeights: Array<{ z: number; verticalOffset: number; name: string; color: number }>;
  // NEW: Vertical bias computation method
  verticalBiasComputationMode: VerticalBiasComputationMode; // How to round/snap computed values
}

export interface ControlState {
  isLocked: boolean;
  isGridVisible: boolean;
  isTilesVisible: boolean;
  // Camera mode
  isIsometric: boolean;
  // Tile editor controls
  isEditing: boolean;
  isEditorVisible: boolean;
  selectedTileType: TileType;
  // Enhanced isometric controls
  isometricEditor: IsometricEditorState;
}

export interface BattlemapStoreState {
  grid: GridState;
  view: ViewState;
  controls: ControlState;
  loading: boolean;
  error: string | null;
}

// Read-only type for consuming components
export type ReadonlyBattlemapStore = DeepReadonly<BattlemapStoreState>;

// Initialize the store with default values for local editing
const battlemapStore = proxy<BattlemapStoreState>({
  grid: {
    width: 30,
    height: 20,
    tiles: {},
    walls: {},
    maxZLevel: 0,
  },
  view: {
    offset: { x: 0, y: 0 },
    hoveredCell: { x: -1, y: -1 },
    wasd_moving: false,
    showZLevel: -1, // Show all levels by default
    zoomLevel: 1.0,
    gridDiamondWidth: 400, // Updated to user's preferred value (was 402)
    spriteScale: 1.0, // Keep at original size
    isRatioLocked: true, // NEW: Default to true as requested
    baseGridDiamondWidth: 400, // Original grid width for ratio calculations
    baseSpriteScale: 1.0, // Original sprite scale for ratio calculations
    baseZLayerHeights: DEFAULT_Z_LAYER_SETTINGS.map(layer => ({ ...layer })), // Original Z-layer heights for ratio calculations
    invisibleMarginUp: 8, // User's working top margin
    invisibleMarginDown: 8, // User's working bottom margin
    invisibleMarginLeft: 8, // User's working left margin
    invisibleMarginRight: 8, // User's working right margin
    activeZLayer: 0,
    layerVisibilityMode: LayerVisibilityMode.NORMAL,
    gridLayerVisibility: {
      0: true,   // Only layer 0 visible by default (will be updated by setActiveZLayer)
      1: false,  // Other layers hidden by default
      2: false,
    },
    zLayerHeights: DEFAULT_Z_LAYER_SETTINGS,
    verticalBiasComputationMode: VerticalBiasComputationMode.SNAP_TO_NEAREST,
  },
  controls: {
    isLocked: false,
    isGridVisible: true,
    isTilesVisible: true,
    isIsometric: true,
    isEditing: false,
    isEditorVisible: false,
    selectedTileType: 'floor',
    isometricEditor: {
      selectedSpriteName: null,
      selectedSpriteDirection: IsometricDirection.SOUTH,
      selectedZLevel: 0,
      selectedSpriteCategory: SpriteCategory.BLOCKS,
      brushSize: 1,
      isDirectionalMode: false,
      spriteTypeSettings: {},
      wallMode: false,
      selectedWallType: 'brick',
      wallPlacementDirection: IsometricDirection.SOUTH,
      wallSpriteDirection: IsometricDirection.SOUTH,
      wallPositioningSettings: {},
      lastSelectedBlockSprite: null,
      lastSelectedWallSprite: null,
    },
  },
  loading: false,
  error: null,
});

// Enhanced actions for isometric sprite editing
const battlemapActions = {
  // Grid actions
  setGridDimensions: (width: number, height: number) => {
    battlemapStore.grid.width = width;
    battlemapStore.grid.height = height;
  },
  
  setTiles: (tiles: Record<string, TileSummary>) => {
    battlemapStore.grid.tiles = tiles;
    // Update max Z level
    const maxZ = Math.max(0, ...Object.values(tiles).map(tile => tile.z_level));
    battlemapStore.grid.maxZLevel = maxZ;
  },

  // Enhanced tile operations with isometric support
  addIsometricTile: (tile: TileSummary) => {
    const posKey = `${tile.position[0]},${tile.position[1]},${tile.z_level}`;
    battlemapStore.grid.tiles[posKey] = tile;
    
    // Update max Z level if necessary
    if (tile.z_level > battlemapStore.grid.maxZLevel) {
      battlemapStore.grid.maxZLevel = tile.z_level;
    }
    
    console.log('[battlemapStore] Added isometric tile:', tile, '- FORCING RENDER');
    
    // Force immediate re-render by triggering a dummy change
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    // Also trigger manual renders if available
    setTimeout(() => {
      if ((window as any).__forceTileRender) (window as any).__forceTileRender();
    }, 0);
  },

  removeIsometricTile: (x: number, y: number, z: number) => {
    const posKey = `${x},${y},${z}`;
    if (battlemapStore.grid.tiles[posKey]) {
      delete battlemapStore.grid.tiles[posKey];
      console.log('[battlemapStore] Removed isometric tile at:', [x, y, z], '- FORCING RENDER');
      
      // Force immediate re-render by triggering a dummy change
      const currentOffset = battlemapStore.view.offset;
      battlemapStore.view.offset = { ...currentOffset };
      
      // Also trigger manual renders if available
      setTimeout(() => {
        if ((window as any).__forceTileRender) (window as any).__forceTileRender();
      }, 0);
    }
  },

  updateIsometricTile: (x: number, y: number, z: number, updates: Partial<TileSummary>) => {
    const posKey = `${x},${y},${z}`;
    const existingTile = battlemapStore.grid.tiles[posKey];
    if (existingTile) {
      battlemapStore.grid.tiles[posKey] = { ...existingTile, ...updates };
      console.log('[battlemapStore] Updated isometric tile at:', [x, y, z], '- FORCING RENDER');
      
      // Force immediate re-render by triggering a dummy change
      const currentOffset = battlemapStore.view.offset;
      battlemapStore.view.offset = { ...currentOffset };
      
      // Also trigger manual renders if available
      setTimeout(() => {
        if ((window as any).__forceTileRender) (window as any).__forceTileRender();
      }, 0);
    }
  },

  clearAllTiles: () => {
    battlemapStore.grid.tiles = {};
    battlemapStore.grid.maxZLevel = 0;
    console.log('[battlemapStore] Cleared all tiles locally');
  },
  
  // View actions
  setOffset: (x: number, y: number) => {
    battlemapStore.view.offset.x = x;
    battlemapStore.view.offset.y = y;
  },
  
  setHoveredCell: (x: number, y: number) => {
    battlemapStore.view.hoveredCell.x = x;
    battlemapStore.view.hoveredCell.y = y;
  },
  
  setWasdMoving: (moving: boolean) => {
    battlemapStore.view.wasd_moving = moving;
  },
  
  // Enhanced view controls
  setShowZLevel: (zLevel: number) => {
    battlemapStore.view.showZLevel = zLevel;
    
    // Also update individual grid layer visibility for backwards compatibility
    if (zLevel === -1) {
      // Show all layers
      battlemapStore.view.gridLayerVisibility[0] = true;
      battlemapStore.view.gridLayerVisibility[1] = true;
      battlemapStore.view.gridLayerVisibility[2] = true;
    } else {
      // Show only specific layer
      battlemapStore.view.gridLayerVisibility[0] = zLevel === 0;
      battlemapStore.view.gridLayerVisibility[1] = zLevel === 1;
      battlemapStore.view.gridLayerVisibility[2] = zLevel === 2;
    }
    
    console.log(`[battlemapStore] Show Z level set to: ${zLevel} - FORCING RENDER`);
    
    // Force immediate re-render by triggering a dummy change
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    // Also trigger manual renders if available
    setTimeout(() => {
      if ((window as any).__forceGridRender) (window as any).__forceGridRender();
      if ((window as any).__forceTileRender) (window as any).__forceTileRender();
    }, 0);
  },
  
  setZoomLevel: (zoom: number) => {
    battlemapStore.view.zoomLevel = Math.max(0.1, Math.min(5.0, zoom));
  },
  
  setGridDiamondWidth: (width: number) => {
    battlemapStore.view.gridDiamondWidth = width;
    
    // NEW: If ratio lock is enabled, adjust sprite scale and Z-layer heights proportionally from base values
    if (battlemapStore.view.isRatioLocked) {
      const ratio = width / battlemapStore.view.baseGridDiamondWidth;
      
      // Scale sprite scale from base value
      battlemapStore.view.spriteScale = battlemapStore.view.baseSpriteScale * ratio;
      
      // Scale Z-layer heights from base values
      battlemapStore.view.zLayerHeights = battlemapStore.view.baseZLayerHeights.map(layer => ({
        ...layer,
        verticalOffset: Math.round(layer.verticalOffset * ratio)
      }));
      
      console.log(`[battlemapStore] Ratio lock: Grid width changed to ${width}, ratio ${ratio.toFixed(3)}, adjusted sprite scale to ${battlemapStore.view.spriteScale.toFixed(2)}, scaled Z-layer heights from base values`);
    }
  },
  
  setSpriteScale: (scale: number) => {
    const clampedScale = Math.max(0.1, Math.min(5.0, scale));
    battlemapStore.view.spriteScale = clampedScale;
    
    // NEW: If ratio lock is enabled, adjust grid diamond width and Z-layer heights proportionally from base values
    if (battlemapStore.view.isRatioLocked) {
      const ratio = clampedScale / battlemapStore.view.baseSpriteScale;
      
      // Scale grid width from base value
      battlemapStore.view.gridDiamondWidth = Math.round(battlemapStore.view.baseGridDiamondWidth * ratio);
      
      // Scale Z-layer heights from base values
      battlemapStore.view.zLayerHeights = battlemapStore.view.baseZLayerHeights.map(layer => ({
        ...layer,
        verticalOffset: Math.round(layer.verticalOffset * ratio)
      }));
      
      console.log(`[battlemapStore] Ratio lock: Sprite scale changed to ${clampedScale}, ratio ${ratio.toFixed(3)}, adjusted grid width to ${battlemapStore.view.gridDiamondWidth}, scaled Z-layer heights from base values`);
    }
  },
  
  // NEW: Ratio lock management
  setRatioLocked: (locked: boolean) => {
    battlemapStore.view.isRatioLocked = locked;
    console.log(`[battlemapStore] Ratio lock ${locked ? 'enabled' : 'disabled'} - Grid: ${battlemapStore.view.gridDiamondWidth}px, Sprite: ${battlemapStore.view.spriteScale}x`);
  },
  
  toggleRatioLock: () => {
    const newLocked = !battlemapStore.view.isRatioLocked;
    battlemapActions.setRatioLocked(newLocked);
  },
  
  setInvisibleMarginUp: (margin: number) => {
    battlemapStore.view.invisibleMarginUp = margin;
  },
  
  setInvisibleMarginDown: (margin: number) => {
    battlemapStore.view.invisibleMarginDown = margin;
  },
  
  setInvisibleMarginLeft: (margin: number) => {
    battlemapStore.view.invisibleMarginLeft = margin;
  },
  
  setInvisibleMarginRight: (margin: number) => {
    battlemapStore.view.invisibleMarginRight = margin;
  },
  
  // Z-layer management actions
  setActiveZLayer: (zLayer: number) => {
    const clampedLayer = Math.max(0, Math.min(Z_LAYER_CONFIG.maxLayers - 1, zLayer));
    const oldActiveLayer = battlemapStore.view.activeZLayer;
    battlemapStore.view.activeZLayer = clampedLayer;
    
    // FIXED: Default behavior - only show current layer's grid
    // Hide old active layer's grid, show new active layer's grid
    // (Individual toggles can override this)
    battlemapStore.view.gridLayerVisibility[oldActiveLayer] = false;
    battlemapStore.view.gridLayerVisibility[clampedLayer] = true;
    
    // Also update the selected Z level for tile placement
    battlemapStore.controls.isometricEditor.selectedZLevel = clampedLayer;
    console.log(`[battlemapStore] Active Z layer set to: ${clampedLayer} (${DEFAULT_Z_LAYER_SETTINGS[clampedLayer].name}) - FORCING RENDER`);
    
    // Force immediate re-render by triggering a dummy change
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    // Also trigger manual renders if available
    setTimeout(() => {
      if ((window as any).__forceGridRender) (window as any).__forceGridRender();
      if ((window as any).__forceTileRender) (window as any).__forceTileRender();
    }, 0);
  },
  
  setLayerVisibilityMode: (mode: LayerVisibilityMode) => {
    battlemapStore.view.layerVisibilityMode = mode;
    console.log(`[battlemapStore] Layer visibility mode set to: ${mode} - FORCING RENDER`);
    
    // Force immediate re-render by triggering a dummy change
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    // Also trigger manual renders if available
    setTimeout(() => {
      if ((window as any).__forceGridRender) (window as any).__forceGridRender();
      if ((window as any).__forceTileRender) (window as any).__forceTileRender();
    }, 0);
  },
  
  cycleLayerVisibilityMode: () => {
    const currentMode = battlemapStore.view.layerVisibilityMode;
    let nextMode: LayerVisibilityMode;
    
    switch (currentMode) {
      case LayerVisibilityMode.NORMAL:
        nextMode = LayerVisibilityMode.SHADOW;
        break;
      case LayerVisibilityMode.SHADOW:
        nextMode = LayerVisibilityMode.INVISIBLE;
        break;
      case LayerVisibilityMode.INVISIBLE:
        nextMode = LayerVisibilityMode.NORMAL;
        break;
      default:
        nextMode = LayerVisibilityMode.NORMAL;
    }
    
    battlemapActions.setLayerVisibilityMode(nextMode);
  },
  
  getActiveZLayerConfig: () => {
    return battlemapStore.view.zLayerHeights[battlemapStore.view.activeZLayer];
  },
  
  getAllZLayerConfigs: () => {
    return battlemapStore.view.zLayerHeights;
  },
  
  // Controls actions
  setLocked: (locked: boolean) => {
    battlemapStore.controls.isLocked = locked;
  },
  
  setGridVisible: (visible: boolean) => {
    battlemapStore.controls.isGridVisible = visible;
  },
  
  setTilesVisible: (visible: boolean) => {
    battlemapStore.controls.isTilesVisible = visible;
  },
  
  setIsometric: (isometric: boolean) => {
    battlemapStore.controls.isIsometric = isometric;
  },
  
  // Tile editor actions
  setTileEditing: (editing: boolean) => {
    battlemapStore.controls.isEditing = editing;
    if (!editing) {
      battlemapStore.controls.isEditorVisible = false;
    }
  },
  
  setTileEditorVisible: (visible: boolean) => {
    battlemapStore.controls.isEditorVisible = visible;
  },
  
  setSelectedTileType: (tileType: TileType) => {
    battlemapStore.controls.selectedTileType = tileType;
  },
  
  // Enhanced isometric editor actions
  setSelectedSprite: (spriteName: string | null) => {
    const wasWallMode = battlemapStore.controls.isometricEditor.wallMode;
    
    // Remember the last selected sprite for the current mode
    if (spriteName) {
      if (wasWallMode) {
        battlemapStore.controls.isometricEditor.lastSelectedWallSprite = spriteName;
      } else {
        battlemapStore.controls.isometricEditor.lastSelectedBlockSprite = spriteName;
      }
    }
    
    battlemapStore.controls.isometricEditor.selectedSpriteName = spriteName;
  },
  
  setSelectedSpriteDirection: (direction: IsometricDirection) => {
    battlemapStore.controls.isometricEditor.selectedSpriteDirection = direction;
  },
  
  setSelectedZLevel: (zLevel: number) => {
    battlemapStore.controls.isometricEditor.selectedZLevel = Math.max(0, zLevel);
  },
  
  setSelectedSpriteCategory: (category: SpriteCategory) => {
    battlemapStore.controls.isometricEditor.selectedSpriteCategory = category;
  },
  
  setBrushSize: (size: number) => {
    battlemapStore.controls.isometricEditor.brushSize = Math.max(1, Math.min(10, size));
  },
  
  setDirectionalMode: (enabled: boolean) => {
    battlemapStore.controls.isometricEditor.isDirectionalMode = enabled;
  },
  
  // EXACT USER SPECIFICATION: Per-sprite-type positioning settings
  setSpriteTypeSettings: (spriteName: string, settings: {
    // 4-directional invisible margins
    invisibleMarginUp: number;
    invisibleMarginDown: number;
    invisibleMarginLeft: number;
    invisibleMarginRight: number;
    // Auto-computed vertical bias (from width/2 and normalized height formula)
    autoComputedVerticalBias: number;
    // Whether to use auto-computed or manual
    useAutoComputed: boolean;
    // User provided manual bias (shown in menu, initially set to auto-computed)
    manualVerticalBias: number;
    // NEW: Per-direction configuration support
    useSharedSettings?: boolean; // Whether to use shared settings for all directions
    directionalSettings?: {
      [IsometricDirection.NORTH]?: {
        invisibleMarginUp: number;
        invisibleMarginDown: number;
        invisibleMarginLeft: number;
        invisibleMarginRight: number;
        autoComputedVerticalBias: number;
        useAutoComputed: boolean;
        manualVerticalBias: number;
        spriteBoundingBox?: {
          originalWidth: number;
          originalHeight: number; 
          boundingX: number;
          boundingY: number;
          boundingWidth: number;
          boundingHeight: number;
          anchorOffsetX: number;
          anchorOffsetY: number;
        };
      };
      [IsometricDirection.EAST]?: {
        invisibleMarginUp: number;
        invisibleMarginDown: number;
        invisibleMarginLeft: number;
        invisibleMarginRight: number;
        autoComputedVerticalBias: number;
        useAutoComputed: boolean;
        manualVerticalBias: number;
        spriteBoundingBox?: {
          originalWidth: number;
          originalHeight: number; 
          boundingX: number;
          boundingY: number;
          boundingWidth: number;
          boundingHeight: number;
          anchorOffsetX: number;
          anchorOffsetY: number;
        };
      };
      [IsometricDirection.SOUTH]?: {
        invisibleMarginUp: number;
        invisibleMarginDown: number;
        invisibleMarginLeft: number;
        invisibleMarginRight: number;
        autoComputedVerticalBias: number;
        useAutoComputed: boolean;
        manualVerticalBias: number;
        spriteBoundingBox?: {
          originalWidth: number;
          originalHeight: number; 
          boundingX: number;
          boundingY: number;
          boundingWidth: number;
          boundingHeight: number;
          anchorOffsetX: number;
          anchorOffsetY: number;
        };
      };
      [IsometricDirection.WEST]?: {
        invisibleMarginUp: number;
        invisibleMarginDown: number;
        invisibleMarginLeft: number;
        invisibleMarginRight: number;
        autoComputedVerticalBias: number;
        useAutoComputed: boolean;
        manualVerticalBias: number;
        spriteBoundingBox?: {
          originalWidth: number;
          originalHeight: number; 
          boundingX: number;
          boundingY: number;
          boundingWidth: number;
          boundingHeight: number;
          anchorOffsetX: number;
          anchorOffsetY: number;
        };
      };
    };
  }) => {
    console.log(`[battlemapStore] Setting sprite type settings for ${spriteName}:`, settings);
    
    // Initialize or update sprite settings with backward compatibility
    if (!battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName]) {
      // FIXED: When creating new settings, initialize BOTH shared AND all directional settings
      const baseSettings = {
        invisibleMarginUp: settings.invisibleMarginUp,
        invisibleMarginDown: settings.invisibleMarginDown,
        invisibleMarginLeft: settings.invisibleMarginLeft,
        invisibleMarginRight: settings.invisibleMarginRight,
        autoComputedVerticalBias: settings.autoComputedVerticalBias,
        useAutoComputed: settings.useAutoComputed,
        manualVerticalBias: settings.manualVerticalBias,
      };
      
      battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName] = {
        ...settings,
        useSharedSettings: settings.useSharedSettings ?? true, // Default to shared
        // ALWAYS populate directional settings with DIFFERENT values so user can see the difference
        directionalSettings: settings.directionalSettings || {
          [IsometricDirection.NORTH]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          },
          [IsometricDirection.EAST]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          },
          [IsometricDirection.SOUTH]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          },
          [IsometricDirection.WEST]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          }
        }
      };
      
      console.log(`[battlemapStore] Initialized ${spriteName} with BOTH shared and directional settings`);
    } else {
      // Update existing settings
      const existingSettings = battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName];
      
      // Update the settings
      Object.assign(existingSettings, settings);
      
      // FIXED: Ensure directional settings exist even when updating
      if (!existingSettings.directionalSettings) {
        const baseSettings = {
          invisibleMarginUp: settings.invisibleMarginUp,
          invisibleMarginDown: settings.invisibleMarginDown,
          invisibleMarginLeft: settings.invisibleMarginLeft,
          invisibleMarginRight: settings.invisibleMarginRight,
          autoComputedVerticalBias: settings.autoComputedVerticalBias,
          useAutoComputed: settings.useAutoComputed,
          manualVerticalBias: settings.manualVerticalBias,
        };
        
        existingSettings.directionalSettings = {
          [IsometricDirection.NORTH]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          },
          [IsometricDirection.EAST]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          },
          [IsometricDirection.SOUTH]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          },
          [IsometricDirection.WEST]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          }
        };
        
        console.log(`[battlemapStore] Added missing directional settings for ${spriteName}`);
      }
    }
    
    // Force immediate re-render by triggering a dummy change to ensure reactivity
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    // Also trigger manual renders if available
    setTimeout(() => {
      if ((window as any).__forceTileRender) (window as any).__forceTileRender();
    }, 0);
  },
  
  getSpriteTypeSettings: (spriteName: string, direction?: IsometricDirection) => {
    const spriteSettings = battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName];
    if (!spriteSettings) return null;
    
    // Check if using per-direction settings and direction is specified
    if (!spriteSettings.useSharedSettings && direction !== undefined && spriteSettings.directionalSettings?.[direction]) {
      return spriteSettings.directionalSettings[direction];
    }
    
    // Return shared settings (default)
    return {
      invisibleMarginUp: spriteSettings.invisibleMarginUp,
      invisibleMarginDown: spriteSettings.invisibleMarginDown,
      invisibleMarginLeft: spriteSettings.invisibleMarginLeft,
      invisibleMarginRight: spriteSettings.invisibleMarginRight,
      autoComputedVerticalBias: spriteSettings.autoComputedVerticalBias,
      useAutoComputed: spriteSettings.useAutoComputed,
      manualVerticalBias: spriteSettings.manualVerticalBias,
    };
  },

  // NEW: Functions to manage shared vs per-direction settings
  setSpriteUseSharedSettings: (spriteName: string, useShared: boolean) => {
    console.log(`[battlemapStore] setSpriteUseSharedSettings called for ${spriteName} with useShared=${useShared}`);
    
    let existingSettings = battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName];
    
    // If no settings exist, create default ones first
    if (!existingSettings) {
      console.log(`[battlemapStore] No existing settings for ${spriteName}, creating defaults`);
      existingSettings = {
        invisibleMarginUp: 8,
        invisibleMarginDown: 8,
        invisibleMarginLeft: 8,
        invisibleMarginRight: 8,
        autoComputedVerticalBias: 36,
        useAutoComputed: true,
        manualVerticalBias: 36,
        useSharedSettings: true
      };
      battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName] = existingSettings;
    }
    
    console.log(`[battlemapStore] Setting useSharedSettings from ${existingSettings.useSharedSettings} to ${useShared}`);
    existingSettings.useSharedSettings = useShared;
    
    // REMOVED: Don't copy shared settings to directional settings
    // The directional settings should come from saved JSON config files
    // If they don't exist, they'll be auto-calculated when first accessed
    
    console.log(`[battlemapStore] Final settings for ${spriteName}:`, existingSettings);
    console.log(`[battlemapStore] Set ${spriteName} to use ${useShared ? 'shared' : 'per-direction'} settings`);
    
    // Force re-render
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    setTimeout(() => {
      if ((window as any).__forceTileRender) (window as any).__forceTileRender();
    }, 0);
  },

  getSpriteUseSharedSettings: (spriteName: string): boolean => {
    const spriteSettings = battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName];
    return spriteSettings?.useSharedSettings ?? true; // Default to shared
  },

  // NEW: Set direction-specific settings
  setSpriteDirectionalSettings: (spriteName: string, direction: IsometricDirection, settings: {
    invisibleMarginUp: number;
    invisibleMarginDown: number;
    invisibleMarginLeft: number;
    invisibleMarginRight: number;
    autoComputedVerticalBias: number;
    useAutoComputed: boolean;
    manualVerticalBias: number;
  }) => {
    const existingSettings = battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName];
    if (existingSettings) {
      if (!existingSettings.directionalSettings) {
        existingSettings.directionalSettings = {};
      }
      existingSettings.directionalSettings[direction] = settings;
      console.log(`[battlemapStore] Set direction-specific settings for ${spriteName} direction ${direction}`);
      
      // Force re-render
      const currentOffset = battlemapStore.view.offset;
      battlemapStore.view.offset = { ...currentOffset };
      
      setTimeout(() => {
        if ((window as any).__forceTileRender) (window as any).__forceTileRender();
      }, 0);
    }
  },
  
  // EXACT USER SPECIFICATION: Calculate positioning using 4-directional margins and width/2 formula
  calculateSpriteTypePositioning: (spriteWidth: number, spriteHeight: number, margins?: {
    up?: number; down?: number; left?: number; right?: number;
  }) => {
    // Use provided margins or defaults from store
    const marginUp = margins?.up ?? battlemapStore.view.invisibleMarginUp;
    const marginDown = margins?.down ?? battlemapStore.view.invisibleMarginDown;
    const marginLeft = margins?.left ?? battlemapStore.view.invisibleMarginLeft;
    const marginRight = margins?.right ?? battlemapStore.view.invisibleMarginRight;
    
    // USER'S EXACT FORMULA:
    // 1. Take sprite width/2
    const spriteWidthHalf = spriteWidth / 2;
    
    // 2. Normalize dimensions by removing margins
    const normalizedWidth = spriteWidth - marginLeft - marginRight;
    const normalizedHeight = spriteHeight - marginUp - marginDown;
    
    // 3. Calculate vertical bias: normalized height - (normalized width / 2)
    const autoComputedVerticalBias = normalizedHeight - (normalizedWidth / 2);
    
    // NEW: Apply user's preferred computation method
    let roundedBias: number;
    
    switch (battlemapStore.view.verticalBiasComputationMode) {
      case VerticalBiasComputationMode.ROUND_UP:
        roundedBias = Math.ceil(autoComputedVerticalBias);
        break;
      case VerticalBiasComputationMode.ROUND_DOWN:
        roundedBias = Math.floor(autoComputedVerticalBias);
        break;
      case VerticalBiasComputationMode.SNAP_TO_NEAREST:
        // Compute the value, then snap to nearest between 36 and 196
        const computedValue = autoComputedVerticalBias;
        
        // Define the target values (36 and 196 are the key offsets for sprites)
        const targetValues = [36, 196];
        
        // Find the closest target value
        let closestValue = targetValues[0];
        let minDistance = Math.abs(computedValue - targetValues[0]);
        
        for (const target of targetValues) {
          const distance = Math.abs(computedValue - target);
          if (distance < minDistance) {
            minDistance = distance;
            closestValue = target;
          }
        }
        
        roundedBias = closestValue;
        console.log(`[battlemapStore] Snap-to-nearest: computed ${computedValue.toFixed(1)} -> snapped to ${closestValue} (distance: ${minDistance.toFixed(1)})`);
        break;
      default:
        roundedBias = Math.floor(autoComputedVerticalBias);
    }
    
    return {
      invisibleMarginUp: marginUp,
      invisibleMarginDown: marginDown,
      invisibleMarginLeft: marginLeft,
      invisibleMarginRight: marginRight,
      autoComputedVerticalBias: roundedBias,
      useAutoComputed: true,
      manualVerticalBias: roundedBias // Initially set to auto-computed
    };
  },
  
  // LEGACY COMPATIBILITY: Functions for backward compatibility (deprecated)
  setSpritePositioning: (spriteName: string, verticalOffset: number, invisibleMargin: number, isAutoCalculated: boolean = false) => {
    // Convert old single margin to 4-directional for backward compatibility
    console.warn('[battlemapStore] setSpritePositioning is deprecated, use setSpriteTypeSettings instead');
    battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName] = {
      invisibleMarginUp: invisibleMargin,
      invisibleMarginDown: invisibleMargin,
      invisibleMarginLeft: invisibleMargin,
      invisibleMarginRight: invisibleMargin,
      autoComputedVerticalBias: verticalOffset,
      useAutoComputed: isAutoCalculated,
      manualVerticalBias: verticalOffset
    };
  },
  
  getSpritePositioning: (spriteName: string) => {
    // Convert new structure back to old single margin for backward compatibility
    console.warn('[battlemapStore] getSpritePositioning is deprecated, use getSpriteTypeSettings instead');
    const settings = battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName];
    if (!settings) return null;
    
    return {
      verticalOffset: settings.useAutoComputed ? settings.autoComputedVerticalBias : settings.manualVerticalBias,
      invisibleMargin: settings.invisibleMarginDown, // Use down margin as primary
      isAutoCalculated: settings.useAutoComputed
    };
  },
  
  // Calculate positioning using the user's formula (deprecated)
  calculateSpritePositioning: (spriteWidth: number, spriteHeight: number, invisibleMargin: number = 8) => {
    console.warn('[battlemapStore] calculateSpritePositioning is deprecated, use calculateSpriteTypePositioning instead');
    const result = battlemapActions.calculateSpriteTypePositioning(spriteWidth, spriteHeight, {
      up: invisibleMargin, down: invisibleMargin, left: invisibleMargin, right: invisibleMargin
    });
    
    return {
      verticalOffset: result.autoComputedVerticalBias,
      invisibleMargin: result.invisibleMarginDown
    };
  },
  
  // Loading/error status
  setLoading: (loading: boolean) => {
    battlemapStore.loading = loading;
  },
  
  setError: (error: string | null) => {
    battlemapStore.error = error;
  },
  
  // Local grid initialization
  initializeLocalGrid: (width: number = 30, height: number = 20) => {
    battlemapActions.setGridDimensions(width, height);
    battlemapActions.clearAllTiles();
    console.log(`[battlemapStore] Initialized local grid: ${width}x${height}`);
  },

  // Generate sample tiles for testing - updated for isometric sprites
  generateSampleTiles: () => {
    const sampleTiles: Record<string, TileSummary> = {};
    
    // Create a small sample area with floor tiles only
    for (let x = 5; x < 15; x++) {
      for (let y = 5; y < 15; y++) {
        // Create floor tiles at Z=0 with proper 3D keys
        const floorKey = `${x},${y},0`;
        sampleTiles[floorKey] = {
          uuid: `tile_${x}_${y}_0`,
          name: 'Floor',
          position: [x, y] as const,
          walkable: true,
          visible: true,
          sprite_name: 'Floor_01',
          z_level: 0,
          sprite_direction: IsometricDirection.SOUTH,
          tile_type: 'floor',
          snap_position: 'above', // Default to above positioning
        };
      }
    }
    
    battlemapStore.grid.tiles = sampleTiles;
    battlemapStore.grid.maxZLevel = 0; // Only floor level now
    console.log('[battlemapStore] Generated sample isometric tiles:', Object.keys(sampleTiles).length);
  },

  // NEW: Individual grid layer visibility controls
  setGridLayerVisibility: (zLayer: number, visible: boolean) => {
    battlemapStore.view.gridLayerVisibility[zLayer] = visible;
    console.log(`[battlemapStore] Grid layer ${zLayer} visibility set to: ${visible} - FORCING RENDER`);
    
    // Force immediate re-render by triggering a dummy change
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    // Also trigger manual renders if available
    setTimeout(() => {
      if ((window as any).__forceGridRender) (window as any).__forceGridRender();
    }, 0);
  },
  
  toggleGridLayerVisibility: (zLayer: number) => {
    const currentVisibility = battlemapStore.view.gridLayerVisibility[zLayer];
    battlemapActions.setGridLayerVisibility(zLayer, !currentVisibility);
  },
  
  showAllGridLayers: () => {
    battlemapStore.view.gridLayerVisibility[0] = true;
    battlemapStore.view.gridLayerVisibility[1] = true;
    battlemapStore.view.gridLayerVisibility[2] = true;
    console.log('[battlemapStore] All grid layers shown - FORCING RENDER');
    
    // Force immediate re-render by triggering a dummy change
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    // Also trigger manual renders if available
    setTimeout(() => {
      if ((window as any).__forceGridRender) (window as any).__forceGridRender();
    }, 0);
  },
  
  hideAllGridLayers: () => {
    battlemapStore.view.gridLayerVisibility[0] = false;
    battlemapStore.view.gridLayerVisibility[1] = false;
    battlemapStore.view.gridLayerVisibility[2] = false;
    console.log('[battlemapStore] All grid layers hidden - FORCING RENDER');
    
    // Force immediate re-render by triggering a dummy change
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    // Also trigger manual renders if available
    setTimeout(() => {
      if ((window as any).__forceGridRender) (window as any).__forceGridRender();
    }, 0);
  },

  // NEW: Z-layer height controls
  setZLayerHeight: (layerIndex: number, verticalOffset: number) => {
    if (layerIndex >= 0 && layerIndex < battlemapStore.view.zLayerHeights.length) {
      battlemapStore.view.zLayerHeights[layerIndex].verticalOffset = verticalOffset;
      
      // NEW: Also update base values when ratio lock is off (manual adjustment)
      if (!battlemapStore.view.isRatioLocked) {
        battlemapStore.view.baseZLayerHeights[layerIndex].verticalOffset = verticalOffset;
        console.log(`[battlemapStore] Z-layer ${layerIndex} height set to: ${verticalOffset}px (updated base value)`);
      } else {
        console.log(`[battlemapStore] Z-layer ${layerIndex} height set to: ${verticalOffset}px (ratio lock active, base unchanged)`);
      }
      
      // Force immediate re-render by triggering a dummy change
      const currentOffset = battlemapStore.view.offset;
      battlemapStore.view.offset = { ...currentOffset };
      
      // Also trigger manual renders if available
      setTimeout(() => {
        if ((window as any).__forceGridRender) (window as any).__forceGridRender();
        if ((window as any).__forceTileRender) (window as any).__forceTileRender();
      }, 0);
    }
  },
  
  resetZLayerHeights: () => {
    const defaultHeights = DEFAULT_Z_LAYER_SETTINGS.map(layer => ({ ...layer }));
    battlemapStore.view.zLayerHeights = defaultHeights;
    battlemapStore.view.baseZLayerHeights = defaultHeights.map(layer => ({ ...layer }));
    console.log('[battlemapStore] Z-layer heights reset to defaults (updated both current and base values)');
    
    // Force immediate re-render by triggering a dummy change
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    // Also trigger manual renders if available
    setTimeout(() => {
      if ((window as any).__forceGridRender) (window as any).__forceGridRender();
      if ((window as any).__forceTileRender) (window as any).__forceTileRender();
    }, 0);
  },
  
  // NEW: Base value management for ratio lock
  setBaseValues: () => {
    // Capture current values as new base values
    battlemapStore.view.baseGridDiamondWidth = battlemapStore.view.gridDiamondWidth;
    battlemapStore.view.baseSpriteScale = battlemapStore.view.spriteScale;
    battlemapStore.view.baseZLayerHeights = battlemapStore.view.zLayerHeights.map(layer => ({ ...layer }));
    console.log('[battlemapStore] Base values updated from current values');
  },
  
  resetBaseValues: () => {
    // Reset base values to defaults
    battlemapStore.view.baseGridDiamondWidth = 400;
    battlemapStore.view.baseSpriteScale = 1.0;
    battlemapStore.view.baseZLayerHeights = DEFAULT_Z_LAYER_SETTINGS.map(layer => ({ ...layer }));
    console.log('[battlemapStore] Base values reset to defaults');
  },
  
  // NEW: Vertical bias computation method
  setVerticalBiasComputationMode: (mode: VerticalBiasComputationMode) => {
    battlemapStore.view.verticalBiasComputationMode = mode;
    console.log(`[battlemapStore] Vertical bias computation mode set to: ${mode}`);
    
    // Force recalculation of all auto-computed sprite settings
    const spriteSettings = battlemapStore.controls.isometricEditor.spriteTypeSettings;
    console.log(`[battlemapStore] Found ${Object.keys(spriteSettings).length} sprite settings to check`);
    
    Object.keys(spriteSettings).forEach(spriteName => {
      const settings = spriteSettings[spriteName];
      console.log(`[battlemapStore] Checking ${spriteName}: useAutoComputed=${settings.useAutoComputed}, current autoComputedVerticalBias=${settings.autoComputedVerticalBias}`);
      
      if (settings.useAutoComputed) {
        // Get actual sprite frame size for proper recalculation
        const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
        if (spriteFrameSize) {
          // Recalculate using the new rounding method with actual sprite dimensions
          const recalculated = battlemapActions.calculateSpriteTypePositioning(
            spriteFrameSize.width, 
            spriteFrameSize.height,
            {
              up: settings.invisibleMarginUp,
              down: settings.invisibleMarginDown,
              left: settings.invisibleMarginLeft,
              right: settings.invisibleMarginRight
            }
          );
          
          // FIXED: Properly update the settings object to trigger Valtio reactivity
          battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName] = {
            ...settings,
            autoComputedVerticalBias: recalculated.autoComputedVerticalBias
          };
          
          console.log(`[battlemapStore] Recalculated ${spriteName}: ${settings.autoComputedVerticalBias} -> ${recalculated.autoComputedVerticalBias}px`);
        } else {
          console.warn(`[battlemapStore] Could not get sprite frame size for ${spriteName}`);
        }
      }
    });
    
    console.log(`[battlemapStore] Finished recalculating sprite settings`);
  },

  // NEW: Wall management actions
  addWall: (wall: WallSummary) => {
    // Check for existing identical wall (same sprite, position, z_level, wall_direction, sprite_direction)
    const existingWallKey = Object.keys(battlemapStore.grid.walls).find(wallKey => {
      const existingWall = battlemapStore.grid.walls[wallKey];
      return (
        existingWall.sprite_name === wall.sprite_name &&
        existingWall.position[0] === wall.position[0] &&
        existingWall.position[1] === wall.position[1] &&
        existingWall.z_level === wall.z_level &&
        existingWall.wall_direction === wall.wall_direction &&
        existingWall.sprite_direction === wall.sprite_direction
      );
    });

    if (existingWallKey) {
      // Overwrite existing identical wall instead of creating duplicate
      battlemapStore.grid.walls[existingWallKey] = wall;
      console.log('[battlemapStore] Overwriting identical wall:', wall, '- FORCING RENDER');
    } else {
      // Use the wall's UUID as the key to allow multiple different walls per edge
      const wallKey = wall.uuid;
      battlemapStore.grid.walls[wallKey] = wall;
      console.log('[battlemapStore] Added new wall:', wall, '- FORCING RENDER');
    }
    
    // Update max Z level if necessary
    if (wall.z_level > battlemapStore.grid.maxZLevel) {
      battlemapStore.grid.maxZLevel = wall.z_level;
    }
    
    // Force immediate re-render
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    setTimeout(() => {
      if ((window as any).__forceWallRender) (window as any).__forceWallRender();
      if ((window as any).__forceTileRender) (window as any).__forceTileRender();
    }, 0);
  },

  removeWall: (x: number, y: number, z: number, direction: IsometricDirection) => {
    // Remove ALL walls at the specified edge (not just one)
    const wallsToRemove: string[] = [];
    
    // Find all walls at this edge
    Object.keys(battlemapStore.grid.walls).forEach(wallKey => {
      const wall = battlemapStore.grid.walls[wallKey];
      if (wall.position[0] === x && 
          wall.position[1] === y && 
          wall.z_level === z && 
          wall.wall_direction === direction) {
        wallsToRemove.push(wallKey);
      }
    });
    
    // Remove all found walls
    wallsToRemove.forEach(wallKey => {
      delete battlemapStore.grid.walls[wallKey];
    });
    
    console.log(`[battlemapStore] Removed ${wallsToRemove.length} wall(s) at (${x}, ${y}, Z:${z}, Edge:${direction}) - FORCING RENDER`);
    
    // Force immediate re-render
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    setTimeout(() => {
      if ((window as any).__forceWallRender) (window as any).__forceWallRender();
      if ((window as any).__forceTileRender) (window as any).__forceTileRender();
    }, 0);
  },

  updateWall: (wallUuid: string, updates: Partial<WallSummary>) => {
    // Update wall by UUID instead of position+direction
    const existingWall = battlemapStore.grid.walls[wallUuid];
    if (existingWall) {
      battlemapStore.grid.walls[wallUuid] = { ...existingWall, ...updates };
      console.log('[battlemapStore] Updated wall:', wallUuid, '- FORCING RENDER');
      
      // Force immediate re-render
      const currentOffset = battlemapStore.view.offset;
      battlemapStore.view.offset = { ...currentOffset };
      
      setTimeout(() => {
        if ((window as any).__forceWallRender) (window as any).__forceWallRender();
        if ((window as any).__forceTileRender) (window as any).__forceTileRender();
      }, 0);
    }
  },

  getWallsAtPosition: (x: number, y: number, z: number): WallSummary[] => {
    const walls: WallSummary[] = [];
    Object.values(battlemapStore.grid.walls).forEach(wall => {
      if (wall.position[0] === x && wall.position[1] === y && wall.z_level === z) {
        walls.push(wall);
      }
    });
    return walls;
  },

  getWallsAtEdge: (x: number, y: number, z: number, direction: IsometricDirection): WallSummary[] => {
    const walls: WallSummary[] = [];
    Object.values(battlemapStore.grid.walls).forEach(wall => {
      if (wall.position[0] === x && 
          wall.position[1] === y && 
          wall.z_level === z && 
          wall.wall_direction === direction) {
        walls.push(wall);
      }
    });
    return walls;
  },

  clearAllWalls: () => {
    battlemapStore.grid.walls = {};
    console.log('[battlemapStore] Cleared all walls locally');
  },

  // NEW: Wall editor controls
  setWallMode: (enabled: boolean) => {
    const wasWallMode = battlemapStore.controls.isometricEditor.wallMode;
    const currentSprite = battlemapStore.controls.isometricEditor.selectedSpriteName;
    
    // Remember the current sprite for the mode we're leaving
    if (currentSprite) {
      if (wasWallMode) {
        battlemapStore.controls.isometricEditor.lastSelectedWallSprite = currentSprite;
      } else {
        battlemapStore.controls.isometricEditor.lastSelectedBlockSprite = currentSprite;
      }
    }
    
    // Switch to the new mode
    battlemapStore.controls.isometricEditor.wallMode = enabled;
    
    // Auto-select the remembered sprite for the new mode
    if (enabled) {
      // Switching TO wall mode - select last wall sprite
      const lastWallSprite = battlemapStore.controls.isometricEditor.lastSelectedWallSprite;
      if (lastWallSprite) {
        battlemapStore.controls.isometricEditor.selectedSpriteName = lastWallSprite;
        console.log(`[battlemapStore] Wall mode enabled - auto-selected last wall sprite: ${lastWallSprite}`);
      } else {
        // No previous wall sprite - clear selection so user can pick one
        battlemapStore.controls.isometricEditor.selectedSpriteName = null;
        console.log(`[battlemapStore] Wall mode enabled - no previous wall sprite remembered`);
      }
    } else {
      // Switching TO block mode - select last block sprite
      const lastBlockSprite = battlemapStore.controls.isometricEditor.lastSelectedBlockSprite;
      if (lastBlockSprite) {
        battlemapStore.controls.isometricEditor.selectedSpriteName = lastBlockSprite;
        console.log(`[battlemapStore] Block mode enabled - auto-selected last block sprite: ${lastBlockSprite}`);
      } else {
        // No previous block sprite - clear selection so user can pick one
        battlemapStore.controls.isometricEditor.selectedSpriteName = null;
        console.log(`[battlemapStore] Block mode enabled - no previous block sprite remembered`);
      }
    }
    
    console.log(`[battlemapStore] Wall mode ${enabled ? 'enabled' : 'disabled'}`);
  },

  toggleWallMode: () => {
    const newWallMode = !battlemapStore.controls.isometricEditor.wallMode;
    battlemapActions.setWallMode(newWallMode);
  },

  setSelectedWallType: (wallType: 'brick' | 'stone' | 'wood' | 'custom') => {
    battlemapStore.controls.isometricEditor.selectedWallType = wallType;
  },

  setWallPlacementDirection: (direction: IsometricDirection) => {
    battlemapStore.controls.isometricEditor.wallPlacementDirection = direction;
  },

  setWallSpriteDirection: (direction: IsometricDirection) => {
    battlemapStore.controls.isometricEditor.wallSpriteDirection = direction;
  },

  // Wall positioning settings (SAME SYSTEM AS BLOCKS - wall sprites are just positioned relative to edges instead of centers)
  setWallPositioningSettings: (spriteName: string, settings: {
    invisibleMarginUp: number;
    invisibleMarginDown: number;
    invisibleMarginLeft: number;
    invisibleMarginRight: number;
    autoComputedVerticalBias: number;
    useAutoComputed: boolean;
    manualVerticalBias: number;
    manualHorizontalOffset: number;
    manualDiagonalNorthEastOffset: number;
    manualDiagonalNorthWestOffset: number;
    relativeAlongEdgeOffset: number;
    relativeTowardCenterOffset: number;
    relativeDiagonalAOffset: number;
    relativeDiagonalBOffset: number;
    useADivisionForNorthEast: boolean;
    useSpriteTrimmingForWalls: boolean;
    // NEW: Stored bounding box relationship (computed once, reused always)
    spriteBoundingBox?: {
      originalWidth: number;
      originalHeight: number; 
      boundingX: number;
      boundingY: number;
      boundingWidth: number;
      boundingHeight: number;
      anchorOffsetX: number;
      anchorOffsetY: number;
    };
  }) => {
    // FIXED: Preserve existing useSharedSettings and directionalSettings when updating positioning
    const existingSettings = battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName];
    
    // Merge new settings with existing settings to preserve useSharedSettings and directionalSettings
    const updatedSettings = {
      ...settings,
      // Preserve the per-direction configuration fields if they exist
      useSharedSettings: existingSettings?.useSharedSettings ?? true, // Default to shared if not set
      directionalSettings: existingSettings?.directionalSettings // Preserve existing directional settings
    };
    
    battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName] = updatedSettings;
    console.log(`[battlemapActions] Set wall positioning settings for ${spriteName}:`, updatedSettings);
  },

  getWallPositioningSettings: (spriteName: string, direction?: IsometricDirection) => {
    const wallSettings = battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName];
    if (!wallSettings) return null;
    
    // Check if using per-direction settings and direction is specified
    if (!wallSettings.useSharedSettings && direction !== undefined && wallSettings.directionalSettings?.[direction]) {
      return wallSettings.directionalSettings[direction];
    }
    
    // Return shared settings (default)
    return {
      invisibleMarginUp: wallSettings.invisibleMarginUp,
      invisibleMarginDown: wallSettings.invisibleMarginDown,
      invisibleMarginLeft: wallSettings.invisibleMarginLeft,
      invisibleMarginRight: wallSettings.invisibleMarginRight,
      autoComputedVerticalBias: wallSettings.autoComputedVerticalBias,
      useAutoComputed: wallSettings.useAutoComputed,
      manualVerticalBias: wallSettings.manualVerticalBias,
      manualHorizontalOffset: wallSettings.manualHorizontalOffset,
      manualDiagonalNorthEastOffset: wallSettings.manualDiagonalNorthEastOffset,
      manualDiagonalNorthWestOffset: wallSettings.manualDiagonalNorthWestOffset,
      relativeAlongEdgeOffset: wallSettings.relativeAlongEdgeOffset,
      relativeTowardCenterOffset: wallSettings.relativeTowardCenterOffset,
      relativeDiagonalAOffset: wallSettings.relativeDiagonalAOffset,
      relativeDiagonalBOffset: wallSettings.relativeDiagonalBOffset,
      useADivisionForNorthEast: wallSettings.useADivisionForNorthEast,
      useSpriteTrimmingForWalls: wallSettings.useSpriteTrimmingForWalls,
      spriteBoundingBox: wallSettings.spriteBoundingBox,
    };
  },

  // Calculate wall positioning (SIMPLE MANUAL DEFAULTS - no auto calculation for now)
  calculateWallPositioning: (spriteWidth: number, spriteHeight: number, margins?: {
    up?: number; down?: number; left?: number; right?: number;
  }) => {
    // Use provided margins or defaults from store
    const marginUp = margins?.up ?? battlemapStore.view.invisibleMarginUp;
    const marginDown = margins?.down ?? battlemapStore.view.invisibleMarginDown;
    const marginLeft = margins?.left ?? battlemapStore.view.invisibleMarginLeft;
    const marginRight = margins?.right ?? battlemapStore.view.invisibleMarginRight;
    
    // SIMPLIFIED: Return manual defaults with 0 offset for walls
    // This removes auto-calculation complexity so user can understand exact behavior
    return {
      invisibleMarginUp: marginUp,
      invisibleMarginDown: marginDown,
      invisibleMarginLeft: marginLeft,
      invisibleMarginRight: marginRight,
      autoComputedVerticalBias: 0, // Simple default, not actually computed
      useAutoComputed: false, // Default to manual mode
      manualVerticalBias: 0, // Default to 0 offset for clear understanding
      manualHorizontalOffset: 0, // Default to 0 horizontal offset for clear understanding
      manualDiagonalNorthEastOffset: 0,
      manualDiagonalNorthWestOffset: 0,
      relativeAlongEdgeOffset: 0,
      relativeTowardCenterOffset: 0,
      relativeDiagonalAOffset: 8, // PERFECT: Default to 8 for universal positioning
      relativeDiagonalBOffset: 3, // PERFECT: Default to 3 for universal positioning
      useADivisionForNorthEast: true, // NEW: Default to true (current behavior with division)
      useSpriteTrimmingForWalls: false, // NEW: Default to false (current behavior without trimming)
    };
  },

  // NEW: Wall-specific functions to manage shared vs per-direction settings (SAME AS BLOCKS)
  setWallUseSharedSettings: (spriteName: string, useShared: boolean) => {
    console.log(`[battlemapStore] setWallUseSharedSettings called for ${spriteName} with useShared=${useShared}`);
    
    let existingSettings = battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName];
    
    // If no settings exist, create default ones first
    if (!existingSettings) {
      console.log(`[battlemapStore] No existing wall settings for ${spriteName}, creating defaults`);
      existingSettings = {
        invisibleMarginUp: 8,
        invisibleMarginDown: 8,
        invisibleMarginLeft: 8,
        invisibleMarginRight: 8,
        autoComputedVerticalBias: 0,
        useAutoComputed: false,
        manualVerticalBias: 0,
        manualHorizontalOffset: 0,
        manualDiagonalNorthEastOffset: 0,
        manualDiagonalNorthWestOffset: 0,
        relativeAlongEdgeOffset: 0,
        relativeTowardCenterOffset: 0,
        relativeDiagonalAOffset: 8,
        relativeDiagonalBOffset: 3,
        useADivisionForNorthEast: true,
        useSpriteTrimmingForWalls: false,
        useSharedSettings: true
      };
      battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName] = existingSettings;
    }
    
    console.log(`[battlemapStore] Setting wall useSharedSettings from ${existingSettings.useSharedSettings} to ${useShared}`);
    
    // FIXED: Use full object assignment to ensure Valtio reactivity
    const updatedSettings = {
      ...existingSettings,
      useSharedSettings: useShared
    };
    
    // Also ensure directional settings exist with different default values so user can see the difference
    if (!updatedSettings.directionalSettings) {
      const baseSettings = {
        invisibleMarginUp: updatedSettings.invisibleMarginUp,
        invisibleMarginDown: updatedSettings.invisibleMarginDown,
        invisibleMarginLeft: updatedSettings.invisibleMarginLeft,
        invisibleMarginRight: updatedSettings.invisibleMarginRight,
        autoComputedVerticalBias: updatedSettings.autoComputedVerticalBias,
        useAutoComputed: updatedSettings.useAutoComputed,
        manualVerticalBias: updatedSettings.manualVerticalBias,
        manualHorizontalOffset: updatedSettings.manualHorizontalOffset,
        manualDiagonalNorthEastOffset: updatedSettings.manualDiagonalNorthEastOffset,
        manualDiagonalNorthWestOffset: updatedSettings.manualDiagonalNorthWestOffset,
        relativeAlongEdgeOffset: updatedSettings.relativeAlongEdgeOffset,
        relativeTowardCenterOffset: updatedSettings.relativeTowardCenterOffset,
        relativeDiagonalAOffset: updatedSettings.relativeDiagonalAOffset,
        relativeDiagonalBOffset: updatedSettings.relativeDiagonalBOffset,
        useADivisionForNorthEast: updatedSettings.useADivisionForNorthEast,
        useSpriteTrimmingForWalls: updatedSettings.useSpriteTrimmingForWalls,
      };
      
      updatedSettings.directionalSettings = {
        [IsometricDirection.NORTH]: { 
          ...baseSettings, 
          invisibleMarginUp: 0, invisibleMarginDown: 0, 
          invisibleMarginLeft: 0, invisibleMarginRight: 0,
          relativeDiagonalAOffset: 0, relativeDiagonalBOffset: 0
        },
        [IsometricDirection.EAST]: { 
          ...baseSettings, 
          invisibleMarginUp: 0, invisibleMarginDown: 0, 
          invisibleMarginLeft: 0, invisibleMarginRight: 0,
          relativeDiagonalAOffset: 0, relativeDiagonalBOffset: 0
        },
        [IsometricDirection.SOUTH]: { 
          ...baseSettings, 
          invisibleMarginUp: 0, invisibleMarginDown: 0, 
          invisibleMarginLeft: 0, invisibleMarginRight: 0,
          relativeDiagonalAOffset: 0, relativeDiagonalBOffset: 0
        },
        [IsometricDirection.WEST]: { 
          ...baseSettings, 
          invisibleMarginUp: 0, invisibleMarginDown: 0, 
          invisibleMarginLeft: 0, invisibleMarginRight: 0,
          relativeDiagonalAOffset: 0, relativeDiagonalBOffset: 0
        }
      };
    }
    
    // FIXED: Assign the entire updated object to trigger Valtio reactivity properly
    battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName] = updatedSettings;
    
    console.log(`[battlemapStore] Final wall settings for ${spriteName}:`, updatedSettings);
    console.log(`[battlemapStore] Set ${spriteName} wall to use ${useShared ? 'shared' : 'per-direction'} settings`);
    
    // Force re-render
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    setTimeout(() => {
      if ((window as any).__forceWallRender) (window as any).__forceWallRender();
      if ((window as any).__forceTileRender) (window as any).__forceTileRender();
    }, 0);
  },

  getWallUseSharedSettings: (spriteName: string): boolean => {
    const wallSettings = battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName];
    return wallSettings?.useSharedSettings ?? true; // Default to shared
  },

  // NEW: Set direction-specific wall settings
  setWallDirectionalSettings: (spriteName: string, direction: IsometricDirection, settings: {
    invisibleMarginUp: number;
    invisibleMarginDown: number;
    invisibleMarginLeft: number;
    invisibleMarginRight: number;
    autoComputedVerticalBias: number;
    useAutoComputed: boolean;
    manualVerticalBias: number;
    manualHorizontalOffset: number;
    manualDiagonalNorthEastOffset: number;
    manualDiagonalNorthWestOffset: number;
    relativeAlongEdgeOffset: number;
    relativeTowardCenterOffset: number;
    relativeDiagonalAOffset: number;
    relativeDiagonalBOffset: number;
    useADivisionForNorthEast: boolean;
    useSpriteTrimmingForWalls: boolean;
  }) => {
    const existingSettings = battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName];
    if (existingSettings) {
      if (!existingSettings.directionalSettings) {
        existingSettings.directionalSettings = {};
      }
      existingSettings.directionalSettings[direction] = settings;
      console.log(`[battlemapStore] Set direction-specific wall settings for ${spriteName} direction ${direction}`);
      
      // Force re-render
      const currentOffset = battlemapStore.view.offset;
      battlemapStore.view.offset = { ...currentOffset };
      
      setTimeout(() => {
        if ((window as any).__forceWallRender) (window as any).__forceWallRender();
        if ((window as any).__forceTileRender) (window as any).__forceTileRender();
      }, 0);
    }
  },
};

// Export both store and actions
export { battlemapStore, battlemapActions }; 