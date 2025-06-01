import { Direction } from '../types/battlemap_types';
import { IsometricDirection } from '../game/managers/IsometricSpriteManager';
import { GRID_STROKE_WIDTH, ISOMETRIC_TILE_WIDTH, ISOMETRIC_TILE_HEIGHT } from '../constants/layout';
import { battlemapStore } from '../store';
import { ENTITY_PANEL_WIDTH } from '../constants/layout';

/**
 * Convert grid coordinates to isometric screen coordinates
 * @param gridX Grid X coordinate
 * @param gridY Grid Y coordinate
 * @param gridDiamondWidth Width of the diamond grid in pixels
 * @returns Screen coordinates in isometric perspective
 */
export function gridToIsometric(gridX: number, gridY: number, gridDiamondWidth: number = 64): { isoX: number; isoY: number } {
  // Precise isometric transformation
  // In isometric view: X goes right-down diagonal, Y goes left-down diagonal
  const tileWidth = gridDiamondWidth;
  const tileHeight = gridDiamondWidth / 2; // 2:1 aspect ratio for isometric diamonds
  
  const isoX = (gridX - gridY) * (tileWidth / 2);
  const isoY = (gridX + gridY) * (tileHeight / 2);
  
  return { isoX, isoY };
}

/**
 * Convert isometric screen coordinates back to grid coordinates
 * @param isoX Isometric screen X coordinate (relative to grid origin)
 * @param isoY Isometric screen Y coordinate (relative to grid origin)
 * @param gridDiamondWidth Width of the diamond grid in pixels
 * @returns Grid coordinates
 */
export function isometricToGrid(isoX: number, isoY: number, gridDiamondWidth: number = 64): { gridX: number; gridY: number } {
  // Precise inverse isometric transformation
  // Solving the system of equations:
  // isoX = (gridX - gridY) * (TILE_WIDTH / 2)
  // isoY = (gridX + gridY) * (TILE_HEIGHT / 2)
  
  // Rearrange to solve for gridX and gridY:
  // Let A = TILE_WIDTH / 2, B = TILE_HEIGHT / 2
  // isoX = (gridX - gridY) * A  =>  isoX/A = gridX - gridY
  // isoY = (gridX + gridY) * B  =>  isoY/B = gridX + gridY
  //
  // Adding: isoX/A + isoY/B = 2*gridX  =>  gridX = (isoX/A + isoY/B) / 2
  // Subtracting: isoY/B - isoX/A = 2*gridY  =>  gridY = (isoY/B - isoX/A) / 2
  
  const tileWidth = gridDiamondWidth;
  const tileHeight = gridDiamondWidth / 2; // 2:1 aspect ratio
  
  const A = tileWidth / 2;
  const B = tileHeight / 2;
  
  const gridX = (isoX / A + isoY / B) / 2;
  const gridY = (isoY / B - isoX / A) / 2;
  
  return { 
    gridX: Math.floor(gridX + 0.5), // Round to nearest integer instead of just floor
    gridY: Math.floor(gridY + 0.5)  // Round to nearest integer instead of just floor
  };
}

/**
 * Convert screen pixel coordinates to grid coordinates (for mouse interaction)
 * This is the critical function for mouse highlighting to work correctly
 * @param screenX Screen X coordinate
 * @param screenY Screen Y coordinate
 * @param offsetX Grid origin X offset in screen coordinates
 * @param offsetY Grid origin Y offset in screen coordinates
 * @param scaleFactor Scale factor applied to the isometric grid
 * @param gridWidth Width of the grid in tiles
 * @param gridHeight Height of the grid in tiles
 * @param gridDiamondWidth Width of the diamond grid in pixels
 * @returns Grid coordinates and bounds check
 */
