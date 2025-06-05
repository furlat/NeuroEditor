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
 * Grid attachment points for different asset types
 */
export enum GridAnchorPoint {
  CENTER = 'center',           // Center of diamond (default for tiles)
  NORTH_EDGE = 'north_edge',   // North edge of diamond  
  EAST_EDGE = 'east_edge',     // East edge of diamond
  SOUTH_EDGE = 'south_edge',   // South edge of diamond
  WEST_EDGE = 'west_edge',     // West edge of diamond
  NORTH_CORNER = 'north_corner', // North corner of diamond
  EAST_CORNER = 'east_corner',   // East corner of diamond  
  SOUTH_CORNER = 'south_corner', // South corner of diamond
  WEST_CORNER = 'west_corner',   // West corner of diamond
  CUSTOM = 'custom'            // Custom position using gridAnchorX/Y
}

/**
 * Sprite anchor configuration
 */
export interface SpriteAnchorConfig {
  readonly spriteAnchorX: number;          // Where on sprite to anchor (0-1, X axis)
  readonly spriteAnchorY: number;          // Where on sprite to anchor (0-1, Y axis)
  readonly useDefaultSpriteAnchor: boolean; // Whether to use asset-type defaults
  readonly useBoundingBoxAnchor: boolean;   // Whether to apply anchor to bounding box instead of full sprite
}

/**
 * Mutable sprite anchor configuration
 */
export interface MutableSpriteAnchorConfig {
  spriteAnchorX: number;
  spriteAnchorY: number;
  useDefaultSpriteAnchor: boolean;
  useBoundingBoxAnchor: boolean;
}

/**
 * Grid anchor configuration  
 */
export interface GridAnchorConfig {
  readonly gridAnchorPoint: GridAnchorPoint; // Predefined grid attachment point
  readonly gridAnchorX: number;              // Custom grid X position (0-1, only used with CUSTOM)
  readonly gridAnchorY: number;              // Custom grid Y position (0-1, only used with CUSTOM)  
  readonly useDefaultGridAnchor: boolean;    // Whether to use asset-type defaults
}

/**
 * Mutable grid anchor configuration
 */
export interface MutableGridAnchorConfig {
  gridAnchorPoint: GridAnchorPoint;
  gridAnchorX: number;
  gridAnchorY: number;
  useDefaultGridAnchor: boolean;
}

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
  
  // FIXED: Separate anchor systems
  readonly gridAnchor: GridAnchorConfig;     // Where to attach to the grid
  readonly spriteAnchor: SpriteAnchorConfig; // Where to anchor on the sprite
  
  // Enhanced positioning for processed assets
  readonly horizontalOffset: number;                     // Fine-tune X positioning
  readonly verticalOffset: number;                       // Additional Y positioning  
  readonly scaleX: number;                              // Horizontal scale multiplier
  readonly scaleY: number;                              // Vertical scale multiplier
  readonly keepProportions: boolean;                    // Whether to keep scaleX = scaleY
  readonly rotation: number;                            // Rotation in degrees
  readonly alpha: number;                               // Transparency (0-1)
  readonly tint: number;                                // Color tint (hex color)
  
  // DEPRECATED: Remove these in favor of gridAnchor/spriteAnchor
  readonly anchorX: number;                             // DEPRECATED: Use spriteAnchor.spriteAnchorX
  readonly anchorY: number;                             // DEPRECATED: Use spriteAnchor.spriteAnchorY
  readonly useCustomAnchor: boolean;                    // DEPRECATED: Use spriteAnchor.useDefaultSpriteAnchor
  readonly zIndex: number;                              // Additional Z-ordering within layer
  
  // Wall-specific positioning (from old system)
  readonly manualHorizontalOffset: number;
  readonly manualDiagonalNorthEastOffset: number;
  readonly manualDiagonalNorthWestOffset: number;
  readonly relativeAlongEdgeOffset: number;
  readonly relativeTowardCenterOffset: number;
  readonly relativeDiagonalAOffset: number;
  readonly relativeDiagonalBOffset: number;
  readonly useADivisionForNorthEast: boolean;
  readonly useSpriteTrimmingForWalls: boolean;
  
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
  
  // FIXED: Separate anchor systems
  gridAnchor: MutableGridAnchorConfig;     // Where to attach to the grid
  spriteAnchor: MutableSpriteAnchorConfig; // Where to anchor on the sprite
  
  horizontalOffset: number;
  verticalOffset: number;
  scaleX: number;
  scaleY: number;
  keepProportions: boolean;
  rotation: number;
  alpha: number;
  tint: number;
  
  // DEPRECATED: Remove these in favor of gridAnchor/spriteAnchor
  anchorX: number;                             // DEPRECATED: Use spriteAnchor.spriteAnchorX
  anchorY: number;                             // DEPRECATED: Use spriteAnchor.spriteAnchorY  
  useCustomAnchor: boolean;                    // DEPRECATED: Use spriteAnchor.useDefaultSpriteAnchor
  zIndex: number;
  
  // Wall positioning - NO LONGER OPTIONAL
  manualHorizontalOffset: number;
  manualDiagonalNorthEastOffset: number;
  manualDiagonalNorthWestOffset: number;
  relativeAlongEdgeOffset: number;
  relativeTowardCenterOffset: number;
  relativeDiagonalAOffset: number;
  relativeDiagonalBOffset: number;
  useADivisionForNorthEast: boolean;
  useSpriteTrimmingForWalls: boolean;
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
 * Calculate auto-computed positioning based on sprite dimensions (same formula as IsometricEditor)
 * This should ONLY be used for setting defaults - the actual auto-computation should happen in the UI when needed
 */
