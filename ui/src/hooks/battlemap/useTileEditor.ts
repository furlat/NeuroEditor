import { useCallback } from 'react';
import { battlemapActions, battlemapStore } from '../../store/battlemapStore';
import { useSnapshot } from 'valtio';

export type TileType = 'floor' | 'wall' | 'water' | 'lava' | 'grass' | 'erase';

/**
 * Hook for tile editor functionality
 * PERFORMANCE OPTIMIZED: Only subscribes to tile editor controls
 */
export const useTileEditor = () => {
  // PERFORMANCE FIX: Only subscribe to controls, not view/grid that change during WASD movement
  const controlsSnap = useSnapshot(battlemapStore.controls);
  
  // Extract tile editor state from the store
  const selectedTile = controlsSnap.selectedTileType as TileType;
  const isEditing = controlsSnap.isEditing;
  const isEditorVisible = controlsSnap.isEditorVisible;

  const toggleEditing = useCallback(() => {
    const newEditingState = !isEditing;
    console.log('[TileEditor] Toggling editing mode:', { current: isEditing, new: newEditingState });
    
    battlemapActions.setTileEditing(newEditingState);
    
    // When enabling editing, always show the editor panel
    if (newEditingState) {
      console.log('[TileEditor] Editing enabled, showing editor panel');
      battlemapActions.setTileEditorVisible(true);
    }
  }, [isEditing]);

  const toggleEditorVisibility = useCallback(() => {
    const newVisibility = !isEditorVisible;
    console.log('[TileEditor] Toggling editor visibility:', { current: isEditorVisible, new: newVisibility });
    
    battlemapActions.setTileEditorVisible(newVisibility);
  }, [isEditorVisible]);

  const selectTile = useCallback((tileType: TileType) => {
    console.log('[TileEditor] Selecting tile type:', { previous: selectedTile, new: tileType });
    
    battlemapActions.setSelectedTileType(tileType);
  }, [selectedTile]);

  // Utility functions for local tile manipulation
  const clearAllTiles = useCallback(() => {
    console.log('[TileEditor] Clearing all tiles');
    battlemapActions.clearAllTiles();
  }, []);

  const generateSampleTiles = useCallback(() => {
    console.log('[TileEditor] Generating sample tiles');
    battlemapActions.generateSampleTiles();
  }, []);

  const initializeGrid = useCallback((width: number = 30, height: number = 20) => {
    console.log('[TileEditor] Initializing grid:', { width, height });
    battlemapActions.initializeLocalGrid(width, height);
  }, []);

  return {
    selectedTile,
    isEditing,
    isEditorVisible,
    toggleEditing,
    toggleEditorVisibility,
    selectTile,
    // Utility functions for map management
    clearAllTiles,
    generateSampleTiles,
    initializeGrid,
  };
};

export default useTileEditor; 