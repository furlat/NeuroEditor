import React, { useCallback } from 'react';
import { Box, Paper, IconButton, Tooltip, Divider, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import GridOnIcon from '@mui/icons-material/GridOn';
import GridOffIcon from '@mui/icons-material/GridOff';
import EditIcon from '@mui/icons-material/Edit';
import EditOffIcon from '@mui/icons-material/EditOff';
import ImageIcon from '@mui/icons-material/Image';
import HideImageIcon from '@mui/icons-material/HideImage';
import { useMapControls } from '../../../hooks/battlemap';
import IsometricConfigurationPanel from './IsometricConfigurationPanel';
import { battlemapStore } from '../../../store';
import { useSnapshot } from 'valtio';
import ZLayerSelector from './ZLayerSelector';

/**
 * Component that renders the tile editor control panel
 * PERFORMANCE OPTIMIZED: Only subscribes to view properties needed for display
 */
export const CanvasControls: React.FC = () => {
  // Use the hooks to get the state and actions
  const { 
    isLocked, 
    isGridVisible, 
    isTilesVisible,
    toggleLock,
    toggleGridVisibility,
    toggleTilesVisibility,
    resetView,
    zoomIn,
    zoomOut
  } = useMapControls();
  
  // Simple editing state - get from store directly
  const controlsSnap = useSnapshot(battlemapStore.controls);
  const isEditing = controlsSnap.isEditing;
  const isEditorVisible = controlsSnap.isEditorVisible;
  
  const toggleEditing = () => {
    battlemapStore.controls.isEditing = !battlemapStore.controls.isEditing;
  };
  
  const toggleEditorVisibility = () => {
    battlemapStore.controls.isEditorVisible = !battlemapStore.controls.isEditorVisible;
  };
  
  // PERFORMANCE FIX: Only subscribe to hoveredCell, not the entire view object
  // This avoids re-renders when offset changes during WASD movement
  const hoveredCellSnap = useSnapshot(battlemapStore.view.hoveredCell);
  
  const handleEditToggle = useCallback(() => {
    console.log('[CanvasControls] Edit button clicked, current state:', { isEditing });
    
    // Toggle editing state
    toggleEditing();
    
    // If we're enabling editing, also ensure editor panel is visible
    if (!isEditing) {
      toggleEditorVisibility();
    }
    
    console.log('[CanvasControls] After toggle, new editing state will be:', { isEditing: !isEditing });
  }, [isEditing, toggleEditing, toggleEditorVisibility]);

  const formatPosition = (x: number, y: number): string => {
    if (x < 0 || y < 0) return 'Outside';
    return `(${x}, ${y})`;
  };

  return (
    <>
      {/* Main Control Panel - Centered at Top */}
      <Paper 
        sx={{ 
          position: 'absolute', 
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: 2,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          color: 'white',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          gap: 2
        }}
      >
        {/* Lock Control */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={isLocked ? "Unlock Map" : "Lock Map"}>
            <IconButton
              onClick={toggleLock}
              sx={{ color: isLocked ? '#f44336' : '#4caf50' }}
            >
              {isLocked ? <LockIcon /> : <LockOpenIcon />}
            </IconButton>
          </Tooltip>
          
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {isLocked ? '🔒' : '🔓'}
          </Typography>
        </Box>
        
        <Divider orientation="vertical" sx={{ borderColor: 'rgba(255,255,255,0.3)', height: 30 }} />

        {/* View Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Zoom In">
            <IconButton
              onClick={zoomIn}
              disabled={isLocked}
              sx={{ color: 'white' }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Zoom Out">
            <IconButton
              onClick={zoomOut}
              disabled={isLocked}
              sx={{ color: 'white' }}
            >
              <RemoveIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Reset View">
            <IconButton
              onClick={resetView}
              disabled={isLocked}
              sx={{ color: 'white' }}
            >
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Divider orientation="vertical" sx={{ borderColor: 'rgba(255,255,255,0.3)', height: 30 }} />

        {/* Visibility Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={isGridVisible ? "Hide Grid" : "Show Grid"}>
            <IconButton
              onClick={toggleGridVisibility}
              disabled={isLocked}
              sx={{ color: isGridVisible ? '#00bcd4' : 'rgba(255,255,255,0.5)' }}
            >
              {isGridVisible ? <GridOnIcon /> : <GridOffIcon />}
            </IconButton>
          </Tooltip>
          
          <Tooltip title={isTilesVisible ? "Hide Tiles" : "Show Tiles"}>
            <IconButton
              onClick={toggleTilesVisibility}
              disabled={isLocked}
              sx={{ color: isTilesVisible ? '#ff9800' : 'rgba(255,255,255,0.5)' }}
            >
              {isTilesVisible ? <ImageIcon /> : <HideImageIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        <Divider orientation="vertical" sx={{ borderColor: 'rgba(255,255,255,0.3)', height: 30 }} />

        {/* Tile Editor Toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title={isEditing ? "Close Tile Editor" : "Open Tile Editor"}>
            <IconButton
              onClick={handleEditToggle}
              disabled={isLocked}
              sx={{ color: isEditing ? '#4caf50' : 'rgba(255,255,255,0.5)' }}
            >
              {isEditing ? <EditIcon /> : <EditOffIcon />}
            </IconButton>
          </Tooltip>
          
          <Typography variant="body2" sx={{ opacity: 0.8 }}>
            {isEditing ? '🎨' : '📋'}
          </Typography>
        </Box>

        <Divider orientation="vertical" sx={{ borderColor: 'rgba(255,255,255,0.3)', height: 30 }} />

        {/* Mouse Position Display */}
        <Typography variant="caption" sx={{ opacity: 0.6 }}>
          🖱️ {formatPosition(hoveredCellSnap.x, hoveredCellSnap.y)}
        </Typography>

      </Paper>

      {/* Z-Layer Selector */}
      <ZLayerSelector isLocked={isLocked} />

      {/* Tile Editor Panels */}
      {isEditing && (
        <>
          {/* Configuration Panel with Utils - Right Side */}
          <Box sx={{
            position: 'absolute',
            top: 80,
            right: 16,
            zIndex: 1000
          }}>
            <IsometricConfigurationPanel isLocked={isLocked} />
          </Box>
        </>
      )}
    </>
  );
}; 