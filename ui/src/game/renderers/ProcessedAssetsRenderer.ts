import { Graphics, Sprite, Container } from 'pixi.js';
import { battlemapStore, battlemapActions, LayerVisibilityMode } from '../../store';
import { AbstractRenderer } from './BaseRenderer';
import { subscribe } from 'valtio';
import { LayerName } from '../BattlemapEngine';
import { IsometricRenderingUtils } from './utils/IsometricRenderingUtils';
import { isometricSpriteManager, IsometricDirection } from '../managers/IsometricSpriteManager';
import { calculateIsometricGridOffset, gridToIsometric } from '../../utils/isometricUtils';
import { ENTITY_PANEL_WIDTH } from '../../constants/layout';
import {
  ProcessedAssetId,
  MutableProcessedAssetDefinition
} from '../../types/processed_assets';

// Interface for renderable asset instances
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
 * ProcessedAssetsRenderer - Clean, focused processed asset rendering for tile editor
 * Follows the same patterns as IsometricTileRenderer with proper subscription management
 */
export class ProcessedAssetsRenderer extends AbstractRenderer {
  get layerName(): LayerName { return 'tiles'; }
  
  // Asset rendering containers
  private assetsContainer: Container = new Container();
  private fallbackGraphics: Graphics = new Graphics();
  
  // Sprite management
  private spritePool: Sprite[] = [];
  private activeAssetSprites: Map<string, Sprite> = new Map();
  private spritesLoaded = false;
  
  // Asset instance cache for change detection
  private lastAssetInstancesHash: string = '';
  private lastAssetLibraryHash: string = '';
  
  // Last known states for change detection (SAME AS ISOMETRIC TILE RENDERER)
  private lastOffset = { x: 0, y: 0 };
  private lastGridDiamondWidth = 100;
  private lastSpriteScale = 1.0;
  private lastTileVisibility = true;
  private lastShowZLevel = -1;
  private lastZoomLevel = 1.0;
  private lastGridLayerVisibility: { [zLayer: number]: boolean } = { 0: true, 1: true, 2: true };
  private lastLayerVisibilityMode: LayerVisibilityMode = LayerVisibilityMode.NORMAL;
  private lastActiveZLayer = 0;

  initialize(engine: any): void {
    super.initialize(engine);
    
    // Add containers to main container
    this.container.addChild(this.assetsContainer);
    this.container.addChild(this.fallbackGraphics);
    
    this.setupSubscriptions();
    this.initializeSprites();
    
    // Initialize last states (SAME AS ISOMETRIC TILE RENDERER)
    this.updateLastKnownStates();
  }
  
