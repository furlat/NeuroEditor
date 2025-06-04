/**
 * Processed Assets System Types
 * 
 * This system extends the existing sophisticated positioning system to include
 * procedural asset generation and composition capabilities. Every asset that gets
 * rendered goes through this processing system instead of using raw sprites directly.
 */

import { IsometricDirection } from '../game/managers/IsometricSpriteManager';
import { Position } from './common';

// ============================================================================
// CORE ASSET IDENTITY AND CATEGORIZATION
// ============================================================================

/**
 * Unique identifier for each processed asset
 */
export type ProcessedAssetId = string;

/**
 * High-level categorization for processed assets
 */
export enum AssetCategory {
  TILE = 'tile',           // Floor tiles, ground surfaces
  WALL = 'wall',           // Walls, barriers, fences  
  STAIR = 'stair',         // Stairs, ramps, elevations
  DECORATION = 'decoration', // Decorative objects
  FURNITURE = 'furniture',   // Interactive furniture
  VEGETATION = 'vegetation', // Plants, trees, natural elements
  EFFECT = 'effect',         // Visual effects, particles
  UTILITY = 'utility',       // Utility objects, tools
}

/**
 * Subcategory provides more specific classification within each category
 */
export type AssetSubcategory = string; // e.g. "stone", "wood", "metal", "grass"

/**
 * Asset type determines rendering behavior and positioning logic
 */
export enum ProcessedAssetType {
  TILE = 'tile',     // Center-anchored grid assets (floors, blocks)
  WALL = 'wall',     // Edge-anchored grid assets (walls, fences)
  STAIR = 'stair',   // Multi-level connectors
}

// ============================================================================
// SOURCE PROCESSING SYSTEM
// ============================================================================

/**
 * Individual processing operation that can be applied to source images
 */
export interface ProcessingOperation {
  readonly id: string;                    // Unique operation identifier  
  readonly type: ProcessingOperationType; // Type of operation
  readonly enabled: boolean;              // Whether this operation is active
  readonly parameters: ProcessingParameters; // Operation-specific parameters
  readonly order: number;                 // Execution order (lower = earlier)
}

/**
 * Mutable version for Valtio store
 */
export interface MutableProcessingOperation {
  id: string;
  type: ProcessingOperationType;
  enabled: boolean;
  parameters: ProcessingParameters;
  order: number;
}

/**
 * Types of processing operations available
 */
export enum ProcessingOperationType {
  RESIZE = 'resize',
  CROP = 'crop',
  ROTATE = 'rotate',
  FLIP = 'flip',
  COLOR_ADJUST = 'color_adjust',
  FILTER = 'filter',
  OVERLAY = 'overlay',
  MASK = 'mask',
  COMPOSITE = 'composite',
}

/**
 * Parameters for processing operations (union type for all operation types)
 */
export type ProcessingParameters = 
  | ResizeParameters
  | CropParameters  
  | RotateParameters
  | FlipParameters
  | ColorAdjustParameters
  | FilterParameters
  | OverlayParameters
  | MaskParameters
  | CompositeParameters;

// Specific parameter types for each operation
export interface ResizeParameters {
  readonly width: number;
  readonly height: number;
  readonly maintainAspectRatio: boolean;
  readonly resizeMode: 'stretch' | 'crop' | 'pad';
}

