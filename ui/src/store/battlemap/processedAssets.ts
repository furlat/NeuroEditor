/**
 * Processed Assets Store Actions and Utilities
 * 
 * This file manages the processed assets system state, including:
 * - Asset mode toggle (battlemap tiles vs processed assets)
 * - Asset library management
 * - Asset creation and editing workflows
 * - Asset preview system
 * - Asset placement and grid management
 */

import { battlemapStore, forceRerender } from './core';
import { IsometricDirection } from '../../game/managers/IsometricSpriteManager';
import {
  ProcessedAssetId,
  AssetCategory,
  ProcessedAssetType,
  MutableProcessedAssetDefinition,
  TemporaryAssetState,
  ProcessingOperation,
  createDefaultDirectionalSettings,
  createDefaultGameplayProperties,
  generateProcessedAssetId,
  AssetPreviewConfiguration,
} from '../../types/processed_assets';
import { Position } from '../../types/common';

// ============================================================================
// ASSET MODE TOGGLE ACTIONS
// ============================================================================

export const processedAssetModeActions = {
  /**
   * Toggle between battlemap tiles mode and processed assets mode
   */
  toggleProcessedAssetMode: () => {
    const wasProcessedMode = battlemapStore.processedAssets.isProcessedAssetMode;
    battlemapStore.processedAssets.isProcessedAssetMode = !wasProcessedMode;
    
    if (!wasProcessedMode) {
      // Switching TO processed asset mode
      console.log('[ProcessedAssets] Switching to processed asset mode');
      
      // Store current grid size for restoration later
      const currentGridWidth = battlemapStore.grid.width;
      const currentGridHeight = battlemapStore.grid.height;
      console.log(`[ProcessedAssets] Storing previous grid size: ${currentGridWidth}x${currentGridHeight}`);
      
      // Switch to smaller asset grid
      processedAssetModeActions.initializeAssetGrid();
      
      // Reset view state and center camera on the asset grid
      processedAssetModeActions.resetViewStateForAssetMode();
      processedAssetModeActions.centerCameraOnAssetGrid();
      
      // NEW: Initialize preview content if no assets exist
      processedAssetModeActions.initializePreviewContent();
      
      console.log('[ProcessedAssets] Switched to processed asset mode - smaller grid initialized');
    } else {
      // Switching BACK to battlemap mode
      console.log('[ProcessedAssets] Switching back to battlemap tile mode');
      
      // Restore larger grid size (default 30x20)
      processedAssetModeActions.restoreBattlemapGrid();
      
      // Reset view and center on the larger grid
      processedAssetModeActions.resetViewStateForBattlemapMode();
      processedAssetModeActions.centerCameraOnBattlemapGrid();
      
      console.log('[ProcessedAssets] Switched back to battlemap tile mode');
    }
    
    forceRerender();
  },
  
  /**
   * Initialize the asset grid for processed asset mode
   */
  initializeAssetGrid: (width: number = 3, height: number = 3) => {
    battlemapStore.processedAssets.assetGrid.width = width;
    battlemapStore.processedAssets.assetGrid.height = height;
    
    // Update the main battlemap grid to match asset grid size
    battlemapStore.grid.width = width;
    battlemapStore.grid.height = height;
    
    // Clear any existing tiles/walls for clean slate
    battlemapStore.grid.tiles = {};
    battlemapStore.grid.walls = {};
    battlemapStore.grid.maxZLevel = 0;
    
    console.log(`[ProcessedAssets] Initialized asset grid: ${width}x${height}`);
  },
  
  /**
   * Restore the battlemap grid to larger size
   */
  restoreBattlemapGrid: (width: number = 30, height: number = 20) => {
    battlemapStore.grid.width = width;
    battlemapStore.grid.height = height;
    
    // Clear any asset mode data
    battlemapStore.processedAssets.assetInstances = {};
    
    console.log(`[ProcessedAssets] Restored battlemap grid: ${width}x${height}`);
  },
  
  /**
   * Reset view state for asset mode
   */
  resetViewStateForAssetMode: () => {
    // Reset hovered cell
    battlemapStore.view.hoveredCell = { x: -1, y: -1 };
    
    // Reset WASD movement state
    battlemapStore.view.wasd_moving = false;
    
    // Reset active Z layer to 0
    battlemapStore.view.activeZLayer = 0;
    
    console.log('[ProcessedAssets] Reset view state for asset mode');
  },
  
  /**
   * Reset view state for battlemap mode
   */
  resetViewStateForBattlemapMode: () => {
    // Reset hovered cell
    battlemapStore.view.hoveredCell = { x: -1, y: -1 };
    
    // Reset WASD movement state
    battlemapStore.view.wasd_moving = false;
    
    // Reset active Z layer to 0
    battlemapStore.view.activeZLayer = 0;
    
    console.log('[ProcessedAssets] Reset view state for battlemap mode');
  },
  
  /**
   * Center camera on the asset grid
   */
  centerCameraOnAssetGrid: () => {
    // For the asset grid, simply reset the camera offset to (0,0)
    // The IsometricGridRenderer's calculateIsometricGridOffset function
    // already handles centering the grid in the available space
    // Any additional offset we add here will move away from true center
    
    battlemapStore.view.offset.x = 150;
    battlemapStore.view.offset.y = 150;
    
    console.log(`[ProcessedAssets] Centered camera on asset grid: reset offset to (0, 0) - letting renderer handle centering`);
  },
  
  /**
   * Center camera on the battlemap grid
   */
  centerCameraOnBattlemapGrid: () => {
    // Calculate center position for the larger grid
    const gridWidth = battlemapStore.grid.width;
    const gridHeight = battlemapStore.grid.height;
    const diamondWidth = battlemapStore.view.gridDiamondWidth;
    
    // Calculate center offset to position grid in view center
    const centerOffsetX = -(gridWidth * diamondWidth) / 6;
    const centerOffsetY = -(gridHeight * diamondWidth) / 12;
    
    battlemapStore.view.offset.x = centerOffsetX;
    battlemapStore.view.offset.y = centerOffsetY;
    
    console.log(`[ProcessedAssets] Centered camera on battlemap grid (${gridWidth}x${gridHeight}): offset(${centerOffsetX}, ${centerOffsetY})`);
  },
  
  /**
   * Check if currently in processed asset mode
   */
  isInProcessedAssetMode: (): boolean => {
    return battlemapStore.processedAssets.isProcessedAssetMode;
  },
  
  /**
   * NEW: Initialize preview content when entering asset mode
   */
  initializePreviewContent: () => {
    try {
      // Check if we already have some assets in the library
      const existingAssets = Object.keys(battlemapStore.processedAssets.assetLibrary);
      if (existingAssets.length > 0) {
        console.log('[ProcessedAssets] Preview content already exists, skipping initialization');
        return;
      }
      
      // Check if we already have asset instances
      const existingInstances = Object.keys(battlemapStore.processedAssets.assetInstances);
      if (existingInstances.length > 0) {
        console.log('[ProcessedAssets] Asset instances already exist, skipping initialization');
        return;
      }
      
      console.log('[ProcessedAssets] Initializing preview content with default assets');
      
      // This will be triggered when the first sprite is selected
      // For now, just ensure the grid is ready
      
    } catch (error) {
      console.error('[ProcessedAssets] Error initializing preview content:', error);
    }
  },
};

