import { proxy } from 'valtio';
import { TileSummary } from '../types/battlemap_types';
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
  }>;
}

// Types for the local-only store
export interface GridState {
  width: number;
  height: number;
  tiles: Record<string, TileSummary>;
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
  },
  
  setSpriteScale: (scale: number) => {
    battlemapStore.view.spriteScale = Math.max(0.1, Math.min(5.0, scale));
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
    invisibleMarginUp: number;
    invisibleMarginDown: number;
    invisibleMarginLeft: number;
    invisibleMarginRight: number;
    autoComputedVerticalBias: number;
    useAutoComputed: boolean;
    manualVerticalBias: number;
  }) => {
    console.log(`[battlemapStore] Setting sprite type settings for ${spriteName}:`, settings);
    battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName] = settings;
    
    // Force immediate re-render by triggering a dummy change to ensure reactivity
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    // Also trigger manual renders if available
    setTimeout(() => {
      if ((window as any).__forceTileRender) (window as any).__forceTileRender();
    }, 0);
  },
  
  getSpriteTypeSettings: (spriteName: string) => {
    return battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName] || null;
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
      console.log(`[battlemapStore] Z-layer ${layerIndex} height set to: ${verticalOffset}px - FORCING RENDER`);
      
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
    battlemapStore.view.zLayerHeights = DEFAULT_Z_LAYER_SETTINGS.map(layer => ({ ...layer }));
    console.log('[battlemapStore] Z-layer heights reset to defaults - FORCING RENDER');
    
    // Force immediate re-render by triggering a dummy change
    const currentOffset = battlemapStore.view.offset;
    battlemapStore.view.offset = { ...currentOffset };
    
    // Also trigger manual renders if available
    setTimeout(() => {
      if ((window as any).__forceGridRender) (window as any).__forceGridRender();
      if ((window as any).__forceTileRender) (window as any).__forceTileRender();
    }, 0);
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
};

// Export both store and actions
export { battlemapStore, battlemapActions }; 