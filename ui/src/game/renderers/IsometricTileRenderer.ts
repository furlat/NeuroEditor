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

/**
 * Unified sprite object for rendering both tiles and walls
 */
interface RenderableSprite {
  type: 'tile' | 'wall';
  uuid: string;
  position: readonly [number, number];
  z_level: number;
  sprite_name: string | null;
  sprite_direction: IsometricDirection;
  snap_position: 'above' | 'below';
  wall_direction?: IsometricDirection; // Only for walls
}

/**
 * Enhanced IsometricTileRenderer for rendering actual isometric sprites
 * Supports multi-Z-axis rendering, 4-directional sprites, and proper depth sorting
 * NOW RENDERS BOTH TILES AND WALLS
 */
export class IsometricTileRenderer extends AbstractRenderer {
  // Specify which layer this renderer belongs to
  get layerName(): LayerName { return 'tiles'; }
  
  // Container for sprite-based tiles and walls
  private tilesContainer: Container = new Container();
  
  // Fallback graphics for tiles without sprites
  private fallbackGraphics: Graphics = new Graphics();
  
  // Reference to tiles and walls for stable rendering during movement
  private tilesRef: Record<string, TileSummary> = {};
  private wallsRef: Record<string, WallSummary> = {};
  
  // Sprite pool for efficient rendering
  private spritePool: Sprite[] = [];
  private activeTileSprites: Map<string, Sprite> = new Map();
  private activeWallSprites: Map<string, Sprite> = new Map();
  
  // Flag to track when tiles/walls need to be redrawn
  private tilesNeedUpdate: boolean = true;
  private wallsNeedUpdate: boolean = true;
  
  // Last known states for change detection
  private lastOffset = { x: 0, y: 0 };
  private lastGridDiamondWidth = 100;
  private lastSpriteScale = 1.0;
  private lastTileVisibility = true;
  private lastShowZLevel = -1;
  private lastZoomLevel = 1.0;
  private lastGridLayerVisibility: { [zLayer: number]: boolean } = { 0: true, 1: true, 2: true };
  private spritesLoaded = false;
  // Track sprite type settings changes (for both tiles and walls)
  private lastSpriteTypeSettingsHash: string = '';
  private lastWallPositioningSettingsHash: string = '';

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
    
    // Initial tile and wall data
    this.tilesRef = {...battlemapStore.grid.tiles};
    this.wallsRef = {...battlemapStore.grid.walls};
    
    // Initialize last states
    this.updateLastKnownStates();
    
    // Force initial render
    this.tilesNeedUpdate = true;
    this.wallsNeedUpdate = true;
    