// ============================================================================
// ASSET LIBRARY MANAGEMENT ACTIONS
// ============================================================================

export const assetLibraryActions = {
  /**
   * Add a new asset to the library
   */
  addAsset: (asset: MutableProcessedAssetDefinition) => {
    battlemapStore.processedAssets.assetLibrary[asset.id] = asset;
    console.log(`[ProcessedAssets] Added asset to library: ${asset.displayName} (${asset.id})`);
    forceRerender();
  },
  
  /**
   * Remove an asset from the library
   */
  removeAsset: (assetId: ProcessedAssetId) => {
    const asset = battlemapStore.processedAssets.assetLibrary[assetId];
    if (asset) {
      delete battlemapStore.processedAssets.assetLibrary[assetId];
      
      // Also remove any instances of this asset from the grid
      assetInstanceActions.removeAllInstancesOfAsset(assetId);
      
      console.log(`[ProcessedAssets] Removed asset from library: ${asset.displayName} (${assetId})`);
      forceRerender();
    }
  },
  
  /**
   * Get an asset from the library
   */
  getAsset: (assetId: ProcessedAssetId): MutableProcessedAssetDefinition | null => {
    return battlemapStore.processedAssets.assetLibrary[assetId] || null;
  },
  
  /**
   * Get all assets from the library
   */
  getAllAssets: (): Record<ProcessedAssetId, MutableProcessedAssetDefinition> => {
    return battlemapStore.processedAssets.assetLibrary;
  },
  
  /**
   * Get assets filtered by category
   */
  getAssetsByCategory: (category: AssetCategory): MutableProcessedAssetDefinition[] => {
    return Object.values(battlemapStore.processedAssets.assetLibrary)
      .filter(asset => asset.category === category);
  },
  
  /**
   * Update an existing asset
   */
  updateAsset: (assetId: ProcessedAssetId, updates: Partial<MutableProcessedAssetDefinition>) => {
    const asset = battlemapStore.processedAssets.assetLibrary[assetId];
    if (asset) {
      Object.assign(asset, updates);
      asset.lastModified = new Date().toISOString();
      asset.version += 1;
      
      console.log(`[ProcessedAssets] Updated asset: ${asset.displayName} (${assetId}) - version ${asset.version}`);
      forceRerender();
    }
  },
};

