import { Graphics } from 'pixi.js';
import { battlemapStore } from '../../../store';
import { LayerName } from '../../BattlemapEngine';
import { ENTITY_PANEL_WIDTH, GRID_STROKE_WIDTH } from '../../../constants/layout';
import { 
  gridToIsometric, 
  calculateIsometricGridOffset,
  calculateIsometricDiamondCorners,
  screenToGrid
} from '../../../utils/isometricUtils';

/**
 * Isometric rendering utilities for tile editor
 * Simplified version focused on grid and tile rendering
 */
export class IsometricRenderingUtils {
  /**
   * Calculate grid offset with proper centering for isometric view
   * Centralized version used by all isometric renderers
   */
  static calculateIsometricGridOffset(engine: any): { 
    offsetX: number; 
    offsetY: number; 
    tileSize: number;
    gridPixelWidth: number;
    gridPixelHeight: number;
    gridWidth: number;
    gridHeight: number;
  } {
    const snap = battlemapStore;
    
    // Get container size from engine
    const containerSize = engine?.containerSize || { width: 0, height: 0 };
    
    return calculateIsometricGridOffset(
      containerSize.width,
      containerSize.height,
      snap.grid.width,
      snap.grid.height,
      snap.view.gridDiamondWidth,
      snap.view.offset.x,
      snap.view.offset.y,
      ENTITY_PANEL_WIDTH,
      snap.view.zoomLevel
    );
  }
  
  /**
   * Convert screen pixel coordinates to grid coordinates (for mouse interaction)
   * Centralized version with proper isometric conversion
   */
  static screenToGrid(
    screenX: number, 
    screenY: number, 
    engine: any
  ): { gridX: number; gridY: number; inBounds: boolean } {
    const snap = battlemapStore;
    const { offsetX, offsetY, gridWidth, gridHeight } = 
      this.calculateIsometricGridOffset(engine);
    
    return screenToGrid(
      screenX, 
      screenY, 
      offsetX, 
      offsetY, 
      snap.view.zoomLevel,
      gridWidth, 
      gridHeight, 
      snap.view.gridDiamondWidth
    );
  }
  
  /**
   * Render an isometric diamond at grid coordinates
   * Common pattern used by grid and tile renderers
   */
  static renderIsometricDiamond(
    graphics: Graphics,
    gridX: number,
    gridY: number,
    engine: any,
    fillOptions?: { color: number; alpha: number },
    strokeOptions?: { color: number; width: number; alpha?: number }
  ): void {
    const snap = battlemapStore;
    const { offsetX, offsetY, tileSize } = this.calculateIsometricGridOffset(engine);
    
    // Convert grid coordinates to isometric using zoomed grid width
    const { isoX, isoY } = gridToIsometric(gridX, gridY, tileSize);
    
    // Calculate the diamond using utility function
    const centerX = offsetX + isoX;
    const centerY = offsetY + isoY;
    const strokeOffset = strokeOptions ? (strokeOptions.width || GRID_STROKE_WIDTH) * 0.5 : 0;
    
    const { topX, topY, rightX, rightY, bottomX, bottomY, leftX, leftY } = 
      calculateIsometricDiamondCorners(centerX, centerY, tileSize, strokeOffset);
    
    // Draw diamond path
    graphics
      .moveTo(topX, topY)
      .lineTo(rightX, rightY)
      .lineTo(bottomX, bottomY)
      .lineTo(leftX, leftY)
      .lineTo(topX, topY);
    
    // Apply fill if specified
    if (fillOptions) {
      graphics.fill({ color: fillOptions.color, alpha: fillOptions.alpha });
    }
    
    // Apply stroke if specified
    if (strokeOptions) {
      graphics.stroke({ 
        color: strokeOptions.color, 
        width: strokeOptions.width,
        alpha: strokeOptions.alpha || 1.0
      });
    }
  }
  
  /**
   * Render multiple isometric diamonds in a batch
   * Optimized for rendering many tiles/grid cells at once
   */
  static renderIsometricDiamondBatch(
    graphics: Graphics,
    positions: Array<{ x: number; y: number }>,
    engine: any,
    fillOptions?: { color: number; alpha: number },
    strokeOptions?: { color: number; width: number; alpha?: number }
  ): void {
    positions.forEach(({ x, y }) => {
      this.renderIsometricDiamond(graphics, x, y, engine, fillOptions, strokeOptions);
    });
  }
  
  /**
   * Check if a grid position is valid within bounds
   */
  static isValidGridPosition(gridX: number, gridY: number): boolean {
    const snap = battlemapStore;
    return gridX >= 0 && gridY >= 0 && gridX < snap.grid.width && gridY < snap.grid.height;
  }
} 