export interface CropParameters {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface RotateParameters {
  readonly degrees: number;
  readonly maintainSize: boolean;
}

export interface FlipParameters {
  readonly horizontal: boolean;
  readonly vertical: boolean;
}

export interface ColorAdjustParameters {
  readonly brightness: number;    // -100 to 100
  readonly contrast: number;      // -100 to 100  
  readonly saturation: number;    // -100 to 100
  readonly hue: number;          // -180 to 180
}

export interface FilterParameters {
  readonly filterType: 'blur' | 'sharpen' | 'edge_detect' | 'emboss';
  readonly intensity: number;     // 0 to 100
}

export interface OverlayParameters {
  readonly overlayImagePath: string;
  readonly blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft_light';
  readonly opacity: number;       // 0 to 100
}

export interface MaskParameters {
  readonly maskImagePath: string;
  readonly maskMode: 'alpha' | 'luminance';
  readonly invert: boolean;
}

export interface CompositeParameters {
  readonly compositeImagePath: string;
  readonly compositeMode: 'behind' | 'over' | 'replace';
  readonly offsetX: number;
  readonly offsetY: number;
}

/**
 * Source processing configuration for an asset
 */
export interface SourceProcessingConfiguration {
  readonly sourceImagePath: string;                      // Path to original source image
  readonly processingOperations: ProcessingOperation[];  // Ordered list of operations
}

/**
 * Mutable version for Valtio store
 */
export interface MutableSourceProcessingConfiguration {
  sourceImagePath: string;
  processingOperations: MutableProcessingOperation[];
}

// ============================================================================
// DIRECTIONAL POSITIONING SYSTEM (EXTENDS EXISTING SYSTEM)
// ============================================================================

/**
 * Positioning settings for a specific direction (extends existing DirectionalSpriteSettings)
 */
export interface DirectionalPositioningSettings {
  // Core positioning (same as existing system)
  readonly invisibleMarginUp: number;
  readonly invisibleMarginDown: number;
  readonly invisibleMarginLeft: number;
  readonly invisibleMarginRight: number;
  readonly autoComputedVerticalBias: number;
  readonly useAutoComputed: boolean;
  readonly manualVerticalBias: number;
  
  // Enhanced positioning for processed assets
  readonly horizontalOffset: number;                     // Fine-tune X positioning
  readonly verticalOffset: number;                       // Additional Y positioning  
  readonly scaleX: number;                              // Horizontal scale multiplier
  readonly scaleY: number;                              // Vertical scale multiplier
  readonly rotation: number;                            // Rotation in degrees
  readonly alpha: number;                               // Transparency (0-1)
  readonly tint: number;                                // Color tint (hex color)
  
  // Advanced positioning
  readonly anchorX: number;                             // Custom anchor point X (0-1)
  readonly anchorY: number;                             // Custom anchor point Y (0-1)
  readonly useCustomAnchor: boolean;                    // Whether to use custom anchor
  readonly zIndex: number;                              // Additional Z-ordering within layer
  
  // Wall-specific positioning (from old system)
  readonly manualHorizontalOffset?: number;
  readonly manualDiagonalNorthEastOffset?: number;
  readonly manualDiagonalNorthWestOffset?: number;
  readonly relativeAlongEdgeOffset?: number;
  readonly relativeTowardCenterOffset?: number;
  readonly relativeDiagonalAOffset?: number;
  readonly relativeDiagonalBOffset?: number;
  readonly useADivisionForNorthEast?: boolean;
  readonly useSpriteTrimmingForWalls?: boolean;
  
