import { Graphics, Sprite, Container, Texture } from 'pixi.js';
import { getCanvasBoundingBox } from 'pixi.js';
import { battlemapStore, battlemapActions, Z_LAYER_CONFIG, LayerVisibilityMode } from '../../store';
import { TileSummary, WallSummary } from '../../types/battlemap_types';
import { AbstractRenderer } from './BaseRenderer';
import { subscribe } from 'valtio';
import { LayerName } from '../BattlemapEngine';
import { gridToIsometric, calculateIsometricGridOffset, getWallEdgePosition, getWallSpriteAnchor } from '../../utils/isometricUtils';
import { ENTITY_PANEL_WIDTH } from '../../constants/layout';
import { isometricSpriteManager, IsometricDirection } from '../managers/IsometricSpriteManager';
import { 
  ProcessedAssetId, 
  AssetCategory,
  MutableProcessedAssetDefinition 
} from '../../types/processed_assets';

/**
 * Asset instance for rendering (combines instance data with asset definition)
 */
interface RenderableAssetInstance {
  instanceId: string;
  assetId: ProcessedAssetId;
  asset: MutableProcessedAssetDefinition;
  position: readonly [number, number];
  zLevel: number;
  direction: IsometricDirection;
  snapPosition: 'above' | 'below';
}

/**
 * ProcessedAssetsRenderer - Renders processed assets instead of raw battlemap tiles
 * This renderer only operates when in processed asset mode
 */
export class ProcessedAssetsRenderer extends AbstractRenderer {
  // Specify which layer this renderer belongs to
  get layerName(): LayerName { return 'tiles'; }
  
  // Container for asset sprites
  private assetsContainer: Container = new Container();
  
  // Fallback graphics for assets without processed textures
  private fallbackGraphics: Graphics = new Graphics();
  
  // Reference to asset instances for stable rendering during movement
  private assetInstancesRef: Record<string, any> = {};
  
  // Sprite pool for efficient rendering
  private spritePool: Sprite[] = [];
  private activeAssetSprites: Map<string, Sprite> = new Map();
  
  // Flag to track when assets need to be redrawn
  private assetsNeedUpdate: boolean = true;
  
  // Last known states for change detection
  private lastOffset = { x: 0, y: 0 };
  private lastGridDiamondWidth = 100;
  private lastSpriteScale = 1.0;
  private lastTileVisibility = true;
  private lastShowZLevel = -1;
  private lastZoomLevel = 1.0;
  private lastGridLayerVisibility: { [zLayer: number]: boolean } = { 0: true, 1: true, 2: true };
  private spritesLoaded = false;
  
  // Track asset library changes
  private lastAssetLibraryHash: string = '';
  private lastAssetInstancesHash: string = '';

  // Local cache for processed textures to prevent infinite loops
  private processedTextureCache: Map<string, any> = new Map();
  private isCurrentlyRendering: boolean = false;
  
  // Deferred store updates to prevent infinite loops
  private deferredStoreUpdates: Array<() => void> = [];

  /**
   * Initialize the renderer
   */
  initialize(engine: any): void {
    super.initialize(engine);
    
    // Set up container hierarchy - sprites first, then fallback graphics
    this.container.addChild(this.assetsContainer);
    this.container.addChild(this.fallbackGraphics);
    
    // Setup subscriptions
    this.setupSubscriptions();
    
    // Initialize sprite assets (reuse existing sprite manager)
    this.initializeSprites();
    
    // Initial asset data
    this.assetInstancesRef = {...battlemapStore.processedAssets.assetInstances};
    
    // Initialize last states
    this.updateLastKnownStates();
    
    // Force initial render
    this.assetsNeedUpdate = true;
    
    console.log('[ProcessedAssetsRenderer] Initialized for processed assets rendering');
  }

  /**
   * Initialize sprite assets (reuse existing sprite manager)
   */
  private async initializeSprites(): Promise<void> {
    try {
      console.log('[ProcessedAssetsRenderer] Loading sprite assets...');
      await isometricSpriteManager.loadAll();
      this.spritesLoaded = true;
      this.assetsNeedUpdate = true;
      console.log('[ProcessedAssetsRenderer] Sprite assets loaded successfully');
    } catch (error) {
      console.error('[ProcessedAssetsRenderer] Failed to load sprite assets:', error);
      this.spritesLoaded = false;
    }
  }

