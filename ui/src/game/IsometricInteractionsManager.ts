import { Graphics, FederatedPointerEvent, Container } from 'pixi.js';
import { battlemapStore, battlemapActions } from '../store';
import { BattlemapEngine, LayerName } from './BattlemapEngine';
import { TileSummary } from '../types/battlemap_types';
import { Position } from '../types/common';
import { IsometricGridRenderer } from './renderers/IsometricGridRenderer';
import { IsometricDirection } from './managers/IsometricSpriteManager';

// Define minimum width of entity panel
const ENTITY_PANEL_WIDTH = 250;

/**
 * IsometricInteractionsManager handles user input and interactions with the isometric battlemap
 * Simplified for local tile editor - handles only tile editing interactions
 */
export class IsometricInteractionsManager {
  // Engine reference
  private engine: BattlemapEngine | null = null;
  
  // Hit area for capturing events (transparent overlay)
  private hitArea: Graphics | null = null;
  
  // Layer reference for proper integration
  private layer: Container | null = null;
  
  // Reference to the isometric grid renderer for coordinate conversion
  private isometricGridRenderer: IsometricGridRenderer | null = null;
  
  // Context menu event handler reference for cleanup
  private contextMenuHandler: ((event: Event) => boolean) | null = null;
  
  // Click throttling to prevent rapid inputs
  private lastClickTime: number = 0;
  private readonly CLICK_THROTTLE_MS = 300;
  
  /**
   * Initialize the interactions manager
   */
  initialize(engine: BattlemapEngine): void {
    this.engine = engine;
    
    // Get the UI layer for interaction overlay
    this.layer = engine.getLayer('ui');
    
    // Get reference to the isometric grid renderer for coordinate conversion
    this.isometricGridRenderer = engine.getRenderer<IsometricGridRenderer>('grid') || null;
    
    if (!this.isometricGridRenderer) {
      console.error('[IsometricInteractionsManager] Could not find IsometricGridRenderer - coordinate conversion will not work');
    }
    
    // Create hit area for event handling
    this.createHitArea();
    
    console.log('[IsometricInteractionsManager] Initialized with UI layer and isometric coordinate conversion');
  }
  
  /**
   * Create a transparent hit area that covers the entire canvas
   * This captures all mouse/touch events for the battlemap
   */
  private createHitArea(): void {
    if (!this.engine?.app || !this.layer) return;
    
    // Create a transparent graphics object that covers the entire canvas
    this.hitArea = new Graphics();
    
    // Set initial size
    this.updateHitAreaSize();
    
    // Enable interactions
    this.hitArea.eventMode = 'static';
    this.hitArea.cursor = 'crosshair';
    
    // Set up event listeners
    this.hitArea.on('pointermove', this.handlePointerMove.bind(this));
    this.hitArea.on('pointerdown', this.handlePointerDown.bind(this));
    
    // Prevent browser context menu on right-click
    this.hitArea.on('rightclick', (event: FederatedPointerEvent) => {
      event.preventDefault();
      event.stopPropagation();
    });
    
    // Also prevent context menu at the DOM level
    if (this.engine?.app?.canvas) {
      this.contextMenuHandler = (event: Event) => {
        event.preventDefault();
        event.stopPropagation();
        return false;
      };
      this.engine.app.canvas.addEventListener('contextmenu', this.contextMenuHandler);
    }
    
    // Add to UI layer
    this.layer.addChild(this.hitArea);
    
    console.log('[IsometricInteractionsManager] Hit area created and added to UI layer');
  }
  
  /**
   * Update hit area size to match canvas
   */
  private updateHitAreaSize(): void {
    if (!this.hitArea || !this.engine?.containerSize) return;
    
    const { width, height } = this.engine.containerSize;
    
    this.hitArea.clear();
    this.hitArea.rect(0, 0, width, height);
    this.hitArea.fill({ color: 0x000000, alpha: 0 }); // Transparent
  }
  
  /**
   * Convert pixel coordinates to grid coordinates using isometric transformation
   */
  private pixelToGrid(pixelX: number, pixelY: number): { 
    gridX: number; 
    gridY: number; 
    inBounds: boolean 
  } {
    if (!this.isometricGridRenderer) {
      console.warn('[IsometricInteractionsManager] No isometric grid renderer available for coordinate conversion');
      return { gridX: -1, gridY: -1, inBounds: false };
    }
    
    // Use the isometric grid renderer's coordinate conversion
    return this.isometricGridRenderer.screenToGrid(pixelX, pixelY);
  }
  
  /**
   * Handle pointer movement for hover effects
   */
  private handlePointerMove(event: FederatedPointerEvent): void {
    const snap = battlemapStore;
    
    // Skip handling during WASD movement for better performance
    if (snap.view.wasd_moving) return;
    
    // Convert to grid coordinates using isometric transformation
    const mouseX = event.global.x;
    const mouseY = event.global.y;
    
    const { gridX, gridY } = this.pixelToGrid(mouseX, mouseY);
    
    // Always update hovered cell position
    battlemapActions.setHoveredCell(gridX, gridY);
  }
  
