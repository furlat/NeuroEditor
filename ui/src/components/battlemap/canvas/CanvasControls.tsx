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
import { useMapControls, useTileEditor } from '../../../hooks/battlemap';
import TileEditorPanel from './TileEditorPanel';
import IsometricSpriteSelector from './IsometricSpriteSelector';
import { battlemapStore } from '../../../store';
import { useSnapshot } from 'valtio';
import SettingsButton from '../../settings/SettingsButton';

/**
 * Component that renders the tile editor control panel
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
  
  const { 
    isEditing, 
    toggleEditing, 
    toggleEditorVisibility 
  } = useTileEditor();
  
  // Get the current hovered cell position directly from the store
  const snap = useSnapshot(battlemapStore);
  const hoveredCell = snap.view.hoveredCell;
  
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
  
  return (
    <>
      {/* Controls Panel - Positioned at top center */}
      <Paper 
        elevation={3} 
        sx={{ 
          position: 'absolute', 
          top: 8, 
          left: '50%',
          transform: 'translateX(-50%)',
          padding: 1,
          paddingX: 2,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          color: 'white',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          gap: 2,
          zIndex: 1
        }}
      >
        <Typography variant="body2">
          🎯 Position: ({hoveredCell.x >= 0 ? hoveredCell.x : '-'}, {hoveredCell.y >= 0 ? hoveredCell.y : '-'})
        </Typography>
        
        <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
        
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {/* Zoom controls */}
          <Tooltip title="Zoom Out">
            <IconButton 
              size="small" 
              onClick={zoomOut}
              sx={{ color: 'white' }}
            >
              <RemoveIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Reset View">
            <IconButton 
              size="small" 
              onClick={resetView}
              sx={{ color: 'white' }}
            >
              <RestartAltIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Zoom In">
            <IconButton 
              size="small" 
              onClick={zoomIn}
              sx={{ color: 'white' }}
            >
              <AddIcon />
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />

          {/* Lock Button */}
          <Tooltip title={isLocked ? "Unlock Map" : "Lock Map"}>
            <IconButton
              size="small"
              onClick={toggleLock}
              sx={{ 
                color: 'white',
                backgroundColor: isLocked ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
              }}
            >
              {isLocked ? <LockIcon /> : <LockOpenIcon />}
            </IconButton>
          </Tooltip>

          {/* Grid Toggle */}
          <Tooltip title={isGridVisible ? "Hide Grid" : "Show Grid"}>
            <IconButton
              size="small"
              onClick={toggleGridVisibility}
              sx={{ 
                color: 'white',
                backgroundColor: isGridVisible ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
              }}
            >
              {isGridVisible ? <GridOnIcon /> : <GridOffIcon />}
            </IconButton>
          </Tooltip>

          {/* Tiles Toggle */}
          <Tooltip title={isTilesVisible ? "Hide Tiles" : "Show Tiles"}>
            <IconButton
              size="small"
              onClick={toggleTilesVisibility}
              sx={{ 
                color: 'white',
                backgroundColor: isTilesVisible ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
              }}
            >
              {isTilesVisible ? <ImageIcon /> : <HideImageIcon />}
            </IconButton>
          </Tooltip>

          <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />

          {/* Tile Editor Toggle */}
          <Tooltip title={isEditing ? "Exit Tile Editor" : "Enter Tile Editor"}>
            <IconButton
              size="small"
              onClick={handleEditToggle}
              sx={{ 
                color: 'white',
                backgroundColor: isEditing ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
              }}
            >
              {isEditing ? <EditOffIcon /> : <EditIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ bgcolor: 'rgba(255,255,255,0.2)' }} />
        
        {/* Settings */}
        <SettingsButton />
      </Paper>

      {/* Editor Panels - Positioned on the right side */}
      {isEditing && (
        <Box
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            maxWidth: '320px',
            maxHeight: 'calc(100vh - 32px)',
            overflow: 'auto'
          }}
        >
          {/* Isometric Sprite Selector */}
          <IsometricSpriteSelector isLocked={isLocked} />
          
          {/* Traditional Tile Editor Panel */}
          <TileEditorPanel isLocked={isLocked} />
        </Box>
      )}
    </>
  );
}; 