  /**
   * Update last known states
   */
  private updateLastKnownStates(): void {
    this.lastOffset = { 
      x: battlemapStore.view.offset.x, 
      y: battlemapStore.view.offset.y 
    };
    this.lastGridDiamondWidth = battlemapStore.view.gridDiamondWidth;
    this.lastSpriteScale = battlemapStore.view.spriteScale;
    this.lastTileVisibility = battlemapStore.controls.isTilesVisible;
    this.lastShowZLevel = battlemapStore.view.showZLevel;
    this.lastZoomLevel = battlemapStore.view.zoomLevel;
    this.lastGridLayerVisibility = { ...battlemapStore.view.gridLayerVisibility };
    this.lastAssetLibraryHash = JSON.stringify(battlemapStore.processedAssets.assetLibrary);
    this.lastAssetInstancesHash = JSON.stringify(battlemapStore.processedAssets.assetInstances);
  }
  
  /**
   * Set up subscriptions to the Valtio store
   */
  private setupSubscriptions(): void {
    // Subscribe to the root store for broader reactivity
    this.addSubscription(subscribe(battlemapStore, () => {
      // Only render if in processed asset mode
      if (!battlemapStore.processedAssets.isProcessedAssetMode) {
        return;
      }
      
      // Check for asset changes
      const hasAssetInstanceChanges = this.hasAssetInstancesChanged();
      const hasAssetLibraryChanges = this.hasAssetLibraryChanged();
      
      if (hasAssetInstanceChanges || hasAssetLibraryChanges) {
        this.assetInstancesRef = {...battlemapStore.processedAssets.assetInstances};
        this.assetsNeedUpdate = true;
      }
      
      this.render();
    }));
    
    // Manual render trigger for debugging
    (window as any).__forceAssetRender = () => {
      console.log('[ProcessedAssetsRenderer] Manual render trigger called');
      this.assetsNeedUpdate = true;
      this.render();
    };
  }
  
  /**
   * Check if asset instances have changed
   */
  private hasAssetInstancesChanged(): boolean {
    const currentHash = JSON.stringify(battlemapStore.processedAssets.assetInstances);
    const hasChanged = this.lastAssetInstancesHash !== currentHash;
    if (hasChanged) {
      console.log('[ProcessedAssetsRenderer] Asset instances changed');
    }
    return hasChanged;
  }
  
  /**
   * Check if asset library has changed
   */
  private hasAssetLibraryChanged(): boolean {
    const currentHash = JSON.stringify(battlemapStore.processedAssets.assetLibrary);
    const hasChanged = this.lastAssetLibraryHash !== currentHash;
    if (hasChanged) {
      console.log('[ProcessedAssetsRenderer] Asset library changed');
    }
    return hasChanged;
  }
  
  /**
   * Get a sprite from the pool or create a new one
   */
  private getPooledSprite(): Sprite {
    if (this.spritePool.length > 0) {
      return this.spritePool.pop()!;
    }
    return new Sprite();
  }
    
  /**
   * Return a sprite to the pool
   */
  private returnSpriteToPool(sprite: Sprite): void {
    sprite.visible = false;
    sprite.texture = null as any; // Clear texture reference
    sprite.removeFromParent();
    this.spritePool.push(sprite);
  }