export function calculateAutoComputedPositioning(
  spriteWidth: number = 100, 
  spriteHeight: number = 100,
  useBoundingBoxAnchor: boolean = true,  // NEW: Default to cropped sprite anchoring
  spriteName?: string,                   // NEW: Optional sprite name for custom rules
  assetType?: ProcessedAssetType         // NEW: Optional asset type for custom rules
): {
  autoComputedVerticalBias: number;
  verticalOffset: number;
  horizontalOffset: number;
} {
  let normalizedWidth: number;
  let normalizedHeight: number;
  
  // FIXED: Since margins are no longer used for drawing, we don't use them in calculations anymore
  // Use dimensions directly (no margins in the new system)
  normalizedWidth = spriteWidth;
  normalizedHeight = spriteHeight;
  
  console.log(`[calculateAutoComputedPositioning] No margins mode: ${spriteWidth}x${spriteHeight} → normalized ${normalizedWidth}x${normalizedHeight}`);
  
  // USER'S EXACT FORMULA: normalized height - (normalized width / 2)
  let autoComputedVerticalBias = normalizedHeight - (normalizedWidth / 2);
  
  // NEW: For ALL TILES, snap to either 44 or 204
  if (assetType === ProcessedAssetType.TILE) {
    const originalValue = autoComputedVerticalBias;
    const distanceTo44 = Math.abs(autoComputedVerticalBias - 44);
    const distanceTo204 = Math.abs(autoComputedVerticalBias - 204);
    
    if (distanceTo44 <= distanceTo204) {
      autoComputedVerticalBias = 44;
    } else {
      autoComputedVerticalBias = 204;
    }
    
    console.log(`[calculateAutoComputedPositioning] 🎯 Tile snapping rule: ${originalValue} → snapped to ${autoComputedVerticalBias}`);
  }
  
  // For now, use ROUND_DOWN as default (most common)
  const roundedBias = Math.floor(autoComputedVerticalBias);
  
  console.log(`[calculateAutoComputedPositioning] Formula result: ${autoComputedVerticalBias} → rounded: ${roundedBias}`);
  
  // NEW: Default horizontalOffset = 1 for tiles, 0 for others
  const defaultHorizontalOffset = assetType === ProcessedAssetType.TILE ? 1 : 0;
  
  return {
    autoComputedVerticalBias: roundedBias,
    verticalOffset: roundedBias,  // FIXED: Put calculated value into verticalOffset  
    horizontalOffset: defaultHorizontalOffset,  // NEW: offsetX = 1 for tiles, 0 for walls
  };
}

/**
 * Create default directional positioning settings
 */
