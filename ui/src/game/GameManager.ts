import { battlemapEngine } from './BattlemapEngine';
// TEMPORARILY COMMENTED OUT FOR ISOMETRIC TESTING
// import { GridRenderer } from './renderers/GridRenderer';
import { IsometricGridRenderer } from './renderers/IsometricGridRenderer';
// import { TileRenderer } from './renderers/TileRenderer';
import { IsometricTileRenderer } from './renderers/IsometricTileRenderer';
import { ProcessedAssetsRenderer } from './renderers/ProcessedAssetsRenderer';
// import { EntityRenderer } from './renderers/EntityRenderer';
// import { IsometricEntityRenderer } from './renderers/IsometricEntityRenderer';
// import { EffectRenderer } from './renderers/EffectRenderer';
// import { InteractionsManager } from './InteractionsManager';
import { IsometricInteractionsManager } from './IsometricInteractionsManager';
import { MovementController } from './MapMovementController';
import { isometricSpriteManager } from './managers/IsometricSpriteManager';
import { battlemapStore } from '../store';
import { subscribe } from 'valtio';

/**
 * GameManager is the main entry point for the isometric tile editor
 * It initializes components needed for sprite-based tile editing with Z-axis support
 * NOW SUPPORTS BOTH BATTLEMAP TILES AND PROCESSED ASSETS RENDERING
 */
export class GameManager {
  // Flag to track initialization
  private isInitialized: boolean = false;
  
  // Component references - enhanced for isometric sprite editing
  private tileRenderer: IsometricTileRenderer = new IsometricTileRenderer();
  private processedAssetsRenderer: ProcessedAssetsRenderer = new ProcessedAssetsRenderer();
  private gridRenderer: IsometricGridRenderer = new IsometricGridRenderer();
  private interactionsManager: IsometricInteractionsManager = new IsometricInteractionsManager();
  private movementController: MovementController = new MovementController();
  
  // Track which renderer is currently active
  private currentActiveRenderer: 'tiles' | 'processed_assets' = 'tiles';
  
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
      console.log('[GameManager] Initializing isometric tile editor with processed assets support...');

      // Initialize the engine first
      const success = await battlemapEngine.initialize(containerElement);
      if (!success) {
        throw new Error('Failed to initialize BattlemapEngine');
      }

      // Initialize sprite manager before other components
      await this.initializeSpriteAssets();

      // Initialize all components
      this.initializeComponents();

      // Set up mode switching subscriptions
      this.setupModeSubscriptions();

      // Initialize with the correct renderer based on store state
      this.updateActiveRenderer();

      this.isInitialized = true;
      console.log('[GameManager] Successfully initialized isometric tile editor with processed assets support');
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
    console.log('[GameManager] Initializing isometric tile editor components with dual renderer support...');
    
    // Initialize BOTH renderers
    this.tileRenderer.initialize(battlemapEngine);
    this.processedAssetsRenderer.initialize(battlemapEngine);
    this.gridRenderer.initialize(battlemapEngine);
    
    // Register BOTH renderers with the engine (but only one will be active at a time)
    battlemapEngine.registerRenderer('tiles', this.tileRenderer);
    battlemapEngine.registerRenderer('processed_assets', this.processedAssetsRenderer);
    battlemapEngine.registerRenderer('grid', this.gridRenderer);
    
    // Initialize interactions (needs to be after renderers for proper layering)
    this.interactionsManager.initialize(battlemapEngine);
    
    // Initialize movement controller
    if (battlemapEngine.app) {
      this.movementController.initialize(battlemapEngine.app.ticker);
    }
    
    // Perform initial render
    battlemapEngine.renderAll();
    
    console.log(`[GameManager] Initialized ${battlemapEngine.getRendererCount()} isometric tile editor components with dual renderer support`);
  }

  /**
   * Set up subscriptions to handle mode switching
   */
  private setupModeSubscriptions(): void {
    // Subscribe to processed asset mode changes
    subscribe(battlemapStore, () => {
      this.updateActiveRenderer();
    });
    
    console.log('[GameManager] Mode switching subscriptions set up');
  }

  /**
   * Update the active renderer based on the current mode
   */
  private updateActiveRenderer(): void {
    const isProcessedAssetMode = battlemapStore.processedAssets.isProcessedAssetMode;
    const newActiveRenderer = isProcessedAssetMode ? 'processed_assets' : 'tiles';
    
    if (this.currentActiveRenderer !== newActiveRenderer) {
      console.log(`[GameManager] Switching renderer mode: ${this.currentActiveRenderer} -> ${newActiveRenderer}`);
      
      this.currentActiveRenderer = newActiveRenderer;
      
      if (isProcessedAssetMode) {
        // Switching TO processed assets mode
        this.activateProcessedAssetsRenderer();
      } else {
        // Switching BACK to battlemap tiles mode
        this.activateTileRenderer();
      }
      
      // Force a full re-render after switching
      battlemapEngine.renderAll();
    }
  }

  /**
   * Activate the processed assets renderer (hide tile renderer)
   */
  private activateProcessedAssetsRenderer(): void {
    console.log('[GameManager] Activating processed assets renderer');
    
    // The visibility is actually controlled by the renderers themselves
    // based on the store state, so we just need to trigger renders
    
    // Clear the old tile renderer to free up memory
    this.tileRenderer.render(); // This will hide the container due to mode check
    
    // Trigger the processed assets renderer
    this.processedAssetsRenderer.render(); // This will show and render assets
    
    console.log('[GameManager] Processed assets renderer activated');
  }

  /**
   * Activate the tile renderer (hide processed assets renderer)
   */
  private activateTileRenderer(): void {
    console.log('[GameManager] Activating tile renderer');
    
    // The visibility is actually controlled by the renderers themselves
    // based on the store state, so we just need to trigger renders
    
    // Clear the processed assets renderer
    this.processedAssetsRenderer.render(); // This will hide the container due to mode check
    
    // Trigger the tile renderer
    this.tileRenderer.render(); // This will show and render tiles
    
    console.log('[GameManager] Tile renderer activated');
  }

  /**
   * Get the currently active renderer
   */
  getCurrentActiveRenderer(): 'tiles' | 'processed_assets' {
    return this.currentActiveRenderer;
  }

  /**
   * Force a switch to processed assets mode (programmatic toggle)
   */
  switchToProcessedAssetsMode(): void {
    if (!battlemapStore.processedAssets.isProcessedAssetMode) {
      // Import the actions and toggle mode
      import('../store').then(({ battlemapActions }) => {
        battlemapActions.processedAssets.mode.toggleProcessedAssetMode();
      });
    }
  }

  /**
   * Force a switch to battlemap tiles mode (programmatic toggle)
   */
  switchToTilesMode(): void {
    if (battlemapStore.processedAssets.isProcessedAssetMode) {
      // Import the actions and toggle mode
      import('../store').then(({ battlemapActions }) => {
        battlemapActions.processedAssets.mode.toggleProcessedAssetMode();
      });
    }
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
    console.log('[GameManager] Destroying isometric tile editor with processed assets support...');
    
    // Destroy sprite manager
    isometricSpriteManager.destroy();
    
    // Destroy components in reverse order
    this.movementController.destroy();
    this.interactionsManager.destroy();
    this.gridRenderer.destroy();
    this.processedAssetsRenderer.destroy();
    this.tileRenderer.destroy();
    
    // Destroy the engine last
    battlemapEngine.destroy();
    
    this.isInitialized = false;
    console.log('[GameManager] Isometric tile editor with processed assets support destroyed');
  }
}

// Create and export a singleton instance
export const gameManager = new GameManager(); 