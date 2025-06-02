// /types/battlemap/store.ts
import { TileSummary, WallSummary } from '../battlemap_types';
import { TileType } from '../../hooks/battlemap';
import { IsometricEditorState } from './editor';

// Layer visibility modes
export enum LayerVisibilityMode {
  SHADOW = 'shadow',     // All tiles visible, inactive layers dimmed/tinted
  INVISIBLE = 'invisible', // Only active layer tiles visible
  NORMAL = 'normal'      // All tiles visible with full opacity
}

// Vertical bias computation modes
export enum VerticalBiasComputationMode {
  ROUND_DOWN = 'round_down',    // Math.floor (original)
  ROUND_UP = 'round_up',        // Math.ceil  
  SNAP_TO_NEAREST = 'snap_to_nearest' // Compute then snap to nearest value between 36-196
}

// Z-layer configuration - NOW MUTABLE for user control
export const Z_LAYER_CONFIG = {
  maxLayers: 3
} as const;

// Default Z-layer settings (moved to store for user control)
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
  // Ratio lock for keeping grid and sprite scale in sync
  isRatioLocked: boolean; // When true, changing grid or sprite scale maintains their ratio
  // Base values for ratio lock scaling
  baseGridDiamondWidth: number; // Original grid width for ratio calculations
  baseSpriteScale: number; // Original sprite scale for ratio calculations
  baseZLayerHeights: Array<{ z: number; verticalOffset: number; name: string; color: number }>; // Original Z-layer heights for ratio calculations
  // 4-directional invisible margins (default reference values)
  invisibleMarginUp: number;    // Top margin for sprite positioning
  invisibleMarginDown: number;  // Bottom margin for sprite positioning  
  invisibleMarginLeft: number;  // Left margin for sprite positioning
  invisibleMarginRight: number; // Right margin for sprite positioning
  // Z-layer system
  activeZLayer: number; // Currently active Z layer for editing (0, 1, 2)
  // Layer visual effects
  layerVisibilityMode: LayerVisibilityMode; // How layers are displayed
  // Independent grid layer visibility flags
  gridLayerVisibility: { [zLayer: number]: boolean }; // Individual visibility for each grid layer
  // User-configurable Z-layer heights
  zLayerHeights: Array<{ z: number; verticalOffset: number; name: string; color: number }>;
  // Vertical bias computation method
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