export function screenToGrid(
  screenX: number, 
  screenY: number, 
  offsetX: number, 
  offsetY: number, 
  scaleFactor: number,
  gridWidth: number,
  gridHeight: number,
  gridDiamondWidth: number = 64
): { gridX: number; gridY: number; inBounds: boolean } {
  // Convert screen coordinates to isometric space (relative to grid origin)
  const relativeX = screenX - offsetX;
  const relativeY = screenY - offsetY;
  
  // Scale back to unscaled isometric coordinates
  const isoX = relativeX / scaleFactor;
  const isoY = relativeY / scaleFactor;
  
  // Use precise inverse isometric transformation directly
  const tileWidth = gridDiamondWidth;
  const tileHeight = gridDiamondWidth / 2; // 2:1 aspect ratio
  
  const A = tileWidth / 2;
  const B = tileHeight / 2;
  
  // Solve the inverse transformation precisely:
  // isoX = (gridX - gridY) * A  =>  isoX/A = gridX - gridY
  // isoY = (gridX + gridY) * B  =>  isoY/B = gridX + gridY
  // Adding: isoX/A + isoY/B = 2*gridX  =>  gridX = (isoX/A + isoY/B) / 2
  // Subtracting: isoY/B - isoX/A = 2*gridY  =>  gridY = (isoY/B - isoX/A) / 2
  
  const gridXFloat = (isoX / A + isoY / B) / 2;
  const gridYFloat = (isoY / B - isoX / A) / 2;
  
  // Round to nearest integer for grid coordinates
  const gridX = Math.round(gridXFloat);
  const gridY = Math.round(gridYFloat);
  
  // Check bounds strictly
  const inBoundsX = gridX >= 0 && gridX < gridWidth;
  const inBoundsY = gridY >= 0 && gridY < gridHeight;
  const inBounds = inBoundsX && inBoundsY;
  
  return {
    gridX: inBounds ? gridX : -1,
    gridY: inBounds ? gridY : -1,
    inBounds
  };
}

/**
 * Calculate isometric grid offset with proper centering
 * @param containerWidth Width of the container
 * @param containerHeight Height of the container
 * @param gridWidth Width of the grid in tiles
 * @param gridHeight Height of the grid in tiles
 * @param gridDiamondWidth Width of the diamond grid in pixels
 * @param offsetX WASD offset X
 * @param offsetY WASD offset Y
 * @param entityPanelWidth Width of the entity panel to account for
 * @param zoomLevel Zoom level for scaling the grid
 * @returns Grid positioning information
 */
export function calculateIsometricGridOffset(
  containerWidth: number,
  containerHeight: number,
  gridWidth: number,
  gridHeight: number,
  gridDiamondWidth: number,
  offsetX: number,
  offsetY: number,
  entityPanelWidth: number = 250,
  zoomLevel: number = 1.0
): { 
  offsetX: number; 
  offsetY: number; 
  tileSize: number;
  gridPixelWidth: number;
  gridPixelHeight: number;
  gridWidth: number;
  gridHeight: number;
} {
  // Apply zoom to the grid diamond width
  const zoomedGridDiamondWidth = gridDiamondWidth * zoomLevel;
  const tileWidth = zoomedGridDiamondWidth;
  const tileHeight = zoomedGridDiamondWidth / 2; // 2:1 aspect ratio

  // Calculate the bounds of the isometric grid
  // The grid extends from top-left corner to bottom-right corner in isometric space
  const topLeft = gridToIsometric(0, 0, zoomedGridDiamondWidth);
  const topRight = gridToIsometric(gridWidth - 1, 0, zoomedGridDiamondWidth);
  const bottomLeft = gridToIsometric(0, gridHeight - 1, zoomedGridDiamondWidth);
  const bottomRight = gridToIsometric(gridWidth - 1, gridHeight - 1, zoomedGridDiamondWidth);
  
  // Find the actual bounds of the isometric grid
  const minX = Math.min(topLeft.isoX, topRight.isoX, bottomLeft.isoX, bottomRight.isoX);
  const maxX = Math.max(topLeft.isoX, topRight.isoX, bottomLeft.isoX, bottomRight.isoX);
  const minY = Math.min(topLeft.isoY, topRight.isoY, bottomLeft.isoY, bottomRight.isoY);
  const maxY = Math.max(topLeft.isoY, topRight.isoY, bottomLeft.isoY, bottomRight.isoY);
  
  const gridPixelWidth = maxX - minX + tileWidth;
  const gridPixelHeight = maxY - minY + tileHeight;
  
  // Use zoom directly as the scale factor
  const isometricScale = zoomLevel;
  const scaledWidth = gridPixelWidth * isometricScale;
  const scaledHeight = gridPixelHeight * isometricScale;
  
  const availableWidth = containerWidth - entityPanelWidth;
  
  // Center the isometric grid in the available space
  const baseOffsetX = entityPanelWidth + (availableWidth - scaledWidth) / 2;
  const baseOffsetY = (containerHeight - scaledHeight) / 2;
  
  // Apply the offset from WASD controls
  const finalOffsetX = baseOffsetX + offsetX - (minX * isometricScale);
  const finalOffsetY = baseOffsetY + offsetY - (minY * isometricScale);
  
  return { 
    offsetX: finalOffsetX, 
    offsetY: finalOffsetY,
    tileSize: zoomedGridDiamondWidth, // Return the zoomed diamond width
    gridPixelWidth: scaledWidth,
    gridPixelHeight: scaledHeight,
    gridWidth,
    gridHeight
  };
}

