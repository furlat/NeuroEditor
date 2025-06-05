import React from 'react';
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
import { IsometricDirection } from '../game/managers/IsometricSpriteManager';
import { useProcessedAssetConfigurationHandlers } from './hooks/useProcessedAssetConfigurationHandlers';

interface ProcessedAssetConfigurationPanelProps {
  isLocked: boolean;
}

const ProcessedAssetConfigurationPanel: React.FC<ProcessedAssetConfigurationPanelProps> = ({ isLocked }) => {
  // Use the extracted handlers hook
  const {
    selectedDirection,
    setSelectedDirection,
    configStatus,
    setConfigStatus,
    temporaryAsset,
    processedAssetsSnap,
    getCurrentPositioningSettings,
    currentSettings,
    getSpriteBoundingBoxInfo,
    handleRefreshPreview,
    handleSharedSettingsToggle,
    handleToggleAutoMode,
    updateCurrentSettings,
    handleMarginChange,
    handleManualVerticalBiasChange,
    handleRecalculate
  } = useProcessedAssetConfigurationHandlers();

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
          
          {/* Sprite Analysis */}
          {(() => {
            const sourceFileName = temporaryAsset.sourceProcessing.sourceImagePath.split('/').pop();
            const spriteName = sourceFileName?.replace('.png', '') || '';
            const boundingInfo = spriteName ? getSpriteBoundingBoxInfo(spriteName) : null;
            
            return (
              <Box sx={{ mt: 2, p: 2, border: '1px solid #FF9800', borderRadius: 1, backgroundColor: 'rgba(255,152,0,0.05)' }}>
                <Typography variant="caption" sx={{ color: '#FF9800', fontSize: '0.7rem', fontWeight: 'bold', mb: 1, display: 'block' }}>
                  📊 Sprite Analysis:
                </Typography>
                
                {boundingInfo?.error ? (
                  <Typography variant="caption" sx={{ color: '#FF5722', fontSize: '0.65rem' }}>
                    ⚠️ {boundingInfo.error}
                  </Typography>
                ) : boundingInfo?.boundingBox ? (
                  <Box>
                    <Typography variant="caption" sx={{ color: '#FF9800', fontSize: '0.6rem', display: 'block' }}>
                      📏 Original: {boundingInfo.original.width}×{boundingInfo.original.height}px
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#FF9800', fontSize: '0.6rem', display: 'block' }}>
                      ✂️ Trimmed: {boundingInfo.boundingBox.width}×{boundingInfo.boundingBox.height}px
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#FF9800', fontSize: '0.6rem', display: 'block' }}>
                      📍 Offset: ({boundingInfo.boundingBox.x}, {boundingInfo.boundingBox.y})
                    </Typography>
                  </Box>
                ) : (
                  <Typography variant="caption" sx={{ color: 'rgba(255,152,0,0.7)', fontSize: '0.65rem' }}>
                    🔍 Analyzing sprite for transparent pixel trimming...
                  </Typography>
                )}
              </Box>
            );
          })()}
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
                      
                      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <Typography variant="caption" sx={{ minWidth: '40px', color: '#9C27B0' }}>Point:</Typography>
                          <select
                            value={currentSettings?.spriteAnchor?.spriteAnchorPoint || 'bottom_center'}
                            onChange={(e) => {
                              if (!currentSettings) return;
                              
                              const newPoint = e.target.value as any;
                              // When changing anchor point, auto-update the X/Y coordinates
                              const coords = newPoint === 'custom' 
                                ? { x: currentSettings.spriteAnchor?.spriteAnchorX || 0.5, y: currentSettings.spriteAnchor?.spriteAnchorY || 1.0 }
                                : (() => {
                                    // Calculate coordinates from the anchor point
                                    switch (newPoint) {
                                      case 'center': return { x: 0.5, y: 0.5 };
                                      case 'top_left': return { x: 0.0, y: 0.0 };
                                      case 'top_center': return { x: 0.5, y: 0.0 };
                                      case 'top_right': return { x: 1.0, y: 0.0 };
                                      case 'middle_left': return { x: 0.0, y: 0.5 };
                                      case 'middle_right': return { x: 1.0, y: 0.5 };
                                      case 'bottom_left': return { x: 0.0, y: 1.0 };
                                      case 'bottom_center': return { x: 0.5, y: 1.0 };
                                      case 'bottom_right': return { x: 1.0, y: 1.0 };
                                      default: return { x: 0.5, y: 1.0 };
                                    }
                                  })();
                              
                              updateCurrentSettings({ 
                                spriteAnchor: {
                                  ...currentSettings.spriteAnchor,
                                  spriteAnchorPoint: newPoint,
                                  spriteAnchorX: coords.x,
                                  spriteAnchorY: coords.y
                                }
                              });
                            }}
                            disabled={isLocked}
                            style={{ 
                              backgroundColor: '#333', 
                              color: 'white', 
                              border: '1px solid #9C27B0',
                              fontSize: '0.7rem',
                              width: '120px'
                            }}
                          >
                            <option value="center">🎯 Center</option>
                            <option value="top_left">🔸 Top-Left</option>
                            <option value="top_center">⬆️ Top-Center</option>
                            <option value="top_right">🔹 Top-Right</option>
                            <option value="middle_left">⬅️ Mid-Left</option>
                            <option value="middle_right">➡️ Mid-Right</option>
                            <option value="bottom_left">🔸 Bot-Left</option>
                            <option value="bottom_center">⬇️ Bot-Center</option>
                            <option value="bottom_right">🔹 Bot-Right</option>
                            <option value="custom">🎛️ Custom</option>
                          </select>
                        </Box>
                        
                        <Button
                          variant="outlined"
                          onClick={() => {
                            // Restore default sprite anchor for current asset type 
                            const defaultSpriteAnchor = temporaryAsset?.assetType === 'wall'
                              ? { spriteAnchorPoint: 'bottom_center', spriteAnchorX: 0.5, spriteAnchorY: 1.0, useDefaultSpriteAnchor: true, useBoundingBoxAnchor: false }
                              : { spriteAnchorPoint: 'bottom_center', spriteAnchorX: 0.5, spriteAnchorY: 1.0, useDefaultSpriteAnchor: true, useBoundingBoxAnchor: false };
                            
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

                      {/* Custom sprite coordinates (only show if custom) */}
                      {currentSettings?.spriteAnchor?.spriteAnchorPoint === 'custom' && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <Typography variant="caption" sx={{ minWidth: '30px', color: '#9C27B0' }}>X:</Typography>
                            <TextField
                              type="number"
                              inputProps={{ step: 0.1, min: 0, max: 1 }}
                              value={currentSettings?.spriteAnchor?.spriteAnchorX || 0.5}
                              onChange={(e) => updateCurrentSettings({ 
                                spriteAnchor: {
                                  ...currentSettings?.spriteAnchor,
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
                              value={currentSettings?.spriteAnchor?.spriteAnchorY || 1.0}
                              onChange={(e) => updateCurrentSettings({ 
                                spriteAnchor: {
                                  ...currentSettings?.spriteAnchor,
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
                        </Box>
                      )}
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
                    
                    {/* Above/Below Positioning Toggle - Small inline version */}
                    <FormControlLabel
                      control={
                        <Switch
                          checked={currentSettings.useAbovePositioning ?? false}
                          onChange={(e) => updateCurrentSettings({ useAbovePositioning: e.target.checked })}
                          disabled={isLocked}
                          size="small"
                          sx={{
                            '& .MuiSwitch-switchBase.Mui-checked': { color: '#673AB7' },
                            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#673AB7' }
                          }}
                        />
                      }
                      label={
                        <Typography variant="caption" sx={{ color: (currentSettings.useAbovePositioning ?? false) ? '#673AB7' : 'white', fontSize: '0.65rem' }}>
                          {(currentSettings.useAbovePositioning ?? false) ? '🔺 Above Grid' : '🔻 Below Grid'}
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
                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mb: 1 }}>
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
                    
                    {/* Above Snap Offset Control */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                      <Typography variant="caption" sx={{ minWidth: '80px', color: '#673AB7', fontSize: '0.65rem' }}>
                        🔺 Above Offset:
                      </Typography>
                      <TextField
                        type="number"
                        value={currentSettings.snapAboveYOffset || 0}
                        onChange={(e) => updateCurrentSettings({ snapAboveYOffset: parseInt(e.target.value) || 0 })}
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
                      <Typography variant="caption" sx={{ color: 'rgba(103,58,183,0.7)', fontSize: '0.6rem' }}>
                        (non-snapped Y offset for above positioning)
                      </Typography>
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

                    {/* Wall-Relative Positioning (A=8, B=3 System) - Only for non-tile assets */}
                    {temporaryAsset.assetType !== 'tile' && (
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
                        
                        {/* Reset to Defaults Button */}
                        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
                          <Button
                            variant="outlined"
                            onClick={() => {
                              // Restore the A=8, B=3 classic defaults
                              updateCurrentSettings({ 
                                relativeAlongEdgeOffset: 0,
                                relativeTowardCenterOffset: 0,
                                relativeDiagonalAOffset: 8,
                                relativeDiagonalBOffset: 3,
                                useADivisionForNorthEast: true
                              });
                            }}
                            disabled={isLocked}
                            size="small"
                            sx={{
                              fontSize: '0.6rem',
                              borderColor: '#E91E63',
                              color: '#E91E63',
                              '&:hover': { borderColor: '#C2185B', color: '#C2185B' }
                            }}
                          >
                            🔄 Reset to A=8, B=3 Defaults
                          </Button>
                        </Box>
                        
                        <Typography variant="caption" sx={{ 
                          color: 'rgba(233,30,99,0.7)', 
                          fontSize: '0.6rem',
                          display: 'block'
                        }}>
                          💡 Wall-relative: Edge=along wall, Center=toward cell center, A=8, B=3 classic system
                        </Typography>
                      </Box>
                    )}
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