import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  TextField,
  Divider,
  Switch,
  FormControlLabel,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { useSnapshot } from 'valtio';
import { battlemapStore, battlemapActions, VerticalBiasComputationMode } from '../../../store';
import { isometricSpriteManager } from '../../../game/managers/IsometricSpriteManager';
import { useTileEditor } from '../../../hooks/battlemap';

interface IsometricConfigurationPanelProps {
  isLocked: boolean;
}

/**
 * Configuration panel for isometric editor settings
 * PERFORMANCE OPTIMIZED: Only subscribes to editor controls and relevant view settings
 */
const IsometricConfigurationPanel: React.FC<IsometricConfigurationPanelProps> = ({ isLocked }) => {
  // PERFORMANCE FIX: Use controlled snapshots to minimize re-renders
  // We only extract the specific properties we need
  const controlsSnap = useSnapshot(battlemapStore.controls);
  const viewSnap = useSnapshot(battlemapStore.view);
  
  const isometricEditor = controlsSnap.isometricEditor;
  const gridDiamondWidth = viewSnap.gridDiamondWidth;
  const spriteScale = viewSnap.spriteScale;
  const verticalBiasComputationMode = viewSnap.verticalBiasComputationMode;

  // Get utilities from useTileEditor hook
  const {
    clearAllTiles,
    generateSampleTiles,
    initializeGrid,
  } = useTileEditor();

  // Get current sprite settings for display - FIXED: Use reactive store snapshot instead of action function
  const currentSpriteSettings = isometricEditor.selectedSpriteName 
    ? isometricEditor.spriteTypeSettings[isometricEditor.selectedSpriteName]
    : null;

  // NEW: Handle manual vertical bias changes
  const handleManualVerticalBiasChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && isometricEditor.selectedSpriteName) {
      const currentSettings = battlemapActions.getSpriteTypeSettings(isometricEditor.selectedSpriteName);
      if (currentSettings) {
        const updatedSettings = {
          ...currentSettings,
          manualVerticalBias: value,
          useAutoComputed: false // Switch to manual mode when user changes value
        };
        console.log(`[IsometricConfigurationPanel] Setting manual vertical bias for ${isometricEditor.selectedSpriteName}: ${value}px`);
        battlemapActions.setSpriteTypeSettings(isometricEditor.selectedSpriteName, updatedSettings);
      }
    }
  };

  // NEW: Toggle between auto-computed and manual mode
  const handleToggleAutoMode = (spriteName: string) => {
    const currentSettings = battlemapActions.getSpriteTypeSettings(spriteName);
    if (currentSettings) {
      const updatedSettings = {
        ...currentSettings,
        useAutoComputed: !currentSettings.useAutoComputed
      };
      console.log(`[IsometricConfigurationPanel] Toggling auto mode for ${spriteName}: ${updatedSettings.useAutoComputed ? 'AUTO' : 'MANUAL'}`);
      battlemapActions.setSpriteTypeSettings(spriteName, updatedSettings);
    }
  };

  // NEW: Recalculate auto-computed values
  const handleRecalculate = (spriteName: string) => {
    const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
    if (spriteFrameSize) {
      // Use the store's calculation function which includes current rounding method
      const calculated = battlemapActions.calculateSpriteTypePositioning(spriteFrameSize.width, spriteFrameSize.height);
      battlemapActions.setSpriteTypeSettings(spriteName, calculated);
      console.log(`[IsometricConfigurationPanel] Recalculated ${spriteName} with current rounding method:`, calculated);
    }
  };

  // NEW: Handle margin changes
  const handleMarginChange = (marginType: 'up' | 'down' | 'left' | 'right', value: number) => {
    if (!isometricEditor.selectedSpriteName) return;
    
    const currentSettings = battlemapActions.getSpriteTypeSettings(isometricEditor.selectedSpriteName);
    if (!currentSettings) return;
    
    const updatedSettings = {
      ...currentSettings,
      [`invisibleMargin${marginType.charAt(0).toUpperCase() + marginType.slice(1)}`]: value
    };
    
    // If in auto mode, recalculate the auto-computed vertical bias with new margins
    if (currentSettings.useAutoComputed) {
      const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(isometricEditor.selectedSpriteName);
      if (spriteFrameSize) {
        const margins = {
          up: marginType === 'up' ? value : currentSettings.invisibleMarginUp,
          down: marginType === 'down' ? value : currentSettings.invisibleMarginDown,
          left: marginType === 'left' ? value : currentSettings.invisibleMarginLeft,
          right: marginType === 'right' ? value : currentSettings.invisibleMarginRight
        };
        
        // Use the store's calculation function which includes proper rounding
        const recalculated = battlemapActions.calculateSpriteTypePositioning(
          spriteFrameSize.width, 
          spriteFrameSize.height, 
          margins
        );
        
        updatedSettings.autoComputedVerticalBias = recalculated.autoComputedVerticalBias;
        console.log(`[IsometricConfigurationPanel] Recalculated auto bias for ${isometricEditor.selectedSpriteName}: ${recalculated.autoComputedVerticalBias}px (${verticalBiasComputationMode})`);
      }
    }
    
    console.log(`[IsometricConfigurationPanel] Updating ${marginType} margin for ${isometricEditor.selectedSpriteName}: ${value}px`);
    battlemapActions.setSpriteTypeSettings(isometricEditor.selectedSpriteName, updatedSettings as any);
  };

  return (
    <Paper sx={{ 
      p: 2, 
      backgroundColor: 'rgba(0, 0, 0, 0.9)', 
      color: 'white',
      maxHeight: '80vh',
      overflow: 'auto',
      width: '350px'
    }}>
      <Typography variant="h6" gutterBottom>
        ⚙️ Configuration & Utilities
      </Typography>

      {isLocked && (
        <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
          ⚠️ Unlock the map to edit configuration
        </Typography>
      )}

      {/* Map Utilities */}
      <Typography variant="subtitle2" gutterBottom sx={{ color: '#FFC107' }}>
        🛠️ Map Utilities
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
        <Button
          variant="contained"
          onClick={generateSampleTiles}
          disabled={isLocked}
          size="small"
          sx={{ justifyContent: 'flex-start' }}
        >
          🎨 Generate Sample Tiles
        </Button>

        <Button
          variant="outlined"
          onClick={clearAllTiles}
          disabled={isLocked}
          color="warning"
          size="small"
          sx={{ justifyContent: 'flex-start' }}
        >
          🗑️ Clear All Tiles
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => initializeGrid(30, 20)}
            disabled={isLocked}
            size="small"
            sx={{ flex: 1, fontSize: '0.7rem' }}
          >
            📐 Grid 30x20
          </Button>

          <Button
            variant="outlined"
            onClick={() => initializeGrid(50, 30)}
            disabled={isLocked}
            size="small"
            sx={{ flex: 1, fontSize: '0.7rem' }}
          >
            📐 Grid 50x30
          </Button>
        </Box>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.3)', my: 2 }} />

      {/* Global Controls */}
      <Typography variant="subtitle2" gutterBottom sx={{ color: '#FFC107' }}>
        🎯 Global Controls
      </Typography>

      {/* Grid Diamond Width */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2" sx={{ minWidth: '80px' }}>Grid Size:</Typography>
          <TextField
            type="number"
            value={gridDiamondWidth}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (!isNaN(value)) battlemapActions.setGridDiamondWidth(value);
            }}
            onFocus={() => console.log('[IsometricConfigurationPanel] Grid size input focused')}
            onBlur={() => console.log('[IsometricConfigurationPanel] Grid size input blurred')}
            disabled={isLocked}
            size="small"
            sx={{ 
              width: '120px',
              '& .MuiInputBase-input': { color: 'white', fontSize: '0.8rem', padding: '4px 8px' },
              '& .MuiOutlinedInput-root': { 
                '& fieldset': { borderColor: '#FFC107' },
                '&:hover fieldset': { borderColor: '#FFC107' }
              }
            }}
          />
          <Typography variant="caption" sx={{ color: '#FFC107' }}>px</Typography>
        </Box>
      </Box>

      {/* Sprite Scale */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2" sx={{ minWidth: '80px' }}>Sprite Scale:</Typography>
          <TextField
            type="number"
            value={spriteScale.toFixed(2)}
            onChange={(e) => {
              const value = parseFloat(e.target.value);
              if (!isNaN(value) && value >= 0.1 && value <= 5.0) {
                battlemapActions.setSpriteScale(value);
              }
            }}
            onFocus={() => console.log('[IsometricConfigurationPanel] Sprite scale input focused')}
            onBlur={() => console.log('[IsometricConfigurationPanel] Sprite scale input blurred')}
            disabled={isLocked}
            size="small"
            sx={{ 
              width: '80px',
              '& .MuiInputBase-input': { color: 'white', fontSize: '0.8rem', padding: '4px 8px' },
              '& .MuiOutlinedInput-root': { 
                '& fieldset': { borderColor: '#FF9800' },
                '&:hover fieldset': { borderColor: '#FF9800' }
              }
            }}
            inputProps={{ min: 0.1, max: 5.0, step: 0.01 }}
          />
          <Typography variant="caption" sx={{ color: '#FF9800' }}>x</Typography>
        </Box>
      </Box>

      {/* Vertical Bias Computation Mode */}
      <Box sx={{ mb: 2 }}>
        <FormControl fullWidth size="small">
          <InputLabel sx={{ color: 'rgba(255,255,255,0.7)' }}>Computation Method</InputLabel>
          <Select
            value={verticalBiasComputationMode}
            onChange={(e) => battlemapActions.setVerticalBiasComputationMode(e.target.value as VerticalBiasComputationMode)}
            disabled={isLocked}
            sx={{
              color: 'white',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#9C27B0' },
              '& .MuiSvgIcon-root': { color: 'white' }
            }}
          >
            <MenuItem value={VerticalBiasComputationMode.ROUND_DOWN}>Round Down (Floor)</MenuItem>
            <MenuItem value={VerticalBiasComputationMode.ROUND_UP}>Round Up (Ceil)</MenuItem>
            <MenuItem value={VerticalBiasComputationMode.SNAP_TO_NEAREST}>Snap to Nearest (36px/196px)</MenuItem>
          </Select>
        </FormControl>
        <Typography variant="caption" sx={{ color: '#9C27B0', fontSize: '0.65rem', mt: 0.5, display: 'block' }}>
          {verticalBiasComputationMode === VerticalBiasComputationMode.SNAP_TO_NEAREST 
            ? '🎯 Snaps computed values to nearest: 36px (garden base) or 196px (garden decoration)'
            : verticalBiasComputationMode === VerticalBiasComputationMode.ROUND_UP
            ? '⬆️ Rounds computed values up (Math.ceil)'
            : '⬇️ Rounds computed values down (Math.floor)'
          }
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.3)', my: 2 }} />

      {/* Per-Sprite Settings */}
      {isometricEditor.selectedSpriteName && (
        <>
          <Typography variant="subtitle2" gutterBottom sx={{ color: '#4CAF50' }}>
            🖼️ {isometricEditor.selectedSpriteName.replace(/_/g, ' ')} Settings
          </Typography>

          {currentSpriteSettings && (
            <>
              {/* Auto/Manual Mode Toggle */}
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentSpriteSettings.useAutoComputed}
                      onChange={() => handleToggleAutoMode(isometricEditor.selectedSpriteName!)}
                      disabled={isLocked}
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#2196F3' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#2196F3' }
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: currentSpriteSettings.useAutoComputed ? '#2196F3' : 'white' }}>
                        {currentSpriteSettings.useAutoComputed ? '🤖 Auto Computed' : '✋ Manual Override'}
                      </Typography>
                      {currentSpriteSettings.useAutoComputed && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleRecalculate(isometricEditor.selectedSpriteName!)}
                          disabled={isLocked}
                          sx={{
                            minWidth: 'auto',
                            padding: '2px 6px',
                            fontSize: '0.6rem',
                            borderColor: '#2196F3',
                            color: '#2196F3',
                            '&:hover': { borderColor: '#1976D2', color: '#1976D2' }
                          }}
                        >
                          🔄 Recalc
                        </Button>
                      )}
                    </Box>
                  }
                  sx={{ mb: 1 }}
                />
              </Box>

              {/* Vertical Bias Settings */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#FF5722' }}>
                  📏 Vertical Positioning:
                </Typography>
                
                {/* Auto-computed display */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: '60px', color: '#2196F3' }}>Auto:</Typography>
                  <Typography variant="body2" sx={{ 
                    color: currentSpriteSettings.useAutoComputed ? '#2196F3' : 'rgba(255,255,255,0.5)',
                    fontWeight: currentSpriteSettings.useAutoComputed ? 'bold' : 'normal'
                  }}>
                    {currentSpriteSettings.autoComputedVerticalBias}px
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#9C27B0', fontSize: '0.6rem' }}>
                    ({(verticalBiasComputationMode as string).replace('_', ' ')})
                  </Typography>
                </Box>
                
                {/* Manual override */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: '60px', color: '#FF5722' }}>Manual:</Typography>
                  <TextField
                    type="number"
                    value={currentSpriteSettings.manualVerticalBias}
                    onChange={handleManualVerticalBiasChange}
                    disabled={isLocked || currentSpriteSettings.useAutoComputed}
                    size="small"
                    sx={{ 
                      width: '80px',
                      '& .MuiInputBase-input': { 
                        color: currentSpriteSettings.useAutoComputed ? 'rgba(255,255,255,0.3)' : 'white', 
                        fontSize: '0.8rem', 
                        padding: '4px 8px' 
                      },
                      '& .MuiOutlinedInput-root': { 
                        '& fieldset': { borderColor: currentSpriteSettings.useAutoComputed ? 'rgba(255,255,255,0.2)' : '#FF5722' },
                        '&:hover fieldset': { borderColor: currentSpriteSettings.useAutoComputed ? 'rgba(255,255,255,0.2)' : '#D84315' }
                      }
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#FF5722' }}>px</Typography>
                </Box>

                {/* Active value display */}
                <Typography variant="caption" sx={{ 
                  color: '#4CAF50', 
                  fontSize: '0.65rem',
                  fontWeight: 'bold'
                }}>
                  ✅ Active: {currentSpriteSettings.useAutoComputed ? currentSpriteSettings.autoComputedVerticalBias : currentSpriteSettings.manualVerticalBias}px
                </Typography>
              </Box>

              {/* 4-Directional Margins */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#673AB7' }}>
                  📐 Invisible Margins:
                </Typography>
                
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                  {/* Up */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ minWidth: '30px', color: '#673AB7' }}>Up:</Typography>
                    <TextField
                      type="number"
                      value={currentSpriteSettings.invisibleMarginUp}
                      onChange={(e) => handleMarginChange('up', parseInt(e.target.value) || 0)}
                      disabled={isLocked}
                      size="small"
                      sx={{ 
                        width: '60px',
                        '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                        '& .MuiOutlinedInput-root': { 
                          '& fieldset': { borderColor: '#673AB7' },
                          '&:hover fieldset': { borderColor: '#512DA8' }
                        }
                      }}
                    />
                  </Box>
                  
                  {/* Down */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ minWidth: '40px', color: '#673AB7' }}>Down:</Typography>
                    <TextField
                      type="number"
                      value={currentSpriteSettings.invisibleMarginDown}
                      onChange={(e) => handleMarginChange('down', parseInt(e.target.value) || 0)}
                      disabled={isLocked}
                      size="small"
                      sx={{ 
                        width: '60px',
                        '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                        '& .MuiOutlinedInput-root': { 
                          '& fieldset': { borderColor: '#673AB7' },
                          '&:hover fieldset': { borderColor: '#512DA8' }
                        }
                      }}
                    />
                  </Box>
                  
                  {/* Left */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ minWidth: '30px', color: '#673AB7' }}>Left:</Typography>
                    <TextField
                      type="number"
                      value={currentSpriteSettings.invisibleMarginLeft}
                      onChange={(e) => handleMarginChange('left', parseInt(e.target.value) || 0)}
                      disabled={isLocked}
                      size="small"
                      sx={{ 
                        width: '60px',
                        '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                        '& .MuiOutlinedInput-root': { 
                          '& fieldset': { borderColor: '#673AB7' },
                          '&:hover fieldset': { borderColor: '#512DA8' }
                        }
                      }}
                    />
                  </Box>
                  
                  {/* Right */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Typography variant="caption" sx={{ minWidth: '40px', color: '#673AB7' }}>Right:</Typography>
                    <TextField
                      type="number"
                      value={currentSpriteSettings.invisibleMarginRight}
                      onChange={(e) => handleMarginChange('right', parseInt(e.target.value) || 0)}
                      disabled={isLocked}
                      size="small"
                      sx={{ 
                        width: '60px',
                        '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                        '& .MuiOutlinedInput-root': { 
                          '& fieldset': { borderColor: '#673AB7' },
                          '&:hover fieldset': { borderColor: '#512DA8' }
                        }
                      }}
                    />
                  </Box>
                </Box>
              </Box>
            </>
          )}

          {!currentSpriteSettings && (
            <Typography variant="body2" sx={{ opacity: 0.7, mb: 2 }}>
              📋 No settings configured yet. Settings will be auto-calculated when you place a tile.
            </Typography>
          )}
        </>
      )}

      {!isometricEditor.selectedSpriteName && (
        <Typography variant="body2" sx={{ opacity: 0.7, color: '#FFC107' }}>
          💡 Select a sprite to configure its positioning settings
        </Typography>
      )}
    </Paper>
  );
};

export default IsometricConfigurationPanel; 