// ============================================================================
// ASSET CREATION AND EDITING ACTIONS
// ============================================================================

export const assetCreationActions = {
  /**
   * Start creating a new asset
   */
  startCreatingAsset: (category: AssetCategory = AssetCategory.TILE, subcategory: string = 'floor') => {
    battlemapStore.processedAssets.assetCreation.isCreating = true;
    battlemapStore.processedAssets.assetCreation.isEditing = false;
    battlemapStore.processedAssets.assetCreation.currentStep = 'source';
    battlemapStore.processedAssets.assetCreation.selectedCategory = category;
    battlemapStore.processedAssets.assetCreation.selectedSubcategory = subcategory;
    
    // Create new temporary asset
    const newAsset: TemporaryAssetState = {
      isTemporary: true,
      hasUnsavedChanges: false,
      id: generateProcessedAssetId(),
      displayName: 'New Asset',
      category: category,
      subcategory: subcategory,
      assetType: category === AssetCategory.WALL ? ProcessedAssetType.WALL : ProcessedAssetType.TILE,
      version: 1,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      sourceProcessing: {
        sourceImagePath: '',
        processingOperations: [],
      },
      directionalBehavior: {
        useSharedSettings: true,
        sharedSettings: createDefaultDirectionalSettings(),
        directionalSettings: {
          [IsometricDirection.NORTH]: createDefaultDirectionalSettings(),
          [IsometricDirection.EAST]: createDefaultDirectionalSettings(),
          [IsometricDirection.SOUTH]: createDefaultDirectionalSettings(),
          [IsometricDirection.WEST]: createDefaultDirectionalSettings(),
        },
      },
      gameplayProperties: {
        useSharedProperties: true,
        sharedProperties: createDefaultGameplayProperties(),
        directionalProperties: {
          [IsometricDirection.NORTH]: createDefaultGameplayProperties(),
          [IsometricDirection.EAST]: createDefaultGameplayProperties(),
          [IsometricDirection.SOUTH]: createDefaultGameplayProperties(),
          [IsometricDirection.WEST]: createDefaultGameplayProperties(),
        },
      },
      zPropertyContribution: {
        snapPosition: 'above',
        zOffset: 0,
        affectsOcclusionCalculation: false,
        occlusionPriority: 0,
      },
      tags: [],
      isValid: false,
      validationErrors: ['Source image not selected'],
    };
    
    battlemapStore.processedAssets.temporaryAsset = newAsset;
    
    console.log(`[ProcessedAssets] Started creating new ${category} asset`);
    forceRerender();
  },
  
  /**
   * Start editing an existing asset
   */
  startEditingAsset: (assetId: ProcessedAssetId) => {
    const existingAsset = assetLibraryActions.getAsset(assetId);
    if (!existingAsset) {
      console.error(`[ProcessedAssets] Cannot edit asset - not found: ${assetId}`);
      return;
    }
    
    battlemapStore.processedAssets.assetCreation.isCreating = false;
    battlemapStore.processedAssets.assetCreation.isEditing = true;
    battlemapStore.processedAssets.assetCreation.currentStep = 'source';
    
    // Create temporary copy for editing
    const temporaryAsset: TemporaryAssetState = {
      ...existingAsset,
      isTemporary: true,
      basedOnAssetId: assetId,
      hasUnsavedChanges: false,
    };
    
    battlemapStore.processedAssets.temporaryAsset = temporaryAsset;
    
    console.log(`[ProcessedAssets] Started editing asset: ${existingAsset.displayName} (${assetId})`);
    forceRerender();
  },
  
  /**
   * Cancel asset creation/editing
   */
  cancelAssetCreation: () => {
    battlemapStore.processedAssets.assetCreation.isCreating = false;
    battlemapStore.processedAssets.assetCreation.isEditing = false;
    battlemapStore.processedAssets.temporaryAsset = null;
    
    console.log('[ProcessedAssets] Cancelled asset creation/editing');
    forceRerender();
  },
  
  /**
   * Save the temporary asset to the library
   */
  saveTemporaryAsset: () => {
    const temporaryAsset = battlemapStore.processedAssets.temporaryAsset;
    if (!temporaryAsset) {
      console.error('[ProcessedAssets] Cannot save - no temporary asset');
      return false;
    }
    
    if (!temporaryAsset.isValid) {
      console.error('[ProcessedAssets] Cannot save - asset has validation errors');
      return false;
    }
    
    // Remove temporary flags
    const { isTemporary, basedOnAssetId, hasUnsavedChanges, ...assetData } = temporaryAsset;
    
    const finalAsset: MutableProcessedAssetDefinition = {
      ...assetData,
      lastModified: new Date().toISOString(),
    };
    
    if (battlemapStore.processedAssets.assetCreation.isEditing && basedOnAssetId) {
      // Update existing asset
      assetLibraryActions.updateAsset(basedOnAssetId, finalAsset);
      console.log(`[ProcessedAssets] Updated existing asset: ${finalAsset.displayName} (${basedOnAssetId})`);
    } else {
      // Create new asset
      assetLibraryActions.addAsset(finalAsset);
      console.log(`[ProcessedAssets] Created new asset: ${finalAsset.displayName} (${finalAsset.id})`);
    }
    
    // Clear temporary state
    assetCreationActions.cancelAssetCreation();
    
    return true;
  },
  
  /**
   * Update the temporary asset
   */
  updateTemporaryAsset: (updates: Partial<TemporaryAssetState>) => {
    const temporaryAsset = battlemapStore.processedAssets.temporaryAsset;
    if (temporaryAsset) {
      Object.assign(temporaryAsset, updates);
      temporaryAsset.hasUnsavedChanges = true;
      temporaryAsset.lastModified = new Date().toISOString();
      
      // TODO: Run validation
      assetCreationActions.validateTemporaryAsset();
      
      forceRerender();
    }
  },
  
  /**
   * Validate the temporary asset
   */
  validateTemporaryAsset: () => {
    const temporaryAsset = battlemapStore.processedAssets.temporaryAsset;
    if (!temporaryAsset) return;
    
    const errors: string[] = [];
    
    // Basic validation
    if (!temporaryAsset.displayName.trim()) {
      errors.push('Display name is required');
    }
    
    if (!temporaryAsset.sourceProcessing.sourceImagePath) {
      errors.push('Source image is required');
    }
    
    // Update validation state
    temporaryAsset.isValid = errors.length === 0;
    temporaryAsset.validationErrors = errors;
    
    console.log(`[ProcessedAssets] Validated asset: ${errors.length === 0 ? 'VALID' : 'INVALID'} (${errors.length} errors)`);
  },
  
  /**
   * Set the current creation step
   */
  setCreationStep: (step: 'source' | 'processing' | 'directional' | 'gameplay' | 'preview') => {
    battlemapStore.processedAssets.assetCreation.currentStep = step;
    forceRerender();
  },
};