    console.log('[IsometricTileRenderer] Initialized with sprite support for tiles and walls');
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
      this.wallsNeedUpdate = true;
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
    this.lastWallPositioningSettingsHash = JSON.stringify(battlemapStore.controls.isometricEditor.wallPositioningSettings);
  }
  
  /**
   * Set up subscriptions to the Valtio store
   */
  private setupSubscriptions(): void {
    // Subscribe to the root store for broader reactivity
    this.addSubscription(subscribe(battlemapStore, () => {
      // console.log('[IsometricTileRenderer] Store changed, checking for relevant changes');
      
      const hasTileChanges = this.hasTilesChanged(battlemapStore.grid.tiles);
      const hasWallChanges = this.hasWallsChanged(battlemapStore.grid.walls);
      
      if (hasTileChanges) {
          this.tilesRef = {...battlemapStore.grid.tiles};
          this.tilesNeedUpdate = true;
      }
      
      if (hasWallChanges) {
        this.wallsRef = {...battlemapStore.grid.walls};
        this.wallsNeedUpdate = true;
      }
      
      this.render();
    }));
    
    // Also set up a manual render trigger that can be called from outside
    (window as any).__forceTileRender = () => {
      // console.log('[IsometricTileRenderer] Manual render trigger called');
      this.tilesNeedUpdate = true;
      this.wallsNeedUpdate = true;
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
   * Check if the walls have significantly changed to warrant a re-render
   */
  private hasWallsChanged(newWalls: Record<string, WallSummary>): boolean {
    // Quick check: different number of walls
    if (Object.keys(this.wallsRef).length !== Object.keys(newWalls).length) {
      return true;
    }
    
    // Check each wall for changes
    for (const key in newWalls) {
      const oldWall = this.wallsRef[key];
      const newWall = newWalls[key];
      
      // New wall that didn't exist before
      if (!oldWall) {
        return true;
      }
      
      // Check for sprite changes
      if (oldWall.sprite_name !== newWall.sprite_name ||
          oldWall.sprite_direction !== newWall.sprite_direction ||
          oldWall.wall_direction !== newWall.wall_direction ||
          oldWall.z_level !== newWall.z_level ||
          oldWall.snap_position !== newWall.snap_position) {
        return true;
      }
    }
    
    // Check for removed walls
    for (const key in this.wallsRef) {
      if (!newWalls[key]) {
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
   * Filter walls based on shadow/invisible mode - EXACT SAME LOGIC AS TILES
   */
  private getVisibleWalls(): WallSummary[] {
    const allWalls = Object.values(this.wallsRef);
    const snap = battlemapStore;
    
    switch (snap.view.layerVisibilityMode) {
      case LayerVisibilityMode.SHADOW:
      case LayerVisibilityMode.NORMAL:
        // SHADOW and NORMAL modes: Show ALL walls (grid visibility doesn't affect walls, same as tiles)
        return allWalls;
      case LayerVisibilityMode.INVISIBLE:
        // INVISIBLE mode: Show ONLY active layer walls
        return allWalls.filter(wall => wall.z_level === snap.view.activeZLayer);
      default:
        return allWalls;
    }
  }

  /**
   * Convert tiles and walls to unified renderable sprites and sort by depth
   */
  private getVisibleRenderableSprites(): RenderableSprite[] {
    const visibleTiles = this.getVisibleTiles();
    const visibleWalls = this.getVisibleWalls();
    
    // Convert tiles to renderable sprites
    const tileSprites: RenderableSprite[] = visibleTiles.map(tile => ({
      type: 'tile' as const,
      uuid: tile.uuid,
      position: tile.position,
      z_level: tile.z_level,
      sprite_name: tile.sprite_name,
      sprite_direction: tile.sprite_direction,
      snap_position: tile.snap_position,
    }));
    
    // Convert walls to renderable sprites
    const wallSprites: RenderableSprite[] = visibleWalls.map(wall => ({
      type: 'wall' as const,
      uuid: wall.uuid,
      position: wall.position,
      z_level: wall.z_level,
      sprite_name: wall.sprite_name,
      sprite_direction: wall.sprite_direction,
      snap_position: wall.snap_position,
      wall_direction: wall.wall_direction,
    }));
    
    // Combine and sort by depth
    const allSprites = [...tileSprites, ...wallSprites];
    return this.sortSpritesByDepth(allSprites);
  }

  /**
   * Sort sprites by depth for proper isometric rendering
   */
  private sortSpritesByDepth(sprites: RenderableSprite[]): RenderableSprite[] {
    return sprites.sort((a, b) => {
      // First sort by Z level (lower Z renders first)
      if (a.z_level !== b.z_level) {
        return a.z_level - b.z_level;
      }
      
      // Then sort by isometric depth (Y then X for proper back-to-front rendering)
      if (a.position[1] !== b.position[1]) {
        return a.position[1] - b.position[1];
      }
      
      if (a.position[0] !== b.position[0]) {
      return a.position[0] - b.position[0];
      }
      
      // If position is the same, walls render after tiles (walls on top)
      if (a.type !== b.type) {
        return a.type === 'tile' ? -1 : 1;
      }
      
      // For walls: basic edge sorting (user will handle detailed positioning)
      if (a.type === 'wall' && b.type === 'wall') {
        const wallA = a as unknown as WallSummary;
        const wallB = b as unknown as WallSummary;
        
        // Simple edge ordering: North -> East -> South -> West
        return wallA.wall_direction - wallB.wall_direction;
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
    
    // console.log('[IsometricTileRenderer] Starting render cycle...');
    
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
      // console.log('[IsometricTileRenderer] Tiles not visible, cleared and exiting');
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
    const hasWallPositioningSettingsChanged = this.hasWallPositioningSettingsChanged();
    
    const snap = battlemapStore;
    // console.log(`[IsometricTileRenderer] Change detection - Tiles: ${this.tilesNeedUpdate}, Walls: ${this.wallsNeedUpdate}, Position: ${hasPositionChanged}, Grid: ${hasGridDiamondWidthChanged}, Scale: ${hasSpriteScaleChanged}, Zoom: ${hasZoomChanged}, Z-Level: ${hasZLevelChanged}, Visibility: ${hasVisibilityChanged}, GridLayers: ${hasGridLayerVisibilityChanged}, SpriteSettings: ${hasSpriteTypeSettingsChanged}, WallSettings: ${hasWallPositioningSettingsChanged}, WASD: ${snap.view.wasd_moving}`);
    
    // Render sprites if needed - now includes both tiles and walls
    if (this.tilesNeedUpdate || this.wallsNeedUpdate || hasPositionChanged || hasGridDiamondWidthChanged || hasSpriteScaleChanged || hasZoomChanged ||
        hasVisibilityChanged || hasZLevelChanged || hasGridLayerVisibilityChanged || hasSpriteTypeSettingsChanged || hasWallPositioningSettingsChanged || battlemapStore.view.wasd_moving) {
      
      // console.log('[IsometricTileRenderer] Triggering sprite re-render due to changes');
      
      if (this.spritesLoaded) {
        this.renderSpritesWithTextures();
      } else {
        this.renderFallbackSprites();
      }
      
      this.tilesNeedUpdate = false;
      this.wallsNeedUpdate = false;
      this.updateLastKnownStates();
    } else {
      // console.log('[IsometricTileRenderer] No changes detected, skipping render');
    }
  }
  
  /**
   * Render tiles and walls using actual isometric sprites
   */
  private renderSpritesWithTextures(): void {
    // Clear existing sprites
    this.clearAllTiles(); // This already clears both tiles and walls
    
    // Get and sort visible tiles
    const visibleTiles = this.getVisibleTiles();
    const visibleWalls = this.getVisibleWalls();
    
    // Combine tiles and walls for unified depth sorting
    const allSprites = [
      ...visibleTiles.map(tile => ({ ...tile, type: 'tile' as const })),
      ...visibleWalls.map(wall => ({ ...wall, type: 'wall' as const }))
    ];
    
    // Sort by depth (IMPROVED logic for walls)
    const sortedSprites = allSprites.sort((a, b) => {
      // First sort by Z level (lower Z renders first)
      if (a.z_level !== b.z_level) {
        return a.z_level - b.z_level;
      }
      
      // Then sort by isometric depth (Y then X for proper back-to-front rendering)
      if (a.position[1] !== b.position[1]) {
        return a.position[1] - b.position[1];
      }
      
      if (a.position[0] !== b.position[0]) {
        return a.position[0] - b.position[0];
      }
      
      // If position is the same, walls render after tiles (walls on top)
      if (a.type !== b.type) {
        return a.type === 'tile' ? -1 : 1;
      }
      
      // For walls: basic edge sorting (user will handle detailed positioning)
      if (a.type === 'wall' && b.type === 'wall') {
        const wallA = a as unknown as WallSummary;
        const wallB = b as unknown as WallSummary;
        
        // Simple edge ordering: North -> East -> South -> West
        return wallA.wall_direction - wallB.wall_direction;
      }
      
      return 0;
    });
    
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

    // Render each sprite
    sortedSprites.forEach(spriteData => {
      if (spriteData.type === 'wall') {
        this.renderSingleWall(spriteData as WallSummary, isometricOffset);
      } else {
        this.renderSingleTile(spriteData as TileSummary, isometricOffset);
      }
    });

    // console.log('[IsometricTileRenderer] Rendered', sortedSprites.length, 'sprites (', visibleTiles.length, 'tiles +', visibleWalls.length, 'walls)');
  }

  /**
   * Render a single tile with sprite (existing method - keep unchanged)
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
    this.applyTilePositioning(sprite, tile, spriteName, snap);

    // Set visibility and add to container
    sprite.visible = true;
    this.tilesContainer.addChild(sprite);
    this.activeTileSprites.set(tileKey, sprite);
  }

  /**
   * Apply positioning settings to a tile sprite
   */
  private applyTilePositioning(sprite: any, tile: TileSummary, spriteName: string, snap: any): void {
    // Apply positioning adjustments using per-sprite settings
    // FIXED: Scale positioning offsets by sprite scale independently, then apply zoom to final positioning
    const spriteScale = snap.view.spriteScale;
    const zoomLevel = snap.view.zoomLevel;
    
    // EXACT USER SPECIFICATION: Get per-sprite-type positioning settings
    let spriteTypeSettings = battlemapActions.getSpriteTypeSettings(spriteName, tile.sprite_direction);
    
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
  }

  /**
   * Render a single wall with sprite (new method - uses edge positioning)
   */
  private renderSingleWall(wall: WallSummary, isometricOffset: any): void {
    const [gridX, gridY] = wall.position;
    const wallKey = wall.uuid; // Use wall UUID as key to support multiple walls per edge

    // Get sprite texture
    const spriteName = wall.sprite_name || 'Floor_01';
    const texture = isometricSpriteManager.getSpriteTexture(spriteName, wall.sprite_direction);

    if (!texture) {
      // Fallback - for now just skip walls without textures
      return;
    }

    // Get sprite from pool
    const sprite = this.getPooledSprite();
    sprite.texture = texture;

    // FIXED: Position wall at the correct diamond edge instead of center
    const edgePosition = getWallEdgePosition(gridX, gridY, wall.wall_direction, isometricOffset);
    sprite.x = edgePosition.x;
    sprite.y = edgePosition.y;

    // Apply Z offset (same as tiles)
    const snap = battlemapStore;
    if (wall.z_level < Z_LAYER_CONFIG.maxLayers) {
      const layerConfig = battlemapActions.getAllZLayerConfigs()[wall.z_level];
      sprite.y -= layerConfig.verticalOffset * snap.view.zoomLevel;
    }

    // FIXED: Set direction-specific anchor point instead of center-bottom
    const anchor = getWallSpriteAnchor(wall.wall_direction);
    sprite.anchor.set(anchor.x, anchor.y);

    // Apply wall positioning (uses same system as tiles now)
    this.applyWallPositioning(sprite, wall, spriteName, snap);

    // Set visibility and add to container
    sprite.visible = true;
    this.tilesContainer.addChild(sprite);
    this.activeWallSprites.set(wallKey, sprite);
  }

  /**
   * Apply positioning settings to a wall sprite (same system as tiles but respects edge anchoring)
   */
  private applyWallPositioning(sprite: any, wall: WallSummary, spriteName: string, snap: any): void {
    // Get wall positioning settings for this sprite WITH direction support
    let wallPositioningSettings = battlemapActions.getWallPositioningSettings(spriteName, wall.sprite_direction);
    if (!wallPositioningSettings) {
      // Auto-calculate for walls without settings using simple manual defaults
      const calculated = battlemapActions.calculateWallPositioning(0, 0); // Don't need sprite size for walls
      wallPositioningSettings = calculated;
      // Save the calculated settings
      battlemapActions.setWallPositioningSettings(spriteName, calculated);
      console.log(`[IsometricTileRenderer] Auto-calculated wall positioning settings for ${spriteName}`);
    }

    // NEW: Compute and store bounding box if not already computed
    if (!wallPositioningSettings.spriteBoundingBox && sprite.texture) {
      try {
        // Create temporary canvas and extract texture data
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (context) {
          canvas.width = sprite.texture.width;
          canvas.height = sprite.texture.height;
          
          const renderer = this.engine?.app?.renderer;
          if (renderer) {
            const textureData = renderer.extract.canvas(sprite.texture) as HTMLCanvasElement;
            context.drawImage(textureData, 0, 0);
            
            const boundingBox = getCanvasBoundingBox(canvas, 1);
            
            if (boundingBox.width > 0 && boundingBox.height > 0) {
              // Store bounding box relationship
              const updatedSettings = {
                ...wallPositioningSettings,
                spriteBoundingBox: {
                  originalWidth: sprite.texture.width,
                  originalHeight: sprite.texture.height,
                  boundingX: boundingBox.x,
                  boundingY: boundingBox.y,
                  boundingWidth: boundingBox.width,
                  boundingHeight: boundingBox.height,
                  anchorOffsetX: boundingBox.x / sprite.texture.width,
                  anchorOffsetY: boundingBox.y / sprite.texture.height
                }
              };
              
              battlemapActions.setWallPositioningSettings(spriteName, updatedSettings);
              wallPositioningSettings = updatedSettings;
              
              console.log(`[IsometricTileRenderer] Computed and stored bounding box for ${spriteName}:`, updatedSettings.spriteBoundingBox);
            }
          }
        }
      } catch (error) {
        console.warn(`[IsometricTileRenderer] Failed to compute bounding box for ${spriteName}:`, error);
      }
    }

    // NEW: Apply sprite trimming if enabled
    if (wallPositioningSettings.useSpriteTrimmingForWalls && wallPositioningSettings.spriteBoundingBox) {
      // Use stored bounding box relationship (computed once, reused always)
      const bbox = wallPositioningSettings.spriteBoundingBox;
      
      // Get the direction-based anchor logic (same as before)
      const directionAnchor = getWallSpriteAnchor(wall.wall_direction);
      
      // Convert the direction-based anchor from bbox coordinates to sprite coordinates
      let bboxAnchorX: number, bboxAnchorY: number;
      
      // Apply the same anchor logic but to the bounding box rectangle
      if (directionAnchor.x === 0.0) {
        // Left edge of bbox
        bboxAnchorX = bbox.boundingX;
      } else if (directionAnchor.x === 1.0) {
        // Right edge of bbox  
        bboxAnchorX = bbox.boundingX + bbox.boundingWidth;
      } else {
        // Center or other position
        bboxAnchorX = bbox.boundingX + (bbox.boundingWidth * directionAnchor.x);
      }
      
      if (directionAnchor.y === 0.0) {
        // Top edge of bbox
        bboxAnchorY = bbox.boundingY;
      } else if (directionAnchor.y === 1.0) {
        // Bottom edge of bbox
        bboxAnchorY = bbox.boundingY + bbox.boundingHeight;
      } else {
        // Center or other position
        bboxAnchorY = bbox.boundingY + (bbox.boundingHeight * directionAnchor.y);
      }
      
      // Convert bbox anchor coordinates to sprite coordinates (0-1 range)
      const spriteAnchorX = bboxAnchorX / bbox.originalWidth;
      const spriteAnchorY = bboxAnchorY / bbox.originalHeight;
      
      // Apply the converted anchor (no position adjustments needed)
      sprite.anchor.set(spriteAnchorX, spriteAnchorY);
      
      console.log(`[IsometricTileRenderer] Applied bbox anchor to ${spriteName}: direction(${directionAnchor.x}, ${directionAnchor.y}) -> bbox(${bboxAnchorX}, ${bboxAnchorY}) -> sprite(${spriteAnchorX.toFixed(3)}, ${spriteAnchorY.toFixed(3)})`);
    } else if (wallPositioningSettings.useSpriteTrimmingForWalls && !wallPositioningSettings.spriteBoundingBox) {
      console.warn(`[IsometricTileRenderer] Sprite trimming enabled for ${spriteName} but no bounding box stored. Please toggle trimming off and on again to recompute.`);
    }

    // Apply positioning adjustments using per-wall settings (SAME SYSTEM AS BLOCKS)
    // FIXED: Scale positioning offsets by sprite scale independently, then apply zoom to final positioning
    const spriteScale = snap.view.spriteScale;
    const zoomLevel = snap.view.zoomLevel;
    
    // Apply vertical positioning (same as blocks)
    const verticalBias = wallPositioningSettings.manualVerticalBias;
    const finalInvisibleMargin = wallPositioningSettings.invisibleMarginDown;
    
    // Apply positioning based on snap position with proper independent scaling
    if (wall.snap_position === 'above') {
      // Above positioning: apply vertical bias + invisible margin, scaled by sprite scale first
      const spriteScaledOffset = (verticalBias + finalInvisibleMargin) * spriteScale;
      sprite.y += spriteScaledOffset * zoomLevel;
    } else {
      // Below positioning: only apply invisible margin to snap to edge
      const spriteScaledOffset = finalInvisibleMargin * spriteScale;
      sprite.y += spriteScaledOffset * zoomLevel;
    }

    // NEW: Apply horizontal offset for fine-tuning wall X position
    const horizontalOffset = wallPositioningSettings.manualHorizontalOffset || 0;
    if (horizontalOffset !== 0) {
      const spriteScaledHorizontalOffset = horizontalOffset * spriteScale;
      sprite.x += spriteScaledHorizontalOffset * zoomLevel;
      console.log(`[IsometricTileRenderer] Applied horizontal offset to ${spriteName}: ${horizontalOffset}px (scaled: ${spriteScaledHorizontalOffset * zoomLevel}px)`);
    }

    // NEW: Apply diagonal offsets along diamond border axes
    const diagonalNEOffset = wallPositioningSettings.manualDiagonalNorthEastOffset || 0;
    const diagonalNWOffset = wallPositioningSettings.manualDiagonalNorthWestOffset || 0;
    
    if (diagonalNEOffset !== 0 || diagonalNWOffset !== 0) {
      // NE diagonal: positive values move toward northeast (right+up), negative toward southwest (left+down)  
      // NW diagonal: positive values move toward northwest (left+up), negative toward southeast (right+down)
      
      // Convert diagonal movement to X,Y components
      // For isometric grid: NE diagonal has slope 0.5, NW diagonal has slope -0.5
      const neXComponent = diagonalNEOffset * Math.cos(Math.PI / 6); // ~0.866 (diamond width component)
      const neYComponent = -diagonalNEOffset * Math.sin(Math.PI / 6); // ~-0.5 (diamond height component, negative = up)
      
      const nwXComponent = -diagonalNWOffset * Math.cos(Math.PI / 6); // ~-0.866 (negative = left)
      const nwYComponent = -diagonalNWOffset * Math.sin(Math.PI / 6); // ~-0.5 (negative = up)
      
      // Apply scaled and zoomed offsets
      const totalXOffset = (neXComponent + nwXComponent) * spriteScale * zoomLevel;
      const totalYOffset = (neYComponent + nwYComponent) * spriteScale * zoomLevel;
      
      sprite.x += totalXOffset;
      sprite.y += totalYOffset;
      
      if (diagonalNEOffset !== 0 || diagonalNWOffset !== 0) {
        console.log(`[IsometricTileRenderer] Applied diagonal offsets to ${spriteName}: NE=${diagonalNEOffset}px, NW=${diagonalNWOffset}px (total X=${totalXOffset.toFixed(1)}px, Y=${totalYOffset.toFixed(1)}px)`);
      }
    }

    // NEW: Apply wall-relative offsets (the magic happens here!)
    const relativeAlongEdge = wallPositioningSettings.relativeAlongEdgeOffset || 0;
    const relativeTowardCenter = wallPositioningSettings.relativeTowardCenterOffset || 0;
    const relativeDiagA = wallPositioningSettings.relativeDiagonalAOffset || 0;
    const relativeDiagB = wallPositioningSettings.relativeDiagonalBOffset || 0;
    
    if (relativeAlongEdge !== 0 || relativeTowardCenter !== 0 || relativeDiagA !== 0 || relativeDiagB !== 0) {
      // Convert relative directions to actual screen directions based on wall direction
      let alongEdgeX = 0, alongEdgeY = 0;       // Direction parallel to wall edge
      let towardCenterX = 0, towardCenterY = 0; // Direction toward diamond center
      let diagAX = 0, diagAY = 0;               // First diagonal relative to edge
      let diagBX = 0, diagBY = 0;               // Second diagonal relative to edge
      
      // NEW: Sign multipliers for consistent diagonal normalization
      // User inputs positive values (8, 3) - system applies correct signs per wall direction
      let diagASignMultiplier = 1;
      let diagBSignMultiplier = 1;
      
      // NEW: Check sprite-specific division setting
      const useADivision = wallPositioningSettings.useADivisionForNorthEast ?? true; // Default to true for backward compatibility
      
      switch (wall.wall_direction) {
        case IsometricDirection.NORTH: // Top edge
          // Along edge: left/right along top edge
          alongEdgeX = 1; alongEdgeY = 0;
          // Toward center: down into diamond
          towardCenterX = 0; towardCenterY = 1;
          // Diagonal normalization: North needs A=-4 (8÷2) if division enabled, A=-8 if disabled, B=-3
          diagASignMultiplier = useADivision ? -0.5 : -1; // NEW: Use flag to control division
          diagBSignMultiplier = -1;
          // Standard diagonal directions (before sign application)
          diagAX = Math.cos(Math.PI / 4); diagAY = Math.sin(Math.PI / 4);
          diagBX = Math.cos(-Math.PI / 4); diagBY = Math.sin(-Math.PI / 4);
          break;
          
        case IsometricDirection.EAST: // Right edge
          // Along edge: up/down along right edge
          alongEdgeX = 0; alongEdgeY = 1;
          // Toward center: left into diamond
          towardCenterX = -1; towardCenterY = 0;
          // Diagonal normalization: East needs A=-4 (8÷2) if division enabled, A=-8 if disabled, B=+3
          diagASignMultiplier = useADivision ? -0.5 : -1; // NEW: Use flag to control division
          diagBSignMultiplier = +1;
          // Standard diagonal directions (before sign application)
          diagAX = Math.cos(Math.PI / 2 + Math.PI / 4); diagAY = Math.sin(Math.PI / 2 + Math.PI / 4);
          diagBX = Math.cos(Math.PI / 2 - Math.PI / 4); diagBY = Math.sin(Math.PI / 2 - Math.PI / 4);
          break;
          
        case IsometricDirection.SOUTH: // Bottom edge
          // Along edge: right/left along bottom edge
          alongEdgeX = -1; alongEdgeY = 0;
          // Toward center: up into diamond
          towardCenterX = 0; towardCenterY = -1;
          // Diagonal normalization: South needs A=+8, B=+3 → both positive (PERFECT)
          diagASignMultiplier = +1;
          diagBSignMultiplier = +1;
          // Standard diagonal directions (before sign application)
          diagAX = Math.cos(Math.PI + Math.PI / 4); diagAY = Math.sin(Math.PI + Math.PI / 4);
          diagBX = Math.cos(Math.PI - Math.PI / 4); diagBY = Math.sin(Math.PI - Math.PI / 4);
          break;
          
        case IsometricDirection.WEST: // Left edge
          // Along edge: down/up along left edge
          alongEdgeX = 0; alongEdgeY = -1;
          // Toward center: right into diamond
          towardCenterX = 1; towardCenterY = 0;
          // Diagonal normalization: West needs A=+8, B=-3 → A positive, B negative (PERFECT)
          diagASignMultiplier = +1;
          diagBSignMultiplier = -1;
          // Standard diagonal directions (before sign application)
          diagAX = Math.cos(-Math.PI / 2 + Math.PI / 4); diagAY = Math.sin(-Math.PI / 2 + Math.PI / 4);
          diagBX = Math.cos(-Math.PI / 2 - Math.PI / 4); diagBY = Math.sin(-Math.PI / 2 - Math.PI / 4);
          break;
      }
      
      // Calculate total relative offset with NORMALIZED diagonal inputs
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
      
      // Apply the relative offsets
      sprite.x += totalRelativeX;
      sprite.y += totalRelativeY;
      
      console.log(`[IsometricTileRenderer] Applied NORMALIZED wall-relative offsets to ${spriteName} (${['North', 'East', 'South', 'West'][wall.wall_direction]} wall): DiagA=${relativeDiagA}×${diagASignMultiplier}=${relativeDiagA * diagASignMultiplier}, DiagB=${relativeDiagB}×${diagBSignMultiplier}=${relativeDiagB * diagBSignMultiplier} (A-Division: ${useADivision ? 'ON' : 'OFF'}) → (${totalRelativeX.toFixed(1)}, ${totalRelativeY.toFixed(1)})`);
    }

    // FIXED: Don't override anchor - it's already set correctly based on wall direction
    // Set scale only
    const finalScale = spriteScale * zoomLevel;
    sprite.scale.set(finalScale);

    // Apply visual effects (same as tiles)
    const isActiveLayer = wall.z_level === snap.view.activeZLayer;
    
    switch (snap.view.layerVisibilityMode) {
      case LayerVisibilityMode.SHADOW:
        if (isActiveLayer) {
          sprite.alpha = 1.0;
          sprite.tint = 0xFFFFFF;
        } else {
          sprite.alpha = 0.6;
          if (wall.z_level < Z_LAYER_CONFIG.maxLayers) {
            const layerConfig = battlemapActions.getAllZLayerConfigs()[wall.z_level];
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
  private renderFallbackSprites(): void {
    this.fallbackGraphics.clear();
    
    const visibleTiles = this.getVisibleTiles();
    const visibleWalls = this.getVisibleWalls();
    
    // Combine and sort (simple version)
    const allSprites = [...visibleTiles, ...visibleWalls];
    const sortedSprites = allSprites.sort((a, b) => {
      if (a.z_level !== b.z_level) return a.z_level - b.z_level;
      if (a.position[1] !== b.position[1]) return a.position[1] - b.position[1];
      return a.position[0] - b.position[0];
    });
    
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

    sortedSprites.forEach((spriteData: TileSummary | WallSummary) => {
      if ('wall_direction' in spriteData) {
        // It's a wall - for now just skip fallback walls
        return;
      } else {
        // It's a tile
        this.renderFallbackTile(spriteData as TileSummary, isometricOffset);
      }
    });

    console.log('[IsometricTileRenderer] Rendered', sortedSprites.length, 'fallback sprites');
  }

  /**
   * Clear all sprites and return them to pool
   */
  private clearAllTiles(): void {
    // Return tile sprites to pool
    this.activeTileSprites.forEach(sprite => {
      this.tilesContainer.removeChild(sprite);
      this.returnSpriteToPool(sprite);
    });
    this.activeTileSprites.clear();

    // Return wall sprites to pool
    this.activeWallSprites.forEach(sprite => {
      this.tilesContainer.removeChild(sprite);
      this.returnSpriteToPool(sprite);
    });
    this.activeWallSprites.clear();

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

  /**
   * Check if wall positioning settings have changed (margins, vertical bias, etc.)
   */
  private hasWallPositioningSettingsChanged(): boolean {
    const currentHash = JSON.stringify(battlemapStore.controls.isometricEditor.wallPositioningSettings);
    const hasChanged = this.lastWallPositioningSettingsHash !== currentHash;
    if (hasChanged) {
      console.log(`[IsometricTileRenderer] Wall positioning settings changed! Old hash length: ${this.lastWallPositioningSettingsHash.length}, New hash length: ${currentHash.length}`);
    }
    return hasChanged;
  }
} 