  /**
   * Get visible asset instances with their asset definitions
   */
  private getVisibleAssetInstances(): RenderableAssetInstance[] {
    const instances = Object.values(this.assetInstancesRef);
    const assetLibrary = battlemapStore.processedAssets.assetLibrary;
    const snap = battlemapStore;
    
    // Filter and convert to renderable instances
    const renderableInstances: RenderableAssetInstance[] = [];
    
    for (const instance of instances) {
      const asset = assetLibrary[instance.assetId];
      if (!asset) {
        console.warn(`[ProcessedAssetsRenderer] Asset not found in library: ${instance.assetId}`);
        continue;
      }
      
      // Apply layer visibility filtering (same logic as original renderer)
      let shouldShow = false;
      switch (snap.view.layerVisibilityMode) {
        case LayerVisibilityMode.SHADOW:
        case LayerVisibilityMode.NORMAL:
          // Show all instances
          shouldShow = true;
          break;
        case LayerVisibilityMode.INVISIBLE:
          // Show only active layer instances
          shouldShow = instance.zLevel === snap.view.activeZLayer;
          break;
        default:
          shouldShow = true;
      }
      
      if (shouldShow) {
        renderableInstances.push({
          instanceId: instance.instanceId,
          assetId: instance.assetId,
          asset: asset,
          position: instance.position,
          zLevel: instance.zLevel,
          direction: instance.direction,
          snapPosition: instance.snapPosition,
        });
      }
    }
    
    return renderableInstances;
  }

  /**
   * Sort asset instances by depth for proper isometric rendering
   */
  private sortAssetsByDepth(assets: RenderableAssetInstance[]): RenderableAssetInstance[] {
    return assets.sort((a, b) => {
      // First sort by Z level (lower Z renders first)
      if (a.zLevel !== b.zLevel) {
        return a.zLevel - b.zLevel;
      }
      
      // Then sort by isometric depth (Y then X for proper back-to-front rendering)
      if (a.position[1] !== b.position[1]) {
        return a.position[1] - b.position[1];
      }
      
      if (a.position[0] !== b.position[0]) {
        return a.position[0] - b.position[0];
      }
      
      // For same position, walls render after tiles
      if (a.asset.category !== b.asset.category) {
        if (a.asset.category === AssetCategory.TILE) return -1;
        if (b.asset.category === AssetCategory.TILE) return 1;
      }
      
      return 0;
    });
  }
  
  /**
   * Main render method
   */
  render(): void {
    if (!this.engine || !this.engine.app) {
      return;
    }
    
    // Only render if in processed asset mode
    if (!battlemapStore.processedAssets.isProcessedAssetMode) {
      // Hide container if not in asset mode
      this.container.visible = false;
      return;
    }
    
    // Show container when in asset mode
    this.container.visible = true;
    
    // Prevent recursive rendering
    if (this.isCurrentlyRendering) {
      console.warn('[ProcessedAssetsRenderer] Skipping render - already rendering');
      return;
    }
    
    this.isCurrentlyRendering = true;
    
    try {
      console.log('[ProcessedAssetsRenderer] Starting render cycle...');
      
      // Check if tiles are visible
      const currentTileVisibility = battlemapStore.controls.isTilesVisible;
      this.assetsContainer.visible = currentTileVisibility;
      this.fallbackGraphics.visible = currentTileVisibility;
      
      if (!currentTileVisibility) {
        this.clearAllAssets();
        this.updateLastKnownStates();
        console.log('[ProcessedAssetsRenderer] Assets not visible, cleared and exiting');
        return;
      }
      
      // Check for various changes that require re-rendering
      const hasPositionChanged = 
        this.lastOffset.x !== battlemapStore.view.offset.x || 
        this.lastOffset.y !== battlemapStore.view.offset.y;
      
      const hasGridDiamondWidthChanged = this.lastGridDiamondWidth !== battlemapStore.view.gridDiamondWidth;
      const hasSpriteScaleChanged = this.lastSpriteScale !== battlemapStore.view.spriteScale;
      const hasZoomChanged = this.lastZoomLevel !== battlemapStore.view.zoomLevel;
      const hasGridLayerVisibilityChanged = 
        this.lastGridLayerVisibility[0] !== battlemapStore.view.gridLayerVisibility[0] ||
        this.lastGridLayerVisibility[1] !== battlemapStore.view.gridLayerVisibility[1] ||
        this.lastGridLayerVisibility[2] !== battlemapStore.view.gridLayerVisibility[2];
      
      const snap = battlemapStore;
      console.log(`[ProcessedAssetsRenderer] Change detection - Assets: ${this.assetsNeedUpdate}, Position: ${hasPositionChanged}, Grid: ${hasGridDiamondWidthChanged}, Scale: ${hasSpriteScaleChanged}, Zoom: ${hasZoomChanged}, GridLayers: ${hasGridLayerVisibilityChanged}, WASD: ${snap.view.wasd_moving}`);
      
      // Render assets if needed
      if (this.assetsNeedUpdate || hasPositionChanged || hasGridDiamondWidthChanged || 
          hasSpriteScaleChanged || hasZoomChanged || hasGridLayerVisibilityChanged || 
          battlemapStore.view.wasd_moving) {
        
        console.log('[ProcessedAssetsRenderer] Triggering asset re-render due to changes');
        
        if (this.spritesLoaded) {
          this.renderAssetsWithTextures();
        } else {
          this.renderFallbackAssets();
        }
        
        this.assetsNeedUpdate = false;
        this.updateLastKnownStates();
      } else {
        console.log('[ProcessedAssetsRenderer] No changes detected, skipping render');
      }
    } finally {
      this.isCurrentlyRendering = false;
      
      // Process any deferred store updates
      if (this.deferredStoreUpdates.length > 0) {
        console.log(`[ProcessedAssetsRenderer] Processing ${this.deferredStoreUpdates.length} deferred store updates`);
        setTimeout(() => {
          const updates = [...this.deferredStoreUpdates];
          this.deferredStoreUpdates = [];
          updates.forEach(update => {
            try {
              update();
            } catch (error) {
              console.error('[ProcessedAssetsRenderer] Error in deferred store update:', error);
            }
          });
        }, 0);
      }
    }
  }
  
