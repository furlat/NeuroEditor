import { Graphics } from 'pixi.js';
import { battlemapStore, battlemapActions, Z_LAYER_CONFIG, LayerVisibilityMode } from '../../store';
import { AbstractRenderer } from './BaseRenderer';
import { subscribe } from 'valtio';
import { LayerName } from '../BattlemapEngine';
import { GRID_STROKE_WIDTH } from '../../constants/layout';
import { IsometricRenderingUtils } from './utils/IsometricRenderingUtils';

/**
 * IsometricGridRenderer - Clean, focused grid rendering for tile editor
 * Enhanced to support multiple Z-layer grids with proper vertical offsets
 */
export class IsometricGridRenderer extends AbstractRenderer {
  get layerName(): LayerName { return 'grid'; }
  
  private zLayerGrids: Graphics[] = []; // One graphics object per Z layer
  private highlightGraphics = new Graphics();

  initialize(engine: any): void {
    super.initialize(engine);
    
    // Create graphics objects for each Z layer
    battlemapActions.getAllZLayerConfigs().forEach((layerConfig, index) => {
      const layerGraphics = new Graphics();
      this.zLayerGrids[index] = layerGraphics;
      this.container.addChild(layerGraphics);
    });
    
    this.container.addChild(this.highlightGraphics);
    this.setupSubscriptions();
  }
  
  private setupSubscriptions(): void {
    // Subscribe to the root store for broader reactivity
    this.addSubscription(subscribe(battlemapStore, () => {
      console.log('[IsometricGridRenderer] Store changed, triggering render');
      this.render();
    }));
    
    // Also set up a manual render trigger that can be called from outside
    (window as any).__forceGridRender = () => {
      console.log('[IsometricGridRenderer] Manual render trigger called');
      this.render();
    };
  }
  
  render(): void {
    this.incrementRenderCount();
    console.log('[IsometricGridRenderer] Rendering grid...');
    this.renderGrid();
    this.renderHighlight();
    this.logRenderSummary();
  }
  
  private renderGrid(): void {
    if (!this.isEngineReady()) return;
    
    this.zLayerGrids.forEach(layerGraphics => layerGraphics.clear());
    if (!battlemapStore.controls.isGridVisible) return;
    
    const snap = battlemapStore;
    console.log(`[IsometricGridRenderer] Rendering grid - Active: ${snap.view.activeZLayer}, Grid Visibility: [0:${snap.view.gridLayerVisibility[0]}, 1:${snap.view.gridLayerVisibility[1]}, 2:${snap.view.gridLayerVisibility[2]}], Visibility Mode: ${snap.view.layerVisibilityMode}`);
    
    // Render each Z layer grid
    battlemapActions.getAllZLayerConfigs().forEach((layerConfig, layerIndex) => {
      const layerGraphics = this.zLayerGrids[layerIndex];
      
      // ENHANCED: Use individual grid layer visibility flags
      const isLayerVisible = snap.view.gridLayerVisibility[layerIndex] ?? false;
      
      if (!isLayerVisible) {
        // Skip rendering this layer if it's not visible
        console.log(`[IsometricGridRenderer] Skipping layer ${layerIndex} (visibility: ${isLayerVisible})`);
        return;
      }
      
      // Generate positions for this Z layer
      const positions = [];
      for (let x = 0; x < snap.grid.width; x++) {
        for (let y = 0; y < snap.grid.height; y++) {
          positions.push({ x, y, zOffset: layerConfig.verticalOffset });
        }
      }
      
      // Render grid diamonds for this layer with its specific color
      const isActiveLayer = snap.view.activeZLayer === layerIndex;
      
      // ENHANCED: Different opacity rules based on active layer and visibility mode
      let opacity: number;
      switch (snap.view.layerVisibilityMode) {
        case LayerVisibilityMode.SHADOW:
          // With shadowing: active is bright, others dimmed
          opacity = isActiveLayer ? 1.0 : 0.3;
          break;
        case LayerVisibilityMode.NORMAL:
        case LayerVisibilityMode.INVISIBLE:
        default:
          // Without shadowing: all layers bright
          opacity = 1.0;
          break;
      }
      
      console.log(`[IsometricGridRenderer] Rendering layer ${layerIndex} (${layerConfig.name}) - Active: ${isActiveLayer}, Opacity: ${opacity}`);
      
      IsometricRenderingUtils.renderIsometricDiamondBatchWithZOffset(
        layerGraphics, positions, this.engine,
        undefined, // No fill
        { 
          color: layerConfig.color, 
          width: GRID_STROKE_WIDTH,
          alpha: opacity
        }
      );
    });
  }
  
  private renderHighlight(): void {
    this.highlightGraphics.clear();
    if (battlemapStore.view.wasd_moving) return;
    
    const { x, y } = battlemapStore.view.hoveredCell;
    if (!IsometricRenderingUtils.isValidGridPosition(x, y)) return;
    
    // Get active Z layer configuration
    const activeLayerConfig = battlemapActions.getActiveZLayerConfig();
    
    // Render highlight at the active Z layer position
    IsometricRenderingUtils.renderIsometricDiamondBatchWithZOffset(
      this.highlightGraphics, 
      [{ x, y, zOffset: activeLayerConfig.verticalOffset }], 
      this.engine,
      { color: 0x00FF00, alpha: 0.3 }
    );
  }
  
  public screenToGrid(screenX: number, screenY: number) {
    return IsometricRenderingUtils.screenToGrid(screenX, screenY, this.engine);
  }
  
  destroy(): void {
    this.zLayerGrids.forEach(layerGraphics => this.destroyGraphics(layerGraphics));
    this.destroyGraphics(this.highlightGraphics);
    super.destroy();
  }
} 