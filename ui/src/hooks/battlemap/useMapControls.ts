import { useCallback } from 'react';
import { useSnapshot } from 'valtio';
import { battlemapStore, battlemapActions } from '../../store/battlemapStore';

// Constants for zoom
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5.0;
const ZOOM_STEP = 0.2;

/**
 * Hook for managing the battlemap UI controls and settings
 * Updated for isometric system with proper zoom controls
 * PERFORMANCE OPTIMIZED: Only subscribes to control-relevant properties
 */
export const useMapControls = () => {
  // PERFORMANCE FIX: Use selective snapshot to avoid re-renders during WASD movement
  // Only subscribe to the specific properties this hook actually needs
  const controlsSnap = useSnapshot(battlemapStore.controls);
  const viewSnap = useSnapshot(battlemapStore.view, {
    sync: false // Don't sync immediately - helps with performance
  });
  
  // Only extract the properties we actually need for UI controls
  const zoomLevel = viewSnap.zoomLevel;
  const gridDiamondWidth = viewSnap.gridDiamondWidth;
  const spriteScale = viewSnap.spriteScale;
  const isLocked = controlsSnap.isLocked;
  const isGridVisible = controlsSnap.isGridVisible;
  const isTilesVisible = controlsSnap.isTilesVisible;
  const isWasdMoving = viewSnap.wasd_moving;
  
  // We don't need to subscribe to offset changes for controls
  // so we get it directly from store when needed
  const getOffset = () => battlemapStore.view.offset;
  
  /**
   * Zoom in (increase zoom level)
   */
  const zoomIn = useCallback(() => {
    const currentZoom = zoomLevel;
    const newZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
    battlemapActions.setZoomLevel(newZoom);
  }, [zoomLevel]);
  
  /**
   * Zoom out (decrease zoom level)
   */
  const zoomOut = useCallback(() => {
    const currentZoom = zoomLevel;
    const newZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
    battlemapActions.setZoomLevel(newZoom);
  }, [zoomLevel]);
  
  /**
   * Reset view to default (reset zoom and offset)
   */
  const resetView = useCallback(() => {
    battlemapActions.setZoomLevel(1.0); // Reset to 1x zoom
    battlemapActions.setOffset(0, 0);
    battlemapActions.setGridDiamondWidth(400); // Updated to match default value
    battlemapActions.setSpriteScale(1.0); // Updated to match default value
  }, []);
  
  /**
   * Lock/unlock the map (affects movement and editing)
   */
  const setLocked = useCallback((locked: boolean) => {
    battlemapActions.setLocked(locked);
    
    // If locking, also close the tile editor
    if (locked && controlsSnap.isEditing) {
      console.log('[MapControls] Map locked, closing tile editor');
      battlemapActions.setTileEditing(false);
      battlemapActions.setTileEditorVisible(false);
    }
  }, [controlsSnap.isEditing]);
  
  /**
   * Toggle lock state
   */
  const toggleLock = useCallback(() => {
    const newLocked = !isLocked;
    setLocked(newLocked);
  }, [isLocked, setLocked]);
  
  /**
   * Set grid visibility
   */
  const setGridVisible = useCallback((visible: boolean) => {
    battlemapActions.setGridVisible(visible);
  }, []);
  
  /**
   * Toggle grid visibility
   */
  const toggleGridVisibility = useCallback(() => {
    battlemapActions.setGridVisible(!isGridVisible);
  }, [isGridVisible]);
  
  /**
   * Set tiles visibility
   */
  const setTilesVisible = useCallback((visible: boolean) => {
    battlemapActions.setTilesVisible(visible);
  }, []);
  
  /**
   * Toggle tiles visibility
   */
  const toggleTilesVisibility = useCallback(() => {
    battlemapActions.setTilesVisible(!isTilesVisible);
  }, [isTilesVisible]);
  
  return {
    // Current state
    zoomLevel, // Updated from tileSize
    gridDiamondWidth, // Current grid diamond width
    spriteScale, // Current sprite scale
    offset: getOffset(), // Get offset when needed, not reactive
    isLocked,
    isGridVisible,
    isTilesVisible,
    isWasdMoving, // Still exposed for UI feedback
    
    // Methods
    zoomIn,
    zoomOut,
    resetView,
    setLocked,
    toggleLock,
    setGridVisible,
    toggleGridVisibility,
    setTilesVisible,
    toggleTilesVisibility,
  };
}; 