  // Sprite bounding box data (for trimming)
  readonly spriteBoundingBox?: {
    readonly originalWidth: number;
    readonly originalHeight: number;
    readonly boundingX: number;
    readonly boundingY: number;
    readonly boundingWidth: number;
    readonly boundingHeight: number;
    readonly anchorOffsetX: number;
    readonly anchorOffsetY: number;
  };
}

/**
 * Mutable version for Valtio store
 */
export interface MutableDirectionalPositioningSettings {
  invisibleMarginUp: number;
  invisibleMarginDown: number;
  invisibleMarginLeft: number;
  invisibleMarginRight: number;
  autoComputedVerticalBias: number;
  useAutoComputed: boolean;
  manualVerticalBias: number;
  horizontalOffset: number;
  verticalOffset: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  alpha: number;
  tint: number;
  anchorX: number;
  anchorY: number;
  useCustomAnchor: boolean;
  zIndex: number;
  manualHorizontalOffset?: number;
  manualDiagonalNorthEastOffset?: number;
  manualDiagonalNorthWestOffset?: number;
  relativeAlongEdgeOffset?: number;
  relativeTowardCenterOffset?: number;
  relativeDiagonalAOffset?: number;
  relativeDiagonalBOffset?: number;
  useADivisionForNorthEast?: boolean;
  useSpriteTrimmingForWalls?: boolean;
  spriteBoundingBox?: {
    originalWidth: number;
    originalHeight: number;
    boundingX: number;
    boundingY: number;
    boundingWidth: number;
    boundingHeight: number;
    anchorOffsetX: number;
    anchorOffsetY: number;
  };
}

/**
 * Directional behavior configuration for assets
 */
export interface DirectionalBehaviorConfiguration {
  readonly useSharedSettings: boolean;                   // Use same settings for all directions
  readonly sharedSettings: DirectionalPositioningSettings; // Settings used when shared
  readonly directionalSettings: {                        // Direction-specific settings
    readonly [IsometricDirection.NORTH]: DirectionalPositioningSettings;
    readonly [IsometricDirection.EAST]: DirectionalPositioningSettings;
    readonly [IsometricDirection.SOUTH]: DirectionalPositioningSettings;
    readonly [IsometricDirection.WEST]: DirectionalPositioningSettings;
  };
}

/**
 * Mutable version for Valtio store
 */
export interface MutableDirectionalBehaviorConfiguration {
  useSharedSettings: boolean;
  sharedSettings: MutableDirectionalPositioningSettings;
  directionalSettings: {
    [IsometricDirection.NORTH]: MutableDirectionalPositioningSettings;
    [IsometricDirection.EAST]: MutableDirectionalPositioningSettings;
    [IsometricDirection.SOUTH]: MutableDirectionalPositioningSettings;
    [IsometricDirection.WEST]: MutableDirectionalPositioningSettings;
  };
}

// ============================================================================
// GAMEPLAY PROPERTIES SYSTEM
// ============================================================================

/**
 * Gameplay properties that can vary by direction
 */
export interface GameplayProperties {
  readonly walkable: boolean;                           // Can entities walk through this
  readonly blocksSight: boolean;                        // Blocks line of sight
  readonly blocksProjectiles: boolean;                  // Blocks projectiles/spells
  readonly interactable: boolean;                       // Can be interacted with
  readonly destructible: boolean;                       // Can be destroyed
  readonly climbable: boolean;                          // Can be climbed over
  readonly providesCovers: boolean;                     // Provides defensive cover
  readonly lightLevel: number;                          // Light emission (0-100)
  readonly soundOcclusion: number;                      // Sound blocking (0-100)
  readonly movementCost: number;                        // Movement cost multiplier
  readonly interactionRange: number;                    // Range for interaction
  readonly tags: readonly string[];                     // Gameplay tags for scripting
}

/**
 * Mutable version for Valtio store
 */
export interface MutableGameplayProperties {
  walkable: boolean;
  blocksSight: boolean;
  blocksProjectiles: boolean;
  interactable: boolean;
  destructible: boolean;
  climbable: boolean;
  providesCovers: boolean;
  lightLevel: number;
  soundOcclusion: number;
  movementCost: number;
  interactionRange: number;
  tags: string[];
}

/**
 * Directional gameplay properties configuration
 */
export interface DirectionalGameplayConfiguration {
  readonly useSharedProperties: boolean;                // Use same properties for all directions
  readonly sharedProperties: GameplayProperties;       // Properties used when shared
  readonly directionalProperties: {                     // Direction-specific properties
    readonly [IsometricDirection.NORTH]: GameplayProperties;
    readonly [IsometricDirection.EAST]: GameplayProperties;
    readonly [IsometricDirection.SOUTH]: GameplayProperties;
    readonly [IsometricDirection.WEST]: GameplayProperties;
  };
}

/**
 * Mutable version for Valtio store
 */
export interface MutableDirectionalGameplayConfiguration {
  useSharedProperties: boolean;
  sharedProperties: MutableGameplayProperties;
  directionalProperties: {
    [IsometricDirection.NORTH]: MutableGameplayProperties;
    [IsometricDirection.EAST]: MutableGameplayProperties;
    [IsometricDirection.SOUTH]: MutableGameplayProperties;
    [IsometricDirection.WEST]: MutableGameplayProperties;
  };
}

// ============================================================================
// Z-LAYER CONTRIBUTION SYSTEM
// ============================================================================

/**
 * How this asset contributes to Z-layer calculations
 */
export interface ZLayerContribution {
  readonly snapPosition: 'above' | 'below';            // Base snap position
  readonly zOffset: number;                            // Additional Z offset
  readonly affectsOcclusionCalculation: boolean;       // Whether this affects occlusion
  readonly occlusionPriority: number;                  // Priority for occlusion (higher = more important)
}

/**
 * Mutable version for Valtio store
 */
export interface MutableZLayerContribution {
  snapPosition: 'above' | 'below';
  zOffset: number;
  affectsOcclusionCalculation: boolean;
  occlusionPriority: number;
}

// ============================================================================
// WALL-SPECIFIC CONFIGURATION
// ============================================================================

/**
 * Wall-specific configuration
 */
export interface WallConfiguration {
  readonly wallDirection: IsometricDirection;  // Which edge (N/E/S/W)
  readonly wallType: string;                    // Material type
  readonly blocksMovement: boolean;             // Gameplay property
}

// ============================================================================
// COMPLETE PROCESSED ASSET DEFINITION
// ============================================================================

/**
 * Complete definition of a processed asset (read-only version)
 */
export interface ProcessedAssetDefinition {
  // Core identity
  readonly id: ProcessedAssetId;                        // Unique identifier
  readonly displayName: string;                         // Human-readable name
  readonly category: AssetCategory;                     // High-level category
  readonly subcategory: AssetSubcategory;              // Specific subcategory
  readonly assetType: ProcessedAssetType;              // NEW: Determines rendering behavior
  readonly version: number;                            // Version number for updates
  readonly createdAt: string;                          // ISO timestamp
  readonly lastModified: string;                       // ISO timestamp
  
