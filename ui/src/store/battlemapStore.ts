import { proxy } from 'valtio';
import { TileSummary } from '../types/battlemap_types';
import type { DeepReadonly } from '../types/common';
import { TileType } from '../hooks/battlemap';
import { IsometricDirection, SpriteCategory } from '../game/managers/IsometricSpriteManager';

// Enhanced types for isometric editing
export interface IsometricEditorState {
  selectedSpriteName: string | null;
  selectedSpriteDirection: IsometricDirection;
  selectedZLevel: number;
  selectedSpriteCategory: SpriteCategory;
  brushSize: number; // For painting multiple tiles at once
  isDirectionalMode: boolean; // Whether to auto-select direction based on neighbors
  // Per-sprite positioning settings
  spriteSettings: Record<string, {
    verticalOffset: number;
    invisibleMargin: number;
    isAutoCalculated: boolean; // Whether using formula or manual override
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
  showZLevel: number; // Which Z level to display (-1 for all)
  zoomLevel: number; // Separate zoom tracking
  // Manual grid and sprite controls
  gridDiamondWidth: number; // Width of the diamond grid in pixels
  spriteScale: number; // Scale multiplier for sprites (independent of grid)
  spriteVerticalOffset: number; // Vertical offset for sprite positioning relative to anchor
  spriteInvisibleMargin: number; // Invisible margin for internal positioning adjustments
  // Calculation-only variables (don't affect rendering, only predictions)
  calcMarginUp: number; // Top margin for calculation purposes
  calcMarginLeft: number; // Left margin for calculation purposes  
  calcMarginRight: number; // Right margin for calculation purposes
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
    gridDiamondWidth: 400, // Updated to user's working value
    spriteScale: 1.0, // Keep at original size
    spriteVerticalOffset: 35, // User's working vertical offset
    spriteInvisibleMargin: 8, // User's working invisible margin
    calcMarginUp: 0,
    calcMarginLeft: 0,
    calcMarginRight: 0,
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
      spriteSettings: {},
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
    
    console.log('[battlemapStore] Added isometric tile:', tile);
  },

  removeIsometricTile: (x: number, y: number, z: number) => {
    const posKey = `${x},${y},${z}`;
    if (battlemapStore.grid.tiles[posKey]) {
      delete battlemapStore.grid.tiles[posKey];
      console.log('[battlemapStore] Removed isometric tile at:', [x, y, z]);
    }
  },

  updateIsometricTile: (x: number, y: number, z: number, updates: Partial<TileSummary>) => {
    const posKey = `${x},${y},${z}`;
    const existingTile = battlemapStore.grid.tiles[posKey];
    if (existingTile) {
      battlemapStore.grid.tiles[posKey] = { ...existingTile, ...updates };
      console.log('[battlemapStore] Updated isometric tile at:', [x, y, z]);
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
  
  setSpriteVerticalOffset: (offset: number) => {
    battlemapStore.view.spriteVerticalOffset = offset;
  },
  
  setSpriteInvisibleMargin: (margin: number) => {
    battlemapStore.view.spriteInvisibleMargin = margin;
  },
  
  setCalcMarginUp: (margin: number) => {
    battlemapStore.view.calcMarginUp = margin;
  },
  
  setCalcMarginLeft: (margin: number) => {
    battlemapStore.view.calcMarginLeft = margin;
  },
  
  setCalcMarginRight: (margin: number) => {
    battlemapStore.view.calcMarginRight = margin;
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
  
  // Per-sprite positioning settings
  setSpritePositioning: (spriteName: string, verticalOffset: number, invisibleMargin: number, isAutoCalculated: boolean = false) => {
    battlemapStore.controls.isometricEditor.spriteSettings[spriteName] = {
      verticalOffset,
      invisibleMargin,
      isAutoCalculated
    };
  },
  
  getSpritePositioning: (spriteName: string) => {
    return battlemapStore.controls.isometricEditor.spriteSettings[spriteName] || null;
  },
  
  // Calculate positioning using the user's formula
  calculateSpritePositioning: (spriteWidth: number, spriteHeight: number, invisibleMargin: number = 8) => {
    // Step 1: (WIDTH - (MARGIN + 1)) / 2 --> isometric diamond bottom height
    const actualWidth = spriteWidth - (invisibleMargin + 1);
    const isometricDiamondBottomHeight = actualWidth / 2;
    
    // Step 2: empirical height - (margin+1) - margin_above - actual height == vertical offset
    const marginBelow = invisibleMargin;
    const marginAbove = 4; // Estimated margin above
    const effectiveEmpiricalHeight = spriteHeight - marginBelow - marginAbove - 1;
    const calculatedVerticalOffset = effectiveEmpiricalHeight - isometricDiamondBottomHeight;
    
    return {
      verticalOffset: Math.round(calculatedVerticalOffset),
      invisibleMargin: invisibleMargin
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
        };
      }
    }
    
    battlemapStore.grid.tiles = sampleTiles;
    battlemapStore.grid.maxZLevel = 0; // Only floor level now
    console.log('[battlemapStore] Generated sample isometric tiles:', Object.keys(sampleTiles).length);
  },
};

// Export both store and actions
export { battlemapStore, battlemapActions }; 