// /store/battlemap/index.ts

// Import from all store modules
import { battlemapStore, coreActions } from './core';
import { zLayerActions, LayerVisibilityMode, Z_LAYER_CONFIG, DEFAULT_Z_LAYER_SETTINGS } from './zlayer';
import { isometricEditorActions, VerticalBiasComputationMode, DirectionalSettings } from './isometricEditor';
import { wallActions } from './walls';
import { processedAssetsActions } from './processedAssets';


// Type imports
import type { DeepReadonly } from '../../types/common';

// Since we can't import BattlemapStoreState due to circular dependencies, 
// we'll define ReadonlyBattlemapStore using typeof
export type ReadonlyBattlemapStore = DeepReadonly<typeof battlemapStore>;

// Export store
export { battlemapStore };

// Re-export types and values for components to use
export { 
  VerticalBiasComputationMode, 
  LayerVisibilityMode,
  Z_LAYER_CONFIG,
  DEFAULT_Z_LAYER_SETTINGS 
};
export type { DirectionalSettings };

// Re-export commonly used types from original type files (safe imports)
export type { 
  TileSummary, 
  WallSummary, 
  GridSnapshot 
} from '../../types/battlemap_types';

// Re-export processed assets types
export type {
  ProcessedAssetId,
  AssetCategory,
  MutableProcessedAssetDefinition,
  TemporaryAssetState,
  AssetPreviewConfiguration,
  ProcessingOperation,
  ProcessedAssetDefinition
} from '../../types/processed_assets';

// Combined actions object for backward compatibility
export const battlemapActions = {
  // Core actions
  ...coreActions,
  
  // Z-layer actions
  ...zLayerActions,
  
  // Isometric editor actions
  ...isometricEditorActions,
  
  // Wall actions
  ...wallActions,
  
  // *** NEW: Processed assets actions ***
  processedAssets: processedAssetsActions,
  
  // Special handling for vertical bias computation mode
  // (needs to trigger recalculation in isometric editor)
  setVerticalBiasComputationMode: (mode: Parameters<typeof coreActions.setVerticalBiasComputationMode>[0]) => {
    coreActions.setVerticalBiasComputationMode(mode);
    // Trigger recalculation of all auto-computed sprite settings
    isometricEditorActions.recalculateAutoComputedSettings();
  },
};