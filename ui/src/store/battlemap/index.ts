// /store/battlemap/index.ts
// CLEANED UP: All legacy positioning logic removed

// Import from remaining store modules
import { battlemapStore, coreActions } from './core';
import { zLayerActions, LayerVisibilityMode, Z_LAYER_CONFIG, DEFAULT_Z_LAYER_SETTINGS } from './zlayer';

// Type imports
import type { DeepReadonly } from '../../types/common';

// Since we can't import BattlemapStoreState due to circular dependencies,
// we'll define ReadonlyBattlemapStore using typeof
export type ReadonlyBattlemapStore = DeepReadonly<typeof battlemapStore>;

// Export store
export { battlemapStore };

// Re-export types and values for components to use
export {
  LayerVisibilityMode,
  Z_LAYER_CONFIG,
  DEFAULT_Z_LAYER_SETTINGS
};

// Re-export commonly used types from original type files (safe imports)
export type {
  TileSummary,
  GridSnapshot
} from '../../types/battlemap_types';

// Combined actions object - positioning logic removed
export const battlemapActions = {
  // Core actions (grid, view, controls)
  ...coreActions,
  
  // Z-layer actions
  ...zLayerActions,
};