  // Source and processing
  readonly sourceProcessing: SourceProcessingConfiguration; // How to process source image
  
  // Directional behavior
  readonly directionalBehavior: DirectionalBehaviorConfiguration; // Positioning by direction
  
  // Gameplay properties
  readonly gameplayProperties: DirectionalGameplayConfiguration; // Gameplay behavior by direction
  
  // Z-layer integration
  readonly zPropertyContribution: ZLayerContribution;  // How this affects Z-layers
  
  // Wall-specific configuration (only for wall assets)
  readonly wallConfiguration?: WallConfiguration;
  
  // Metadata and organization
  readonly tags: readonly string[];                    // Search and organization tags
  readonly isValid: boolean;                           // Whether asset is ready for use
  readonly validationErrors: readonly string[];        // Any validation issues
}

/**
 * Mutable version for Valtio store
 */
export interface MutableProcessedAssetDefinition {
  id: ProcessedAssetId;
  displayName: string;
  category: AssetCategory;
  subcategory: AssetSubcategory;
  assetType: ProcessedAssetType;
  version: number;
  createdAt: string;
  lastModified: string;
  sourceProcessing: MutableSourceProcessingConfiguration;
  directionalBehavior: MutableDirectionalBehaviorConfiguration;
  gameplayProperties: MutableDirectionalGameplayConfiguration;
  zPropertyContribution: MutableZLayerContribution;
  wallConfiguration?: WallConfiguration;
  tags: string[];
  isValid: boolean;
  validationErrors: string[];
}

// ============================================================================
// TEMPORARY ASSET STATE (FOR CREATION/EDITING)
// ============================================================================

/**
 * Extended asset definition for creation/editing workflows
 */
export interface TemporaryAssetState extends MutableProcessedAssetDefinition {
  readonly isTemporary: true;                          // Flag to indicate temporary state
  readonly basedOnAssetId?: ProcessedAssetId;          // If editing existing asset
  hasUnsavedChanges: boolean;                          // Whether there are unsaved changes
}

// ============================================================================
// ASSET PREVIEW SYSTEM
// ============================================================================

/**
 * Configuration for asset preview rendering
 */
export interface AssetPreviewConfiguration {
  readonly gridSize: { width: number; height: number }; // Preview grid dimensions
  readonly centerCellPosition: readonly [number, number]; // Which cell to center on
  readonly cameraOffset: { x: number; y: number };     // Camera offset for preview
  readonly zoomLevel: number;                          // Zoom level for preview
  readonly showGridAnchors: boolean;                   // Show grid anchor points
  readonly showSpriteAnchors: boolean;                 // Show sprite anchor points
  readonly showBoundingBoxAnchors: boolean;            // Show bounding box anchors
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Generate a unique processed asset ID
 */
export function generateProcessedAssetId(): ProcessedAssetId {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 8);
  return `asset_${timestamp}_${random}`;
}

/**
 * Create default directional positioning settings
 */
export function createDefaultDirectionalSettings(): MutableDirectionalPositioningSettings {
  return {
    // Core positioning (compatible with existing system)
    invisibleMarginUp: 8,
    invisibleMarginDown: 8,
    invisibleMarginLeft: 8,
    invisibleMarginRight: 8,
    autoComputedVerticalBias: 36,
    useAutoComputed: true,
    manualVerticalBias: 36,
    
    // Enhanced positioning for processed assets
    horizontalOffset: 0,
    verticalOffset: 0,
    scaleX: 1.0,
    scaleY: 1.0,
    rotation: 0,
    alpha: 1.0,
    tint: 0xFFFFFF,
    
    // Advanced positioning
    anchorX: 0.5,
    anchorY: 1.0,
    useCustomAnchor: false,
    zIndex: 0,
  };
}

/**
 * Create default gameplay properties
 */
export function createDefaultGameplayProperties(): MutableGameplayProperties {
  return {
    walkable: true,
    blocksSight: false,
    blocksProjectiles: false,
    interactable: false,
    destructible: false,
    climbable: false,
    providesCovers: false,
    lightLevel: 0,
    soundOcclusion: 0,
    movementCost: 1.0,
    interactionRange: 1.0,
    tags: [],
  };
}

/**
 * Create default Z-layer contribution
 */
export function createDefaultZLayerContribution(): MutableZLayerContribution {
  return {
    snapPosition: 'above',
    zOffset: 0,
    affectsOcclusionCalculation: false,
    occlusionPriority: 0,
  };
}

/**
 * Create a complete default processed asset definition
 */
export function createDefaultProcessedAsset(
  category: AssetCategory = AssetCategory.TILE,
  subcategory: AssetSubcategory = 'floor'
): MutableProcessedAssetDefinition {
  const id = generateProcessedAssetId();
  const now = new Date().toISOString();
  
  return {
    // Core identity
    id,
    displayName: 'New Asset',
    category,
    subcategory,
    assetType: category === AssetCategory.WALL ? ProcessedAssetType.WALL : ProcessedAssetType.TILE,
    version: 1,
    createdAt: now,
    lastModified: now,
    
    // Source and processing
    sourceProcessing: {
      sourceImagePath: '',
      processingOperations: [],
    },
    
    // Directional behavior
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
    
    // Gameplay properties
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
    
    // Z-layer integration
    zPropertyContribution: createDefaultZLayerContribution(),
    
    // Wall-specific configuration (only for wall assets)
    wallConfiguration: category === AssetCategory.WALL ? {
      wallDirection: IsometricDirection.NORTH,
      wallType: 'default',
      blocksMovement: true,
    } : undefined,
    
    // Metadata and organization
    tags: [],
    isValid: false,
    validationErrors: ['Source image not selected'],
  };
}

/**
 * Validate a processed asset definition
 */
export function validateProcessedAsset(asset: MutableProcessedAssetDefinition): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Basic validation
  if (!asset.displayName.trim()) {
    errors.push('Display name is required');
  }
  
  if (!asset.sourceProcessing.sourceImagePath) {
    errors.push('Source image is required');
  }
  
  if (!asset.category) {
    errors.push('Category is required');
  }
  
  if (!asset.subcategory.trim()) {
    errors.push('Subcategory is required');
  }
  
  // Advanced validation could be added here
  // - Check if source image exists
  // - Validate processing operation parameters
  // - Check for circular dependencies in composite operations
  // - Validate gameplay property combinations
  
  return {
    isValid: errors.length === 0,
    errors,
  };
} 