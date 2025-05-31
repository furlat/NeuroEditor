import { useState } from 'react';
import { useSnapshot } from 'valtio';
import { battlemapStore } from '../../store/battlemapStore';

/**
 * Simplified hook for container size management
 * Legacy grid calculation methods removed - isometric system uses IsometricRenderingUtils
 */
export const useGrid = () => {
  const snap = useSnapshot(battlemapStore);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  return {
    // Basic grid info
    gridWidth: snap.grid.width,
    gridHeight: snap.grid.height,
    
    // Current hover state
    hoveredCell: snap.view.hoveredCell,
    
    // Container size management (only thing actually used by components)
    containerSize,
    setContainerSize,
  };
}; 