/**
 * Calculate diamond corners for isometric tile rendering
 * @param centerX Center X coordinate of the diamond
 * @param centerY Center Y coordinate of the diamond
 * @param gridDiamondWidth Width of the diamond grid in pixels
 * @param strokeOffset Optional stroke offset for grid lines (usually strokeWidth / 2)
 * @returns Diamond corner coordinates
 */
export function calculateIsometricDiamondCorners(
  centerX: number,
  centerY: number,
  gridDiamondWidth: number,
  strokeOffset: number = 0
): {
  topX: number; topY: number;
  rightX: number; rightY: number;
  bottomX: number; bottomY: number;
  leftX: number; leftY: number;
} {
  // Use dynamic grid diamond width with 2:1 aspect ratio
  const tileWidthHalf = (gridDiamondWidth / 2) - strokeOffset;
  const tileHeightHalf = ((gridDiamondWidth / 2) / 2) - strokeOffset; // 2:1 aspect ratio
  
  return {
    topX: centerX,
    topY: centerY - tileHeightHalf,
    
    rightX: centerX + tileWidthHalf,
    rightY: centerY,
    
    bottomX: centerX,
    bottomY: centerY + tileHeightHalf,
    
    leftX: centerX - tileWidthHalf,
    leftY: centerY
  };
}

/**
 * Convert absolute direction to isometric direction
 * In isometric view, absolute North appears as NE, East as SE, etc.
 * This accounts for the 45-degree rotation of the isometric perspective
 */
export function convertToIsometricDirection(absoluteDirection: Direction): Direction {
  const directionMap: Record<Direction, Direction> = {
    [Direction.N]: Direction.NE,   // North becomes Northeast
    [Direction.NE]: Direction.E,   // Northeast becomes East
    [Direction.E]: Direction.SE,   // East becomes Southeast
    [Direction.SE]: Direction.S,   // Southeast becomes South
    [Direction.S]: Direction.SW,   // South becomes Southwest
    [Direction.SW]: Direction.W,   // Southwest becomes West
    [Direction.W]: Direction.NW,   // West becomes Northwest
    [Direction.NW]: Direction.N    // Northwest becomes North
  };
  
  return directionMap[absoluteDirection];
}

/**
 * NEW: Edge-based utilities for wall placement system
 * Walls are placed on the edges of grid cells rather than in the center
 */

/**
 * Calculate the screen coordinates for a specific edge of a grid cell
 */