  /**
   * Render assets using actual processed textures
   */
  private renderAssetsWithTextures(): void {
    // Clear existing sprites
    this.clearAllAssets();
    
    // Get and sort visible assets
    const visibleAssets = this.getVisibleAssetInstances();
    const sortedAssets = this.sortAssetsByDepth(visibleAssets);
    
    // Get grid offset and sizes using dynamic grid diamond width WITH ZOOM
    const snap = battlemapStore;
    const isometricOffset = calculateIsometricGridOffset(
      this.engine?.containerSize?.width || 0,
      this.engine?.containerSize?.height || 0,
      snap.grid.width,
      snap.grid.height,
      snap.view.gridDiamondWidth,
      snap.view.offset.x,
      snap.view.offset.y,
      ENTITY_PANEL_WIDTH,
      snap.view.zoomLevel
    );

    // Render each asset
    sortedAssets.forEach(assetInstance => {
      this.renderSingleAsset(assetInstance, isometricOffset);
    });

    console.log('[ProcessedAssetsRenderer] Rendered', sortedAssets.length, 'processed assets');
  }

  /**
   * Render a single processed asset
   */
  private renderSingleAsset(assetInstance: RenderableAssetInstance, isometricOffset: any): void {
    const [gridX, gridY] = assetInstance.position;
    const assetKey = `${gridX},${gridY},${assetInstance.zLevel},${assetInstance.instanceId}`;

    // For now, use the source image directly (later we'll add processing operations)
    const sourceImagePath = assetInstance.asset.sourceProcessing.sourceImagePath;
    
    // Get the sprite name from the source path (extract filename without extension)
    let spriteName = 'Floor_01'; // Default fallback
    if (sourceImagePath) {
      const pathParts = sourceImagePath.split('/');
      const filename = pathParts[pathParts.length - 1];
      spriteName = filename.replace(/\.(png|jpg|jpeg)$/i, '');
    }
    
    // Get sprite texture using existing sprite manager
    const texture = isometricSpriteManager.getSpriteTexture(spriteName, assetInstance.direction);

    if (!texture) {
      // Fallback to colored diamond if sprite not available
      this.renderFallbackAsset(assetInstance, isometricOffset);
      return;
    }

    // Get sprite from pool
    const sprite = this.getPooledSprite();
    sprite.texture = texture;

    // Convert grid position to isometric coordinates
    const { isoX, isoY } = gridToIsometric(gridX, gridY, isometricOffset.tileSize);

    // Position sprite using the same coordinate system as the grid
    sprite.x = isometricOffset.offsetX + isoX;
    
    // For Y positioning, align with the actual grid diamond bottom
    const snap = battlemapStore;
    const zoomedDiamondHeight = isometricOffset.tileSize / 2;
    sprite.y = isometricOffset.offsetY + isoY + (zoomedDiamondHeight / 2);

    // Apply Z offset (same as original renderer)
    if (assetInstance.zLevel < Z_LAYER_CONFIG.maxLayers) {
      const layerConfig = battlemapActions.getAllZLayerConfigs()[assetInstance.zLevel];
      sprite.y -= layerConfig.verticalOffset * snap.view.zoomLevel;
    }

    // Apply positioning using the processed asset's directional settings
    this.applyAssetPositioning(sprite, assetInstance, spriteName, snap);

    // Set visibility and add to container
    sprite.visible = true;
    this.assetsContainer.addChild(sprite);
    this.activeAssetSprites.set(assetKey, sprite);
  }

