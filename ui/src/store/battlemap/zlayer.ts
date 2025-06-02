// /store/battlemap/zLayer.ts
import { battlemapStore, forceRerender } from './core';
import { TileSummary } from '../../types/battlemap_types';
import { IsometricDirection } from '../../game/managers/IsometricSpriteManager';

// Local type definitions (exported for re-export from store index)
export enum LayerVisibilityMode {
  SHADOW = 'shadow',
  INVISIBLE = 'invisible', 
  NORMAL = 'normal'
}

export const Z_LAYER_CONFIG = {
  maxLayers: 3
} as const;

export const DEFAULT_Z_LAYER_SETTINGS = [
  { z: 0, verticalOffset: 0, name: 'Ground', color: 0x444444 },
  { z: 1, verticalOffset: 36, name: 'Level 1', color: 0x666666 },
  { z: 2, verticalOffset: 196, name: 'Level 2', color: 0x888888 },
];

// Z-layer management actions
export const zLayerActions = {
  // Enhanced tile operations with isometric support
  addIsometricTile: (tile: TileSummary) => {
    const posKey = `${tile.position[0]},${tile.position[1]},${tile.z_level}`;
    battlemapStore.grid.tiles[posKey] = tile;
    
    // Update max Z level if necessary
    if (tile.z_level > battlemapStore.grid.maxZLevel) {
      battlemapStore.grid.maxZLevel = tile.z_level;
    }
    
    console.log('[battlemapStore] Added isometric tile:', tile, '- FORCING RENDER');
    forceRerender();
  },

  removeIsometricTile: (x: number, y: number, z: number) => {
    const posKey = `${x},${y},${z}`;
    if (battlemapStore.grid.tiles[posKey]) {
      delete battlemapStore.grid.tiles[posKey];
      console.log('[battlemapStore] Removed isometric tile at:', [x, y, z], '- FORCING RENDER');
      forceRerender();
    }
  },

  updateIsometricTile: (x: number, y: number, z: number, updates: Partial<TileSummary>) => {
    const posKey = `${x},${y},${z}`;
    const existingTile = battlemapStore.grid.tiles[posKey];
    if (existingTile) {
      battlemapStore.grid.tiles[posKey] = { ...existingTile, ...updates };
      console.log('[battlemapStore] Updated isometric tile at:', [x, y, z], '- FORCING RENDER');
      forceRerender();
    }
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
    forceRerender();
  },

  // Z-layer management actions
  setActiveZLayer: (zLayer: number) => {
    const clampedLayer = Math.max(0, Math.min(Z_LAYER_CONFIG.maxLayers - 1, zLayer));
    const oldActiveLayer = battlemapStore.view.activeZLayer;
    battlemapStore.view.activeZLayer = clampedLayer;
    
    // Default behavior - only show current layer's grid
    battlemapStore.view.gridLayerVisibility[oldActiveLayer] = false;
    battlemapStore.view.gridLayerVisibility[clampedLayer] = true;
    
    // Also update the selected Z level for tile placement
    battlemapStore.controls.isometricEditor.selectedZLevel = clampedLayer;
    console.log(`[battlemapStore] Active Z layer set to: ${clampedLayer} (${DEFAULT_Z_LAYER_SETTINGS[clampedLayer].name}) - FORCING RENDER`);
    forceRerender();
  },
  
  setLayerVisibilityMode: (mode: LayerVisibilityMode) => {
    battlemapStore.view.layerVisibilityMode = mode;
    console.log(`[battlemapStore] Layer visibility mode set to: ${mode} - FORCING RENDER`);
    forceRerender();
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
    
    zLayerActions.setLayerVisibilityMode(nextMode);
  },
  
  getActiveZLayerConfig: () => {
    return battlemapStore.view.zLayerHeights[battlemapStore.view.activeZLayer];
  },
  
  getAllZLayerConfigs: () => {
    return battlemapStore.view.zLayerHeights;
  },

  // Individual grid layer visibility controls
  setGridLayerVisibility: (zLayer: number, visible: boolean) => {
    battlemapStore.view.gridLayerVisibility[zLayer] = visible;
    console.log(`[battlemapStore] Grid layer ${zLayer} visibility set to: ${visible} - FORCING RENDER`);
    forceRerender();
  },
  
  toggleGridLayerVisibility: (zLayer: number) => {
    const currentVisibility = battlemapStore.view.gridLayerVisibility[zLayer];
    zLayerActions.setGridLayerVisibility(zLayer, !currentVisibility);
  },
  
  showAllGridLayers: () => {
    battlemapStore.view.gridLayerVisibility[0] = true;
    battlemapStore.view.gridLayerVisibility[1] = true;
    battlemapStore.view.gridLayerVisibility[2] = true;
    console.log('[battlemapStore] All grid layers shown - FORCING RENDER');
    forceRerender();
  },
  
  hideAllGridLayers: () => {
    battlemapStore.view.gridLayerVisibility[0] = false;
    battlemapStore.view.gridLayerVisibility[1] = false;
    battlemapStore.view.gridLayerVisibility[2] = false;
    console.log('[battlemapStore] All grid layers hidden - FORCING RENDER');
    forceRerender();
  },

  // Z-layer height controls
  setZLayerHeight: (layerIndex: number, verticalOffset: number) => {
    if (layerIndex >= 0 && layerIndex < battlemapStore.view.zLayerHeights.length) {
      battlemapStore.view.zLayerHeights[layerIndex].verticalOffset = verticalOffset;
      
      // Also update base values when ratio lock is off (manual adjustment)
      if (!battlemapStore.view.isRatioLocked) {
        battlemapStore.view.baseZLayerHeights[layerIndex].verticalOffset = verticalOffset;
        console.log(`[battlemapStore] Z-layer ${layerIndex} height set to: ${verticalOffset}px (updated base value)`);
      } else {
        console.log(`[battlemapStore] Z-layer ${layerIndex} height set to: ${verticalOffset}px (ratio lock active, base unchanged)`);
      }
      
      forceRerender();
    }
  },
  
  resetZLayerHeights: () => {
    const defaultHeights = DEFAULT_Z_LAYER_SETTINGS.map((layer: { z: number; verticalOffset: number; name: string; color: number }) => ({ ...layer }));
    battlemapStore.view.zLayerHeights = defaultHeights;
    battlemapStore.view.baseZLayerHeights = defaultHeights.map((layer: { z: number; verticalOffset: number; name: string; color: number }) => ({ ...layer }));
    console.log('[battlemapStore] Z-layer heights reset to defaults (updated both current and base values)');
    forceRerender();
  },
};