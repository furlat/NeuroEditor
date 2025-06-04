import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Slider,
  Switch,
  FormControlLabel,
  Chip,
  Grid,
  Alert,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Crop as CropIcon,
  Transform as TransformIcon,
  Gamepad as GamepadIcon,
  Preview as PreviewIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Upload as UploadIcon
} from '@mui/icons-material';
import { useSnapshot } from 'valtio';
import { battlemapStore } from '../store';
import { processedAssetsActions } from '../store/battlemap/processedAssets';
import { IsometricDirection } from '../game/managers/IsometricSpriteManager';
import { isometricSpriteManager } from '../game/managers/IsometricSpriteManager';
import { getCanvasBoundingBox } from 'pixi.js';
import * as PIXI from 'pixi.js';
import { gameManager } from '../game/GameManager';
import { battlemapEngine } from '../game/BattlemapEngine';

interface ProcessedAssetConfigurationPanelProps {
  isLocked: boolean;
}

const ProcessedAssetConfigurationPanel: React.FC<ProcessedAssetConfigurationPanelProps> = ({ isLocked }) => {
  // Store subscriptions
  const processedAssetsSnap = useSnapshot(battlemapStore.processedAssets);
  const temporaryAsset = processedAssetsSnap.temporaryAsset;

  // Local state for direction selection (when using per-direction mode)
  const [selectedDirection, setSelectedDirection] = useState<IsometricDirection>(IsometricDirection.SOUTH);
  const [configStatus, setConfigStatus] = useState<{
    loaded: boolean;
    lastSaved?: string;
    error?: string;
  }>({ loaded: false });

  // Get current positioning settings based on shared vs per-direction mode
  const getCurrentPositioningSettings = () => {
    if (!temporaryAsset) return null;
    
    if (temporaryAsset.directionalBehavior.useSharedSettings) {
      return temporaryAsset.directionalBehavior.sharedSettings;
    } else {
      return temporaryAsset.directionalBehavior.directionalSettings[selectedDirection];
    }
  };

  const currentSettings = getCurrentPositioningSettings();

  // Function to get sprite bounding box info (from IsometricConfigurationPanel)
  const getSpriteBoundingBoxInfo = (spriteName: string): { 
    original: { width: number; height: number }; 
    boundingBox: { x: number; y: number; width: number; height: number } | null;
    error?: string;
  } => {
    try {
      const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
      if (!spriteFrameSize) {
        return { original: { width: 0, height: 0 }, boundingBox: null, error: 'Sprite not found' };
      }

      // Try to get the texture and compute bounding box
      const texture = isometricSpriteManager.getSpriteTexture(spriteName, IsometricDirection.SOUTH);
      if (!texture) {
        return { 
          original: spriteFrameSize, 
          boundingBox: null, 
          error: 'Texture not loaded' 
        };
      }

      // FIXED: Use proper approach to extract and analyze texture data
      try {
        // Create temporary canvas with correct dimensions
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) {
          return { 
            original: spriteFrameSize, 
            boundingBox: null, 
            error: 'Canvas context failed' 
          };
        }

        canvas.width = texture.width;
        canvas.height = texture.height;

        // Use PIXI's renderer to extract texture if available
        if (battlemapEngine?.app?.renderer) {
          try {
            const tempSprite = new PIXI.Sprite(texture);
            const extractedCanvas = battlemapEngine.app.renderer.extract.canvas(tempSprite) as HTMLCanvasElement;
            context.drawImage(extractedCanvas, 0, 0);
            tempSprite.destroy();
          } catch (extractError) {
            // Fallback to direct texture access
            const resource = texture.baseTexture.resource;
            if (resource && 'source' in resource) {
              const img = resource.source as HTMLImageElement;
              if (img && img.complete && img.naturalWidth > 0) {
                context.drawImage(
                  img,
                  texture.frame.x, texture.frame.y, texture.frame.width, texture.frame.height,
                  0, 0, texture.frame.width, texture.frame.height
                );
              } else {
                return { 
                  original: spriteFrameSize, 
                  boundingBox: null, 
                  error: 'Image not ready' 
                };
              }
            } else {
              return { 
                original: spriteFrameSize, 
                boundingBox: null, 
                error: 'Texture resource unavailable' 
              };
            }
          }
        } else {
          // No renderer available, try direct texture access
          const resource = texture.baseTexture.resource;
          if (resource && 'source' in resource) {
            const img = resource.source as HTMLImageElement;
            if (img && img.complete && img.naturalWidth > 0) {
              context.drawImage(
                img,
                texture.frame.x, texture.frame.y, texture.frame.width, texture.frame.height,
                0, 0, texture.frame.width, texture.frame.height
              );
            } else {
              return { 
                original: spriteFrameSize, 
                boundingBox: null, 
                error: 'Image not ready' 
              };
            }
          } else {
            return { 
              original: spriteFrameSize, 
              boundingBox: null, 
              error: 'No renderer or resource available' 
            };
          }
        }

        // FIXED: Use the correct getCanvasBoundingBox function with resolution=1
        const boundingBox = getCanvasBoundingBox(canvas, 1);
        
        return {
          original: spriteFrameSize,
          boundingBox: {
            x: boundingBox.x,
            y: boundingBox.y,
            width: boundingBox.width,
            height: boundingBox.height
          }
        };
      } catch (processingError) {
        console.warn('[ProcessedAssetConfigurationPanel] Bounding box computation failed:', processingError);
        return { 
          original: spriteFrameSize, 
          boundingBox: null, 
          error: 'Bounding box computation failed' 
        };
      }
    } catch (error) {
      return { 
        original: { width: 0, height: 0 }, 
        boundingBox: null, 
        error: `Error: ${error}` 
      };
    }
  };

  // Handle refreshing the preview
  const handleRefreshPreview = () => {
    if (temporaryAsset) {
      // Clear existing instances first
      const existingInstances = processedAssetsActions.instances.getAllInstances();
      Object.keys(existingInstances).forEach(instanceKey => {
        processedAssetsActions.instances.removeAssetInstance(instanceKey);
      });
      
      // Re-place directional instances
      const placements = [
        { position: [0, 0] as const, direction: IsometricDirection.NORTH },
        { position: [0, 2] as const, direction: IsometricDirection.EAST },
        { position: [2, 0] as const, direction: IsometricDirection.SOUTH },
        { position: [2, 2] as const, direction: IsometricDirection.WEST },
      ];
      
      placements.forEach(({ position, direction }) => {
        processedAssetsActions.instances.placeAssetInstance(
          temporaryAsset.id,
          position,
          0, // Z level 0
          direction,
          'above' // Snap position
        );
      });
      
      console.log(`[ProcessedAssetConfigurationPanel] Refreshed preview for asset: ${temporaryAsset.id}`);
    }
  };

  // Handle shared settings toggle
  const handleSharedSettingsToggle = () => {
    if (!temporaryAsset) return;
    
    const newSharedState = !temporaryAsset.directionalBehavior.useSharedSettings;
    
    processedAssetsActions.creation.updateTemporaryAsset({
      directionalBehavior: {
        ...temporaryAsset.directionalBehavior,
        useSharedSettings: newSharedState
      }
    });
    
    console.log(`[ProcessedAssetConfigurationPanel] Toggled shared settings: ${newSharedState}`);
  };

  // Handle auto-computed vs manual toggle
  const handleToggleAutoMode = () => {
    if (!temporaryAsset || !currentSettings) return;
    
    // Auto-computed mode is only available for tile assets
    if (temporaryAsset.assetType !== 'tile') {
      console.warn('[ProcessedAssetConfigurationPanel] Auto-computed mode only available for tile assets');
      return;
    }
    
    const newUseAutoComputed = !currentSettings.useAutoComputed;
    
    updateCurrentSettings({
      useAutoComputed: newUseAutoComputed
    });
  };

  // Update current settings (shared or directional)
  const updateCurrentSettings = (updates: any) => {
    if (!temporaryAsset) return;
    
    if (temporaryAsset.directionalBehavior.useSharedSettings) {
      // Update shared settings
      processedAssetsActions.creation.updateTemporaryAsset({
        directionalBehavior: {
          ...temporaryAsset.directionalBehavior,
          sharedSettings: {
            ...temporaryAsset.directionalBehavior.sharedSettings,
            ...updates
          }
        }
      });
    } else {
      // Update specific direction settings
      processedAssetsActions.creation.updateTemporaryAsset({
        directionalBehavior: {
          ...temporaryAsset.directionalBehavior,
          directionalSettings: {
            ...temporaryAsset.directionalBehavior.directionalSettings,
            [selectedDirection]: {
              ...temporaryAsset.directionalBehavior.directionalSettings[selectedDirection],
              ...updates
            }
          }
        }
      });
    }
  };

  // Handle margin changes
  const handleMarginChange = (marginType: 'up' | 'down' | 'left' | 'right', value: number) => {
    const marginKey = `invisibleMargin${marginType.charAt(0).toUpperCase() + marginType.slice(1)}`;
    updateCurrentSettings({ [marginKey]: value });
  };

  // Handle vertical bias change
  const handleManualVerticalBiasChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      updateCurrentSettings({
        manualVerticalBias: value,
        useAutoComputed: false
      });
    }
  };

  // Handle recalculation for auto mode
  const handleRecalculate = () => {
    if (!temporaryAsset || !currentSettings) return;
    
    // Get sprite name from source path (simple extraction)
    const sourceFileName = temporaryAsset.sourceProcessing.sourceImagePath.split('/').pop();
    const spriteName = sourceFileName?.replace('.png', '') || '';
    
    if (spriteName) {
      try {
        const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
        if (spriteFrameSize) {
          // Use the same formula as in IsometricConfigurationPanel
          const normalizedHeight = spriteFrameSize.height / 100;
          const normalizedWidth = spriteFrameSize.width / 100;
          const autoComputedVerticalBias = normalizedHeight - (normalizedWidth / 2);
          
          updateCurrentSettings({
            autoComputedVerticalBias: autoComputedVerticalBias,
            useAutoComputed: true
          });
          
          console.log(`[ProcessedAssetConfigurationPanel] Recalculated auto vertical bias: ${autoComputedVerticalBias}`);
        }
      } catch (error) {
        console.error('[ProcessedAssetConfigurationPanel] Error recalculating:', error);
      }
    }
  };

  return (
    <Paper sx={{ 
      p: 3, 
      backgroundColor: 'rgba(0, 0, 0, 0.9)', 
      color: 'white',
      maxHeight: '85vh',
      overflow: 'auto',
      minWidth: '500px',
      maxWidth: '600px'
    }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#FF9800', mb: 1 }}>
          ⚙️ Asset Configuration
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Configure positioning and gameplay properties
        </Typography>
      </Box>

      {isLocked && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Unlock the map to configure assets
        </Alert>
      )}

      {/* Current Asset Info */}
      {temporaryAsset && (
        <Box sx={{ 
          mb: 3, 
          p: 3, 
          border: '2px solid #FF9800', 
          borderRadius: 2,
          backgroundColor: 'rgba(255, 152, 0, 0.05)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#FF9800' }}>
              📌 Current Asset:
            </Typography>
            <Button
              size="medium"
              startIcon={<RefreshIcon />}
              onClick={handleRefreshPreview}
              sx={{ color: '#FF9800', borderColor: '#FF9800' }}
              variant="outlined"
              disabled={isLocked}
            >
              Refresh Preview
            </Button>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
            {temporaryAsset.displayName}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', display: 'block', mb: 1 }}>
            <strong>Category:</strong> {temporaryAsset.category} • <strong>Source:</strong> {temporaryAsset.sourceProcessing.sourceImagePath.split('/').pop()}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
            <strong>Preview:</strong> All 4 directions displayed on grid at (0,0), (0,2), (2,0), (2,2)
          </Typography>
        </Box>
      )}

      {!temporaryAsset && (
        <Box sx={{ 
          mb: 3, 
          p: 3, 
          border: '1px solid rgba(255,255,255,0.2)', 
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.02)',
          textAlign: 'center'
        }}>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1 }}>
            📝 No Asset Selected
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            Select a PNG from the left panel to start configuring an asset
          </Typography>
        </Box>
      )}

      {/* Source Processing Operations Panel */}
      <Accordion sx={{ backgroundColor: 'rgba(33, 150, 243, 0.1)', mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#2196F3' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CropIcon sx={{ color: '#2196F3' }} />
            <Typography variant="h6" sx={{ color: '#2196F3' }}>
              1. Source Processing Operations
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              (Coming Soon)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
            Configure cropping, resizing, rotation, and other processing operations to be applied to the source image.
          </Typography>
          <Box sx={{ mt: 3, p: 3, backgroundColor: 'rgba(33, 150, 243, 0.1)', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ color: '#2196F3' }}>
              🚧 Coming Soon: Crop tool, resize controls, rotation, filters, and compositing operations
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Directional Positioning Panel - NOW FULLY IMPLEMENTED */}
      <Accordion defaultExpanded sx={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#4CAF50' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TransformIcon sx={{ color: '#4CAF50' }} />
            <Typography variant="h6" sx={{ color: '#4CAF50' }}>
              2. Directional Positioning & Anchoring
            </Typography>
            <Chip 
              label="ACTIVE" 
              size="small" 
              sx={{ 
                backgroundColor: '#4CAF50', 
                color: 'white',
                fontSize: '0.6rem',
                height: '20px'
              }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          {temporaryAsset && (
            <>
              {/* Configuration Management */}
              <Box sx={{ mb: 3, p: 2, border: '1px solid #4CAF50', borderRadius: 1, backgroundColor: 'rgba(76,175,80,0.05)' }}>
                <Typography variant="subtitle2" sx={{ color: '#4CAF50', fontWeight: 'bold', mb: 2 }}>
                  💾 Positioning Configuration
                </Typography>
                
                {/* Shared/Per-Direction Toggle */}
                <Box sx={{ mb: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={temporaryAsset.directionalBehavior.useSharedSettings}
                        onChange={handleSharedSettingsToggle}
                        disabled={isLocked}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: '#4CAF50' },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#4CAF50' }
                        }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: temporaryAsset.directionalBehavior.useSharedSettings ? '#4CAF50' : 'white', fontSize: '0.75rem' }}>
                          {temporaryAsset.directionalBehavior.useSharedSettings ? '🔗 Shared Settings' : '🎯 Per-Direction Settings'}
                        </Typography>
                      </Box>
                    }
                  />
                  <Typography variant="caption" sx={{ 
                    color: 'rgba(76,175,80,0.7)', 
                    fontSize: '0.6rem',
                    display: 'block'
                  }}>
                    {temporaryAsset.directionalBehavior.useSharedSettings 
                      ? 'Same settings for all directions (N/E/S/W)' 
                      : 'Different settings for each direction (for complex sprites)'
                    }
                  </Typography>
                </Box>

                {/* Direction Selector (only when using per-direction) */}
                {!temporaryAsset.directionalBehavior.useSharedSettings && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ mb: 1, color: '#FF9800' }}>
                      🧭 Configure Direction:
                    </Typography>
                    <ToggleButtonGroup
                      value={selectedDirection}
                      exclusive
                      onChange={(_, value) => value !== null && setSelectedDirection(value)}
                      size="small"
                      disabled={isLocked}
                      sx={{ display: 'flex', gap: 0.5 }}
                    >
                      <ToggleButton value={IsometricDirection.NORTH} sx={{ color: 'white', minWidth: '60px', fontSize: '0.7rem' }}>
                        🔼 North
                      </ToggleButton>
                      <ToggleButton value={IsometricDirection.EAST} sx={{ color: 'white', minWidth: '60px', fontSize: '0.7rem' }}>
                        ▶️ East
                      </ToggleButton>
                      <ToggleButton value={IsometricDirection.SOUTH} sx={{ color: 'white', minWidth: '60px', fontSize: '0.7rem' }}>
                        🔽 South
                      </ToggleButton>
                      <ToggleButton value={IsometricDirection.WEST} sx={{ color: 'white', minWidth: '60px', fontSize: '0.7rem' }}>
                        ◀️ West
                      </ToggleButton>
                    </ToggleButtonGroup>
                  </Box>
                )}
              </Box>

              {/* Positioning Controls */}
              {currentSettings && (
                <>
                  {/* FIXED: Live Vertical Positioning Values (No Auto Toggle) */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#FF5722' }}>
                      📏 Vertical Positioning:
                    </Typography>
                    
                    <Typography variant="caption" sx={{ 
                      color: 'rgba(255,87,34,0.8)', 
                      fontSize: '0.7rem',
                      display: 'block',
                      mb: 2
                    }}>
                      Live values: Manual (current) + Auto-computed (reference) + Restore button
                    </Typography>

                    {/* Current Manual Value - ALWAYS shown and editable */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body2" sx={{ minWidth: '60px', color: '#FF5722', fontWeight: 'bold' }}>Current:</Typography>
                      <TextField
                        type="number"
                        value={currentSettings.manualVerticalBias}
                        onChange={handleManualVerticalBiasChange}
                        disabled={isLocked}
                        size="small"
                        sx={{ 
                          width: '80px',
                          '& .MuiInputBase-input': { 
                            color: 'white', 
                            fontSize: '0.8rem', 
                            padding: '4px 8px',
                            fontWeight: 'bold'
                          },
                          '& .MuiOutlinedInput-root': { 
                            '& fieldset': { borderColor: '#FF5722' },
                            '&:hover fieldset': { borderColor: '#D84315' }
                          }
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#FF5722' }}>px</Typography>
                    </Box>

                    {/* Auto-computed reference - ONLY for tiles */}
                    {temporaryAsset.assetType === 'tile' && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" sx={{ minWidth: '60px', color: '#2196F3' }}>Auto-Ref:</Typography>
                        <Typography variant="body2" sx={{ 
                          color: '#2196F3',
                          fontFamily: 'monospace',
                          width: '80px'
                        }}>
                          {currentSettings.autoComputedVerticalBias}px
                        </Typography>
                        <Button
                          variant="outlined"
                          onClick={() => {
                            // Populate manual with auto-computed value
                            updateCurrentSettings({ 
                              manualVerticalBias: currentSettings.autoComputedVerticalBias,
                              useAutoComputed: false // Keep useAutoComputed for tracking, but don't use it for switching
                            });
                          }}
                          disabled={isLocked}
                          size="small"
                          sx={{
                            fontSize: '0.6rem',
                            minWidth: 'auto',
                            padding: '2px 8px',
                            borderColor: '#2196F3',
                            color: '#2196F3',
                            '&:hover': { borderColor: '#1976D2', color: '#1976D2' }
                          }}
                        >
                          🔄 Use Auto
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={handleRecalculate}
                          disabled={isLocked}
                          size="small"
                          sx={{
                            fontSize: '0.6rem',
                            minWidth: 'auto',
                            padding: '2px 8px',
                            borderColor: '#2196F3',
                            color: '#2196F3',
                            '&:hover': { borderColor: '#1976D2', color: '#1976D2' }
                          }}
                        >
                          🔄 Recalc Auto
                        </Button>
                      </Box>
                    )}

                    {/* For non-tiles, show info about manual-only mode */}
                    {temporaryAsset.assetType !== 'tile' && (
                      <Typography variant="caption" sx={{ 
                        color: 'rgba(255,152,0,0.7)', 
                        fontSize: '0.6rem',
                        display: 'block'
                      }}>
                        📝 Manual positioning only (Auto-mode only available for tile assets)
                      </Typography>
                    )}
                    
                    {/* Explanation for different asset types */}
                    <Typography variant="caption" sx={{ 
                      color: 'rgba(255,152,0,0.7)', 
                      fontSize: '0.6rem',
                      display: 'block',
                      mt: 1
                    }}>
                      {temporaryAsset.assetType === 'tile' 
                        ? '💡 Tiles: Auto-computed uses height-width formula, manual allows override'
                        : temporaryAsset.assetType === 'wall'
                        ? '🧱 Walls: Manual positioning for edge-anchored assets'
                        : temporaryAsset.assetType === 'stair'
                        ? '🪜 Stairs: Manual positioning for multi-level connectors'
                        : '🎯 Custom: Manual positioning for specialized assets'
                      }
                    </Typography>
                  </Box>

                  {/* 4-Directional Margins */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#673AB7' }}>
                      📐 Invisible Margins:
                    </Typography>
                    
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      {/* Up */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ minWidth: '30px', color: '#673AB7' }}>Up:</Typography>
                        <TextField
                          type="number"
                          value={currentSettings.invisibleMarginUp}
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
                          value={currentSettings.invisibleMarginDown}
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
                          value={currentSettings.invisibleMarginLeft}
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
                          value={currentSettings.invisibleMarginRight}
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

                  {/* Manual Horizontal Offset (for walls) */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#607D8B' }}>
                      ↔️ Manual Horizontal Offset:
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ minWidth: '80px', color: '#607D8B' }}>Horizontal:</Typography>
                      <TextField
                        type="number"
                        value={currentSettings.manualHorizontalOffset || 0}
                        onChange={(e) => updateCurrentSettings({ manualHorizontalOffset: parseInt(e.target.value) || 0 })}
                        disabled={isLocked}
                        size="small"
                        sx={{ 
                          width: '80px',
                          '& .MuiInputBase-input': { 
                            color: 'white', 
                            fontSize: '0.8rem', 
                            padding: '4px 8px' 
                          },
                          '& .MuiOutlinedInput-root': { 
                            '& fieldset': { borderColor: '#607D8B' },
                            '&:hover fieldset': { borderColor: '#455A64' }
                          }
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#607D8B' }}>px</Typography>
                    </Box>
                    
                    <Typography variant="caption" sx={{ 
                      color: 'rgba(96,125,139,0.7)', 
                      fontSize: '0.6rem',
                      display: 'block',
                      mt: 1
                    }}>
                      💡 Additional horizontal positioning offset (especially useful for walls)
                    </Typography>
                  </Box>

                  {/* FIXED: Separate Grid and Sprite Anchor Systems */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#FF9800' }}>
                      🎯 Anchor Configuration:
                    </Typography>
                    
                    <Typography variant="caption" sx={{ 
                      color: 'rgba(255,152,0,0.8)', 
                      fontSize: '0.7rem',
                      display: 'block',
                      mb: 2
                    }}>
                      Two separate anchor systems: WHERE on grid diamond + WHERE on sprite canvas
                    </Typography>

                    {/* Grid Anchor - WHERE on the diamond we attach */}
                    <Box sx={{ mb: 2, p: 1, border: '1px solid #FF9800', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: '#FF9800', fontSize: '0.75rem', mb: 1, display: 'block' }}>
                        🔷 Grid Anchor (WHERE on diamond):
                      </Typography>
                      
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ minWidth: '40px', color: '#FF9800' }}>Point:</Typography>
                          <select
                            value={currentSettings.gridAnchor?.gridAnchorPoint || 'center'}
                            onChange={(e) => updateCurrentSettings({ 
                              gridAnchor: {
                                ...currentSettings.gridAnchor,
                                gridAnchorPoint: e.target.value as any
                              }
                            })}
                            disabled={isLocked}
                            style={{ 
                              backgroundColor: '#333', 
                              color: 'white', 
                              border: '1px solid #FF9800',
                              fontSize: '0.7rem',
                              width: '100px'
                            }}
                          >
                            <option value="center">Center</option>
                            <option value="north_edge">N Edge</option>
                            <option value="east_edge">E Edge</option>
                            <option value="south_edge">S Edge</option>
                            <option value="west_edge">W Edge</option>
                            <option value="north_corner">N Corner</option>
                            <option value="east_corner">E Corner</option>
                            <option value="south_corner">S Corner</option>
                            <option value="west_corner">W Corner</option>
                            <option value="custom">Custom</option>
                          </select>
                        </Box>
                        
                        <Button
                          variant="outlined"
                          onClick={() => {
                            // Restore default grid anchor for current asset type
                            const defaultGridAnchor = temporaryAsset?.assetType === 'wall' 
                              ? { gridAnchorPoint: 'south_edge', gridAnchorX: 0.5, gridAnchorY: 0.5, useDefaultGridAnchor: true }
                              : { gridAnchorPoint: 'center', gridAnchorX: 0.5, gridAnchorY: 0.5, useDefaultGridAnchor: true };
                            
                            updateCurrentSettings({ gridAnchor: defaultGridAnchor });
                          }}
                          disabled={isLocked}
                          size="small"
                          sx={{
                            fontSize: '0.6rem',
                            borderColor: '#FF9800',
                            color: '#FF9800',
                            '&:hover': { borderColor: '#F57C00', color: '#F57C00' }
                          }}
                        >
                          🔄 Restore Default
                        </Button>
                      </Box>

                      {/* Custom grid coordinates (only show if custom) */}
                      {currentSettings.gridAnchor?.gridAnchorPoint === 'custom' && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ minWidth: '40px', color: '#FF9800' }}>Grid X:</Typography>
                            <TextField
                              type="number"
                              inputProps={{ step: 0.1, min: 0, max: 1 }}
                              value={currentSettings.gridAnchor?.gridAnchorX || 0.5}
                              onChange={(e) => updateCurrentSettings({ 
                                gridAnchor: {
                                  ...currentSettings.gridAnchor,
                                  gridAnchorX: parseFloat(e.target.value) || 0.5
                                }
                              })}
                              disabled={isLocked}
                              size="small"
                              sx={{ 
                                width: '60px',
                                '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                                '& .MuiOutlinedInput-root': { 
                                  '& fieldset': { borderColor: '#FF9800' },
                                  '&:hover fieldset': { borderColor: '#F57C00' }
                                }
                              }}
                            />
                          </Box>
                          
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ minWidth: '40px', color: '#FF9800' }}>Grid Y:</Typography>
                            <TextField
                              type="number"
                              inputProps={{ step: 0.1, min: 0, max: 1 }}
                              value={currentSettings.gridAnchor?.gridAnchorY || 0.5}
                              onChange={(e) => updateCurrentSettings({ 
                                gridAnchor: {
                                  ...currentSettings.gridAnchor,
                                  gridAnchorY: parseFloat(e.target.value) || 0.5
                                }
                              })}
                              disabled={isLocked}
                              size="small"
                              sx={{ 
                                width: '60px',
                                '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                                '& .MuiOutlinedInput-root': { 
                                  '& fieldset': { borderColor: '#FF9800' },
                                  '&:hover fieldset': { borderColor: '#F57C00' }
                                }
                              }}
                            />
                          </Box>
                        </Box>
                      )}
                    </Box>

                    {/* Sprite Anchor - WHERE on the sprite canvas we anchor */}
                    <Box sx={{ mb: 2, p: 1, border: '1px solid #9C27B0', borderRadius: 1 }}>
                      <Typography variant="caption" sx={{ color: '#9C27B0', fontSize: '0.75rem', mb: 1, display: 'block' }}>
                        🖼️ Sprite Anchor (WHERE on sprite canvas):
                      </Typography>
                      
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ minWidth: '30px', color: '#9C27B0' }}>X:</Typography>
                          <TextField
                            type="number"
                            inputProps={{ step: 0.1, min: 0, max: 1 }}
                            value={currentSettings.spriteAnchor?.spriteAnchorX || 0.5}
                            onChange={(e) => updateCurrentSettings({ 
                              spriteAnchor: {
                                ...currentSettings.spriteAnchor,
                                spriteAnchorX: parseFloat(e.target.value) || 0.5
                              }
                            })}
                            disabled={isLocked}
                            size="small"
                            sx={{ 
                              width: '60px',
                              '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                              '& .MuiOutlinedInput-root': { 
                                '& fieldset': { borderColor: '#9C27B0' },
                                '&:hover fieldset': { borderColor: '#7B1FA2' }
                              }
                            }}
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ minWidth: '30px', color: '#9C27B0' }}>Y:</Typography>
                          <TextField
                            type="number"
                            inputProps={{ step: 0.1, min: 0, max: 1 }}
                            value={currentSettings.spriteAnchor?.spriteAnchorY || 1.0}
                            onChange={(e) => updateCurrentSettings({ 
                              spriteAnchor: {
                                ...currentSettings.spriteAnchor,
                                spriteAnchorY: parseFloat(e.target.value) || 1.0
                              }
                            })}
                            disabled={isLocked}
                            size="small"
                            sx={{ 
                              width: '60px',
                              '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                              '& .MuiOutlinedInput-root': { 
                                '& fieldset': { borderColor: '#9C27B0' },
                                '&:hover fieldset': { borderColor: '#7B1FA2' }
                              }
                            }}
                          />
                        </Box>
                        
                        <Button
                          variant="outlined"
                          onClick={() => {
                            // Restore default sprite anchor for current asset type 
                            const defaultSpriteAnchor = temporaryAsset?.assetType === 'wall'
                              ? { spriteAnchorX: 0.5, spriteAnchorY: 1.0, useDefaultSpriteAnchor: true, useBoundingBoxAnchor: false } // Will be direction-specific
                              : { spriteAnchorX: 0.5, spriteAnchorY: 1.0, useDefaultSpriteAnchor: true, useBoundingBoxAnchor: false };
                            
                            updateCurrentSettings({ spriteAnchor: defaultSpriteAnchor });
                          }}
                          disabled={isLocked}
                          size="small"
                          sx={{
                            fontSize: '0.6rem',
                            borderColor: '#9C27B0',
                            color: '#9C27B0',
                            '&:hover': { borderColor: '#7B1FA2', color: '#7B1FA2' }
                          }}
                        >
                          🔄 Restore Default
                        </Button>
                      </Box>

                      {/* Bounding Box Anchor Toggle */}
                      <FormControlLabel
                        control={
                          <Switch
                            checked={currentSettings.spriteAnchor?.useBoundingBoxAnchor || false}
                            onChange={(e) => updateCurrentSettings({ 
                              spriteAnchor: {
                                ...currentSettings.spriteAnchor,
                                useBoundingBoxAnchor: e.target.checked
                              }
                            })}
                            disabled={isLocked}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': { color: '#9C27B0' },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#9C27B0' }
                            }}
                          />
                        }
                        label={
                          <Typography variant="caption" sx={{ color: (currentSettings.spriteAnchor?.useBoundingBoxAnchor || false) ? '#9C27B0' : 'white', fontSize: '0.65rem' }}>
                            📦 Apply to Bounding Box (trimmed rectangle)
                          </Typography>
                        }
                      />
                      
                      <Typography variant="caption" sx={{ 
                        color: 'rgba(156,39,176,0.7)', 
                        fontSize: '0.6rem',
                        display: 'block'
                      }}>
                        When enabled, anchor applies to trimmed sprite area instead of full canvas
                      </Typography>
                    </Box>
                  </Box>

                  {/* Advanced Positioning Controls */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#FF9800' }}>
                      🎯 Advanced Positioning:
                    </Typography>
                    
                    {/* Scale Controls */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ minWidth: '40px', color: '#FF9800' }}>ScaleX:</Typography>
                        <TextField
                          type="number"
                          inputProps={{ step: 0.1, min: 0.1 }}
                          value={currentSettings.scaleX || 1.0}
                          onChange={(e) => {
                            const newScaleX = parseFloat(e.target.value) || 1.0;
                            if (currentSettings.keepProportions) {
                              // Update both X and Y to maintain proportions
                              updateCurrentSettings({ 
                                scaleX: newScaleX, 
                                scaleY: newScaleX 
                              });
                            } else {
                              updateCurrentSettings({ scaleX: newScaleX });
                            }
                          }}
                          disabled={isLocked}
                          size="small"
                          sx={{ 
                            width: '60px',
                            '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                            '& .MuiOutlinedInput-root': { 
                              '& fieldset': { borderColor: '#FF9800' },
                              '&:hover fieldset': { borderColor: '#F57C00' }
                            }
                          }}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ minWidth: '40px', color: '#FF9800' }}>ScaleY:</Typography>
                        <TextField
                          type="number"
                          inputProps={{ step: 0.1, min: 0.1 }}
                          value={currentSettings.scaleY || 1.0}
                          onChange={(e) => {
                            const newScaleY = parseFloat(e.target.value) || 1.0;
                            if (currentSettings.keepProportions) {
                              // Update both X and Y to maintain proportions
                              updateCurrentSettings({ 
                                scaleX: newScaleY, 
                                scaleY: newScaleY 
                              });
                            } else {
                              updateCurrentSettings({ scaleY: newScaleY });
                            }
                          }}
                          disabled={isLocked || currentSettings.keepProportions}
                          size="small"
                          sx={{ 
                            width: '60px',
                            '& .MuiInputBase-input': { 
                              color: currentSettings.keepProportions ? 'rgba(255,255,255,0.5)' : 'white', 
                              fontSize: '0.7rem', 
                              padding: '2px 4px' 
                            },
                            '& .MuiOutlinedInput-root': { 
                              '& fieldset': { borderColor: currentSettings.keepProportions ? 'rgba(255,152,0,0.5)' : '#FF9800' },
                              '&:hover fieldset': { borderColor: currentSettings.keepProportions ? 'rgba(255,152,0,0.5)' : '#F57C00' }
                            }
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Proportional Scaling Toggle */}
                    <FormControlLabel
                      control={
                        <Switch
                          checked={currentSettings.keepProportions ?? true}
                          onChange={(e) => updateCurrentSettings({ keepProportions: e.target.checked })}
                          disabled={isLocked}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: '#FF9800' },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#FF9800' }
                          }}
                        />
                      }
                      label={
                        <Typography variant="caption" sx={{ color: (currentSettings.keepProportions ?? true) ? '#FF9800' : 'white', fontSize: '0.65rem' }}>
                          🔗 Keep Proportions (ScaleX = ScaleY)
                        </Typography>
                      }
                      sx={{ mb: 1 }}
                    />

                    {/* Offset Controls */}
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ minWidth: '40px', color: '#FF9800' }}>OffsetX:</Typography>
                        <TextField
                          type="number"
                          value={currentSettings.horizontalOffset || 0}
                          onChange={(e) => updateCurrentSettings({ horizontalOffset: parseInt(e.target.value) || 0 })}
                          disabled={isLocked}
                          size="small"
                          sx={{ 
                            width: '60px',
                            '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                            '& .MuiOutlinedInput-root': { 
                              '& fieldset': { borderColor: '#FF9800' },
                              '&:hover fieldset': { borderColor: '#F57C00' }
                            }
                          }}
                        />
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Typography variant="caption" sx={{ minWidth: '40px', color: '#FF9800' }}>OffsetY:</Typography>
                        <TextField
                          type="number"
                          value={currentSettings.verticalOffset || 0}
                          onChange={(e) => updateCurrentSettings({ verticalOffset: parseInt(e.target.value) || 0 })}
                          disabled={isLocked}
                          size="small"
                          sx={{ 
                            width: '60px',
                            '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                            '& .MuiOutlinedInput-root': { 
                              '& fieldset': { borderColor: '#FF9800' },
                              '&:hover fieldset': { borderColor: '#F57C00' }
                            }
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>

                  {/* Advanced Directional Positioning (Wall-Relative & Diagonal) */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#E91E63' }}>
                      🧭 Advanced Directional Positioning:
                    </Typography>
                    
                    {/* Diagonal Offsets */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ color: '#E91E63', fontSize: '0.7rem', mb: 1, display: 'block' }}>
                        📐 Manual Diagonal Offsets:
                      </Typography>
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ minWidth: '30px', color: '#E91E63', fontSize: '0.6rem' }}>NE:</Typography>
                          <TextField
                            type="number"
                            value={currentSettings.manualDiagonalNorthEastOffset || 0}
                            onChange={(e) => updateCurrentSettings({ manualDiagonalNorthEastOffset: parseInt(e.target.value) || 0 })}
                            disabled={isLocked}
                            size="small"
                            sx={{ 
                              width: '60px',
                              '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                              '& .MuiOutlinedInput-root': { 
                                '& fieldset': { borderColor: '#E91E63' },
                                '&:hover fieldset': { borderColor: '#C2185B' }
                              }
                            }}
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ minWidth: '30px', color: '#E91E63', fontSize: '0.6rem' }}>NW:</Typography>
                          <TextField
                            type="number"
                            value={currentSettings.manualDiagonalNorthWestOffset || 0}
                            onChange={(e) => updateCurrentSettings({ manualDiagonalNorthWestOffset: parseInt(e.target.value) || 0 })}
                            disabled={isLocked}
                            size="small"
                            sx={{ 
                              width: '60px',
                              '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                              '& .MuiOutlinedInput-root': { 
                                '& fieldset': { borderColor: '#E91E63' },
                                '&:hover fieldset': { borderColor: '#C2185B' }
                              }
                            }}
                          />
                        </Box>
                      </Box>
                    </Box>

                    {/* Wall-Relative Positioning (A=8, B=3 System) */}
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" sx={{ color: '#E91E63', fontSize: '0.7rem', mb: 1, display: 'block' }}>
                        🧱 Wall-Relative Positioning (A=8, B=3 System):
                      </Typography>
                      
                      {/* First Row: Along Edge & Toward Center */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ minWidth: '35px', color: '#E91E63', fontSize: '0.6rem' }}>Edge:</Typography>
                          <TextField
                            type="number"
                            value={currentSettings.relativeAlongEdgeOffset || 0}
                            onChange={(e) => updateCurrentSettings({ relativeAlongEdgeOffset: parseInt(e.target.value) || 0 })}
                            disabled={isLocked}
                            size="small"
                            sx={{ 
                              width: '60px',
                              '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                              '& .MuiOutlinedInput-root': { 
                                '& fieldset': { borderColor: '#E91E63' },
                                '&:hover fieldset': { borderColor: '#C2185B' }
                              }
                            }}
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ minWidth: '35px', color: '#E91E63', fontSize: '0.6rem' }}>Center:</Typography>
                          <TextField
                            type="number"
                            value={currentSettings.relativeTowardCenterOffset || 0}
                            onChange={(e) => updateCurrentSettings({ relativeTowardCenterOffset: parseInt(e.target.value) || 0 })}
                            disabled={isLocked}
                            size="small"
                            sx={{ 
                              width: '60px',
                              '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                              '& .MuiOutlinedInput-root': { 
                                '& fieldset': { borderColor: '#E91E63' },
                                '&:hover fieldset': { borderColor: '#C2185B' }
                              }
                            }}
                          />
                        </Box>
                      </Box>

                      {/* Second Row: Diagonal A & B */}
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ minWidth: '35px', color: '#E91E63', fontSize: '0.6rem' }}>DiagA:</Typography>
                          <TextField
                            type="number"
                            value={currentSettings.relativeDiagonalAOffset || 0}
                            onChange={(e) => updateCurrentSettings({ relativeDiagonalAOffset: parseInt(e.target.value) || 0 })}
                            disabled={isLocked}
                            size="small"
                            sx={{ 
                              width: '60px',
                              '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                              '& .MuiOutlinedInput-root': { 
                                '& fieldset': { borderColor: '#E91E63' },
                                '&:hover fieldset': { borderColor: '#C2185B' }
                              }
                            }}
                          />
                        </Box>
                        
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ minWidth: '35px', color: '#E91E63', fontSize: '0.6rem' }}>DiagB:</Typography>
                          <TextField
                            type="number"
                            value={currentSettings.relativeDiagonalBOffset || 0}
                            onChange={(e) => updateCurrentSettings({ relativeDiagonalBOffset: parseInt(e.target.value) || 0 })}
                            disabled={isLocked}
                            size="small"
                            sx={{ 
                              width: '60px',
                              '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
                              '& .MuiOutlinedInput-root': { 
                                '& fieldset': { borderColor: '#E91E63' },
                                '&:hover fieldset': { borderColor: '#C2185B' }
                              }
                            }}
                          />
                        </Box>
                      </Box>

                      {/* A Division Flag for North/East */}
                      <FormControlLabel
                        control={
                          <Switch
                            checked={currentSettings.useADivisionForNorthEast ?? true}
                            onChange={(e) => updateCurrentSettings({ useADivisionForNorthEast: e.target.checked })}
                            disabled={isLocked}
                            sx={{
                              '& .MuiSwitch-switchBase.Mui-checked': { color: '#E91E63' },
                              '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#E91E63' }
                            }}
                          />
                        }
                        label={
                          <Typography variant="caption" sx={{ color: currentSettings.useADivisionForNorthEast ? '#E91E63' : 'white', fontSize: '0.65rem' }}>
                            🔄 A-Division for North/East (A÷2)
                          </Typography>
                        }
                        sx={{ mb: 1 }}
                      />
                      
                      <Typography variant="caption" sx={{ 
                        color: 'rgba(233,30,99,0.7)', 
                        fontSize: '0.6rem',
                        display: 'block'
                      }}>
                        💡 Wall-relative: Edge=along wall, Center=toward cell center, A=8, B=3 classic system
                      </Typography>
                    </Box>
                  </Box>

                  {/* Canvas Trimming & Bounding Box */}
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, color: '#795548' }}>
                      ✂️ Canvas Trimming & Bounding Box:
                    </Typography>
                    
                    {/* Asset type specific info */}
                    <Typography variant="caption" sx={{ 
                      color: 'rgba(121,85,72,0.8)', 
                      fontSize: '0.7rem',
                      display: 'block',
                      mb: 2
                    }}>
                      {temporaryAsset.assetType === 'wall' 
                        ? '🧱 Wall assets: Trimming adjusts anchor to visible content for precise edge positioning'
                        : temporaryAsset.assetType === 'tile'
                        ? '📦 Tile assets: Auto mode uses original anchor, Manual mode can use trimmed anchor'
                        : '🎯 Custom assets: Trimming adjusts anchor based on asset positioning needs'
                      }
                    </Typography>
                    
                    {/* Sprite Trimming Toggle - Updated logic for auto vs manual */}
                    <FormControlLabel
                      control={
                        <Switch
                          checked={currentSettings.useSpriteTrimmingForWalls || false}
                          onChange={(e) => updateCurrentSettings({ useSpriteTrimmingForWalls: e.target.checked })}
                          disabled={isLocked || (temporaryAsset.assetType === 'tile' && currentSettings.useAutoComputed)}
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: '#795548' },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#795548' }
                          }}
                        />
                      }
                      label={
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="body2" sx={{ color: currentSettings.useSpriteTrimmingForWalls ? '#795548' : 'white', fontSize: '0.75rem' }}>
                            {currentSettings.useSpriteTrimmingForWalls ? '✂️ Use Bounding Box Anchor' : '📐 Use Original Sprite Anchor'}
                          </Typography>
                          {temporaryAsset.assetType === 'tile' && currentSettings.useAutoComputed && (
                            <Typography variant="caption" sx={{ color: 'rgba(255,152,0,0.7)', fontSize: '0.65rem' }}>
                              ⚠️ Auto mode: Original anchor enforced (disable auto for trimming)
                            </Typography>
                          )}
                        </Box>
                      }
                      sx={{ mb: 2 }}
                    />

                    {/* Bounding Box Information */}
                    {(() => {
                      if (!temporaryAsset) return null;
                      
                      const sourceFileName = temporaryAsset.sourceProcessing.sourceImagePath.split('/').pop();
                      const spriteName = sourceFileName?.replace('.png', '') || '';
                      const boundingInfo = spriteName ? getSpriteBoundingBoxInfo(spriteName) : null;
                      
                      return (
                        <Box sx={{ p: 2, border: '1px solid #795548', borderRadius: 1, backgroundColor: 'rgba(121,85,72,0.05)' }}>
                          <Typography variant="caption" sx={{ color: '#795548', fontSize: '0.7rem', fontWeight: 'bold', mb: 1, display: 'block' }}>
                            📊 Sprite Analysis:
                          </Typography>
                          
                          {boundingInfo?.error ? (
                            <Typography variant="caption" sx={{ color: '#FF5722', fontSize: '0.65rem' }}>
                              ⚠️ {boundingInfo.error}
                            </Typography>
                          ) : boundingInfo?.boundingBox ? (
                            <Box>
                              <Typography variant="caption" sx={{ color: '#795548', fontSize: '0.6rem', display: 'block' }}>
                                📏 Original: {boundingInfo.original.width}×{boundingInfo.original.height}px
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#795548', fontSize: '0.6rem', display: 'block' }}>
                                ✂️ Trimmed: {boundingInfo.boundingBox.width}×{boundingInfo.boundingBox.height}px
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#795548', fontSize: '0.6rem', display: 'block' }}>
                                📍 Offset: ({boundingInfo.boundingBox.x}, {boundingInfo.boundingBox.y})
                              </Typography>
                              
                              {/* Auto-store bounding box when detected */}
                              {(() => {
                                // Store the bounding box in the current settings
                                const boundingBoxData = {
                                  originalWidth: boundingInfo.original.width,
                                  originalHeight: boundingInfo.original.height,
                                  boundingX: boundingInfo.boundingBox.x,
                                  boundingY: boundingInfo.boundingBox.y,
                                  boundingWidth: boundingInfo.boundingBox.width,
                                  boundingHeight: boundingInfo.boundingBox.height,
                                  anchorOffsetX: boundingInfo.boundingBox.x / boundingInfo.original.width,
                                  anchorOffsetY: boundingInfo.boundingBox.y / boundingInfo.original.height
                                };
                                
                                // Auto-update if not already set
                                if (!currentSettings.spriteBoundingBox || 
                                    JSON.stringify(currentSettings.spriteBoundingBox) !== JSON.stringify(boundingBoxData)) {
                                  setTimeout(() => {
                                    updateCurrentSettings({ spriteBoundingBox: boundingBoxData });
                                  }, 0);
                                }
                                
                                return null;
                              })()}
                            </Box>
                          ) : (
                            <Typography variant="caption" sx={{ color: 'rgba(121,85,72,0.7)', fontSize: '0.65rem' }}>
                              🔍 Analyzing sprite for transparent pixel trimming...
                            </Typography>
                          )}
                          
                          <Typography variant="caption" sx={{ 
                            color: 'rgba(121,85,72,0.7)', 
                            fontSize: '0.6rem',
                            display: 'block',
                            mt: 1
                          }}>
                            💡 Trimming removes transparent borders and adjusts anchor to the visible content
                          </Typography>
                        </Box>
                      );
                    })()}
                  </Box>
                </>
              )}
            </>
          )}

          {!temporaryAsset && (
            <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
              Select a PNG asset to configure positioning, anchoring, margins, and directional behavior.
            </Typography>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Gameplay Properties Panel */}
      <Accordion sx={{ backgroundColor: 'rgba(156, 39, 176, 0.1)', mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#9C27B0' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GamepadIcon sx={{ color: '#9C27B0' }} />
            <Typography variant="h6" sx={{ color: '#9C27B0' }}>
              3. Gameplay Properties
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              (Coming Soon)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
            Configure walkability, sight blocking, interaction properties, and other gameplay mechanics.
          </Typography>
          <Box sx={{ mt: 3, p: 3, backgroundColor: 'rgba(156, 39, 176, 0.1)', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ color: '#9C27B0' }}>
              🚧 Coming Soon: Walkable, blocks sight, interactable, destructible, light level, movement cost, tags
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Preview Controls Panel */}
      <Accordion sx={{ backgroundColor: 'rgba(255, 193, 7, 0.1)' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#FFC107' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PreviewIcon sx={{ color: '#FFC107' }} />
            <Typography variant="h6" sx={{ color: '#FFC107' }}>
              4. Preview & Testing
            </Typography>
            <Chip 
              label="ACTIVE" 
              size="small" 
              sx={{ 
                backgroundColor: '#FFC107', 
                color: 'black',
                fontSize: '0.6rem',
                height: '20px'
              }}
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
            Preview is active on the main canvas. Use the Refresh Preview button above to update positioning.
          </Typography>
          <Box sx={{ mt: 3, p: 3, backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ color: '#FFC107' }}>
              ✅ Live preview on canvas • 🚧 Coming Soon: Grid anchor visualization, test placement tools
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Footer */}
      <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <Typography variant="body2" sx={{ 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: '0.75rem' 
        }}>
          ⚙️ Core positioning system now active! Wall-relative positioning, sprite trimming, and advanced features coming next.
        </Typography>
      </Box>
    </Paper>
  );
};

export default ProcessedAssetConfigurationPanel; 