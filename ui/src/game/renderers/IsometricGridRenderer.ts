import { Graphics } from 'pixi.js';
import { battlemapStore } from '../../store';
import { AbstractRenderer } from './BaseRenderer';
import { subscribe } from 'valtio';
import { LayerName } from '../BattlemapEngine';
import { GRID_STROKE_WIDTH } from '../../constants/layout';
import { IsometricRenderingUtils } from './utils/IsometricRenderingUtils';

/**
 * IsometricGridRenderer - Clean, focused grid rendering for tile editor
 * Simplified to render only grid and hover highlight - no entity paths
 */
export class IsometricGridRenderer extends AbstractRenderer {
  get layerName(): LayerName { return 'grid'; }
  
  private gridGraphics = new Graphics();
  private highlightGraphics = new Graphics();

  initialize(engine: any): void {
    super.initialize(engine);
    this.container.addChild(this.gridGraphics, this.highlightGraphics);
    this.setupSubscriptions();
  }
  
  private setupSubscriptions(): void {
    this.addSubscription(subscribe(battlemapStore.view, () => this.render()));
    this.addSubscription(subscribe(battlemapStore.controls, () => this.render()));
  }
  
  render(): void {
    this.incrementRenderCount();
    this.renderGrid();
    this.renderHighlight();
    this.logRenderSummary();
  }
  
  private renderGrid(): void {
    if (!this.isEngineReady()) return;
    
    this.gridGraphics.clear();
    if (!battlemapStore.controls.isGridVisible) return;
    
    const snap = battlemapStore;
    const positions = [];
    for (let x = 0; x < snap.grid.width; x++) {
      for (let y = 0; y < snap.grid.height; y++) {
        positions.push({ x, y });
      }
    }
    
    IsometricRenderingUtils.renderIsometricDiamondBatch(
      this.gridGraphics, positions, this.engine, undefined,
      { color: 0x444444, width: GRID_STROKE_WIDTH }
    );
  }
  
  private renderHighlight(): void {
    this.highlightGraphics.clear();
    if (battlemapStore.view.wasd_moving) return;
    
    const { x, y } = battlemapStore.view.hoveredCell;
    if (!IsometricRenderingUtils.isValidGridPosition(x, y)) return;
    
    IsometricRenderingUtils.renderIsometricDiamond(
      this.highlightGraphics, x, y, this.engine,
      { color: 0x00FF00, alpha: 0.3 }
    );
  }
  
  public screenToGrid(screenX: number, screenY: number) {
    return IsometricRenderingUtils.screenToGrid(screenX, screenY, this.engine);
  }
  
  destroy(): void {
    this.destroyGraphicsArray([this.gridGraphics, this.highlightGraphics]);
    super.destroy();
  }
} 