export function getGridEdgePosition(
  gridX: number, 
  gridY: number, 
  edge: IsometricDirection, 
  engine: any
): { x: number; y: number } {
  const snap = battlemapStore;
  const gridOffset = calculateIsometricGridOffset(
    engine?.containerSize?.width || 0,
    engine?.containerSize?.height || 0,
    snap.grid.width,
    snap.grid.height,
    snap.view.gridDiamondWidth,
    snap.view.offset.x,
    snap.view.offset.y,
    ENTITY_PANEL_WIDTH,
    snap.view.zoomLevel
  );

  // Get center position of the grid cell
  const { isoX, isoY } = gridToIsometric(gridX, gridY, gridOffset.tileSize);
  const centerX = gridOffset.offsetX + isoX;
  const centerY = gridOffset.offsetY + isoY;

  // Calculate edge positions based on diamond geometry
  const halfTile = gridOffset.tileSize / 2;
  const quarterTile = gridOffset.tileSize / 4;

  switch (edge) {
    case IsometricDirection.NORTH:
      // Top edge of diamond
      return { x: centerX, y: centerY - quarterTile };
    case IsometricDirection.EAST:
      // Right edge of diamond  
      return { x: centerX + halfTile, y: centerY };
    case IsometricDirection.SOUTH:
      // Bottom edge of diamond
      return { x: centerX, y: centerY + quarterTile };
    case IsometricDirection.WEST:
      // Left edge of diamond
      return { x: centerX - halfTile, y: centerY };
    default:
      return { x: centerX, y: centerY };
  }
}

/**
 * Helper function to call screenToGrid with engine parameters
 */
function screenToGridWithEngine(screenX: number, screenY: number, engine: any): { gridX: number; gridY: number; inBounds: boolean } {
  if (!engine || !engine.containerSize) {
    return { gridX: -1, gridY: -1, inBounds: false };
  }

  const snap = battlemapStore;
  const gridOffset = calculateIsometricGridOffset(
    engine.containerSize.width,
    engine.containerSize.height,
    snap.grid.width,
    snap.grid.height,
    snap.view.gridDiamondWidth,
    snap.view.offset.x,
    snap.view.offset.y,
    ENTITY_PANEL_WIDTH,
    snap.view.zoomLevel
  );

  return screenToGrid(
    screenX,
    screenY,
    gridOffset.offsetX,
    gridOffset.offsetY,
    snap.view.zoomLevel,
    snap.grid.width,
    snap.grid.height,
    snap.view.gridDiamondWidth
  );
}

/**
 * Detect the closest grid edge to a screen position
 */
export function detectClosestGridEdge(
  screenX: number, 
  screenY: number, 
  engine: any,
  edgeThreshold: number = 50
): { gridX: number; gridY: number; edge: IsometricDirection; distance: number } | null {
  // First get the grid cell using the helper function
  const gridResult = screenToGridWithEngine(screenX, screenY, engine);
  if (!gridResult || !gridResult.inBounds) {
    return null;
  }

  const { gridX, gridY } = gridResult;
  
  // Check all 4 edges of this cell
  const edges = [
    IsometricDirection.NORTH,
    IsometricDirection.EAST, 
    IsometricDirection.SOUTH,
    IsometricDirection.WEST
  ];

  let closestEdge: IsometricDirection = IsometricDirection.NORTH;
  let minDistance = Infinity;

  for (const edge of edges) {
    const edgePos = getGridEdgePosition(gridX, gridY, edge, engine);
    const distance = Math.sqrt(
      Math.pow(screenX - edgePos.x, 2) + Math.pow(screenY - edgePos.y, 2)
    );

    if (distance < minDistance && distance <= edgeThreshold) {
      minDistance = distance;
      closestEdge = edge;
    }
  }

  if (minDistance <= edgeThreshold) {
    return {
      gridX,
      gridY, 
      edge: closestEdge,
      distance: minDistance
    };
  }

  return null;
}

/**
 * Get information about edge zones for wall placement feedback
 */
