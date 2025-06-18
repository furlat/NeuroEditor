import { Graphics, FederatedPointerEvent, Container } from 'pixi.js';
import { battlemapStore, battlemapActions } from '../store';
import { BattlemapEngine, LayerName } from './BattlemapEngine';
import { TileSummary } from '../types/battlemap_types';
import { Position } from '../types/common';
import { IsometricGridRenderer } from './renderers/IsometricGridRenderer';

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
  
  // Keyboard event handlers for cleanup
  private keyDownHandler: ((event: KeyboardEvent) => void) | null = null;
  
  // Click throttling to prevent rapid inputs
  private lastClickTime: number = 0;
  private readonly CLICK_THROTTLE_MS = 300;
  
  // NEW: Mouse drag painting state
  private isDragging: boolean = false;
  private isMiddleClickDragging: boolean = false; // NEW: Track middle-click dragging
  private dragStartPosition: { x: number; y: number } | null = null;
  private lastDragGridPosition: { x: number; y: number } | null = null;
  
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
    
    // Set up keyboard shortcuts
    this.setupKeyboardShortcuts();
    
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
    this.hitArea.on('pointerdown', this.handlePointerDown.bind(this));
    this.hitArea.on('pointermove', this.handlePointerMove.bind(this));
    this.hitArea.on('pointerup', this.handlePointerUp.bind(this));
    this.hitArea.on('pointerleave', this.handlePointerLeave.bind(this));
    
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
   * Set up keyboard shortcuts for layer switching
   */
  private setupKeyboardShortcuts(): void {
    // Set up keyboard event listener for layer switching (1-9)
    this.keyDownHandler = (event: KeyboardEvent) => {
      // Skip if modifier keys are pressed or controls are locked
      if (event.ctrlKey || event.altKey || event.metaKey || battlemapStore.controls.isLocked) return;
      
      // Skip if user is typing in any input field or textarea
      const activeElement = document.activeElement;
      if (activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.hasAttribute('contenteditable')
      )) {
        console.log('[IsometricInteractionsManager] Skipping shortcuts - user is typing in input field');
        return;
      }
      
      const key = event.key.toLowerCase();
      
      // Handle layer switching with number keys 1-9
      if (/^[1-9]$/.test(key)) {
        const layerIndex = parseInt(key, 10) - 1; // Convert to 0-based index
        const maxLayers = battlemapActions.getAllZLayerConfigs().length;
        
        if (layerIndex < maxLayers) {
          event.preventDefault();
          battlemapActions.setActiveZLayer(layerIndex);
          console.log(`[IsometricInteractionsManager] Switched to layer ${layerIndex} via keyboard`);
        }
      }
    };
    
    window.addEventListener('keydown', this.keyDownHandler);
    console.log('[IsometricInteractionsManager] Keyboard shortcuts set up (1-9 for layers)');
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
   * Handle pointer down events (mouse clicks)
   */
  private handlePointerDown(event: FederatedPointerEvent): void {
    if (battlemapStore.controls.isLocked) return;
    
    // Throttle rapid clicks to prevent performance issues
    const currentTime = Date.now();
    if (currentTime - this.lastClickTime < this.CLICK_THROTTLE_MS) {
      console.log('[IsometricInteractionsManager] Click throttled');
      return;
    }
    this.lastClickTime = currentTime;
    
    const mouseX = event.global.x;
    const mouseY = event.global.y;
    
    const snap = battlemapStore;
    
    // Determine button clicked
    const isRightClick = event.button === 2; // Right mouse button
    const isMiddleClick = event.button === 1; // Middle mouse button
    
    console.log(`[IsometricInteractionsManager] ${isMiddleClick ? 'Middle' : (isRightClick ? 'Right' : 'Left')} click at screen (${mouseX}, ${mouseY})`);
    
    // Handle basic tile editing
    if (snap.controls.isEditing && !snap.controls.isLocked) {
      const gridResult = this.isometricGridRenderer?.screenToGrid(mouseX, mouseY);
      if (!gridResult || !gridResult.inBounds) return;
      
      const { gridX, gridY } = gridResult;
      const snapPosition: 'above' | 'below' = isRightClick ? 'below' : 'above';
      
      // Handle middle click deletion
      if (isMiddleClick) {
        this.handleTileDelete(gridX, gridY);
        
        // Start middle-click drag for continuous deletion
        this.isMiddleClickDragging = true;
        this.dragStartPosition = { x: mouseX, y: mouseY };
        this.lastDragGridPosition = { x: gridX, y: gridY };
        console.log(`[IsometricInteractionsManager] Started middle-click drag deletion at (${gridX}, ${gridY})`);
        return;
      }
      
      // Handle tile placement
      this.handleTileEdit(gridX, gridY, snapPosition);
      
      // Start drag tracking for left/right clicks
      if (!isMiddleClick) {
        this.isDragging = true;
        this.dragStartPosition = { x: mouseX, y: mouseY };
        this.lastDragGridPosition = { x: gridX, y: gridY };
        console.log(`[IsometricInteractionsManager] Started drag painting at (${gridX}, ${gridY})`);
      }
    }
  }
  
  
  /**
   * Handle pointer move events (mouse move for drag painting)
   */
  private handlePointerMove(event: FederatedPointerEvent): void {
    const mouseX = event.global.x;
    const mouseY = event.global.y;
    
    const snap = battlemapStore;
    
    const gridResult = this.isometricGridRenderer?.screenToGrid(mouseX, mouseY);
    if (gridResult?.inBounds) {
      battlemapActions.setHoveredCell(gridResult.gridX, gridResult.gridY);
    } else {
      battlemapActions.setHoveredCell(-1, -1);
    }
    
    // Handle drag operations
    if (this.isMiddleClickDragging && gridResult?.inBounds && snap.controls.isEditing && !snap.controls.isLocked) {
      const { gridX, gridY } = gridResult;
      
      // Only delete if we moved to a different grid cell
      if (this.lastDragGridPosition &&
          (this.lastDragGridPosition.x !== gridX || this.lastDragGridPosition.y !== gridY)) {
        
        this.handleTileDelete(gridX, gridY);
        this.lastDragGridPosition = { x: gridX, y: gridY };
        console.log(`[IsometricInteractionsManager] Middle-click drag deleted tile at (${gridX}, ${gridY})`);
      }
    }
    
    if (this.isDragging && gridResult?.inBounds && snap.controls.isEditing && !snap.controls.isLocked) {
      const { gridX, gridY } = gridResult;
      
      // Only paint if we moved to a different grid cell
      if (this.lastDragGridPosition &&
          (this.lastDragGridPosition.x !== gridX || this.lastDragGridPosition.y !== gridY)) {
        
        // Use default snap position for drag
        const snapPosition: 'above' | 'below' = 'above';
        
        this.handleTileEdit(gridX, gridY, snapPosition);
        this.lastDragGridPosition = { x: gridX, y: gridY };
        console.log(`[IsometricInteractionsManager] Drag painted tile at (${gridX}, ${gridY})`);
      }
    }
  }
  
  /**
   * Handle pointer up events (stop drag painting)
   */
  private handlePointerUp(event: FederatedPointerEvent): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragStartPosition = null;
      this.lastDragGridPosition = null;
      console.log('[IsometricInteractionsManager] Stopped drag painting');
    }
    
    if (this.isMiddleClickDragging) {
      this.isMiddleClickDragging = false;
      this.dragStartPosition = null;
      this.lastDragGridPosition = null;
      console.log('[IsometricInteractionsManager] Stopped middle-click drag deletion');
    }
  }

  /**
   * Handle pointer leave events (stop drag painting when mouse leaves area)
   */
  private handlePointerLeave(event: FederatedPointerEvent): void {
    // Stop dragging when mouse leaves the interaction area
    if (this.isDragging) {
      this.isDragging = false;
      this.dragStartPosition = null;
      this.lastDragGridPosition = null;
      console.log('[IsometricInteractionsManager] Stopped drag painting (mouse left area)');
    }

    if (this.isMiddleClickDragging) {
      this.isMiddleClickDragging = false;
      this.dragStartPosition = null;
      this.lastDragGridPosition = null;
      console.log('[IsometricInteractionsManager] Stopped middle-click drag deletion (mouse left area)');
    }
    
    // Clear hover highlight
    battlemapActions.setHoveredCell(-1, -1);
  }
  
  /**
   * Handle tile editing - simplified basic tile placement
   */
  private async handleTileEdit(gridX: number, gridY: number, snapPosition: 'above' | 'below'): Promise<void> {
    const selectedTileType = battlemapStore.controls.selectedTileType;
    const activeZLayer = battlemapStore.view.activeZLayer;
    
    console.log(`[IsometricInteractionsManager] Tile edit at (${gridX}, ${gridY})`);
    
    try {
      if (selectedTileType === 'erase') {
        // Delete tile at the active Z level
        battlemapActions.removeIsometricTile(gridX, gridY, activeZLayer);
        console.log(`[IsometricInteractionsManager] Deleted tile at (${gridX}, ${gridY}, Z:${activeZLayer})`);
      } else {
        // Simple tile placement - use basic tile type
        const newTile: TileSummary = {
          uuid: `tile_${gridX}_${gridY}_${activeZLayer}_${Date.now()}`,
          name: 'basic_tile',
          position: [gridX, gridY] as const,
          walkable: true,
          visible: true,
          sprite_name: 'basic_tile',
          z_level: activeZLayer,
          sprite_direction: 0,
          tile_type: 'floor',
          snap_position: snapPosition,
        };

        battlemapActions.addIsometricTile(newTile);
        console.log(`[IsometricInteractionsManager] Created basic tile at (${gridX}, ${gridY}, Z:${activeZLayer})`);
      }
    } catch (error) {
      console.error(`[IsometricInteractionsManager] Error editing tile at (${gridX}, ${gridY}):`, error);
    }
  }

  /**
   * Handle tile deletion (middle mouse click)
   */
  private handleTileDelete(gridX: number, gridY: number): void {
    const activeZLayer = battlemapStore.view.activeZLayer;
    
    // Delete tile at the active Z level
    battlemapActions.removeIsometricTile(gridX, gridY, activeZLayer);
    console.log(`[IsometricInteractionsManager] Middle-click deleted tile at (${gridX}, ${gridY}, Z:${activeZLayer})`);
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
    
    // Remove keyboard handler
    if (this.keyDownHandler) {
      window.removeEventListener('keydown', this.keyDownHandler);
      this.keyDownHandler = null;
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