// ============================================================================
// ASSET INSTANCE MANAGEMENT ACTIONS
// ============================================================================

export const assetInstanceActions = {
  /**
   * Place an asset instance on the grid
   */
  placeAssetInstance: (
    assetId: ProcessedAssetId,
    position: Position,
    zLevel: number,
    direction: IsometricDirection = IsometricDirection.SOUTH,
    snapPosition: 'above' | 'below' = 'above'
  ) => {
    const asset = assetLibraryActions.getAsset(assetId);
    if (!asset) {
      console.error(`[ProcessedAssets] Cannot place asset - not found: ${assetId}`);
      return null;
    }
    
    const instanceId = `instance_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const instanceKey = `${position[0]},${position[1]},${zLevel},${instanceId}`;
    
    const instance = {
      instanceId,
      assetId,
      position,
      zLevel,
      direction,
      snapPosition,
    };
    
    battlemapStore.processedAssets.assetInstances[instanceKey] = instance;
    
    console.log(`[ProcessedAssets] Placed asset instance: ${asset.displayName} at (${position[0]}, ${position[1]}, Z:${zLevel})`);
    forceRerender();
    
    return instanceId;
  },
  
  /**
   * Remove an asset instance from the grid
   */
  removeAssetInstance: (instanceKey: string) => {
    const instance = battlemapStore.processedAssets.assetInstances[instanceKey];
    if (instance) {
      delete battlemapStore.processedAssets.assetInstances[instanceKey];
      console.log(`[ProcessedAssets] Removed asset instance: ${instance.instanceId}`);
      forceRerender();
    }
  },
  
  /**
   * Remove all instances of a specific asset
   */
  removeAllInstancesOfAsset: (assetId: ProcessedAssetId) => {
    let removedCount = 0;
    
    Object.keys(battlemapStore.processedAssets.assetInstances).forEach(instanceKey => {
      const instance = battlemapStore.processedAssets.assetInstances[instanceKey];
      if (instance.assetId === assetId) {
        delete battlemapStore.processedAssets.assetInstances[instanceKey];
        removedCount++;
      }
    });
    
    if (removedCount > 0) {
      console.log(`[ProcessedAssets] Removed ${removedCount} instances of asset: ${assetId}`);
      forceRerender();
    }
  },
  
  /**
   * Get all asset instances
   */
  getAllInstances: () => {
    return battlemapStore.processedAssets.assetInstances;
  },
  
  /**
   * Get instances at a specific position
   */
  getInstancesAtPosition: (position: Position, zLevel?: number) => {
    return Object.values(battlemapStore.processedAssets.assetInstances)
      .filter(instance => {
        const positionMatches = instance.position[0] === position[0] && instance.position[1] === position[1];
        const levelMatches = zLevel === undefined || instance.zLevel === zLevel;
        return positionMatches && levelMatches;
      });
  },
};

// ============================================================================
// ASSET PREVIEW ACTIONS
// ============================================================================

export const assetPreviewActions = {
  /**
   * Open the asset preview window
   */
  openPreview: (assetId: ProcessedAssetId, configuration?: Partial<AssetPreviewConfiguration>) => {
    const asset = assetLibraryActions.getAsset(assetId);
    if (!asset) {
      console.error(`[ProcessedAssets] Cannot preview asset - not found: ${assetId}`);
      return;
    }
    
    // Set up preview configuration
    const defaultConfig: AssetPreviewConfiguration = {
      gridSize: { width: 3, height: 3 },
      centerCellPosition: [1, 1] as const,
      cameraOffset: { x: 0, y: 0 },
      zoomLevel: 1.0,
      showGridAnchors: false,
      showSpriteAnchors: false,
      showBoundingBoxAnchors: false,
    };
    
    battlemapStore.processedAssets.assetPreview.configuration = {
      ...defaultConfig,
      ...configuration,
    };
    
    battlemapStore.processedAssets.assetPreview.isPreviewOpen = true;
    
    console.log(`[ProcessedAssets] Opened asset preview: ${asset.displayName} (${assetId})`);
    forceRerender();
  },
  
  /**
   * Close the asset preview window
   */
  closePreview: () => {
    battlemapStore.processedAssets.assetPreview.isPreviewOpen = false;
    console.log('[ProcessedAssets] Closed asset preview');
    forceRerender();
  },
  
  /**
   * Update preview configuration
   */
  updatePreviewConfiguration: (updates: Partial<AssetPreviewConfiguration>) => {
    Object.assign(battlemapStore.processedAssets.assetPreview.configuration, updates);
    forceRerender();
  },
  
  /**
   * Update preview camera state
   */
  updatePreviewCamera: (offset?: { x: number; y: number }, zoomLevel?: number) => {
    if (offset) {
      battlemapStore.processedAssets.assetPreview.cameraState.offset = offset;
    }
    if (zoomLevel !== undefined) {
      battlemapStore.processedAssets.assetPreview.cameraState.zoomLevel = zoomLevel;
    }
    forceRerender();
  },
};

// ============================================================================
// ASSET PLACEMENT ACTIONS
// ============================================================================

export const assetPlacementActions = {
  /**
   * Set the selected asset for placement
   */
  setSelectedAsset: (assetId: ProcessedAssetId | null) => {
    battlemapStore.processedAssets.assetPlacement.selectedAssetId = assetId;
    
    if (assetId) {
      const asset = assetLibraryActions.getAsset(assetId);
      console.log(`[ProcessedAssets] Selected asset for placement: ${asset?.displayName || 'Unknown'} (${assetId})`);
    } else {
      console.log('[ProcessedAssets] Cleared asset selection');
    }
    
    forceRerender();
  },
  
  /**
   * Set the placement direction
   */
  setPlacementDirection: (direction: IsometricDirection) => {
    battlemapStore.processedAssets.assetPlacement.placementDirection = direction;
    forceRerender();
  },
  
  /**
   * Set the placement snap position
   */
  setPlacementSnapPosition: (snapPosition: 'above' | 'below') => {
    battlemapStore.processedAssets.assetPlacement.placementSnapPosition = snapPosition;
    forceRerender();
  },
  
  /**
   * Set the placement brush size
   */
  setPlacementBrushSize: (size: number) => {
    battlemapStore.processedAssets.assetPlacement.brushSize = Math.max(1, Math.min(10, size));
    forceRerender();
  },
  
  /**
   * Get current placement settings
   */
  getPlacementSettings: () => {
    return battlemapStore.processedAssets.assetPlacement;
  },
};

// ============================================================================
// COMBINED EXPORT
// ============================================================================

export const processedAssetsActions = {
  mode: processedAssetModeActions,
  library: assetLibraryActions,
  creation: assetCreationActions,
  instances: assetInstanceActions,
  preview: assetPreviewActions,
  placement: assetPlacementActions,
}; 