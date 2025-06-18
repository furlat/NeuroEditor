// /store/battlemap/core.ts
import { proxy } from 'valtio';
import { TileSummary } from '../../types/battlemap_types';
import { TileType } from '../../hooks/battlemap';
import { LayerVisibilityMode, DEFAULT_Z_LAYER_SETTINGS } from './zlayer';

// Local type definition for BattlemapStoreState to avoid circular dependency
interface BattlemapStoreState {
  grid: {
    width: number;
    height: number;
    tiles: Record<string, TileSummary>;
    maxZLevel: number;
  };
  view: {
    offset: { x: number; y: number };
    hoveredCell: { x: number; y: number };
    wasd_moving: boolean;
    showZLevel: number;
    zoomLevel: number;
    gridDiamondWidth: number;
    isRatioLocked: boolean;
    baseGridDiamondWidth: number;
    baseZLayerHeights: Array<{ z: number; verticalOffset: number; name: string; color: number }>;
    activeZLayer: number;
    layerVisibilityMode: LayerVisibilityMode;
    gridLayerVisibility: { [zLayer: number]: boolean };
    zLayerHeights: Array<{ z: number; verticalOffset: number; name: string; color: number }>;
  };
  controls: {
    isLocked: boolean;
    isGridVisible: boolean;
    isTilesVisible: boolean;
    isIsometric: boolean;
    isEditing: boolean;
    isEditorVisible: boolean;
    selectedTileType: TileType;
  };
  loading: boolean;
  error: string | null;
}

// Initialize the store with default values for local editing
export const battlemapStore = proxy<BattlemapStoreState>({
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
    gridDiamondWidth: 401,
    isRatioLocked: true,
    baseGridDiamondWidth: 400,
    baseZLayerHeights: DEFAULT_Z_LAYER_SETTINGS.map(layer => ({ ...layer })),
    activeZLayer: 0,
    layerVisibilityMode: LayerVisibilityMode.NORMAL,
    gridLayerVisibility: {
      0: true,   // Only layer 0 visible by default
      1: false,  // Other layers hidden by default
      2: false,
    },
    zLayerHeights: DEFAULT_Z_LAYER_SETTINGS,
  },
  controls: {
    isLocked: false,
    isGridVisible: true,
    isTilesVisible: true,
    isIsometric: true,
    isEditing: false,
    isEditorVisible: false,
    selectedTileType: 'floor',
  },
  loading: false,
  error: null,
});

// Force re-render helper
export const forceRerender = () => {
  const currentOffset = battlemapStore.view.offset;
  battlemapStore.view.offset = { ...currentOffset };
  
  // Also trigger manual renders if available
  setTimeout(() => {
    if ((window as any).__forceGridRender) (window as any).__forceGridRender();
  }, 0);
};

// Core actions for grid, view, and controls
export const coreActions = {
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

  setZoomLevel: (zoom: number) => {
    battlemapStore.view.zoomLevel = Math.max(0.1, Math.min(5.0, zoom));
  },
  
  setGridDiamondWidth: (width: number) => {
    battlemapStore.view.gridDiamondWidth = width;
    
    // If ratio lock is enabled, adjust Z-layer heights proportionally from base values
    if (battlemapStore.view.isRatioLocked) {
      const ratio = width / battlemapStore.view.baseGridDiamondWidth;
      
      // Scale Z-layer heights from base values
      battlemapStore.view.zLayerHeights = battlemapStore.view.baseZLayerHeights.map((layer: { z: number; verticalOffset: number; name: string; color: number }) => ({
        ...layer,
        verticalOffset: Math.round(layer.verticalOffset * ratio)
      }));
      
      console.log(`[battlemapStore] Ratio lock: Grid width changed to ${width}, ratio ${ratio.toFixed(3)}, scaled Z-layer heights from base values`);
    }
  },
  
  // Ratio lock management
  setRatioLocked: (locked: boolean) => {
    battlemapStore.view.isRatioLocked = locked;
    console.log(`[battlemapStore] Ratio lock ${locked ? 'enabled' : 'disabled'} - Grid: ${battlemapStore.view.gridDiamondWidth}px`);
  },
  
  toggleRatioLock: () => {
    const newLocked = !battlemapStore.view.isRatioLocked;
    coreActions.setRatioLocked(newLocked);
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
  
  // Loading/error status
  setLoading: (loading: boolean) => {
    battlemapStore.loading = loading;
  },
  
  setError: (error: string | null) => {
    battlemapStore.error = error;
  },
  
  // Local grid initialization
  initializeLocalGrid: (width: number = 30, height: number = 20) => {
    coreActions.setGridDimensions(width, height);
    coreActions.clearAllTiles();
    console.log(`[battlemapStore] Initialized local grid: ${width}x${height}`);
  },

  // Generate sample tiles for testing - basic grid data only
  generateSampleTiles: () => {
    const sampleTiles: Record<string, TileSummary> = {};
    
    // Create a small sample area with basic floor tiles
    for (let x = 5; x < 15; x++) {
      for (let y = 5; y < 15; y++) {
        const floorKey = `${x},${y},0`;
        sampleTiles[floorKey] = {
          uuid: `tile_${x}_${y}_0`,
          name: 'Floor',
          position: [x, y] as const,
          walkable: true,
          visible: true,
          z_level: 0,
          tile_type: 'floor',
        } as TileSummary;
      }
    }
    
    battlemapStore.grid.tiles = sampleTiles;
    battlemapStore.grid.maxZLevel = 0;
    console.log('[battlemapStore] Generated sample tiles:', Object.keys(sampleTiles).length);
  },

  // Base value management for ratio lock
  setBaseValues: () => {
    // Capture current values as new base values
    battlemapStore.view.baseGridDiamondWidth = battlemapStore.view.gridDiamondWidth;
    battlemapStore.view.baseZLayerHeights = battlemapStore.view.zLayerHeights.map((layer: { z: number; verticalOffset: number; name: string; color: number }) => ({ ...layer }));
    console.log('[battlemapStore] Base values updated from current values');
  },
  
  resetBaseValues: () => {
    // Reset base values to defaults
    battlemapStore.view.baseGridDiamondWidth = 400;
    battlemapStore.view.baseZLayerHeights = DEFAULT_Z_LAYER_SETTINGS.map((layer: { z: number; verticalOffset: number; name: string; color: number }) => ({ ...layer }));
    console.log('[battlemapStore] Base values reset to defaults');
  },
};