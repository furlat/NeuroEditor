import { Graphics, Sprite, Container } from 'pixi.js';
import { battlemapStore, battlemapActions, Z_LAYER_CONFIG, LayerVisibilityMode } from '../../store';
import { TileSummary } from '../../types/battlemap_types';
import { AbstractRenderer } from './BaseRenderer';
import { subscribe } from 'valtio';
import { LayerName } from '../BattlemapEngine';
import { gridToIsometric, calculateIsometricGridOffset } from '../../utils/isometricUtils';
import { ENTITY_PANEL_WIDTH } from '../../constants/layout';
import { isometricSpriteManager, IsometricDirection } from '../managers/IsometricSpriteManager';

/**
 * Enhanced IsometricTileRenderer for rendering actual isometric sprites
 * Supports multi-Z-axis rendering, 4-directional sprites, and proper depth sorting
 */
export class IsometricTileRenderer extends AbstractRenderer {
  // Specify which layer this renderer belongs to
  get layerName(): LayerName { return 'tiles'; }
  
  // Container for sprite-based tiles
  private tilesContainer: Container = new Container();
  
  // Fallback graphics for tiles without sprites
  private fallbackGraphics: Graphics = new Graphics();
  
  // Reference to tiles for stable rendering during movement
  private tilesRef: Record<string, TileSummary> = {};
  
  // Sprite pool for efficient rendering
  private spritePool: Sprite[] = [];
  private activeTileSprites: Map<string, Sprite> = new Map();
  
  // Flag to track when tiles need to be redrawn
  private tilesNeedUpdate: boolean = true;
  
  // Last known states for change detection
  private lastOffset = { x: 0, y: 0 };
  private lastGridDiamondWidth = 100;
  private lastSpriteScale = 1.0;
  private lastTileVisibility = true;
  private lastShowZLevel = -1;
  private lastZoomLevel = 1.0;
  private lastGridLayerVisibility: { [zLayer: number]: boolean } = { 0: true, 1: true, 2: true };
  private spritesLoaded = false;
  // NEW: Track sprite type settings changes
  private lastSpriteTypeSettingsHash: string = '';

  /**
   * Initialize the renderer
   */
  initialize(engine: any): void {
    super.initialize(engine);
    
    // Set up container hierarchy - sprites first, then fallback graphics
    this.container.addChild(this.tilesContainer);
    this.container.addChild(this.fallbackGraphics);
    
    // Setup subscriptions
    this.setupSubscriptions();
    
    // Initialize sprite assets
    this.initializeSprites();
    
    // Initial tile data
    this.tilesRef = {...battlemapStore.grid.tiles};
    
    // Initialize last states
    this.updateLastKnownStates();
    
    // Force initial render
    this.tilesNeedUpdate = true;
    
    console.log('[IsometricTileRenderer] Initialized with sprite support');
  }