  /**
   * Update last known states (SAME AS ISOMETRIC TILE RENDERER)
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
    this.lastLayerVisibilityMode = battlemapStore.view.layerVisibilityMode;
    this.lastActiveZLayer = battlemapStore.view.activeZLayer;
  }
  
  private async initializeSprites(): Promise<void> {
    try {
      await isometricSpriteManager.loadAll();
      this.spritesLoaded = true;
      console.log('[ProcessedAssetsRenderer] Sprites loaded successfully');
      this.render(); // Re-render with textures
    } catch (error) {
      console.error('[ProcessedAssetsRenderer] Failed to load sprites:', error);
      this.spritesLoaded = false;
    }
  }
  
  private setupSubscriptions(): void {
    // Subscribe to the root store for broader reactivity (same pattern as GridRenderer)
    this.addSubscription(subscribe(battlemapStore, () => {
      // Only render if in processed asset mode
      if (!battlemapStore.processedAssets.isProcessedAssetMode) {
        return;
      }
      this.render();
    }));
    
    // Manual render trigger (same pattern as GridRenderer)
    (window as any).__forceAssetsRender = () => {
      this.render();
    };
  }
  
  render(): void {
    this.incrementRenderCount();
    this.renderAssets();
    this.logRenderSummary();
  }
  
  private renderAssets(): void {
    if (!this.isEngineReady()) return;
    
    // Only render if in processed asset mode (same pattern as GridRenderer)
    if (!battlemapStore.processedAssets.isProcessedAssetMode) {
      this.clearAllAssets();
      this.container.visible = false;
      return;
    }
    
    this.container.visible = true;
    
    // Check if tiles are visible (same pattern as GridRenderer)
    const snap = battlemapStore;
    if (!snap.controls.isTilesVisible) {
      this.clearAllAssets();
      return;
    }
    
    // COMPLETE CHANGE DETECTION (SAME AS ISOMETRIC TILE RENDERER)
    const currentTileVisibility = snap.controls.isTilesVisible;
    const hasVisibilityChanged = this.lastTileVisibility !== currentTileVisibility;
    const hasZLevelChanged = this.lastShowZLevel !== snap.view.showZLevel;
    
    // Check for various changes that require re-rendering (SAME AS ISOMETRIC TILE RENDERER)
    const hasPositionChanged = 
      this.lastOffset.x !== snap.view.offset.x || 
      this.lastOffset.y !== snap.view.offset.y;
    
    const hasGridDiamondWidthChanged = this.lastGridDiamondWidth !== snap.view.gridDiamondWidth;
    const hasSpriteScaleChanged = this.lastSpriteScale !== snap.view.spriteScale;
    const hasZoomChanged = this.lastZoomLevel !== snap.view.zoomLevel;
    
    // Check for grid layer visibility changes (SAME AS ISOMETRIC TILE RENDERER)
    const hasGridLayerVisibilityChanged = 
      this.lastGridLayerVisibility[0] !== snap.view.gridLayerVisibility[0] ||
      this.lastGridLayerVisibility[1] !== snap.view.gridLayerVisibility[1] ||
      this.lastGridLayerVisibility[2] !== snap.view.gridLayerVisibility[2];
    
    // Check for layer visibility mode change
    const hasLayerVisibilityModeChanged = this.lastLayerVisibilityMode !== snap.view.layerVisibilityMode;
    
    // Check for active layer change
    const hasActiveZLayerChanged = this.lastActiveZLayer !== snap.view.activeZLayer;
    
    // Check for asset changes
    const currentInstancesHash = JSON.stringify(snap.processedAssets.assetInstances);
    const currentLibraryHash = JSON.stringify(snap.processedAssets.assetLibrary);
    
    const hasAssetChanges = this.lastAssetInstancesHash !== currentInstancesHash || 
                           this.lastAssetLibraryHash !== currentLibraryHash;
    
    // CRITICAL: Check if we need to re-render (INCLUDES WASD MOVEMENT)
    if (hasAssetChanges || hasPositionChanged || hasGridDiamondWidthChanged || hasSpriteScaleChanged || hasZoomChanged ||
        hasVisibilityChanged || hasZLevelChanged || hasGridLayerVisibilityChanged || hasLayerVisibilityModeChanged ||
        hasActiveZLayerChanged || snap.view.wasd_moving) {
      
      this.lastAssetInstancesHash = currentInstancesHash;
      this.lastAssetLibraryHash = currentLibraryHash;
      this.updateLastKnownStates(); // Update all last known states
      
      // Clear and re-render all assets
      this.clearAllAssets();
      
      if (this.spritesLoaded) {
        this.renderAssetsWithTextures();
      } else {
        this.renderFallbackAssets();
      }
    }
  }
  
  private getVisibleAssetInstances(): RenderableAssetInstance[] {
    const snap = battlemapStore;
    const allInstances: RenderableAssetInstance[] = [];
    
    Object.values(snap.processedAssets.assetInstances).forEach(instance => {
      const asset = snap.processedAssets.assetLibrary[instance.assetId];
      if (!asset) return;
      
      allInstances.push({
        instanceId: instance.instanceId,
        assetId: instance.assetId,
        asset,
        position: instance.position,
        zLevel: instance.zLevel,
        direction: instance.direction,
        snapPosition: instance.snapPosition
      });
    });
    
    // Filter based on layer visibility mode (SAME AS ISOMETRIC TILE RENDERER)
    switch (snap.view.layerVisibilityMode) {
      case LayerVisibilityMode.SHADOW:
      case LayerVisibilityMode.NORMAL:
        // SHADOW and NORMAL modes: Show ALL assets (grid visibility doesn't affect assets)
        return allInstances;
      case LayerVisibilityMode.INVISIBLE:
        // INVISIBLE mode: Show ONLY active layer assets
        return allInstances.filter(instance => instance.zLevel === snap.view.activeZLayer);
      default:
        return allInstances;
    }
  }
  
  private sortAssetsByDepth(assets: RenderableAssetInstance[]): RenderableAssetInstance[] {
    return [...assets].sort((a, b) => {
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
      
      return 0;
    });
  }
  
  private renderAssetsWithTextures(): void {
    const visibleAssets = this.getVisibleAssetInstances();
    const sortedAssets = this.sortAssetsByDepth(visibleAssets);
    
    sortedAssets.forEach(assetInstance => {
      this.renderSingleAsset(assetInstance);
    });
    
    console.log('[ProcessedAssetsRenderer] Rendered', sortedAssets.length, 'assets with textures');
  }
  
  private renderSingleAsset(assetInstance: RenderableAssetInstance): void {
    try {
      // Extract sprite name from asset's source path
      const sourceImagePath = assetInstance.asset.sourceProcessing.sourceImagePath;
      const pathParts = sourceImagePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const spriteName = fileName.replace('.png', '');
      
      // Check if sprite is loaded
      if (!isometricSpriteManager.isSpriteLoaded(spriteName)) {
        console.warn(`[ProcessedAssetsRenderer] Sprite not loaded: ${spriteName}`);
        return;
      }
      
      // Get texture for the direction
      const texture = isometricSpriteManager.getSpriteTexture(spriteName, assetInstance.direction);
      if (!texture) {
        console.warn(`[ProcessedAssetsRenderer] No texture found for ${spriteName} direction ${assetInstance.direction}`);
        return;
      }
      
      // Get or create sprite
      const instanceKey = `${assetInstance.assetId}_${assetInstance.instanceId}`;
      let sprite = this.activeAssetSprites.get(instanceKey);
      
      if (!sprite) {
        sprite = this.getPooledSprite();
        this.activeAssetSprites.set(instanceKey, sprite);
        this.assetsContainer.addChild(sprite);
      }
      
      // Update sprite texture
      sprite.texture = texture;
      
      // Calculate position using SAME SYSTEM AS ISOMETRIC TILE RENDERER
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
        snap.view.zoomLevel // Include zoom level (CRITICAL)
      );
      
      // Convert grid position to isometric coordinates using the same system as grid
      const { isoX, isoY } = gridToIsometric(
        assetInstance.position[0], 
        assetInstance.position[1], 
        isometricOffset.tileSize // Use tileSize which includes zoom
      );
      
      // Position sprite using the same coordinate system as the tiles
      sprite.x = isometricOffset.offsetX + isoX;
      
      // For Y positioning, align with the actual grid diamond bottom (SAME AS TILE RENDERER)
      const zoomedDiamondHeight = isometricOffset.tileSize / 2; // tileSize already includes zoom, 2:1 aspect ratio
      sprite.y = isometricOffset.offsetY + isoY + (zoomedDiamondHeight / 2); // Align to bottom of diamond
      
      // Calculate Z offset (SAME PATTERN AS TILE RENDERER)
      const zLayerConfigs = battlemapActions.getAllZLayerConfigs();
      const zLayerConfig = zLayerConfigs[assetInstance.zLevel];
      if (zLayerConfig) {
        sprite.y -= zLayerConfig.verticalOffset * snap.view.zoomLevel; // Apply Z offset with zoom scaling
      }
      
      // Apply snap position offset (SAME AS TILE RENDERER)
      if (assetInstance.snapPosition === 'below') {
        sprite.y += 50 * snap.view.zoomLevel; // Below offset scaled by zoom
      }
      
      // Apply asset transformations
      this.applyAssetTransformations(sprite, assetInstance);
      
      // Apply layer visibility effects (SAME AS ISOMETRIC TILE RENDERER)
      const isActiveLayer = snap.view.activeZLayer === assetInstance.zLevel;
      
      switch (snap.view.layerVisibilityMode) {
        case LayerVisibilityMode.SHADOW:
          // SHADOW mode: All assets visible, non-active layers dimmed/tinted
          if (isActiveLayer) {
            // Active layer: full visibility, no tint
            sprite.alpha *= 1.0;
            sprite.tint = 0xFFFFFF; // White (no tint)
          } else {
            // Non-active layer: dimmed with layer color tint
            sprite.alpha *= 0.6;
            const zLayerConfigs = battlemapActions.getAllZLayerConfigs();
            if (assetInstance.zLevel < zLayerConfigs.length) {
              const layerConfig = zLayerConfigs[assetInstance.zLevel];
              sprite.tint = layerConfig.color;
            }
          }
          break;
        case LayerVisibilityMode.NORMAL:
          // NORMAL mode: All assets visible with full opacity, no tinting
          sprite.alpha *= 1.0;
          sprite.tint = 0xFFFFFF; // White (no tint)
          break;
        case LayerVisibilityMode.INVISIBLE:
          // INVISIBLE mode: Only active layer assets are rendered (this should only be active layer)
          sprite.alpha *= 1.0;
          sprite.tint = 0xFFFFFF; // White (no tint)
          break;
        default:
          sprite.alpha *= 1.0;
          sprite.tint = 0xFFFFFF; // White (no tint)
      }
      
      sprite.visible = true;
      
    } catch (error) {
      console.error('[ProcessedAssetsRenderer] Error rendering single asset:', error, assetInstance);
    }
  }
  
  private applyAssetTransformations(sprite: Sprite, assetInstance: RenderableAssetInstance): void {
    try {
      const asset = assetInstance.asset;
      const directionalBehavior = asset.directionalBehavior;
      const snap = battlemapStore;
      
      // Get appropriate directional settings
      let settings;
      if (directionalBehavior.useSharedSettings) {
        settings = directionalBehavior.sharedSettings;
      } else {
        settings = directionalBehavior.directionalSettings[assetInstance.direction];
      }
      
      if (!settings) {
        console.warn('[ProcessedAssetsRenderer] No directional settings found for asset:', assetInstance.assetId);
        return;
      }
      
      // Set anchor (SAME AS TILE RENDERER)
      sprite.anchor.set(0.5, 1.0);
      
      // Apply both sprite scale AND zoom level for consistent scaling with grid (SAME AS TILE RENDERER)
      const spriteScale = snap.view.spriteScale;
      const zoomLevel = snap.view.zoomLevel;
      const finalScale = spriteScale * zoomLevel; // Both sprite scale and zoom
      
      sprite.scale.set(finalScale * (settings.scaleX || 1.0), finalScale * (settings.scaleY || 1.0));
      
      // Apply transformations
      sprite.rotation = (settings.rotation || 0) * (Math.PI / 180);
      sprite.alpha = settings.alpha || 1.0;
      sprite.tint = settings.tint || 0xFFFFFF;
      
      // Apply positioning offsets (SCALED BY ZOOM)
      sprite.x += (settings.horizontalOffset || 0) * zoomLevel;
      sprite.y += (settings.verticalOffset || 0) * zoomLevel;
      
      // Apply custom anchor
      if (settings.useCustomAnchor) {
        sprite.anchor.x = settings.anchorX || 0.5;
        sprite.anchor.y = settings.anchorY || 1.0;
      }
      
    } catch (error) {
      console.error('[ProcessedAssetsRenderer] Error applying asset transformations:', error);
    }
  }
  
  private renderFallbackAssets(): void {
    this.fallbackGraphics.clear();
    
    const visibleAssets = this.getVisibleAssetInstances();
    const sortedAssets = this.sortAssetsByDepth(visibleAssets);
    
    // Use same rendering pattern as GridRenderer
    sortedAssets.forEach(assetInstance => {
      this.renderFallbackAsset(assetInstance);
    });
    
    console.log('[ProcessedAssetsRenderer] Rendered', sortedAssets.length, 'fallback assets');
  }
  
  private renderFallbackAsset(assetInstance: RenderableAssetInstance): void {
    const snap = battlemapStore;
    
    // Get active Z layer configuration (same pattern as GridRenderer)
    const zLayerConfigs = battlemapActions.getAllZLayerConfigs();
    const zLayerConfig = zLayerConfigs[assetInstance.zLevel];
    const zOffset = zLayerConfig ? zLayerConfig.verticalOffset : 0;
    
    // Render fallback diamond using IsometricRenderingUtils (same pattern as GridRenderer)
    IsometricRenderingUtils.renderIsometricDiamondBatchWithZOffset(
      this.fallbackGraphics,
      [{ x: assetInstance.position[0], y: assetInstance.position[1], zOffset }],
      this.engine,
      { color: this.getAssetColor(assetInstance.asset), alpha: 0.6 },
      { color: 0x333333, width: 1, alpha: 0.8 }
    );
  }
  
  private getAssetColor(asset: MutableProcessedAssetDefinition): number {
    // Color by category
    switch (asset.category) {
      case 'tile': return 0x4CAF50;    // Green
      case 'wall': return 0x2196F3;    // Blue
      case 'stair': return 0xFF9800;   // Orange
      case 'decoration': return 0x9C27B0; // Purple
      default: return 0x9E9E9E;        // Gray
    }
  }
  
  private getPooledSprite(): Sprite {
    if (this.spritePool.length > 0) {
      return this.spritePool.pop()!;
    }
    return new Sprite();
  }
  
  private returnSpriteToPool(sprite: Sprite): void {
    sprite.visible = false;
    sprite.texture = null as any;
    sprite.alpha = 1.0;
    sprite.scale.set(1.0);
    sprite.rotation = 0;
    sprite.tint = 0xFFFFFF;
    this.spritePool.push(sprite);
  }
  
  private clearAllAssets(): void {
    // Return sprites to pool (same pattern as other renderers)
    this.activeAssetSprites.forEach(sprite => {
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
      this.returnSpriteToPool(sprite);
    });
    this.activeAssetSprites.clear();
    
    // Clear fallback graphics
    this.fallbackGraphics.clear();
  }
  
  public screenToGrid(screenX: number, screenY: number) {
    return IsometricRenderingUtils.screenToGrid(screenX, screenY, this.engine);
  }
  
  destroy(): void {
    this.clearAllAssets();
    this.destroyGraphics(this.fallbackGraphics);
    
    // Clear sprite pool
    this.spritePool.forEach(sprite => sprite.destroy());
    this.spritePool = [];
    
    super.destroy();
  }
} 