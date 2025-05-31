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
 */
export const useMapControls = () => {
  const snap = useSnapshot(battlemapStore);
  
  /**
   * Zoom in (increase zoom level)
   */
  const zoomIn = useCallback(() => {
    const currentZoom = snap.view.zoomLevel;
    const newZoom = Math.min(currentZoom + ZOOM_STEP, MAX_ZOOM);
    battlemapActions.setZoomLevel(newZoom);
  }, [snap.view.zoomLevel]);
  
  /**
   * Zoom out (decrease zoom level)
   */
  const zoomOut = useCallback(() => {
    const currentZoom = snap.view.zoomLevel;
    const newZoom = Math.max(currentZoom - ZOOM_STEP, MIN_ZOOM);
    battlemapActions.setZoomLevel(newZoom);
  }, [snap.view.zoomLevel]);
  
  /**
   * Reset view to default (reset zoom and offset)
   */
  const resetView = useCallback(() => {
    battlemapActions.setZoomLevel(1.0); // Reset to 1x zoom
    battlemapActions.setOffset(0, 0);
    battlemapActions.setGridDiamondWidth(200); // Updated to match sprites better
    battlemapActions.setSpriteScale(0.5); // Updated to scale down large sprites
  }, []);
  
  /**
   * Lock/unlock the map (affects movement and editing)
   */
  const setLocked = useCallback((locked: boolean) => {
    battlemapActions.setLocked(locked);
    
    // If locking, also close the tile editor
    if (locked && snap.controls.isEditing) {
      console.log('[MapControls] Map locked, closing tile editor');
      battlemapActions.setTileEditing(false);
      battlemapActions.setTileEditorVisible(false);
    }
  }, [snap.controls.isEditing]);
  
  /**
   * Toggle lock state
   */
  const toggleLock = useCallback(() => {
    const newLocked = !snap.controls.isLocked;
    setLocked(newLocked);
  }, [snap.controls.isLocked, setLocked]);
  
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
    battlemapActions.setGridVisible(!snap.controls.isGridVisible);
  }, [snap.controls.isGridVisible]);
  
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
    battlemapActions.setTilesVisible(!snap.controls.isTilesVisible);
  }, [snap.controls.isTilesVisible]);
  
  return {
    // Current state
    zoomLevel: snap.view.zoomLevel, // Updated from tileSize
    gridDiamondWidth: snap.view.gridDiamondWidth, // Current grid diamond width
    spriteScale: snap.view.spriteScale, // Current sprite scale
    offset: snap.view.offset,
    isLocked: snap.controls.isLocked,
    isGridVisible: snap.controls.isGridVisible,
    isTilesVisible: snap.controls.isTilesVisible,
    isWasdMoving: snap.view.wasd_moving, // Still exposed for UI feedback
    
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