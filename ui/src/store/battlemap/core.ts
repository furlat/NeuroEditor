// /store/battlemap/core.ts
import { proxy } from 'valtio';
import { TileSummary } from '../../types/battlemap_types';
import { TileType } from '../../hooks/battlemap';
import { IsometricDirection, SpriteCategory } from '../../game/managers/IsometricSpriteManager';

// Import values from local definitions in other store modules to avoid circular dependencies
import { VerticalBiasComputationMode } from './isometricEditor';
import { LayerVisibilityMode, DEFAULT_Z_LAYER_SETTINGS } from './zlayer';
import { DeepReadonly } from '../../types/common';
import { 
  MutableProcessedAssetDefinition, 
  TemporaryAssetState, 
  AssetPreviewConfiguration,
  ProcessedAssetId,
  AssetCategory
} from '../../types/processed_assets';

// Local type definition for BattlemapStoreState to avoid circular dependency
interface BattlemapStoreState {
  grid: {
    width: number;
    height: number;
    tiles: Record<string, TileSummary>;
    walls: Record<string, any>; // Using any to avoid importing WallSummary
    maxZLevel: number;
  };
  view: {
    offset: { x: number; y: number };
    hoveredCell: { x: number; y: number };
    wasd_moving: boolean;
    showZLevel: number;
    zoomLevel: number;
    gridDiamondWidth: number;
    spriteScale: number;
    isRatioLocked: boolean;
    baseGridDiamondWidth: number;
    baseSpriteScale: number;
    baseZLayerHeights: Array<{ z: number; verticalOffset: number; name: string; color: number }>;
    invisibleMarginUp: number;
    invisibleMarginDown: number;
    invisibleMarginLeft: number;
    invisibleMarginRight: number;
    activeZLayer: number;
    layerVisibilityMode: LayerVisibilityMode;
    gridLayerVisibility: { [zLayer: number]: boolean };
    zLayerHeights: Array<{ z: number; verticalOffset: number; name: string; color: number }>;
    verticalBiasComputationMode: VerticalBiasComputationMode;
  };
  controls: {
    isLocked: boolean;
    isGridVisible: boolean;
    isTilesVisible: boolean;
    isIsometric: boolean;
    isEditing: boolean;
    isEditorVisible: boolean;
    selectedTileType: TileType;
    isometricEditor: any; // Using any to avoid complex type definition
  };
  // *** NEW: PROCESSED ASSETS SYSTEM ***
  processedAssets: {
    // Asset mode toggle
    isProcessedAssetMode: boolean;          // Toggle between old battlemap tiles and new processed assets
    
    // Asset library (UUID-indexed)
    assetLibrary: Record<ProcessedAssetId, MutableProcessedAssetDefinition>;
    
    // Temporary asset for creation/editing interface
    temporaryAsset: TemporaryAssetState | null;
    
    // Asset instances placed on the grid (UUID-indexed)
    assetInstances: Record<string, {       // Key: "x,y,z,instanceId"
      instanceId: string;                  // Unique instance identifier
      assetId: ProcessedAssetId;           // Reference to asset in library
      position: readonly [number, number]; // Grid position
      zLevel: number;                      // Z layer
      direction: IsometricDirection;       // Asset orientation
      snapPosition: 'above' | 'below';    // Snap positioning
      wallDirection?: IsometricDirection;  // NEW: For wall assets
    }>;
    
    // Asset creation and editing state
    assetCreation: {
      isCreating: boolean;                 // Whether asset creation UI is open
      isEditing: boolean;                  // Whether editing existing asset
      currentStep: 'source' | 'processing' | 'directional' | 'gameplay' | 'preview'; // Current step in creation
      selectedSourceImage: string | null; // Currently selected source image path
      selectedCategory: AssetCategory;     // Currently selected asset category
      selectedSubcategory: string;         // Currently selected subcategory
    };
    
    // Asset preview system
    assetPreview: {
      isPreviewOpen: boolean;              // Whether preview window is open
      configuration: AssetPreviewConfiguration;
      cameraState: {                       // Independent camera state for preview
        offset: { x: number; y: number };
        zoomLevel: number;
      };
    };
    
    // Asset grid configuration (for processed asset mode)
    assetGrid: {
      width: number;                       // Grid width for asset mode
      height: number;                      // Grid height for asset mode
      centerOffset: { x: number; y: number }; // Offset to center the grid view
    };
    
    // Asset placement controls
    assetPlacement: {
      selectedAssetId: ProcessedAssetId | null; // Currently selected asset for placement
      placementDirection: IsometricDirection;   // Direction for new placements
      placementSnapPosition: 'above' | 'below'; // Snap position for new placements
      brushSize: number;                        // Brush size for multi-placement
    };
    
    // Asset organization and search
    assetOrganization: {
      searchQuery: string;                 // Search text
      categoryFilter: AssetCategory | 'all'; // Category filter
      subcategoryFilter: string | 'all';  // Subcategory filter
      tagFilters: string[];                // Active tag filters
      sortBy: 'name' | 'category' | 'dateCreated' | 'dateModified'; // Sort criteria
      sortOrder: 'asc' | 'desc';           // Sort direction
    };
    
    // Asset validation and status
    assetValidation: {
      lastValidationRun: string | null;    // ISO timestamp of last validation
      hasValidationErrors: boolean;        // Whether any assets have validation errors
      invalidAssetIds: ProcessedAssetId[]; // List of assets with validation errors
    };
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
    isRatioLocked: true, // Default to true as requested
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
      0: true,   // Only layer 0 visible by default
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
  processedAssets: {
    isProcessedAssetMode: false,
    assetLibrary: {},
    temporaryAsset: null,
    assetInstances: {},
    assetCreation: {
      isCreating: false,
      isEditing: false,
      currentStep: 'source',
      selectedSourceImage: null,
      selectedCategory: AssetCategory.TILE,
      selectedSubcategory: 'floor',
    },
    assetPreview: {
      isPreviewOpen: false,
      configuration: {
        gridSize: { width: 3, height: 3 },
        centerCellPosition: [1, 1] as const,
        cameraOffset: { x: 0, y: 0 },
        zoomLevel: 1.0,
        showGridAnchors: false,
        showSpriteAnchors: false,
        showBoundingBoxAnchors: false,
      },
      cameraState: {
        offset: { x: 0, y: 0 },
        zoomLevel: 1.0,
      },
    },
    assetGrid: {
      width: 3, // Default smaller grid for asset mode
      height: 3,
      centerOffset: { x: 0, y: 0 },
    },
    assetPlacement: {
      selectedAssetId: null,
      placementDirection: IsometricDirection.SOUTH,
      placementSnapPosition: 'above',
      brushSize: 1,
    },
    assetOrganization: {
      searchQuery: '',
      categoryFilter: 'all',
      subcategoryFilter: 'all',
      tagFilters: [],
      sortBy: 'name',
      sortOrder: 'asc',
    },
    assetValidation: {
      lastValidationRun: null,
      hasValidationErrors: false,
      invalidAssetIds: [],
    },
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
    if ((window as any).__forceTileRender) (window as any).__forceTileRender();
    if ((window as any).__forceWallRender) (window as any).__forceWallRender();
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
    
    // If ratio lock is enabled, adjust sprite scale and Z-layer heights proportionally from base values
    if (battlemapStore.view.isRatioLocked) {
      const ratio = width / battlemapStore.view.baseGridDiamondWidth;
      
      // Scale sprite scale from base value
      battlemapStore.view.spriteScale = battlemapStore.view.baseSpriteScale * ratio;
      
      // Scale Z-layer heights from base values
      battlemapStore.view.zLayerHeights = battlemapStore.view.baseZLayerHeights.map((layer: { z: number; verticalOffset: number; name: string; color: number }) => ({
        ...layer,
        verticalOffset: Math.round(layer.verticalOffset * ratio)
      }));
      
      console.log(`[battlemapStore] Ratio lock: Grid width changed to ${width}, ratio ${ratio.toFixed(3)}, adjusted sprite scale to ${battlemapStore.view.spriteScale.toFixed(2)}, scaled Z-layer heights from base values`);
    }
  },
  
  setSpriteScale: (scale: number) => {
    const clampedScale = Math.max(0.1, Math.min(5.0, scale));
    battlemapStore.view.spriteScale = clampedScale;
    
    // If ratio lock is enabled, adjust grid diamond width and Z-layer heights proportionally from base values
    if (battlemapStore.view.isRatioLocked) {
      const ratio = clampedScale / battlemapStore.view.baseSpriteScale;
      
      // Scale grid width from base value
      battlemapStore.view.gridDiamondWidth = Math.round(battlemapStore.view.baseGridDiamondWidth * ratio);
      
      // Scale Z-layer heights from base values
      battlemapStore.view.zLayerHeights = battlemapStore.view.baseZLayerHeights.map((layer: { z: number; verticalOffset: number; name: string; color: number }) => ({
        ...layer,
        verticalOffset: Math.round(layer.verticalOffset * ratio)
      }));
      
      console.log(`[battlemapStore] Ratio lock: Sprite scale changed to ${clampedScale}, ratio ${ratio.toFixed(3)}, adjusted grid width to ${battlemapStore.view.gridDiamondWidth}, scaled Z-layer heights from base values`);
    }
  },
  
  // Ratio lock management
  setRatioLocked: (locked: boolean) => {
    battlemapStore.view.isRatioLocked = locked;
    console.log(`[battlemapStore] Ratio lock ${locked ? 'enabled' : 'disabled'} - Grid: ${battlemapStore.view.gridDiamondWidth}px, Sprite: ${battlemapStore.view.spriteScale}x`);
  },
  
  toggleRatioLock: () => {
    const newLocked = !battlemapStore.view.isRatioLocked;
    coreActions.setRatioLocked(newLocked);
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

  // Base value management for ratio lock
  setBaseValues: () => {
    // Capture current values as new base values
    battlemapStore.view.baseGridDiamondWidth = battlemapStore.view.gridDiamondWidth;
    battlemapStore.view.baseSpriteScale = battlemapStore.view.spriteScale;
    battlemapStore.view.baseZLayerHeights = battlemapStore.view.zLayerHeights.map((layer: { z: number; verticalOffset: number; name: string; color: number }) => ({ ...layer }));
    console.log('[battlemapStore] Base values updated from current values');
  },
  
  resetBaseValues: () => {
    // Reset base values to defaults
    battlemapStore.view.baseGridDiamondWidth = 400;
    battlemapStore.view.baseSpriteScale = 1.0;
    battlemapStore.view.baseZLayerHeights = DEFAULT_Z_LAYER_SETTINGS.map((layer: { z: number; verticalOffset: number; name: string; color: number }) => ({ ...layer }));
    console.log('[battlemapStore] Base values reset to defaults');
  },

  // Vertical bias computation method
  setVerticalBiasComputationMode: (mode: VerticalBiasComputationMode) => {
    battlemapStore.view.verticalBiasComputationMode = mode;
    console.log(`[battlemapStore] Vertical bias computation mode set to: ${mode}`);
    // Note: The recalculation logic is now handled in isometricEditor.ts
  },
};