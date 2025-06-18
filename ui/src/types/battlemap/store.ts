// /types/battlemap/store.ts
// CLEANED UP: All legacy positioning types removed

import { TileSummary } from '../battlemap_types';
import { TileType } from '../../hooks/battlemap';

// Layer visibility modes
export enum LayerVisibilityMode {
  SHADOW = 'shadow',     // All tiles visible, inactive layers dimmed/tinted
  INVISIBLE = 'invisible', // Only active layer tiles visible
  NORMAL = 'normal'      // All tiles visible with full opacity
}

// Z-layer configuration
export const Z_LAYER_CONFIG = {
  maxLayers: 3
} as const;

// Default Z-layer settings
export const DEFAULT_Z_LAYER_SETTINGS = [
  { z: 0, verticalOffset: 0, name: 'Ground', color: 0x444444 },
  { z: 1, verticalOffset: 36, name: 'Level 1', color: 0x666666 },
  { z: 2, verticalOffset: 196, name: 'Level 2', color: 0x888888 },
];

// Types for the local-only store
export interface GridState {
  width: number;
  height: number;
  tiles: Record<string, TileSummary>;
  maxZLevel: number;
}

export interface ViewState {
  offset: { x: number; y: number };
  hoveredCell: { x: number; y: number };
  wasd_moving: boolean;
  showZLevel: number; // Which Z level to display (-1 for all)
  zoomLevel: number;
  gridDiamondWidth: number; // Width of the diamond grid in pixels
  isRatioLocked: boolean;
  baseGridDiamondWidth: number; // Original grid width for ratio calculations
  baseZLayerHeights: Array<{ z: number; verticalOffset: number; name: string; color: number }>;
  activeZLayer: number; // Currently active Z layer for editing (0, 1, 2)
  layerVisibilityMode: LayerVisibilityMode;
  gridLayerVisibility: { [zLayer: number]: boolean };
  zLayerHeights: Array<{ z: number; verticalOffset: number; name: string; color: number }>;
}

export interface ControlState {
  isLocked: boolean;
  isGridVisible: boolean;
  isTilesVisible: boolean;
  isIsometric: boolean;
  isEditing: boolean;
  isEditorVisible: boolean;
  selectedTileType: TileType;
}

export interface BattlemapStoreState {
  grid: GridState;
  view: ViewState;
  controls: ControlState;
  loading: boolean;
  error: string | null;
}