  /**
   * Initialize sprite assets
   */
  private async initializeSprites(): Promise<void> {
    try {
      console.log('[IsometricTileRenderer] Loading sprite assets...');
      await isometricSpriteManager.loadAll();
      this.spritesLoaded = true;
      this.tilesNeedUpdate = true;
      console.log('[IsometricTileRenderer] Sprite assets loaded successfully');
    } catch (error) {
      console.error('[IsometricTileRenderer] Failed to load sprite assets:', error);
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
    this.lastSpriteTypeSettingsHash = JSON.stringify(battlemapStore.controls.isometricEditor.spriteTypeSettings);
  }
  
  /**
   * Set up subscriptions to the Valtio store
   */
  private setupSubscriptions(): void {
    // Subscribe to the root store for broader reactivity
    this.addSubscription(subscribe(battlemapStore, () => {
      console.log('[IsometricTileRenderer] Store changed, checking for relevant changes');
      
        const hasChanges = this.hasTilesChanged(battlemapStore.grid.tiles);
        if (hasChanges) {
          this.tilesRef = {...battlemapStore.grid.tiles};
          this.tilesNeedUpdate = true;
      }
      
      this.render();
    }));
    
    // Also set up a manual render trigger that can be called from outside
    (window as any).__forceTileRender = () => {
      console.log('[IsometricTileRenderer] Manual render trigger called');
      this.tilesNeedUpdate = true;
      this.render();
    };
  }
  
  /**
   * Check if the tiles have significantly changed to warrant a re-render
   */
  private hasTilesChanged(newTiles: Record<string, TileSummary>): boolean {
    // Quick check: different number of tiles
    if (Object.keys(this.tilesRef).length !== Object.keys(newTiles).length) {
      return true;
    }
    
    // Check each tile for changes
    for (const key in newTiles) {
      const oldTile = this.tilesRef[key];
      const newTile = newTiles[key];
      
      // New tile that didn't exist before
      if (!oldTile) {
        return true;
      }
      
      // Check for sprite changes - FIXED: Include snap_position
      if (oldTile.sprite_name !== newTile.sprite_name ||
          oldTile.sprite_direction !== newTile.sprite_direction ||
          oldTile.z_level !== newTile.z_level ||
          oldTile.snap_position !== newTile.snap_position) { // FIXED: Added snap_position check
        return true;
      }
    }
    
    // Check for removed tiles
    for (const key in this.tilesRef) {
      if (!newTiles[key]) {
        return true;
      }
    }
    
    return false;
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
   * Filter tiles based on shadow/invisible mode - NOT grid visibility
   */
  private getVisibleTiles(): TileSummary[] {
    const allTiles = Object.values(this.tilesRef);
    const snap = battlemapStore;
    
    switch (snap.view.layerVisibilityMode) {
      case LayerVisibilityMode.SHADOW:
      case LayerVisibilityMode.NORMAL:
        // SHADOW and NORMAL modes: Show ALL tiles (grid visibility doesn't affect tiles)
        return allTiles;
      case LayerVisibilityMode.INVISIBLE:
        // INVISIBLE mode: Show ONLY active layer tiles
        return allTiles.filter(tile => tile.z_level === snap.view.activeZLayer);
      default:
        return allTiles;
    }
  }

  /**
   * Sort tiles by rendering order (back to front for proper depth)
   */
  private sortTilesByDepth(tiles: TileSummary[]): TileSummary[] {
    return tiles.sort((a, b) => {
      // First sort by Z level (lower Z renders first)
      if (a.z_level !== b.z_level) {
        return a.z_level - b.z_level;
      }
      
      // Then sort by isometric depth (Y then X for proper back-to-front rendering)
      if (a.position[1] !== b.position[1]) {
        return a.position[1] - b.position[1];
      }
      
      return a.position[0] - b.position[0];
    });
  }
  
  /**
   * Main render method
   */
  render(): void {
    if (!this.engine || !this.engine.app) {
      return;
    }
    
    console.log('[IsometricTileRenderer] Starting render cycle...');
    
    // Check if visibility has changed
    const currentTileVisibility = battlemapStore.controls.isTilesVisible;
    const hasVisibilityChanged = this.lastTileVisibility !== currentTileVisibility;
    const hasZLevelChanged = this.lastShowZLevel !== battlemapStore.view.showZLevel;
    
    // Update visibility based on controls
    this.tilesContainer.visible = currentTileVisibility;
    this.fallbackGraphics.visible = currentTileVisibility;
    
    // Early exit if tiles are not visible
    if (!currentTileVisibility) {
      this.clearAllTiles();
      this.updateLastKnownStates();
      console.log('[IsometricTileRenderer] Tiles not visible, cleared and exiting');
      return;
    }
    
    // Check for various changes that require re-rendering
    const hasPositionChanged = 
      this.lastOffset.x !== battlemapStore.view.offset.x || 
      this.lastOffset.y !== battlemapStore.view.offset.y;
    
    const hasGridDiamondWidthChanged = this.lastGridDiamondWidth !== battlemapStore.view.gridDiamondWidth;
    const hasSpriteScaleChanged = this.lastSpriteScale !== battlemapStore.view.spriteScale;
    const hasZoomChanged = this.lastZoomLevel !== battlemapStore.view.zoomLevel;
    
    // ADDED: Check for grid layer visibility changes
    const hasGridLayerVisibilityChanged = 
      this.lastGridLayerVisibility[0] !== battlemapStore.view.gridLayerVisibility[0] ||
      this.lastGridLayerVisibility[1] !== battlemapStore.view.gridLayerVisibility[1] ||
      this.lastGridLayerVisibility[2] !== battlemapStore.view.gridLayerVisibility[2];
    
    // NEW: Check for sprite type settings changes (margins, vertical bias, etc.)
    const hasSpriteTypeSettingsChanged = this.hasSpriteTypeSettingsChanged();
    
    const snap = battlemapStore;
    console.log(`[IsometricTileRenderer] Change detection - Tiles: ${this.tilesNeedUpdate}, Position: ${hasPositionChanged}, Grid: ${hasGridDiamondWidthChanged}, Scale: ${hasSpriteScaleChanged}, Zoom: ${hasZoomChanged}, Z-Level: ${hasZLevelChanged}, Visibility: ${hasVisibilityChanged}, GridLayers: ${hasGridLayerVisibilityChanged}, SpriteSettings: ${hasSpriteTypeSettingsChanged}, WASD: ${snap.view.wasd_moving}`);
    
    // Render tiles if needed - now includes sprite type settings changes
    if (this.tilesNeedUpdate || hasPositionChanged || hasGridDiamondWidthChanged || hasSpriteScaleChanged || hasZoomChanged ||
        hasVisibilityChanged || hasZLevelChanged || hasGridLayerVisibilityChanged || hasSpriteTypeSettingsChanged || battlemapStore.view.wasd_moving) {
      
      console.log('[IsometricTileRenderer] Triggering tile re-render due to changes');
      
      if (this.spritesLoaded) {
        this.renderTilesWithSprites();
      } else {
        this.renderFallbackTiles();
      }
      
      this.tilesNeedUpdate = false;
      this.updateLastKnownStates();
    } else {
      console.log('[IsometricTileRenderer] No changes detected, skipping render');
    }
  }
  
  /**
   * Render tiles using actual isometric sprites
   */
  private renderTilesWithSprites(): void {
    // Clear existing tile sprites
    this.clearAllTiles();
    
    // Get and sort visible tiles
    const visibleTiles = this.getVisibleTiles();
    const sortedTiles = this.sortTilesByDepth(visibleTiles);
    
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
      snap.view.zoomLevel // Include zoom level
    );

    // Render each tile
    sortedTiles.forEach(tile => {
      this.renderSingleTile(tile, isometricOffset);
    });

    console.log('[IsometricTileRenderer] Rendered', sortedTiles.length, 'isometric sprite tiles');
  }

  /**
   * Render a single tile with sprite
   */
  private renderSingleTile(tile: TileSummary, isometricOffset: any): void {
    const [gridX, gridY] = tile.position;
    const tileKey = `${gridX},${gridY},${tile.z_level}`;

    // Get sprite texture
    const spriteName = tile.sprite_name || 'Floor_01';
    const texture = isometricSpriteManager.getSpriteTexture(spriteName, tile.sprite_direction);

    if (!texture) {
      // Fallback to colored diamond if sprite not available
      this.renderFallbackTile(tile, isometricOffset);
      return;
    }

    // Get sprite from pool
    const sprite = this.getPooledSprite();
    sprite.texture = texture;

    // Convert grid position to isometric coordinates using the same system as grid
    const { isoX, isoY } = gridToIsometric(gridX, gridY, isometricOffset.tileSize);

    // Position sprite using the same coordinate system as the grid
    sprite.x = isometricOffset.offsetX + isoX;
    
    // For Y positioning, we need to align with the actual grid diamond bottom
    // Use the ZOOMED grid diamond size (same as what grid uses) for positioning to maintain alignment
    const snap = battlemapStore;
    const zoomedDiamondHeight = isometricOffset.tileSize / 2; // tileSize already includes zoom, 2:1 aspect ratio
    sprite.y = isometricOffset.offsetY + isoY + (zoomedDiamondHeight / 2); // Align to bottom of diamond

    // FIXED: Use Z_LAYER_CONFIG offsets instead of calculated offsets to match grid renderer
    if (tile.z_level < Z_LAYER_CONFIG.maxLayers) {
      const layerConfig = battlemapActions.getAllZLayerConfigs()[tile.z_level];
      sprite.y -= layerConfig.verticalOffset * snap.view.zoomLevel; // Apply Z offset with zoom scaling (same as grid)
    }

    // Apply positioning adjustments using per-sprite settings
    // FIXED: Scale positioning offsets by sprite scale independently, then apply zoom to final positioning
    const spriteScale = snap.view.spriteScale;
    const zoomLevel = snap.view.zoomLevel;
    
    // EXACT USER SPECIFICATION: Get per-sprite-type positioning settings
    let spriteTypeSettings = battlemapActions.getSpriteTypeSettings(spriteName);
    console.log(`[IsometricTileRenderer] Getting settings for ${spriteName}:`, spriteTypeSettings?.autoComputedVerticalBias, spriteTypeSettings?.useAutoComputed);
    
    if (!spriteTypeSettings) {
      // Auto-calculate for sprites without settings using user's exact formula
      const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
      if (spriteFrameSize) {
        const calculated = battlemapActions.calculateSpriteTypePositioning(spriteFrameSize.width, spriteFrameSize.height);
        spriteTypeSettings = calculated;
        // Save the calculated settings
        battlemapActions.setSpriteTypeSettings(spriteName, calculated);
      } else {
        // Fallback to default values
        spriteTypeSettings = {
          invisibleMarginUp: 8,
          invisibleMarginDown: 8,
          invisibleMarginLeft: 8,
          invisibleMarginRight: 8,
          autoComputedVerticalBias: 36,
          useAutoComputed: true,
          manualVerticalBias: 36
        };
      }
    }
    
    // USER SPECIFICATION: Use auto-computed or manual vertical bias based on flag
    const verticalBias = spriteTypeSettings.useAutoComputed 
      ? spriteTypeSettings.autoComputedVerticalBias 
      : spriteTypeSettings.manualVerticalBias;
    
    // For positioning, use the down margin as the primary positioning margin
    const finalInvisibleMargin = spriteTypeSettings.invisibleMarginDown;
    
    // FIXED: Apply positioning based on snap position with proper independent scaling
    // First scale the base offsets by sprite scale, then apply zoom to final positioning
    if (tile.snap_position === 'above') {
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
    const finalScale = spriteScale * zoomLevel; // Both sprite scale and zoom
    
    sprite.scale.set(finalScale);

    // FIXED: Apply visual differentiation based on shadow/invisible mode
    const isActiveLayer = tile.z_level === snap.view.activeZLayer;
    
    switch (snap.view.layerVisibilityMode) {
      case LayerVisibilityMode.SHADOW:
        // SHADOW mode: All tiles visible, non-active layers dimmed/tinted
        if (isActiveLayer) {
          // Active layer: full visibility, no tint
          sprite.alpha = 1.0;
          sprite.tint = 0xFFFFFF; // White (no tint)
        } else {
          // Non-active layer: dimmed with layer color tint
          sprite.alpha = 0.6;
          if (tile.z_level < Z_LAYER_CONFIG.maxLayers) {
            const layerConfig = battlemapActions.getAllZLayerConfigs()[tile.z_level];
            sprite.tint = layerConfig.color;
          }
        }
        break;
      case LayerVisibilityMode.NORMAL:
        // NORMAL mode: All tiles visible with full opacity, no tinting
        sprite.alpha = 1.0;
        sprite.tint = 0xFFFFFF; // White (no tint)
        break;
      case LayerVisibilityMode.INVISIBLE:
        // INVISIBLE mode: Only active layer tiles are rendered (this should only be active layer)
        sprite.alpha = 1.0;
        sprite.tint = 0xFFFFFF; // White (no tint)
        break;
      default:
        sprite.alpha = 1.0;
        sprite.tint = 0xFFFFFF; // White (no tint)
    }

    // Debug info for manual tuning (you can see these values)
    if (Math.random() < 0.01) { // Log occasionally to avoid spam
      const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
      const actualSpriteWidth = spriteFrameSize?.width || 128;
      const actualSpriteHeight = spriteFrameSize?.height || 128;
      const invisibleMarginBase = finalInvisibleMargin;
      const verticalOffsetBase = verticalBias;
      // FIXED: Show separate scaling factors
      const spriteScaledMargin = invisibleMarginBase * spriteScale;
      const finalScaledMargin = spriteScaledMargin * zoomLevel;
      const spriteScaledVerticalOffset = verticalOffsetBase * spriteScale;
      const finalScaledVerticalOffset = spriteScaledVerticalOffset * zoomLevel;
      const layerConfig = tile.z_level < Z_LAYER_CONFIG.maxLayers ? battlemapActions.getAllZLayerConfigs()[tile.z_level] : { name: 'Invalid', verticalOffset: 0 };
      const isCurrentSprite = spriteName === snap.controls.isometricEditor.selectedSpriteName;
      
      // Also show calculations for currently selected sprite (for predictions)
      const selectedSpriteName = snap.controls.isometricEditor.selectedSpriteName;
      if (selectedSpriteName) {
        const selectedSpriteFrameSize = isometricSpriteManager.getSpriteFrameSize(selectedSpriteName);
        const selectedSpriteWidth = selectedSpriteFrameSize?.width || 128;
        const selectedSpriteHeight = selectedSpriteFrameSize?.height || 128;
        console.log(`[IsometricTileRenderer] Current Tile: ${spriteName} (${actualSpriteWidth}x${actualSpriteHeight}px) ${spriteTypeSettings.useAutoComputed ? '🤖AUTO' : '✋MANUAL'} ${isCurrentSprite ? '🎯SELECTED' : ''} [${tile.snap_position.toUpperCase()}] [Z:${tile.z_level}/${layerConfig.name}] [V:${tile.snap_position === 'above' ? verticalOffsetBase : 0}px*${spriteScale}*${zoomLevel}→${tile.snap_position === 'above' ? finalScaledVerticalOffset.toFixed(1) : '0.0'}px, M:${invisibleMarginBase}px*${spriteScale}*${zoomLevel}→${finalScaledMargin.toFixed(1)}px] | Selected: ${selectedSpriteName} (${selectedSpriteWidth}x${selectedSpriteHeight}px) | Grid: ${isometricOffset.tileSize}px`);
      } else {
        console.log(`[IsometricTileRenderer] Current Tile: ${spriteName} (${actualSpriteWidth}x${actualSpriteHeight}px) ${spriteTypeSettings.useAutoComputed ? '🤖AUTO' : '✋MANUAL'} ${isCurrentSprite ? '🎯SELECTED' : ''} [${tile.snap_position.toUpperCase()}] [Z:${tile.z_level}/${layerConfig.name}] [V:${tile.snap_position === 'above' ? verticalOffsetBase : 0}px*${spriteScale}*${zoomLevel}→${tile.snap_position === 'above' ? finalScaledVerticalOffset.toFixed(1) : '0.0'}px, M:${invisibleMarginBase}px*${spriteScale}*${zoomLevel}→${finalScaledMargin.toFixed(1)}px] | Grid: ${isometricOffset.tileSize}px`);
      }
    }

    // Set visibility and add to container
    sprite.visible = true;
    this.tilesContainer.addChild(sprite);
    this.activeTileSprites.set(tileKey, sprite);
  }

  /**
   * Render fallback colored diamond for tiles without sprites
   */
  private renderFallbackTile(tile: TileSummary, isometricOffset: any): void {
    const [gridX, gridY] = tile.position;

    // Convert grid position to isometric coordinates using dynamic grid width
    const snap = battlemapStore;
    const { isoX, isoY } = gridToIsometric(gridX, gridY, snap.view.gridDiamondWidth);

    // Scale and position
    const scaledIsoX = isoX; // No additional scaling
    const scaledIsoY = isoY;
    const centerX = isometricOffset.offsetX + scaledIsoX;
    let centerY = isometricOffset.offsetY + scaledIsoY;
    
    // FIXED: Use Z_LAYER_CONFIG offsets instead of calculated offsets to match grid renderer
    if (tile.z_level < Z_LAYER_CONFIG.maxLayers) {
      const layerConfig = battlemapActions.getAllZLayerConfigs()[tile.z_level];
      centerY -= layerConfig.verticalOffset * snap.view.zoomLevel; // Apply Z offset with zoom scaling (same as grid)
    }

    // Calculate diamond corners using actual grid diamond width
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

    // Get tile color based on type
    const tileColor = this.getTileColor(tile);

    // Draw diamond tile
    this.fallbackGraphics
      .moveTo(topX, topY)
      .lineTo(rightX, rightY)
      .lineTo(bottomX, bottomY)
      .lineTo(leftX, leftY)
      .lineTo(topX, topY)
      .fill({ color: tileColor, alpha: 0.6 })
      .stroke({ color: 0x333333, width: 1, alpha: 0.8 });
  }

  /**
   * Render tiles using colored diamonds (fallback)
   */
  private renderFallbackTiles(): void {
    this.fallbackGraphics.clear();
    
    const visibleTiles = this.getVisibleTiles();
    const sortedTiles = this.sortTilesByDepth(visibleTiles);
    
    const snap = battlemapStore;
    const isometricOffset = calculateIsometricGridOffset(
      this.engine?.containerSize?.width || 0,
      this.engine?.containerSize?.height || 0,
      snap.grid.width,
      snap.grid.height,
      snap.view.gridDiamondWidth, // Use dynamic grid diamond width
      snap.view.offset.x,
      snap.view.offset.y,
      ENTITY_PANEL_WIDTH
    );

    sortedTiles.forEach(tile => {
      this.renderFallbackTile(tile, isometricOffset);
    });

    console.log('[IsometricTileRenderer] Rendered', sortedTiles.length, 'fallback tiles');
  }

  /**
   * Clear all active tile sprites
   */
  private clearAllTiles(): void {
    // Return all active sprites to pool
    this.activeTileSprites.forEach(sprite => {
      this.returnSpriteToPool(sprite);
    });
    this.activeTileSprites.clear();

    // Clear fallback graphics
    this.fallbackGraphics.clear();
  }

  /**
   * Get color for tile based on type - simplified for local editor
   */
  private getTileColor(tile: TileSummary): number {
    // Color based on tile type
    switch (tile.tile_type) {
      case 'floor':
        return 0xD4A574; // Light brown
      case 'wall':
        return 0x666666; // Gray
      case 'decoration':
        return 0x7ED321; // Green
      default:
        return tile.walkable ? 0x7ED321 : 0x666666;
    }
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    // Clear all tiles
    this.clearAllTiles();
    
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
    if (this.tilesContainer && !this.tilesContainer.destroyed) {
      this.tilesContainer.destroy({ children: true });
    }
    
    // Call parent destroy
    super.destroy();
  }

  /**
   * Check if sprite type settings have changed (margins, vertical bias, etc.)
   */
  private hasSpriteTypeSettingsChanged(): boolean {
    const currentHash = JSON.stringify(battlemapStore.controls.isometricEditor.spriteTypeSettings);
    const hasChanged = this.lastSpriteTypeSettingsHash !== currentHash;
    if (hasChanged) {
      console.log(`[IsometricTileRenderer] Sprite type settings changed! Old hash length: ${this.lastSpriteTypeSettingsHash.length}, New hash length: ${currentHash.length}`);
    }
    return hasChanged;
  }
} 