  /**
   * Apply positioning settings to an asset sprite (using processed asset settings)
   */
  private applyAssetPositioning(sprite: any, assetInstance: RenderableAssetInstance, spriteName: string, snap: any): void {
    // Get the appropriate directional settings from the processed asset
    const directionalBehavior = assetInstance.asset.directionalBehavior;
    let settings;
    
    if (directionalBehavior.useSharedSettings) {
      settings = directionalBehavior.sharedSettings;
    } else {
      settings = directionalBehavior.directionalSettings[assetInstance.direction];
    }
    
    if (!settings) {
      console.warn(`[ProcessedAssetsRenderer] No settings found for asset ${assetInstance.assetId}, direction ${assetInstance.direction}`);
      // Fall back to shared settings
      settings = directionalBehavior.sharedSettings;
    }

    // Apply positioning adjustments using the processed asset's settings
    const spriteScale = snap.view.spriteScale;
    const zoomLevel = snap.view.zoomLevel;
    
    // Use auto-computed or manual vertical bias based on flag
    const verticalBias = settings.useAutoComputed 
      ? settings.autoComputedVerticalBias 
      : settings.manualVerticalBias;
    
    // For positioning, use the down margin as the primary positioning margin
    const finalInvisibleMargin = settings.invisibleMarginDown;
    
    // Apply positioning based on snap position
    if (assetInstance.snapPosition === 'above') {
      // Above positioning: apply vertical bias + invisible margin, scaled by sprite scale first
      const spriteScaledOffset = (verticalBias + finalInvisibleMargin) * spriteScale;
      sprite.y += spriteScaledOffset * zoomLevel;
    } else {
      // Below positioning: only apply invisible margin to snap to grid diamond bottom
      const spriteScaledOffset = finalInvisibleMargin * spriteScale;
      sprite.y += spriteScaledOffset * zoomLevel;
    }

    // Set anchor to center bottom for proper isometric positioning
    sprite.anchor.set(0.5, 1.0);

    // Apply both sprite scale AND zoom level for consistent scaling with grid
    const finalScale = spriteScale * zoomLevel;
    sprite.scale.set(finalScale);

    // Apply visual differentiation based on shadow/invisible mode
    const isActiveLayer = assetInstance.zLevel === snap.view.activeZLayer;
    
    switch (snap.view.layerVisibilityMode) {
      case LayerVisibilityMode.SHADOW:
        // SHADOW mode: All assets visible, non-active layers dimmed/tinted
        if (isActiveLayer) {
          sprite.alpha = 1.0;
          sprite.tint = 0xFFFFFF;
        } else {
          sprite.alpha = 0.6;
          if (assetInstance.zLevel < Z_LAYER_CONFIG.maxLayers) {
            const layerConfig = battlemapActions.getAllZLayerConfigs()[assetInstance.zLevel];
            sprite.tint = layerConfig.color;
          }
        }
        break;
      case LayerVisibilityMode.NORMAL:
        sprite.alpha = 1.0;
        sprite.tint = 0xFFFFFF;
        break;
      case LayerVisibilityMode.INVISIBLE:
        sprite.alpha = 1.0;
        sprite.tint = 0xFFFFFF;
        break;
      default:
        sprite.alpha = 1.0;
        sprite.tint = 0xFFFFFF;
    }
  }

