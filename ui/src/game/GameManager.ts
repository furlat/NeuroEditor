import { battlemapEngine } from './BattlemapEngine';

import { IsometricGridRenderer } from './renderers/IsometricGridRenderer';

import { IsometricInteractionsManager } from './IsometricInteractionsManager';
import { MovementController } from './MapMovementController';

/**
 * GameManager is the main entry point for the isometric tile editor
 * It initializes components needed for sprite-based tile editing with Z-axis support
 */
export class GameManager {
  // Flag to track initialization
  private isInitialized: boolean = false;
  
  // Component references - grid renderer only
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
   * Initialize all game components for isometric tile editing
   */
  private initializeComponents(): void {
    console.log('[GameManager] Initializing isometric grid renderer...');
    
    // Initialize grid renderer only
    this.gridRenderer.initialize(battlemapEngine);
    
    // Register grid renderer with the engine
    battlemapEngine.registerRenderer('grid', this.gridRenderer);
    
    // Initialize interactions (needs to be after renderers for proper layering)
    this.interactionsManager.initialize(battlemapEngine);
    
    // Initialize movement controller
    if (battlemapEngine.app) {
      this.movementController.initialize(battlemapEngine.app.ticker);
    }
    
    // Perform initial render
    battlemapEngine.renderAll();
    
    console.log(`[GameManager] Initialized ${battlemapEngine.getRendererCount()} isometric grid components`);
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
    
    // Destroy components in reverse order
    this.movementController.destroy();
    this.interactionsManager.destroy();
    this.gridRenderer.destroy();
    
    // Destroy the engine last
    battlemapEngine.destroy();
    
    this.isInitialized = false;
    console.log('[GameManager] Isometric tile editor destroyed');
  }
}

// Create and export a singleton instance
export const gameManager = new GameManager(); 