export function createDefaultDirectionalSettings(
  assetType: ProcessedAssetType = ProcessedAssetType.TILE,
  wallDirection?: IsometricDirection
): MutableDirectionalPositioningSettings {
  // FIXED: Don't calculate auto-computed during initialization - use placeholder
  // Real calculation happens later when we have actual sprite dimensions
  const positioning = calculateAutoComputedPositioning(100, 100, true, undefined, assetType);
  
  const settings: MutableDirectionalPositioningSettings = {
    // Core positioning
    invisibleMarginUp: 0,        // FIXED: Start with 0 since margins no longer used for drawing
    invisibleMarginDown: 0,      // FIXED: Start with 0 since margins no longer used for drawing  
    invisibleMarginLeft: 0,      // FIXED: Start with 0 since margins no longer used for drawing
    invisibleMarginRight: 0,     // FIXED: Start with 0 since margins no longer used for drawing
    autoComputedVerticalBias: 0, // PLACEHOLDER: Will be recalculated with actual sprite data
    useAutoComputed: assetType === ProcessedAssetType.TILE, // Only tiles use auto mode by default
    manualVerticalBias: 0,       // PLACEHOLDER: Will be set when we have real data
    
    // FIXED: Separate anchor systems
    gridAnchor: getDefaultGridAnchor(assetType, wallDirection),
    spriteAnchor: getDefaultSpriteAnchor(assetType, wallDirection),
    
    // Enhanced positioning
    horizontalOffset: positioning.horizontalOffset,  // Use default horizontalOffset = 1 for tiles
    verticalOffset: 0,           // PLACEHOLDER: Will be calculated with real data
    scaleX: 1.0,
    scaleY: 1.0,
    keepProportions: true,
    rotation: 0,
    alpha: 1.0,
    tint: 0xFFFFFF,
    
    // DEPRECATED fields (maintain for compatibility)
    anchorX: 0.5,
    anchorY: 1.0,
    useCustomAnchor: false,
    zIndex: 0,
    
    // Wall positioning
    manualHorizontalOffset: 0,
    manualDiagonalNorthEastOffset: 0,
    manualDiagonalNorthWestOffset: 0,
    relativeAlongEdgeOffset: 0,
    relativeTowardCenterOffset: 0,
    relativeDiagonalAOffset: wallDirection !== undefined ? 8 : 0,  // A=8 for walls
    relativeDiagonalBOffset: wallDirection !== undefined ? 3 : 0,  // B=3 for walls  
    useADivisionForNorthEast: true,
    useSpriteTrimmingForWalls: assetType === ProcessedAssetType.WALL,
    spriteBoundingBox: undefined // Will be computed when sprite is analyzed
  };
  
  return settings;
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
  const assetType = category === AssetCategory.WALL ? ProcessedAssetType.WALL : ProcessedAssetType.TILE;
  
  return {
    // Core identity
    id,
    displayName: 'New Asset',
    category,
    subcategory,
    assetType,
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
      useSharedSettings: true, // FIXED: Both tiles and walls start with shared settings by default
      sharedSettings: createDefaultDirectionalSettings(assetType, IsometricDirection.NORTH),
      directionalSettings: {
        [IsometricDirection.NORTH]: createDefaultDirectionalSettings(assetType, IsometricDirection.NORTH),
        [IsometricDirection.EAST]: createDefaultDirectionalSettings(assetType, IsometricDirection.EAST),
        [IsometricDirection.SOUTH]: createDefaultDirectionalSettings(assetType, IsometricDirection.SOUTH),
        [IsometricDirection.WEST]: createDefaultDirectionalSettings(assetType, IsometricDirection.WEST),
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

export function getDefaultGridAnchor(assetType: ProcessedAssetType, wallDirection?: IsometricDirection): MutableGridAnchorConfig {
  switch (assetType) {
    case ProcessedAssetType.TILE:
      return {
        gridAnchorPoint: GridAnchorPoint.CENTER,
        gridAnchorX: 0.5,
        gridAnchorY: 0.5,
        useDefaultGridAnchor: true
      };
      
    case ProcessedAssetType.WALL:
      // Map wall direction to grid anchor point
      const anchorPoint = wallDirection === IsometricDirection.NORTH ? GridAnchorPoint.NORTH_EDGE :
                         wallDirection === IsometricDirection.EAST ? GridAnchorPoint.EAST_EDGE :
                         wallDirection === IsometricDirection.SOUTH ? GridAnchorPoint.SOUTH_EDGE :
                         wallDirection === IsometricDirection.WEST ? GridAnchorPoint.WEST_EDGE :
                         GridAnchorPoint.SOUTH_EDGE; // Default fallback
      
      return {
        gridAnchorPoint: anchorPoint,
        gridAnchorX: 0.5, // Center along the edge
        gridAnchorY: 0.5,
        useDefaultGridAnchor: true
      };
      
    default:
      return {
        gridAnchorPoint: GridAnchorPoint.CENTER,
        gridAnchorX: 0.5,
        gridAnchorY: 0.5,
        useDefaultGridAnchor: true
      };
  }
}

export function getDefaultSpriteAnchor(assetType: ProcessedAssetType, wallDirection?: IsometricDirection): MutableSpriteAnchorConfig {
  if (assetType === ProcessedAssetType.WALL) {
    // Walls use bottom-center anchoring by default
    return {
      spriteAnchorX: 0.5,
      spriteAnchorY: 1.0,
      useDefaultSpriteAnchor: true,
      useBoundingBoxAnchor: true  // FIXED: Default to cropped sprite anchoring
    };
  } else {
    // Tiles use bottom-center anchoring by default
    return {
      spriteAnchorX: 0.5,
      spriteAnchorY: 1.0,
      useDefaultSpriteAnchor: true,
      useBoundingBoxAnchor: true  // FIXED: Default to cropped sprite anchoring
    };
  }
}

export function populateDefaultAnchors(
  settings: MutableDirectionalPositioningSettings, 
  assetType: ProcessedAssetType, 
  wallDirection?: IsometricDirection
): void {
  settings.gridAnchor = getDefaultGridAnchor(assetType, wallDirection);
  settings.spriteAnchor = getDefaultSpriteAnchor(assetType, wallDirection);
  
  // Also update deprecated fields for backward compatibility
  settings.anchorX = settings.spriteAnchor.spriteAnchorX;
  settings.anchorY = settings.spriteAnchor.spriteAnchorY;
  settings.useCustomAnchor = !settings.spriteAnchor.useDefaultSpriteAnchor;
} 