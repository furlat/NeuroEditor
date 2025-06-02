import { useState, useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { battlemapStore } from '../../store';

/**
 * Simplified hook for container size management
 * Legacy grid calculation methods removed - isometric system uses IsometricRenderingUtils
 * PERFORMANCE OPTIMIZED: Only subscribes to grid-relevant properties
 */
export const useGrid = () => {
  // PERFORMANCE FIX: Only subscribe to grid properties, not the entire store
  const gridSnap = useSnapshot(battlemapStore.grid);
  const viewSnap = useSnapshot(battlemapStore.view, {
    sync: false // Async updates for better performance
  });
  
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  
  return {
    // Basic grid info - these rarely change so won't cause many re-renders
    gridWidth: gridSnap.width,
    gridHeight: gridSnap.height,
    
    // Current hover state - only used for display, doesn't need to be perfectly reactive
    hoveredCell: viewSnap.hoveredCell,
    
    // Container size management (only thing actually used by components)
    containerSize,
    setContainerSize,
  };
}; 