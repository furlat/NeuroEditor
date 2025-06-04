import { Graphics, Sprite, Container, Texture } from 'pixi.js';
import { getCanvasBoundingBox } from 'pixi.js';
import { battlemapStore, battlemapActions, LayerVisibilityMode, Z_LAYER_CONFIG } from '../../store';
import { AbstractRenderer } from './BaseRenderer';
import { subscribe } from 'valtio';
import { LayerName } from '../BattlemapEngine';
import { IsometricRenderingUtils } from './utils/IsometricRenderingUtils';
import { isometricSpriteManager, IsometricDirection } from '../managers/IsometricSpriteManager';
import { calculateIsometricGridOffset, gridToIsometric, getWallEdgePosition, getWallSpriteAnchor } from '../../utils/isometricUtils';
import { ENTITY_PANEL_WIDTH } from '../../constants/layout';
import {
  ProcessedAssetId,
  MutableProcessedAssetDefinition,
  ProcessedAssetType,
  MutableDirectionalPositioningSettings
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
  wallDirection?: IsometricDirection;  // For wall assets
  assetType: ProcessedAssetType;       // Determines rendering path
}

/**
 * ProcessedAssetsRenderer - Unified asset rendering supporting tiles, walls, and future asset types
 * Maintains all sophisticated positioning logic from the original system
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
  private lastTemporaryAssetHash: string = '';  // NEW: Track temporary asset changes
  
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
  private lastPositioningSettingsHash: string = '';
  private lastVerticalBiasMode: string = '';
  
  // Bounding box cache (for sprite trimming)
  private boundingBoxCache: Map<string, any> = new Map();
  private isCurrentlyRendering: boolean = false;
  private deferredStoreUpdates: Array<() => void> = [];

  initialize(engine: any): void {
    super.initialize(engine);
    
    // Add containers to main container
    this.container.addChild(this.assetsContainer);
    this.container.addChild(this.fallbackGraphics);
    
    this.setupSubscriptions();
    this.initializeSprites();
    
    // Initialize last states
    this.updateLastKnownStates();
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
    this.lastLayerVisibilityMode = battlemapStore.view.layerVisibilityMode;
    this.lastActiveZLayer = battlemapStore.view.activeZLayer;
    this.lastPositioningSettingsHash = this.getPositioningSettingsHash();
    this.lastVerticalBiasMode = battlemapStore.view.verticalBiasComputationMode;
  }
  
  private getPositioningSettingsHash(): string {
    // Create hash of all positioning settings for change detection
    const snap = battlemapStore;
    
    // Include both asset library AND temporary asset
    const assetSettings = Object.values(snap.processedAssets.assetLibrary).map(asset => ({
      id: asset.id,
      behavior: asset.directionalBehavior
    }));
    
    // CRITICAL FIX: Include temporary asset in change detection
    if (snap.processedAssets.temporaryAsset) {
      assetSettings.push({
        id: snap.processedAssets.temporaryAsset.id,
        behavior: snap.processedAssets.temporaryAsset.directionalBehavior
      });
    }
    
    return JSON.stringify(assetSettings);
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
    // Subscribe to the root store for broader reactivity
    this.addSubscription(subscribe(battlemapStore, () => {
      // Only render if in processed asset mode
      if (!battlemapStore.processedAssets.isProcessedAssetMode) {
        return;
      }
      this.render();
    }));
    
    // Manual render trigger
    (window as any).__forceAssetsRender = () => {
      this.render();
    };
  }
  
  render(): void {
    if (!this.engine || !this.engine.app) {
      return;
    }
    
    // Prevent recursive rendering
    if (this.isCurrentlyRendering) {
      console.warn('[ProcessedAssetsRenderer] Skipping render - already rendering');
      return;
    }
    
    this.isCurrentlyRendering = true;
    
    try {
      this.incrementRenderCount();
      this.renderAssets();
      this.logRenderSummary();
    } finally {
      this.isCurrentlyRendering = false;
      
      // Process deferred updates
      if (this.deferredStoreUpdates.length > 0) {
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
  
  private renderAssets(): void {
    if (!this.isEngineReady()) return;
    
    // Only render if in processed asset mode
    if (!battlemapStore.processedAssets.isProcessedAssetMode) {
      this.clearAllAssets();
      this.container.visible = false;
      return;
    }
    
    this.container.visible = true;
    
    // Check if tiles are visible
    const snap = battlemapStore;
    if (!snap.controls.isTilesVisible) {
      this.clearAllAssets();
      this.updateLastKnownStates();
      return;
    }
    
    // Complete change detection
    const hasVisibilityChanged = this.lastTileVisibility !== snap.controls.isTilesVisible;
    const hasZLevelChanged = this.lastShowZLevel !== snap.view.showZLevel;
    const hasPositionChanged = 
      this.lastOffset.x !== snap.view.offset.x || 
      this.lastOffset.y !== snap.view.offset.y;
    const hasGridDiamondWidthChanged = this.lastGridDiamondWidth !== snap.view.gridDiamondWidth;
    const hasSpriteScaleChanged = this.lastSpriteScale !== snap.view.spriteScale;
    const hasZoomChanged = this.lastZoomLevel !== snap.view.zoomLevel;
    const hasGridLayerVisibilityChanged = 
      this.lastGridLayerVisibility[0] !== snap.view.gridLayerVisibility[0] ||
      this.lastGridLayerVisibility[1] !== snap.view.gridLayerVisibility[1] ||
      this.lastGridLayerVisibility[2] !== snap.view.gridLayerVisibility[2];
    const hasLayerVisibilityModeChanged = this.lastLayerVisibilityMode !== snap.view.layerVisibilityMode;
    const hasActiveZLayerChanged = this.lastActiveZLayer !== snap.view.activeZLayer;
    const hasVerticalBiasModeChanged = this.lastVerticalBiasMode !== snap.view.verticalBiasComputationMode;
    
    // Check for asset changes
    const currentInstancesHash = JSON.stringify(snap.processedAssets.assetInstances);
    const currentLibraryHash = JSON.stringify(snap.processedAssets.assetLibrary);
    const currentPositioningHash = this.getPositioningSettingsHash();
    const currentTemporaryAssetHash = snap.processedAssets.temporaryAsset 
      ? JSON.stringify(snap.processedAssets.temporaryAsset)
      : '';
    
    const hasAssetChanges = this.lastAssetInstancesHash !== currentInstancesHash || 
                           this.lastAssetLibraryHash !== currentLibraryHash;
    const hasPositioningChanges = this.lastPositioningSettingsHash !== currentPositioningHash;
    const hasTemporaryAssetChanges = this.lastTemporaryAssetHash !== currentTemporaryAssetHash;
    
    // Check if we need to re-render
    if (hasAssetChanges || hasPositionChanged || hasGridDiamondWidthChanged || hasSpriteScaleChanged || 
        hasZoomChanged || hasVisibilityChanged || hasZLevelChanged || hasGridLayerVisibilityChanged || 
        hasLayerVisibilityModeChanged || hasActiveZLayerChanged || hasPositioningChanges || 
        hasVerticalBiasModeChanged || hasTemporaryAssetChanges || snap.view.wasd_moving) {
      
      // Debug logging for temporary asset changes
      if (hasTemporaryAssetChanges) {
        console.log('[ProcessedAssetsRenderer] 🔄 Temporary asset changed - re-rendering for live preview');
      }
      if (hasPositioningChanges) {
        console.log('[ProcessedAssetsRenderer] 🎯 Positioning settings changed - re-rendering');
      }
      
      this.lastAssetInstancesHash = currentInstancesHash;
      this.lastAssetLibraryHash = currentLibraryHash;
      this.lastTemporaryAssetHash = currentTemporaryAssetHash;
      this.updateLastKnownStates();
      
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
    
    // Get regular asset instances
    Object.values(snap.processedAssets.assetInstances).forEach(instance => {
      const asset = snap.processedAssets.assetLibrary[instance.assetId];
      if (!asset) return;
      
      // Determine asset type from the asset definition
      const assetType = asset.assetType || ProcessedAssetType.TILE; // Default to tile for backward compatibility
      
      allInstances.push({
        instanceId: instance.instanceId,
        assetId: instance.assetId,
        asset,
        position: instance.position,
        zLevel: instance.zLevel,
        direction: instance.direction,
        snapPosition: instance.snapPosition,
        wallDirection: instance.wallDirection,
        assetType
      });
    });
    
    // CRITICAL FIX: Include temporary asset instances for live preview
    if (snap.processedAssets.temporaryAsset) {
      const temporaryAsset = snap.processedAssets.temporaryAsset;
      
      // Look for instances that reference the temporary asset
      Object.values(snap.processedAssets.assetInstances).forEach(instance => {
        if (instance.assetId === temporaryAsset.id) {
          // Replace the asset data with the live temporary asset
          const existingIndex = allInstances.findIndex(a => a.instanceId === instance.instanceId);
          if (existingIndex !== -1) {
            allInstances[existingIndex] = {
              ...allInstances[existingIndex],
              asset: temporaryAsset  // Use live temporary asset data
            };
          } else {
            // Add new instance for temporary asset
            const assetType = temporaryAsset.assetType || ProcessedAssetType.TILE;
            allInstances.push({
              instanceId: instance.instanceId,
              assetId: instance.assetId,
              asset: temporaryAsset,
              position: instance.position,
              zLevel: instance.zLevel,
              direction: instance.direction,
              snapPosition: instance.snapPosition,
              wallDirection: instance.wallDirection,
              assetType
            });
          }
        }
      });
    }

    // Filter based on layer visibility mode
    switch (snap.view.layerVisibilityMode) {
      case LayerVisibilityMode.SHADOW:
      case LayerVisibilityMode.NORMAL:
        return allInstances;
      case LayerVisibilityMode.INVISIBLE:
        return allInstances.filter(instance => instance.zLevel === snap.view.activeZLayer);
      default:
        return allInstances;
    }
  }
  
  private sortAssetsByDepth(assets: RenderableAssetInstance[]): RenderableAssetInstance[] {
    return [...assets].sort((a, b) => {
      // First sort by Z level
      if (a.zLevel !== b.zLevel) {
        return a.zLevel - b.zLevel;
      }
      
      // Then sort by isometric depth
      if (a.position[1] !== b.position[1]) {
        return a.position[1] - b.position[1];
      }
      
      if (a.position[0] !== b.position[0]) {
        return a.position[0] - b.position[0];
      }
      
      // If position is the same, walls render after tiles
      if (a.assetType !== b.assetType) {
        if (a.assetType === ProcessedAssetType.TILE && b.assetType === ProcessedAssetType.WALL) return -1;
        if (a.assetType === ProcessedAssetType.WALL && b.assetType === ProcessedAssetType.TILE) return 1;
      }
      
      // For walls at same position, sort by edge direction
      if (a.assetType === ProcessedAssetType.WALL && b.assetType === ProcessedAssetType.WALL) {
        const wallDirA = a.wallDirection || IsometricDirection.SOUTH;
        const wallDirB = b.wallDirection || IsometricDirection.SOUTH;
        return wallDirA - wallDirB;
      }
      
      return 0;
    });
  }
  
  private renderAssetsWithTextures(): void {
    const visibleAssets = this.getVisibleAssetInstances();
    const sortedAssets = this.sortAssetsByDepth(visibleAssets);
    
    sortedAssets.forEach(assetInstance => {
      if (assetInstance.assetType === ProcessedAssetType.WALL) {
        this.renderSingleWallAsset(assetInstance);
      } else {
        this.renderSingleTileAsset(assetInstance);
      }
    });
    
    console.log('[ProcessedAssetsRenderer] Rendered', sortedAssets.length, 'assets with textures');
  }
  
  private renderSingleTileAsset(assetInstance: RenderableAssetInstance): void {
    try {
      const texture = this.getAssetTexture(assetInstance);
      if (!texture) return;
      
      const instanceKey = `${assetInstance.assetId}_${assetInstance.instanceId}`;
      let sprite = this.activeAssetSprites.get(instanceKey);
      
      if (!sprite) {
        sprite = this.getPooledSprite();
        this.activeAssetSprites.set(instanceKey, sprite);
        this.assetsContainer.addChild(sprite);
      }
      
      sprite.texture = texture;
      
      // Calculate position
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
      
      // STEP 1: Get grid center position (as before)
      const { isoX, isoY } = gridToIsometric(
        assetInstance.position[0], 
        assetInstance.position[1], 
        isometricOffset.tileSize
      );
      
      // STEP 2: NEW - Apply Grid Anchor offset to move from center to desired attachment point
      const directionalBehavior = assetInstance.asset.directionalBehavior;
      let settings: MutableDirectionalPositioningSettings;
      
      if (directionalBehavior.useSharedSettings) {
        settings = directionalBehavior.sharedSettings;
      } else {
        settings = directionalBehavior.directionalSettings[assetInstance.direction];
      }
      
      // Calculate grid anchor offset
      const gridAnchorOffset = this.calculateGridAnchorOffset(
        settings.gridAnchor,
        snap.view.gridDiamondWidth,
        snap.view.zoomLevel
      );
      
      // Apply base position + grid anchor offset
      sprite.x = isometricOffset.offsetX + isoX + gridAnchorOffset.x;
      const zoomedDiamondHeight = isometricOffset.tileSize / 2;
      sprite.y = isometricOffset.offsetY + isoY + (zoomedDiamondHeight / 2) + gridAnchorOffset.y;
      
      // Apply Z offset
      const zLayerConfigs = battlemapActions.getAllZLayerConfigs();
      const zLayerConfig = zLayerConfigs[assetInstance.zLevel];
      if (zLayerConfig) {
        sprite.y -= zLayerConfig.verticalOffset * snap.view.zoomLevel;
      }
      
      // Apply tile positioning (this handles sprite anchor and other adjustments)
      this.applyTilePositioning(sprite, assetInstance, snap);
      
      // Apply visual effects
      this.applyVisualEffects(sprite, assetInstance, snap);
      
      sprite.visible = true;
      
    } catch (error) {
      console.error('[ProcessedAssetsRenderer] Error rendering tile asset:', error, assetInstance);
    }
  }
  
  private renderSingleWallAsset(assetInstance: RenderableAssetInstance): void {
    try {
      const texture = this.getAssetTexture(assetInstance);
      if (!texture) return;
      
      const instanceKey = `${assetInstance.assetId}_${assetInstance.instanceId}`;
      let sprite = this.activeAssetSprites.get(instanceKey);
      
      if (!sprite) {
        sprite = this.getPooledSprite();
        this.activeAssetSprites.set(instanceKey, sprite);
        this.assetsContainer.addChild(sprite);
      }
      
      sprite.texture = texture;
      
      // Calculate wall edge position
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
      
      // Use wall direction from instance or asset configuration
      const wallDirection = assetInstance.wallDirection || 
                           assetInstance.asset.wallConfiguration?.wallDirection || 
                           IsometricDirection.SOUTH;
      
      // STEP 1: Get grid center position (same as tiles)
      const { isoX, isoY } = gridToIsometric(
        assetInstance.position[0], 
        assetInstance.position[1], 
        isometricOffset.tileSize
      );
      
      // STEP 2: NEW - Apply Grid Anchor offset instead of hardcoded edge position
      const directionalBehavior = assetInstance.asset.directionalBehavior;
      let settings: MutableDirectionalPositioningSettings;
      
      if (directionalBehavior.useSharedSettings) {
        settings = directionalBehavior.sharedSettings;
      } else {
        settings = directionalBehavior.directionalSettings[assetInstance.direction];
      }
      
      // Calculate grid anchor offset (walls should use edge anchors by default)
      const gridAnchorOffset = this.calculateGridAnchorOffset(
        settings.gridAnchor,
        snap.view.gridDiamondWidth,
        snap.view.zoomLevel
      );
      
      // Apply base position + grid anchor offset
      sprite.x = isometricOffset.offsetX + isoX + gridAnchorOffset.x;
      const zoomedDiamondHeight = isometricOffset.tileSize / 2;
      sprite.y = isometricOffset.offsetY + isoY + (zoomedDiamondHeight / 2) + gridAnchorOffset.y;
      
      // Apply Z offset
      const zLayerConfigs = battlemapActions.getAllZLayerConfigs();
      const zLayerConfig = zLayerConfigs[assetInstance.zLevel];
      if (zLayerConfig) {
        sprite.y -= zLayerConfig.verticalOffset * snap.view.zoomLevel;
      }
      
      // STEP 3: Apply sprite anchor (this is handled in applyWallPositioning)
      // Note: We don't set the anchor here anymore, applyWallPositioning handles it
      
      // Apply wall positioning (this handles sprite anchor and other adjustments)
      this.applyWallPositioning(sprite, assetInstance, wallDirection, snap);
      
      // Apply visual effects
      this.applyVisualEffects(sprite, assetInstance, snap);
      
      sprite.visible = true;
      
    } catch (error) {
      console.error('[ProcessedAssetsRenderer] Error rendering wall asset:', error, assetInstance);
    }
  }
  
  private getAssetTexture(assetInstance: RenderableAssetInstance): Texture | null {
    try {
      const sourceImagePath = assetInstance.asset.sourceProcessing.sourceImagePath;
      const pathParts = sourceImagePath.split('/');
      const fileName = pathParts[pathParts.length - 1];
      const spriteName = fileName.replace('.png', '');
      
      if (!isometricSpriteManager.isSpriteLoaded(spriteName)) {
        console.warn(`[ProcessedAssetsRenderer] Sprite not loaded: ${spriteName}`);
        return null;
      }
      
      return isometricSpriteManager.getSpriteTexture(spriteName, assetInstance.direction);
    } catch (error) {
      console.error('[ProcessedAssetsRenderer] Error getting texture:', error);
      return null;
    }
  }
  
  /**
   * NEW: Calculate grid anchor offset based on GridAnchorPoint
   * This determines WHERE on the diamond to attach the sprite
   */
  private calculateGridAnchorOffset(
    gridAnchorConfig: any, 
    gridDiamondWidth: number, 
    zoomLevel: number
  ): { x: number; y: number } {
    const { gridAnchorPoint, gridAnchorX, gridAnchorY, useDefaultGridAnchor } = gridAnchorConfig;
    
    // If using default, return no offset (center position)
    if (useDefaultGridAnchor && gridAnchorPoint === 'center') {
      return { x: 0, y: 0 };
    }
    
    const halfDiamondWidth = (gridDiamondWidth * zoomLevel) / 2;
    const quarterDiamondHeight = (gridDiamondWidth * zoomLevel) / 4; // Diamond height is width/2, so quarter
    
    let offsetX = 0;
    let offsetY = 0;
    
    switch (gridAnchorPoint) {
      case 'center':
        // No offset - already at center
        offsetX = 0;
        offsetY = 0;
        break;
        
      case 'north_edge':
        offsetX = 0;
        offsetY = -quarterDiamondHeight;
        break;
        
      case 'east_edge':
        offsetX = halfDiamondWidth;
        offsetY = 0;
        break;
        
      case 'south_edge':
        offsetX = 0;
        offsetY = quarterDiamondHeight;
        break;
        
      case 'west_edge':
        offsetX = -halfDiamondWidth;
        offsetY = 0;
        break;
        
      case 'north_corner':
        offsetX = 0;
        offsetY = -quarterDiamondHeight;
        break;
        
      case 'east_corner':
        offsetX = halfDiamondWidth;
        offsetY = 0;
        break;
        
      case 'south_corner':
        offsetX = 0;
        offsetY = quarterDiamondHeight;
        break;
        
      case 'west_corner':
        offsetX = -halfDiamondWidth;
        offsetY = 0;
        break;
        
      case 'custom':
        // Use custom gridAnchorX/Y coordinates (0-1 range)
        // Convert to diamond coordinate system
        offsetX = (gridAnchorX - 0.5) * halfDiamondWidth * 2; // -1 to +1 range
        offsetY = (gridAnchorY - 0.5) * quarterDiamondHeight * 2; // -1 to +1 range  
        break;
        
      default:
        console.warn(`[ProcessedAssetsRenderer] Unknown grid anchor point: ${gridAnchorPoint}`);
        offsetX = 0;
        offsetY = 0;
    }
    
    console.log(`[ProcessedAssetsRenderer] Grid anchor offset for ${gridAnchorPoint}: (${offsetX.toFixed(1)}, ${offsetY.toFixed(1)})`);
    return { x: offsetX, y: offsetY };
  }
  
  private applyTilePositioning(sprite: Sprite, assetInstance: RenderableAssetInstance, snap: any): void {
    const spriteScale = snap.view.spriteScale;
    const zoomLevel = snap.view.zoomLevel;
    
    // Get directional settings
    const directionalBehavior = assetInstance.asset.directionalBehavior;
    let settings: MutableDirectionalPositioningSettings;
    
    if (directionalBehavior.useSharedSettings) {
      settings = directionalBehavior.sharedSettings;
    } else {
      settings = directionalBehavior.directionalSettings[assetInstance.direction];
    }
    
    // FIXED: Apply sprite anchor (WHERE on sprite canvas to anchor)
    // Use new sprite anchor system or fallback to deprecated fields
    const spriteAnchorX = settings.spriteAnchor?.spriteAnchorX ?? settings.anchorX ?? 0.5;
    const spriteAnchorY = settings.spriteAnchor?.spriteAnchorY ?? settings.anchorY ?? 1.0;
    const useBoundingBoxAnchor = settings.spriteAnchor?.useBoundingBoxAnchor ?? false;
    
    // Apply the sprite anchor (this determines WHERE on the sprite canvas)
    sprite.anchor.set(spriteAnchorX, spriteAnchorY);
    
    // FIXED: If trimming is enabled, apply anchor to bounding box instead of full sprite
    if (useBoundingBoxAnchor && settings.spriteBoundingBox) {
      // CRITICAL: Don't change the anchor coordinates - change which rectangle they apply to
      const bbox = settings.spriteBoundingBox;
      
      // Calculate where the current anchor point is within the bounding box
      const anchorXInBbox = bbox.boundingX + (spriteAnchorX * bbox.boundingWidth);
      const anchorYInBbox = bbox.boundingY + (spriteAnchorY * bbox.boundingHeight);
      
      // Convert back to full sprite coordinates (0-1 range)
      const adjustedSpriteAnchorX = anchorXInBbox / bbox.originalWidth;
      const adjustedSpriteAnchorY = anchorYInBbox / bbox.originalHeight;
      
      // Apply the adjusted anchor
      sprite.anchor.set(adjustedSpriteAnchorX, adjustedSpriteAnchorY);
      
      console.log(`[ProcessedAssetsRenderer] Applied trimmed anchor: sprite(${spriteAnchorX}, ${spriteAnchorY}) -> bbox(${anchorXInBbox}, ${anchorYInBbox}) -> adjusted(${adjustedSpriteAnchorX.toFixed(3)}, ${adjustedSpriteAnchorY.toFixed(3)})`);
    }
    
    // Apply vertical positioning using manual vertical bias (tiles use manualVerticalBias now)
    const verticalBias = settings.manualVerticalBias || 36;
    
    // FIXED: Apply all 4 directional invisible margins
    const finalInvisibleMarginUp = settings.invisibleMarginUp || 0;
    const finalInvisibleMarginDown = settings.invisibleMarginDown || 0;
    const finalInvisibleMarginLeft = settings.invisibleMarginLeft || 0;
    const finalInvisibleMarginRight = settings.invisibleMarginRight || 0;
    
    // Apply positioning based on snap position
    if (assetInstance.snapPosition === 'above') {
      const spriteScaledOffset = (verticalBias + finalInvisibleMarginDown - finalInvisibleMarginUp) * spriteScale;
      sprite.y += spriteScaledOffset * zoomLevel;
    } else {
      const spriteScaledOffset = (finalInvisibleMarginDown - finalInvisibleMarginUp) * spriteScale;
      sprite.y += spriteScaledOffset * zoomLevel;
    }
    
    // Apply horizontal margins
    const horizontalMarginOffset = (finalInvisibleMarginRight - finalInvisibleMarginLeft) * spriteScale;
    sprite.x += horizontalMarginOffset * zoomLevel;
    
    // Apply scale
    const finalScale = spriteScale * zoomLevel;
    if (settings.keepProportions && settings.scaleX !== undefined) {
      // If keeping proportions, use scaleX for both dimensions
      sprite.scale.set(finalScale * settings.scaleX, finalScale * settings.scaleX);
    } else {
      sprite.scale.set(finalScale * (settings.scaleX || 1.0), finalScale * (settings.scaleY || 1.0));
    }
    
    // Apply additional transformations
    sprite.rotation = (settings.rotation || 0) * (Math.PI / 180);
    sprite.alpha = settings.alpha || 1.0;
    sprite.tint = settings.tint || 0xFFFFFF;
    
    // Apply offsets
    sprite.x += (settings.horizontalOffset || 0) * zoomLevel;
    sprite.y += (settings.verticalOffset || 0) * zoomLevel;
  }
  
  private applyWallPositioning(sprite: Sprite, assetInstance: RenderableAssetInstance, wallDirection: IsometricDirection, snap: any): void {
    const spriteScale = snap.view.spriteScale;
    const zoomLevel = snap.view.zoomLevel;
    
    // Get directional settings
    const directionalBehavior = assetInstance.asset.directionalBehavior;
    let settings: MutableDirectionalPositioningSettings;
    
    if (directionalBehavior.useSharedSettings) {
      settings = directionalBehavior.sharedSettings;
    } else {
      settings = directionalBehavior.directionalSettings[assetInstance.direction];
    }
    
    // FIXED: Apply sprite anchor (WHERE on sprite canvas to anchor)
    // Use new sprite anchor system or fallback to deprecated fields
    const spriteAnchorX = settings.spriteAnchor?.spriteAnchorX ?? settings.anchorX ?? getWallSpriteAnchor(wallDirection).x;
    const spriteAnchorY = settings.spriteAnchor?.spriteAnchorY ?? settings.anchorY ?? getWallSpriteAnchor(wallDirection).y;
    const useBoundingBoxAnchor = settings.spriteAnchor?.useBoundingBoxAnchor ?? false;
    
    // Apply the sprite anchor (this determines WHERE on the sprite canvas)
    sprite.anchor.set(spriteAnchorX, spriteAnchorY);
    
    // FIXED: If trimming is enabled, apply anchor to bounding box instead of full sprite
    if (useBoundingBoxAnchor && settings.spriteBoundingBox) {
      // CRITICAL: Don't change the anchor coordinates - change which rectangle they apply to
      const bbox = settings.spriteBoundingBox;
      
      // Calculate where the current anchor point is within the bounding box
      const anchorXInBbox = bbox.boundingX + (spriteAnchorX * bbox.boundingWidth);
      const anchorYInBbox = bbox.boundingY + (spriteAnchorY * bbox.boundingHeight);
      
      // Convert back to full sprite coordinates (0-1 range)
      const adjustedSpriteAnchorX = anchorXInBbox / bbox.originalWidth;
      const adjustedSpriteAnchorY = anchorYInBbox / bbox.originalHeight;
      
      // Apply the adjusted anchor
      sprite.anchor.set(adjustedSpriteAnchorX, adjustedSpriteAnchorY);
      
      console.log(`[ProcessedAssetsRenderer] Applied wall trimmed anchor: sprite(${spriteAnchorX}, ${spriteAnchorY}) -> bbox(${anchorXInBbox}, ${anchorYInBbox}) -> adjusted(${adjustedSpriteAnchorX.toFixed(3)}, ${adjustedSpriteAnchorY.toFixed(3)})`);
    }
    
    // Apply vertical positioning using manual vertical bias only (walls don't use auto-computed)
    const verticalBias = settings.manualVerticalBias || 36;
    
    // FIXED: Apply all 4 directional invisible margins for walls
    const finalInvisibleMarginUp = settings.invisibleMarginUp || 0;
    const finalInvisibleMarginDown = settings.invisibleMarginDown || 0;
    const finalInvisibleMarginLeft = settings.invisibleMarginLeft || 0;
    const finalInvisibleMarginRight = settings.invisibleMarginRight || 0;
    
    // Apply positioning based on snap position with proper scaling
    if (assetInstance.snapPosition === 'above') {
      const spriteScaledOffset = (verticalBias + finalInvisibleMarginDown - finalInvisibleMarginUp) * spriteScale;
      sprite.y += spriteScaledOffset * zoomLevel;
    } else {
      const spriteScaledOffset = (finalInvisibleMarginDown - finalInvisibleMarginUp) * spriteScale;
      sprite.y += spriteScaledOffset * zoomLevel;
    }
    
    // Apply horizontal margins
    const horizontalMarginOffset = (finalInvisibleMarginRight - finalInvisibleMarginLeft) * spriteScale;
    sprite.x += horizontalMarginOffset * zoomLevel;
    
    // Apply manual horizontal offset
    const horizontalOffset = settings.manualHorizontalOffset || 0;
    if (horizontalOffset !== 0) {
      const spriteScaledHorizontalOffset = horizontalOffset * spriteScale;
      sprite.x += spriteScaledHorizontalOffset * zoomLevel;
    }
    
    // Apply diagonal offsets
    this.applyDiagonalOffsets(sprite, settings, spriteScale, zoomLevel);
    
    // Apply wall-relative offsets
    this.applyWallRelativeOffsets(sprite, settings, wallDirection, spriteScale, zoomLevel);
    
    // Apply scale
    const finalScale = spriteScale * zoomLevel;
    if (settings.keepProportions && settings.scaleX !== undefined) {
      // If keeping proportions, use scaleX for both dimensions
      sprite.scale.set(finalScale * settings.scaleX, finalScale * settings.scaleX);
    } else {
      sprite.scale.set(finalScale * (settings.scaleX || 1.0), finalScale * (settings.scaleY || 1.0));
    }
  }
  
  private applyDiagonalOffsets(sprite: Sprite, settings: MutableDirectionalPositioningSettings, spriteScale: number, zoomLevel: number): void {
    const diagonalNEOffset = settings.manualDiagonalNorthEastOffset || 0;
    const diagonalNWOffset = settings.manualDiagonalNorthWestOffset || 0;
    
    if (diagonalNEOffset !== 0 || diagonalNWOffset !== 0) {
      const neXComponent = diagonalNEOffset * Math.cos(Math.PI / 6);
      const neYComponent = -diagonalNEOffset * Math.sin(Math.PI / 6);
      
      const nwXComponent = -diagonalNWOffset * Math.cos(Math.PI / 6);
      const nwYComponent = -diagonalNWOffset * Math.sin(Math.PI / 6);
      
      const totalXOffset = (neXComponent + nwXComponent) * spriteScale * zoomLevel;
      const totalYOffset = (neYComponent + nwYComponent) * spriteScale * zoomLevel;
      
      sprite.x += totalXOffset;
      sprite.y += totalYOffset;
    }
  }
  
  private applyWallRelativeOffsets(sprite: Sprite, settings: MutableDirectionalPositioningSettings, wallDirection: IsometricDirection, spriteScale: number, zoomLevel: number): void {
    const relativeAlongEdge = settings.relativeAlongEdgeOffset || 0;
    const relativeTowardCenter = settings.relativeTowardCenterOffset || 0;
    const relativeDiagA = settings.relativeDiagonalAOffset || 0;
    const relativeDiagB = settings.relativeDiagonalBOffset || 0;
    
    if (relativeAlongEdge !== 0 || relativeTowardCenter !== 0 || relativeDiagA !== 0 || relativeDiagB !== 0) {
      let alongEdgeX = 0, alongEdgeY = 0;
      let towardCenterX = 0, towardCenterY = 0;
      let diagAX = 0, diagAY = 0;
      let diagBX = 0, diagBY = 0;
      
      let diagASignMultiplier = 1;
      let diagBSignMultiplier = 1;
      
      const useADivision = settings.useADivisionForNorthEast ?? true;
      
      switch (wallDirection) {
        case IsometricDirection.NORTH:
          alongEdgeX = 1; alongEdgeY = 0;
          towardCenterX = 0; towardCenterY = 1;
          diagASignMultiplier = useADivision ? -0.5 : -1;
          diagBSignMultiplier = -1;
          diagAX = Math.cos(Math.PI / 4); diagAY = Math.sin(Math.PI / 4);
          diagBX = Math.cos(-Math.PI / 4); diagBY = Math.sin(-Math.PI / 4);
          break;
          
        case IsometricDirection.EAST:
          alongEdgeX = 0; alongEdgeY = 1;
          towardCenterX = -1; towardCenterY = 0;
          diagASignMultiplier = useADivision ? -0.5 : -1;
          diagBSignMultiplier = +1;
          diagAX = Math.cos(Math.PI / 2 + Math.PI / 4); diagAY = Math.sin(Math.PI / 2 + Math.PI / 4);
          diagBX = Math.cos(Math.PI / 2 - Math.PI / 4); diagBY = Math.sin(Math.PI / 2 - Math.PI / 4);
          break;
          
        case IsometricDirection.SOUTH:
          alongEdgeX = -1; alongEdgeY = 0;
          towardCenterX = 0; towardCenterY = -1;
          diagASignMultiplier = +1;
          diagBSignMultiplier = +1;
          diagAX = Math.cos(Math.PI + Math.PI / 4); diagAY = Math.sin(Math.PI + Math.PI / 4);
          diagBX = Math.cos(Math.PI - Math.PI / 4); diagBY = Math.sin(Math.PI - Math.PI / 4);
          break;
          
        case IsometricDirection.WEST:
          alongEdgeX = 0; alongEdgeY = -1;
          towardCenterX = 1; towardCenterY = 0;
          diagASignMultiplier = +1;
          diagBSignMultiplier = -1;
          diagAX = Math.cos(-Math.PI / 2 + Math.PI / 4); diagAY = Math.sin(-Math.PI / 2 + Math.PI / 4);
          diagBX = Math.cos(-Math.PI / 2 - Math.PI / 4); diagBY = Math.sin(-Math.PI / 2 - Math.PI / 4);
          break;
      }
      
      const totalRelativeX = (
        relativeAlongEdge * alongEdgeX +
        relativeTowardCenter * towardCenterX +
        (relativeDiagA * diagASignMultiplier) * diagAX +
        (relativeDiagB * diagBSignMultiplier) * diagBX
      ) * spriteScale * zoomLevel;
      
      const totalRelativeY = (
        relativeAlongEdge * alongEdgeY +
        relativeTowardCenter * towardCenterY +
        (relativeDiagA * diagASignMultiplier) * diagAY +
        (relativeDiagB * diagBSignMultiplier) * diagBY
      ) * spriteScale * zoomLevel;
      
      sprite.x += totalRelativeX;
      sprite.y += totalRelativeY;
    }
  }
  
  private applyVisualEffects(sprite: Sprite, assetInstance: RenderableAssetInstance, snap: any): void {
    const isActiveLayer = assetInstance.zLevel === snap.view.activeZLayer;
    
    switch (snap.view.layerVisibilityMode) {
      case LayerVisibilityMode.SHADOW:
        if (isActiveLayer) {
          sprite.alpha = 1.0;
          sprite.tint = 0xFFFFFF;
        } else {
          sprite.alpha = 0.6;
          const zLayerConfigs = battlemapActions.getAllZLayerConfigs();
          if (assetInstance.zLevel < zLayerConfigs.length) {
            const layerConfig = zLayerConfigs[assetInstance.zLevel];
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
  
  private renderFallbackAssets(): void {
    this.fallbackGraphics.clear();
    
    const visibleAssets = this.getVisibleAssetInstances();
    const sortedAssets = this.sortAssetsByDepth(visibleAssets);
    
    sortedAssets.forEach(assetInstance => {
      this.renderFallbackAsset(assetInstance);
    });
    
    console.log('[ProcessedAssetsRenderer] Rendered', sortedAssets.length, 'fallback assets');
  }
  
  private renderFallbackAsset(assetInstance: RenderableAssetInstance): void {
    const snap = battlemapStore;
    
    const zLayerConfigs = battlemapActions.getAllZLayerConfigs();
    const zLayerConfig = zLayerConfigs[assetInstance.zLevel];
    const zOffset = zLayerConfig ? zLayerConfig.verticalOffset : 0;
    
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
      case 'tile': return 0x4CAF50;
      case 'wall': return 0x2196F3;
      case 'stair': return 0xFF9800;
      case 'decoration': return 0x9C27B0;
      case 'furniture': return 0xFFC107;
      case 'vegetation': return 0x8BC34A;
      case 'effect': return 0xE91E63;
      case 'utility': return 0x607D8B;
      default: return 0x9E9E9E;
    }
  }
  
  private computeBoundingBox(spriteName: string, direction: IsometricDirection, texture: Texture): any {
    const cacheKey = `${spriteName}_${direction}`;
    let boundingBoxData = this.boundingBoxCache.get(cacheKey);
    
    if (boundingBoxData) {
      return boundingBoxData;
    }
    
    try {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      if (context && this.engine?.app?.renderer) {
        canvas.width = texture.width;
        canvas.height = texture.height;
        
        const textureData = this.engine.app.renderer.extract.canvas(texture) as HTMLCanvasElement;
        context.drawImage(textureData, 0, 0);
        
        const boundingBox = getCanvasBoundingBox(canvas, 1);
        
        if (boundingBox.width > 0 && boundingBox.height > 0) {
          boundingBoxData = {
            originalWidth: texture.width,
            originalHeight: texture.height,
            boundingX: boundingBox.x,
            boundingY: boundingBox.y,
            boundingWidth: boundingBox.width,
            boundingHeight: boundingBox.height,
            anchorOffsetX: boundingBox.x / texture.width,
            anchorOffsetY: boundingBox.y / texture.height
          };
          
          this.boundingBoxCache.set(cacheKey, boundingBoxData);
          return boundingBoxData;
        }
      }
    } catch (error) {
      console.warn(`[ProcessedAssetsRenderer] Failed to compute bounding box for ${spriteName}:`, error);
    }
    
    return null;
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
    sprite.removeFromParent();
    this.spritePool.push(sprite);
  }
  
  private clearAllAssets(): void {
    this.activeAssetSprites.forEach(sprite => {
      if (sprite.parent) {
        sprite.parent.removeChild(sprite);
      }
      this.returnSpriteToPool(sprite);
    });
    this.activeAssetSprites.clear();
    
    this.fallbackGraphics.clear();
  }
  
  public forceBoundingBoxRecomputation(): void {
    this.boundingBoxCache.clear();
    console.log('[ProcessedAssetsRenderer] Cleared bounding box cache');
  }
  
  public screenToGrid(screenX: number, screenY: number) {
    return IsometricRenderingUtils.screenToGrid(screenX, screenY, this.engine);
  }
  
  destroy(): void {
    this.clearAllAssets();
    this.boundingBoxCache.clear();
    this.destroyGraphics(this.fallbackGraphics, 'fallbackGraphics');
    
    this.spritePool.forEach(sprite => {
      if (!sprite.destroyed) {
        sprite.destroy();
      }
    });
    this.spritePool = [];
    
    if (this.assetsContainer && !this.assetsContainer.destroyed) {
      this.assetsContainer.destroy({ children: true });
    }
    
    super.destroy();
  }
}