  /**
   * Render fallback colored diamond for assets without processed textures
   */
  private renderFallbackAsset(assetInstance: RenderableAssetInstance, isometricOffset: any): void {
    const [gridX, gridY] = assetInstance.position;

    // Convert grid position to isometric coordinates
    const snap = battlemapStore;
    const { isoX, isoY } = gridToIsometric(gridX, gridY, snap.view.gridDiamondWidth);

    const scaledIsoX = isoX;
    const scaledIsoY = isoY;
    const centerX = isometricOffset.offsetX + scaledIsoX;
    let centerY = isometricOffset.offsetY + scaledIsoY;
    
    // Apply Z offset
    if (assetInstance.zLevel < Z_LAYER_CONFIG.maxLayers) {
      const layerConfig = battlemapActions.getAllZLayerConfigs()[assetInstance.zLevel];
      centerY -= layerConfig.verticalOffset * snap.view.zoomLevel;
    }

    // Calculate diamond corners
    const halfTile = snap.view.gridDiamondWidth / 2;
    const quarterTile = snap.view.gridDiamondWidth / 4;

    // Diamond points
    const topX = centerX;
    const topY = centerY - quarterTile;
    const rightX = centerX + halfTile;
    const rightY = centerY;
    const bottomX = centerX;
    const bottomY = centerY + quarterTile;
    const leftX = centerX - halfTile;
    const leftY = centerY;

    // Get asset color based on category
    const assetColor = this.getAssetColor(assetInstance.asset);

    // Draw diamond
    this.fallbackGraphics
      .moveTo(topX, topY)
      .lineTo(rightX, rightY)
      .lineTo(bottomX, bottomY)
      .lineTo(leftX, leftY)
      .lineTo(topX, topY)
      .fill({ color: assetColor, alpha: 0.6 })
      .stroke({ color: 0x333333, width: 1, alpha: 0.8 });
  }

  /**
   * Render assets using colored diamonds (fallback)
   */
  private renderFallbackAssets(): void {
    this.fallbackGraphics.clear();
    
    const visibleAssets = this.getVisibleAssetInstances();
    const sortedAssets = this.sortAssetsByDepth(visibleAssets);
    
    const snap = battlemapStore;
    const isometricOffset = calculateIsometricGridOffset(
      this.engine?.containerSize?.width || 0,
      this.engine?.containerSize?.height || 0,
      snap.grid.width,
      snap.grid.height,
      snap.view.gridDiamondWidth,
      snap.view.offset.x,
      snap.view.offset.y,
      ENTITY_PANEL_WIDTH
    );

    sortedAssets.forEach((assetInstance: RenderableAssetInstance) => {
      this.renderFallbackAsset(assetInstance, isometricOffset);
    });

    console.log('[ProcessedAssetsRenderer] Rendered', sortedAssets.length, 'fallback assets');
  }

  /**
   * Clear all asset sprites and return them to pool
   */
  private clearAllAssets(): void {
    // Return asset sprites to pool
    this.activeAssetSprites.forEach(sprite => {
      this.assetsContainer.removeChild(sprite);
      this.returnSpriteToPool(sprite);
    });
    this.activeAssetSprites.clear();

    // Clear fallback graphics
    this.fallbackGraphics.clear();
  }

  /**
   * Get color for asset based on category
   */
  private getAssetColor(asset: MutableProcessedAssetDefinition): number {
    // Color based on asset category
    switch (asset.category) {
      case AssetCategory.TILE:
        return 0x7ED321; // Green
      case AssetCategory.WALL:
        return 0x666666; // Gray
      case AssetCategory.STAIR:
        return 0xF5A623; // Orange
      default:
        return 0x50E3C2; // Cyan
    }
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear all assets
    this.clearAllAssets();
    
    // Clear texture cache
    this.processedTextureCache.clear();
    
    // Clean up sprite pool
    this.spritePool.forEach(sprite => {
      if (!sprite.destroyed) {
        sprite.destroy();
      }
    });
    this.spritePool = [];
    
    // Use base class graphics cleanup
    this.destroyGraphics(this.fallbackGraphics, 'fallbackGraphics');
    
    // Destroy containers
    if (this.assetsContainer && !this.assetsContainer.destroyed) {
      this.assetsContainer.destroy({ children: true });
    }
    
    // Call parent destroy
    super.destroy();
  }
} 