  /**
   * Handle pointer down (click) events
   */
  private handlePointerDown(event: FederatedPointerEvent): void {
    const snap = battlemapStore;
    
    // Skip handling during WASD movement
    if (snap.view.wasd_moving) return;
    
    // Throttle clicks to prevent rapid inputs
    const currentTime = Date.now();
    if (currentTime - this.lastClickTime < this.CLICK_THROTTLE_MS) {
      console.log(`[IsometricInteractionsManager] Click throttled (${currentTime - this.lastClickTime}ms since last click)`);
      return;
    }
    this.lastClickTime = currentTime;
    
    // Convert to grid coordinates using isometric transformation
    const mouseX = event.global.x;
    const mouseY = event.global.y;
    
    const { gridX, gridY, inBounds } = this.pixelToGrid(mouseX, mouseY);
    
    if (!inBounds) return;
    
    console.log(`[IsometricInteractionsManager] Click at screen (${mouseX}, ${mouseY}) -> grid (${gridX}, ${gridY})`);
    
    // Handle tile editing if enabled and not locked
    if (snap.controls.isEditing && !snap.controls.isLocked) {
      this.handleTileEdit(gridX, gridY);
      return;
    }
  }
  
  /**
   * Handle tile editing - isometric sprite system only
   */
  private async handleTileEdit(gridX: number, gridY: number): Promise<void> {
    const snap = battlemapStore;
    const selectedTileType = snap.controls.selectedTileType;
    const isometricEditor = snap.controls.isometricEditor;
    
    console.log(`[IsometricInteractionsManager] Tile edit at (${gridX}, ${gridY})`);
    console.log(`[IsometricInteractionsManager] Selected sprite: ${isometricEditor.selectedSpriteName}, Z-level: ${isometricEditor.selectedZLevel}`);
    
    try {
      if (selectedTileType === 'erase') {
        // Delete tile at the selected Z level
        battlemapActions.removeIsometricTile(gridX, gridY, isometricEditor.selectedZLevel);
        console.log(`[IsometricInteractionsManager] Deleted tile at (${gridX}, ${gridY}, Z:${isometricEditor.selectedZLevel})`);
      } else {
        // Always require an isometric sprite to be selected
        if (!isometricEditor.selectedSpriteName) {
          console.warn('[IsometricInteractionsManager] No sprite selected - cannot place tile. Please select a sprite first.');
          return;
        }
        
        // Use isometric sprite system
        console.log(`[IsometricInteractionsManager] Placing isometric sprite: ${isometricEditor.selectedSpriteName}`);
        this.handleIsometricSpriteEdit(gridX, gridY);
      }
    } catch (error) {
      console.error(`[IsometricInteractionsManager] Error editing tile at (${gridX}, ${gridY}):`, error);
    }
  }
  
  /**
   * Handle isometric sprite placement
   */
  private handleIsometricSpriteEdit(gridX: number, gridY: number): void {
    const snap = battlemapStore;
    const isometricEditor = snap.controls.isometricEditor;
    
    if (!isometricEditor.selectedSpriteName) {
      console.warn('[IsometricInteractionsManager] No sprite selected for isometric tile edit');
      return;
    }

    // Handle brush size for multi-tile painting
    const brushSize = isometricEditor.brushSize;
    const halfBrush = Math.floor(brushSize / 2);

    for (let dx = -halfBrush; dx <= halfBrush; dx++) {
      for (let dy = -halfBrush; dy <= halfBrush; dy++) {
        const targetX = gridX + dx;
        const targetY = gridY + dy;

        // Check bounds
        if (targetX < 0 || targetY < 0 || targetX >= snap.grid.width || targetY >= snap.grid.height) {
          continue;
        }

        // Create isometric tile
        const newTile: TileSummary = {
          uuid: `tile_${targetX}_${targetY}_${isometricEditor.selectedZLevel}_${Date.now()}`,
          name: isometricEditor.selectedSpriteName,
          position: [targetX, targetY] as const,
          walkable: this.getSpriteWalkable(isometricEditor.selectedSpriteName),
          visible: true,
          sprite_name: isometricEditor.selectedSpriteName,
          z_level: isometricEditor.selectedZLevel,
          sprite_direction: isometricEditor.selectedSpriteDirection,
          tile_type: this.getSpriteTileType(isometricEditor.selectedSpriteName),
        };

        battlemapActions.addIsometricTile(newTile);
        console.log(`[IsometricInteractionsManager] Created isometric tile at (${targetX}, ${targetY}, Z:${isometricEditor.selectedZLevel}) with sprite: ${isometricEditor.selectedSpriteName}`);
      }
    }
  }
  
  /**
   * Get walkable state based on sprite name
   */
  private getSpriteWalkable(spriteName: string): boolean {
    // Walls are generally not walkable
    if (spriteName.toLowerCase().includes('wall')) {
      return false;
    }
    // Floors and blocks are generally walkable
    return true;
  }
  
  /**
   * Get tile type based on sprite name
   */
  private getSpriteTileType(spriteName: string): 'floor' | 'wall' | 'decoration' | 'custom' {
    const name = spriteName.toLowerCase();
    if (name.includes('wall')) return 'wall';
    if (name.includes('floor')) return 'floor';
    return 'decoration';
  }
  
  /**
   * Resize handler
   */
  resize(width: number, height: number): void {
    this.updateHitAreaSize();
  }
  
  /**
   * Clean up resources
   */
  destroy(): void {
    console.log('[IsometricInteractionsManager] Destroying interactions manager');
    
    // Remove context menu handler
    if (this.contextMenuHandler && this.engine?.app?.canvas) {
      this.engine.app.canvas.removeEventListener('contextmenu', this.contextMenuHandler);
      this.contextMenuHandler = null;
    }
    
    // Clean up hit area
    if (this.hitArea) {
      this.hitArea.removeAllListeners();
      if (this.layer && this.hitArea.parent === this.layer) {
        this.layer.removeChild(this.hitArea);
      }
      this.hitArea.destroy();
      this.hitArea = null;
    }
    
    // Clear references
    this.engine = null;
    this.layer = null;
    this.isometricGridRenderer = null;
  }
} 