export function getEdgeZoneInfo(
  screenX: number,
  screenY: number, 
  engine: any,
  edgeThreshold: number = 50
): {
  inEdgeZone: boolean;
  gridX?: number;
  gridY?: number;
  edge?: IsometricDirection;
  distance?: number;
} {
  const edgeInfo = detectClosestGridEdge(screenX, screenY, engine, edgeThreshold);
  
  if (edgeInfo) {
    return {
      inEdgeZone: true,
      gridX: edgeInfo.gridX,
      gridY: edgeInfo.gridY,
      edge: edgeInfo.edge,
      distance: edgeInfo.distance
    };
  }

  return { inEdgeZone: false };
}

/**
 * Get the precise corner coordinates of an isometric diamond
 * Returns screen coordinates for each corner of the diamond
 */
export function getIsometricDiamondCorners(
  gridX: number, 
  gridY: number, 
  isometricOffset: { offsetX: number; offsetY: number; tileSize: number }
): {
  north: { x: number; y: number };    // Top point
  east: { x: number; y: number };     // Right point  
  south: { x: number; y: number };    // Bottom point
  west: { x: number; y: number };     // Left point
  center: { x: number; y: number };   // Center point (for reference)
} {
  // Get the center position of the grid cell
  const { isoX, isoY } = gridToIsometric(gridX, gridY, isometricOffset.tileSize);
  const centerX = isometricOffset.offsetX + isoX;
  const centerY = isometricOffset.offsetY + isoY;
  
  // Calculate diamond dimensions
  const halfWidth = isometricOffset.tileSize / 2;  // Half diamond width
  const halfHeight = isometricOffset.tileSize / 4; // Half diamond height (2:1 aspect ratio)
  
  return {
    north: { x: centerX, y: centerY - halfHeight },           // Top point
    east: { x: centerX + halfWidth, y: centerY },             // Right point
    south: { x: centerX, y: centerY + halfHeight },           // Bottom point
    west: { x: centerX - halfWidth, y: centerY },             // Left point
    center: { x: centerX, y: centerY }                        // Center (for reference)
  };
}

/**
 * Get the edge position for wall placement based on wall direction
 */
export function getWallEdgePosition(
  gridX: number,
  gridY: number, 
  wallDirection: IsometricDirection,
  isometricOffset: { offsetX: number; offsetY: number; tileSize: number }
): { x: number; y: number } {
  const corners = getIsometricDiamondCorners(gridX, gridY, isometricOffset);
  
  switch (wallDirection) {
    case IsometricDirection.NORTH:
      // North wall: bottom-left anchor → diamond's west corner (left point)
      return corners.west;
    case IsometricDirection.EAST:
      // East wall: bottom-right anchor → diamond's east corner
      return corners.east;
    case IsometricDirection.SOUTH:
      // South wall: bottom-left anchor → diamond's south corner
      return corners.south;
    case IsometricDirection.WEST:
      // West wall: bottom-right anchor → diamond's south corner
      return corners.south;
    default:
      return corners.center; // Fallback
  }
}

/**
 * Get the correct sprite anchor point for a wall based on its direction
 * Returns anchor values for PIXI sprite (0-1 range)
 */
export function getWallSpriteAnchor(wallDirection: IsometricDirection): { x: number; y: number } {
  switch (wallDirection) {
    case IsometricDirection.NORTH:
      // North wall: left-bottom corner of sprite
      return { x: 0.0, y: 1.0 };
    case IsometricDirection.EAST:
      // East wall: bottom-right corner of sprite  
      return { x: 1.0, y: 1.0 };
    case IsometricDirection.SOUTH:
      // South wall: left-bottom corner of sprite
      return { x: 0.0, y: 1.0 };
    case IsometricDirection.WEST:
      // West wall: bottom-right corner of sprite
      return { x: 1.0, y: 1.0 };
    default:
      // Fallback to center-bottom (like blocks)
      return { x: 0.5, y: 1.0 };
  }
} 