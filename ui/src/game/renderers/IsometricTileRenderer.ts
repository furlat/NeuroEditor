import { Graphics, Sprite, Container } from 'pixi.js';
import { battlemapStore } from '../../store';
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
  private lastVerticalOffset = 0;
  private lastInvisibleMargin = 0;
  private spritesLoaded = false;

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
    this.lastVerticalOffset = battlemapStore.view.spriteVerticalOffset;
    this.lastInvisibleMargin = battlemapStore.view.spriteInvisibleMargin;
  }
  
  /**
   * Set up subscriptions to the Valtio store
   */
  private setupSubscriptions(): void {
    // Subscribe to grid changes (for tile updates)
    const unsubGrid = subscribe(battlemapStore.grid, () => {
      const hasChanges = this.hasTilesChanged(battlemapStore.grid.tiles);
      
      if (hasChanges) {
        this.tilesRef = {...battlemapStore.grid.tiles};
        this.tilesNeedUpdate = true;
      }
      
      this.render();
    });
    this.addSubscription(unsubGrid);
    
    // Subscribe to view changes (zooming, panning, Z-level filtering)
    const unsubView = subscribe(battlemapStore.view, () => {
      this.render();
    });
    this.addSubscription(unsubView);
    
    // Subscribe to control changes (e.g., tile visibility)
    const unsubControls = subscribe(battlemapStore.controls, () => {
      this.render();
    });
    this.addSubscription(unsubControls);
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
      
      // Check for sprite changes
      if (oldTile.sprite_name !== newTile.sprite_name ||
          oldTile.sprite_direction !== newTile.sprite_direction ||
          oldTile.z_level !== newTile.z_level) {
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
   * Filter tiles based on current Z-level display setting
   */
  private getVisibleTiles(): TileSummary[] {
    const showZLevel = battlemapStore.view.showZLevel;
    const allTiles = Object.values(this.tilesRef);
    
    if (showZLevel === -1) {
      // Show all Z levels
      return allTiles;
    } else {
      // Show only specific Z level
      return allTiles.filter(tile => tile.z_level === showZLevel);
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
      return;
    }
    
    // Check for various changes that require re-rendering
    const hasPositionChanged = 
      this.lastOffset.x !== battlemapStore.view.offset.x || 
      this.lastOffset.y !== battlemapStore.view.offset.y;
    
    const hasGridDiamondWidthChanged = this.lastGridDiamondWidth !== battlemapStore.view.gridDiamondWidth;
    const hasSpriteScaleChanged = this.lastSpriteScale !== battlemapStore.view.spriteScale;
    const hasZoomChanged = this.lastZoomLevel !== battlemapStore.view.zoomLevel;
    const hasVerticalOffsetChanged = this.lastVerticalOffset !== battlemapStore.view.spriteVerticalOffset;
    const hasInvisibleMarginChanged = this.lastInvisibleMargin !== battlemapStore.view.spriteInvisibleMargin;
    
    // Render tiles if needed - now includes zoom change detection
    if (this.tilesNeedUpdate || hasPositionChanged || hasGridDiamondWidthChanged || hasSpriteScaleChanged || hasZoomChanged ||
        hasVisibilityChanged || hasZLevelChanged || hasVerticalOffsetChanged || hasInvisibleMarginChanged || battlemapStore.view.wasd_moving) {
      
      if (this.spritesLoaded) {
        this.renderTilesWithSprites();
      } else {
        this.renderFallbackTiles();
      }
      
      this.tilesNeedUpdate = false;
      this.updateLastKnownStates();
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

    // Add Z-level offset using zoomed diamond size for proper layering
    sprite.y -= tile.z_level * (zoomedDiamondHeight * 0.5);

    // Apply positioning adjustments
    // All values are base offsets at 100% sprite scale, scaled by both spriteScale and zoomLevel
    const scaleFactor = snap.view.spriteScale * snap.view.zoomLevel;
    
    // Invisible margin: internal positioning adjustment (base value scaled by sprite scale and zoom)
    sprite.y += snap.view.spriteInvisibleMargin * scaleFactor;
    // Vertical offset: user fine-tuning (base value scaled by sprite scale and zoom)  
    sprite.y += snap.view.spriteVerticalOffset * scaleFactor;

    // Set anchor to center bottom for proper isometric positioning
    sprite.anchor.set(0.5, 1.0);

    // Apply both sprite scale AND zoom level for consistent scaling with grid
    const spriteScale = snap.view.spriteScale;
    const zoomLevel = snap.view.zoomLevel;
    const finalScale = spriteScale * zoomLevel; // Both sprite scale and zoom
    
    sprite.scale.set(finalScale);

    // Debug info for manual tuning (you can see these values)
    if (Math.random() < 0.01) { // Log occasionally to avoid spam
      const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
      const actualSpriteWidth = spriteFrameSize?.width || 128;
      const actualSpriteHeight = spriteFrameSize?.height || 128;
      const invisibleMarginBase = snap.view.spriteInvisibleMargin;
      const invisibleMarginScaled = invisibleMarginBase * scaleFactor;
      
      // Also show calculations for currently selected sprite (for predictions)
      const selectedSpriteName = snap.controls.isometricEditor.selectedSpriteName;
      if (selectedSpriteName) {
        const selectedSpriteFrameSize = isometricSpriteManager.getSpriteFrameSize(selectedSpriteName);
        const selectedSpriteWidth = selectedSpriteFrameSize?.width || 128;
        const selectedSpriteHeight = selectedSpriteFrameSize?.height || 128;
        console.log(`[IsometricTileRenderer] Current Tile: ${spriteName} (${actualSpriteWidth}x${actualSpriteHeight}px) | Selected Sprite: ${selectedSpriteName} (${selectedSpriteWidth}x${selectedSpriteHeight}px) | Grid: ${isometricOffset.tileSize}px, SpriteScale: ${spriteScale.toFixed(2)}, Zoom: ${snap.view.zoomLevel.toFixed(2)}, GridDiamondWidth: ${snap.view.gridDiamondWidth}px, InvisibleMargin: ${invisibleMarginBase}px (scaled: ${invisibleMarginScaled.toFixed(1)}px)`);
      } else {
        console.log(`[IsometricTileRenderer] Current Tile: ${spriteName} (${actualSpriteWidth}x${actualSpriteHeight}px) | No Selected Sprite | Grid: ${isometricOffset.tileSize}px, SpriteScale: ${spriteScale.toFixed(2)}, Zoom: ${snap.view.zoomLevel.toFixed(2)}, GridDiamondWidth: ${snap.view.gridDiamondWidth}px, InvisibleMargin: ${invisibleMarginBase}px (scaled: ${invisibleMarginScaled.toFixed(1)}px)`);
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
    const centerY = isometricOffset.offsetY + scaledIsoY - (tile.z_level * snap.view.gridDiamondWidth * 0.25);

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
} 