import { battlemapEngine } from './BattlemapEngine';
// TEMPORARILY COMMENTED OUT FOR ISOMETRIC TESTING
// import { GridRenderer } from './renderers/GridRenderer';
import { IsometricGridRenderer } from './renderers/IsometricGridRenderer';
// import { TileRenderer } from './renderers/TileRenderer';
import { IsometricTileRenderer } from './renderers/IsometricTileRenderer';
// import { EntityRenderer } from './renderers/EntityRenderer';
// import { IsometricEntityRenderer } from './renderers/IsometricEntityRenderer';
// import { EffectRenderer } from './renderers/EffectRenderer';
// import { InteractionsManager } from './InteractionsManager';
import { IsometricInteractionsManager } from './IsometricInteractionsManager';
import { MovementController } from './MapMovementController';
import { isometricSpriteManager } from './managers/IsometricSpriteManager';

/**
 * GameManager is the main entry point for the isometric tile editor
 * It initializes components needed for sprite-based tile editing with Z-axis support
 */
export class GameManager {
  // Flag to track initialization
  private isInitialized: boolean = false;
  
  // Component references - enhanced for isometric sprite editing
  private tileRenderer: IsometricTileRenderer = new IsometricTileRenderer();
  private gridRenderer: IsometricGridRenderer = new IsometricGridRenderer();
  private interactionsManager: IsometricInteractionsManager = new IsometricInteractionsManager();
  private movementController: MovementController = new MovementController();
  
  /**
   * Initialize the game manager and all its components
   * @param containerElement The HTML element that will contain the PixiJS canvas
   */
  async initialize(containerElement: HTMLElement): Promise<boolean> {
    if (this.isInitialized) {
      console.warn('[GameManager] Already initialized');
      return true;
    }

    try {
      console.log('[GameManager] Initializing isometric tile editor...');

      // Initialize the engine first
      const success = await battlemapEngine.initialize(containerElement);
      if (!success) {
        throw new Error('Failed to initialize BattlemapEngine');
      }

      // Initialize sprite manager before other components
      await this.initializeSpriteAssets();

      // Initialize all components
      this.initializeComponents();

      this.isInitialized = true;
      console.log('[GameManager] Successfully initialized isometric tile editor');
      return true;

    } catch (error) {
      console.error('[GameManager] Initialization failed:', error);
      this.destroy();
      return false;
    }
  }

  /**
   * Initialize sprite assets
   */
  private async initializeSpriteAssets(): Promise<void> {
    try {
      console.log('[GameManager] Initializing sprite assets...');
      await isometricSpriteManager.initialize();
      // Pre-load some sprites for immediate availability
      await isometricSpriteManager.loadCategory('blocks' as any);
      console.log('[GameManager] Sprite assets initialized successfully');
    } catch (error) {
      console.warn('[GameManager] Failed to initialize sprite assets:', error);
      // Continue without sprites - renderer will fall back to colored diamonds
    }
  }
  
  /**
   * Initialize all game components for isometric tile editing
   */
  private initializeComponents(): void {
    console.log('[GameManager] Initializing isometric tile editor components...');
    
    // Initialize renderers
    this.tileRenderer.initialize(battlemapEngine);
    this.gridRenderer.initialize(battlemapEngine);
    
    // Register renderers with the engine
    battlemapEngine.registerRenderer('tiles', this.tileRenderer);
    battlemapEngine.registerRenderer('grid', this.gridRenderer);
    
    // Initialize interactions (needs to be after renderers for proper layering)
    this.interactionsManager.initialize(battlemapEngine);
    
    // Initialize movement controller
    if (battlemapEngine.app) {
      this.movementController.initialize(battlemapEngine.app.ticker);
    }
    
    // Perform initial render
    battlemapEngine.renderAll();
    
    console.log(`[GameManager] Initialized ${battlemapEngine.getRendererCount()} isometric tile editor components`);
  }
  
  /**
   * Get current movement state
   */
  getMovementState() {
    return this.movementController.getMovementState();
  }
  
  /**
   * Stop movement
   */
  stopMovement(): void {
    this.movementController.stop();
  }
  
  /**
   * Resize the game to new dimensions
   */
  resize(width: number, height: number): void {
    if (!this.isInitialized) return;
    
    console.log('[GameManager] Resizing to:', width, height);
    
    battlemapEngine.resize(width, height);
    this.interactionsManager.resize(width, height);
  }
  
  /**
   * Destroy the game manager and clean up all resources
   */
  destroy(): void {
    console.log('[GameManager] Destroying isometric tile editor...');
    
    // Destroy sprite manager
    isometricSpriteManager.destroy();
    
    // Destroy components in reverse order
    this.movementController.destroy();
    this.interactionsManager.destroy();
    this.gridRenderer.destroy();
    this.tileRenderer.destroy();
    
    // Destroy the engine last
    battlemapEngine.destroy();
    
    this.isInitialized = false;
    console.log('[GameManager] Isometric tile editor destroyed');
  }
}

// Create and export a singleton instance
export const gameManager = new GameManager(); 