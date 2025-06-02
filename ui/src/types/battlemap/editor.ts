// /types/battlemap/editor.ts
import { IsometricDirection, SpriteCategory } from '../../game/managers/IsometricSpriteManager';

// Enhanced types for isometric editing
export interface IsometricEditorState {
  selectedSpriteName: string | null;
  selectedSpriteDirection: IsometricDirection;
  selectedZLevel: number;
  selectedSpriteCategory: SpriteCategory;
  brushSize: number; // For painting multiple tiles at once
  isDirectionalMode: boolean; // Whether to auto-select direction based on neighbors
  // Per-sprite-type positioning settings
  spriteTypeSettings: Record<string, SpriteTypeSettings>;
  // Wall-specific settings
  wallMode: boolean; // Toggle between block and wall editing modes
  selectedWallType: 'brick' | 'stone' | 'wood' | 'custom';
  wallPlacementDirection: IsometricDirection; // Which edge to place wall on
  wallSpriteDirection: IsometricDirection; // Which direction the wall sprite faces
  // Remember last selected sprites for each mode
  lastSelectedBlockSprite: string | null; // Last selected sprite in block mode
  lastSelectedWallSprite: string | null; // Last selected sprite in wall mode
  // Wall positioning settings
  wallPositioningSettings: Record<string, WallPositioningSettings>;
}

export interface DirectionalSettings {
  invisibleMarginUp: number;
  invisibleMarginDown: number;
  invisibleMarginLeft: number;
  invisibleMarginRight: number;
  autoComputedVerticalBias: number;
  useAutoComputed: boolean;
  manualVerticalBias: number;
  // Wall-specific fields (optional)
  manualHorizontalOffset?: number;
  manualDiagonalNorthEastOffset?: number;
  manualDiagonalNorthWestOffset?: number;
  relativeAlongEdgeOffset?: number;
  relativeTowardCenterOffset?: number;
  relativeDiagonalAOffset?: number;
  relativeDiagonalBOffset?: number;
  useADivisionForNorthEast?: boolean;
  useSpriteTrimmingForWalls?: boolean;
  spriteBoundingBox?: SpriteBoundingBox;
}

export interface SpriteBoundingBox {
  originalWidth: number;
  originalHeight: number; 
  boundingX: number;
  boundingY: number;
  boundingWidth: number;
  boundingHeight: number;
  anchorOffsetX: number;
  anchorOffsetY: number;
}

export interface SpriteTypeSettings extends DirectionalSettings {
  // Per-direction configuration support
  useSharedSettings?: boolean; // Whether to use shared settings for all directions
  directionalSettings?: {
    [IsometricDirection.NORTH]?: DirectionalSettings;
    [IsometricDirection.EAST]?: DirectionalSettings;
    [IsometricDirection.SOUTH]?: DirectionalSettings;
    [IsometricDirection.WEST]?: DirectionalSettings;
  };
}

export interface WallPositioningSettings extends DirectionalSettings {
  // Wall-specific fields (always present for walls)
  manualHorizontalOffset: number;
  manualDiagonalNorthEastOffset: number;
  manualDiagonalNorthWestOffset: number;
  relativeAlongEdgeOffset: number;
  relativeTowardCenterOffset: number;
  relativeDiagonalAOffset: number;
  relativeDiagonalBOffset: number;
  useADivisionForNorthEast: boolean;
  useSpriteTrimmingForWalls: boolean;
  // Per-direction configuration support
  useSharedSettings?: boolean; // Whether to use shared settings for all directions
  directionalSettings?: {
    [IsometricDirection.NORTH]?: DirectionalSettings;
    [IsometricDirection.EAST]?: DirectionalSettings;
    [IsometricDirection.SOUTH]?: DirectionalSettings;
    [IsometricDirection.WEST]?: DirectionalSettings;
  };
  // Stored bounding box relationship (computed once, reused always)
  spriteBoundingBox?: SpriteBoundingBox;
}