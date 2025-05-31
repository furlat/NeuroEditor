import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  Slider,
  FormControlLabel,
  Switch,
  TextField,
  Divider
} from '@mui/material';
import { 
  North as NorthIcon,
  East as EastIcon, 
  South as SouthIcon,
  West as WestIcon,
  Add as AddIcon,
  Remove as RemoveIcon
} from '@mui/icons-material';
import { useSnapshot } from 'valtio';
import { battlemapStore, battlemapActions } from '../../../store';
import { 
  isometricSpriteManager, 
  IsometricDirection, 
  SpriteCategory 
} from '../../../game/managers/IsometricSpriteManager';

interface IsometricSpriteSelectorProps {
  isLocked: boolean;
}

const IsometricSpriteSelector: React.FC<IsometricSpriteSelectorProps> = ({ isLocked }) => {
  const snap = useSnapshot(battlemapStore);
  const { isometricEditor } = snap.controls;
  
  const [availableSprites, setAvailableSprites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load available sprites when component mounts
  useEffect(() => {
    const loadSprites = async () => {
      setIsLoading(true);
      try {
        await isometricSpriteManager.loadAll();
        updateAvailableSprites(isometricEditor.selectedSpriteCategory);
      } catch (error) {
        console.error('Failed to load sprites:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSprites();
  }, []);

  // Update available sprites when category changes
  useEffect(() => {
    updateAvailableSprites(isometricEditor.selectedSpriteCategory);
  }, [isometricEditor.selectedSpriteCategory]);

  const updateAvailableSprites = (category: SpriteCategory) => {
    const sprites = isometricSpriteManager.getSpritesInCategory(category);
    setAvailableSprites(sprites);
    
    // Auto-select first sprite if none selected or if current selection is not in the new category
    if (!isometricEditor.selectedSpriteName || !sprites.includes(isometricEditor.selectedSpriteName)) {
      if (sprites.length > 0) {
        battlemapActions.setSelectedSprite(sprites[0]);
        console.log(`[IsometricSpriteSelector] Auto-selected sprite: ${sprites[0]} from category: ${category}`);
      }
    }
  };

  const handleCategoryChange = (category: SpriteCategory) => {
    battlemapActions.setSelectedSpriteCategory(category);
  };

  const handleSpriteSelect = (spriteName: string) => {
    battlemapActions.setSelectedSprite(spriteName);
  };

  const handleDirectionChange = (direction: IsometricDirection) => {
    battlemapActions.setSelectedSpriteDirection(direction);
  };

  const handleZLevelChange = (event: Event, newValue: number | number[]) => {
    battlemapActions.setSelectedZLevel(newValue as number);
  };

  const handleBrushSizeChange = (event: Event, newValue: number | number[]) => {
    battlemapActions.setBrushSize(newValue as number);
  };

  // Precise number input handlers
  const handleGridWidthChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(event.target.value);
    if (!isNaN(value)) {
      battlemapActions.setGridDiamondWidth(value);
    }
  };

  const handleSpriteScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value >= 0.1 && value <= 5.0) {
      battlemapActions.setSpriteScale(value);
    }
  };

  const handleVerticalOffsetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      battlemapActions.setSpriteVerticalOffset(value);
    }
  };

  const handleInvisibleMarginChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      battlemapActions.setSpriteInvisibleMargin(value);
    }
  };

  const handleCalcMarginUpChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      battlemapActions.setCalcMarginUp(value);
    }
  };

  const handleCalcMarginLeftChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      battlemapActions.setCalcMarginLeft(value);
    }
  };

  const handleCalcMarginRightChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value)) {
      battlemapActions.setCalcMarginRight(value);
    }
  };

  const getDirectionIcon = (direction: IsometricDirection) => {
    switch (direction) {
      case IsometricDirection.NORTH: return <NorthIcon />;
      case IsometricDirection.EAST: return <EastIcon />;
      case IsometricDirection.SOUTH: return <SouthIcon />;
      case IsometricDirection.WEST: return <WestIcon />;
    }
  };

  if (isLoading) {
    return (
      <Paper sx={{ p: 2, backgroundColor: 'rgba(0, 0, 0, 0.9)', color: 'white' }}>
        <Typography>Loading sprites...</Typography>
      </Paper>
    );
  }

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
        🎨 Sprite Editor
      </Typography>

      {isLocked && (
        <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
          ⚠️ Unlock the map to edit sprites
        </Typography>
      )}

      {/* Category Selection */}
      <ToggleButtonGroup
        value={isometricEditor.selectedSpriteCategory}
        exclusive
        onChange={(_, value) => value && handleCategoryChange(value)}
        size="small"
        sx={{ mb: 2, width: '100%' }}
        disabled={isLocked}
      >
        <ToggleButton value={SpriteCategory.BLOCKS} sx={{ color: 'white', flex: 1 }}>
          🧱 Blocks
        </ToggleButton>
        <ToggleButton value={SpriteCategory.WALLS} sx={{ color: 'white', flex: 1 }}>
          🧱 Walls
        </ToggleButton>
      </ToggleButtonGroup>

      {/* Current Selection */}
      {isometricEditor.selectedSpriteName && (
        <Box sx={{ 
          mb: 1, 
          p: 1, 
          border: '1px solid rgba(76, 175, 80, 0.5)',
          borderRadius: 1,
          backgroundColor: 'rgba(76, 175, 80, 0.1)'
        }}>
          <Typography variant="caption" sx={{ color: '#4CAF50' }}>
            ✅ Selected: {isometricEditor.selectedSpriteName}
          </Typography>
        </Box>
      )}
      
      {/* Sprite Selection - Compact */}
      <Box sx={{ 
        maxHeight: '120px', 
        overflow: 'auto', 
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 1,
        p: 1,
        mb: 2
      }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {availableSprites.map((spriteName) => (
            <Chip
              key={spriteName}
              label={spriteName.replace(/_/g, ' ')}
              clickable
              size="small"
              variant={isometricEditor.selectedSpriteName === spriteName ? 'filled' : 'outlined'}
              color={isometricEditor.selectedSpriteName === spriteName ? 'primary' : 'default'}
              onClick={() => handleSpriteSelect(spriteName)}
              disabled={isLocked}
              sx={{ 
                fontSize: '0.7rem',
                height: '24px',
                color: 'white',
                borderColor: 'rgba(255,255,255,0.5)'
              }}
            />
          ))}
        </Box>
      </Box>

      {/* Direction & Controls - Compact Row */}
      {isometricEditor.selectedSpriteName && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
          <ToggleButtonGroup
            value={isometricEditor.selectedSpriteDirection}
            exclusive
            onChange={(_, value) => value !== null && handleDirectionChange(value)}
            size="small"
            disabled={isLocked}
          >
            {[IsometricDirection.NORTH, IsometricDirection.EAST, IsometricDirection.SOUTH, IsometricDirection.WEST].map((direction) => (
              <ToggleButton 
                key={direction} 
                value={direction}
                sx={{ color: 'white', minWidth: '32px', padding: '4px' }}
              >
                {getDirectionIcon(direction)}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption">Z:</Typography>
            <TextField
              type="number"
              value={isometricEditor.selectedZLevel}
              onChange={(e) => battlemapActions.setSelectedZLevel(parseInt(e.target.value) || 0)}
              disabled={isLocked}
              size="small"
              sx={{ 
                width: '60px',
                '& .MuiInputBase-input': { color: 'white', fontSize: '0.8rem', padding: '4px 8px' },
                '& .MuiOutlinedInput-root': { 
                  '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                  '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' }
                }
              }}
              inputProps={{ min: 0, max: 10 }}
            />
          </Box>
        </Box>
      )}

      <Divider sx={{ bgcolor: 'rgba(255,255,255,0.2)', my: 2 }} />

      {/* Size Controls - Precise & Compact */}
      <Typography variant="subtitle2" gutterBottom sx={{ color: '#FFC107' }}>
        🎯 Size Controls
      </Typography>

      {/* Grid Diamond Width */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2" sx={{ minWidth: '80px' }}>Grid Size:</Typography>
          <TextField
            type="number"
            value={snap.view.gridDiamondWidth}
            onChange={handleGridWidthChange}
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
            value={snap.view.spriteScale.toFixed(2)}
            onChange={handleSpriteScaleChange}
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
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton 
              size="small" 
              onClick={() => battlemapActions.setSpriteScale(Math.max(0.1, snap.view.spriteScale - 0.01))}
              disabled={isLocked}
              sx={{ color: 'white', width: '24px', height: '24px' }}
            >
              <RemoveIcon sx={{ fontSize: '16px' }} />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => battlemapActions.setSpriteScale(Math.min(5.0, snap.view.spriteScale + 0.01))}
              disabled={isLocked}
              sx={{ color: 'white', width: '24px', height: '24px' }}
            >
              <AddIcon sx={{ fontSize: '16px' }} />
            </IconButton>
          </Box>
        </Box>
        {/* Display current sprite size */}
        {isometricEditor.selectedSpriteName && (() => {
          const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(isometricEditor.selectedSpriteName);
          const actualSpriteWidth = spriteFrameSize?.width || 409;
          return (
            <Typography variant="caption" sx={{ opacity: 0.7, fontSize: '0.7rem', color: '#FF9800' }}>
              Current sprite size: {Math.round(actualSpriteWidth * snap.view.spriteScale * snap.view.zoomLevel)}px 
              (base: {actualSpriteWidth}px × {snap.view.spriteScale.toFixed(2)} × {snap.view.zoomLevel.toFixed(2)})
            </Typography>
          );
        })()}
      </Box>

      {/* Calculation Margins (for predictions only) */}
      <Typography variant="subtitle2" gutterBottom sx={{ color: '#00BCD4', mt: 2 }}>
        🔬 Calculation Margins (Prediction Only)
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: '#00BCD4', fontSize: '0.7rem' }}>Up:</Typography>
          <TextField
            type="number"
            value={snap.view.calcMarginUp}
            onChange={handleCalcMarginUpChange}
            disabled={isLocked}
            size="small"
            sx={{ 
              width: '60px',
              '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
              '& .MuiOutlinedInput-root': { 
                '& fieldset': { borderColor: '#00BCD4' },
                '&:hover fieldset': { borderColor: '#00BCD4' }
              }
            }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: '#00BCD4', fontSize: '0.7rem' }}>Left:</Typography>
          <TextField
            type="number"
            value={snap.view.calcMarginLeft}
            onChange={handleCalcMarginLeftChange}
            disabled={isLocked}
            size="small"
            sx={{ 
              width: '60px',
              '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
              '& .MuiOutlinedInput-root': { 
                '& fieldset': { borderColor: '#00BCD4' },
                '&:hover fieldset': { borderColor: '#00BCD4' }
              }
            }}
          />
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" sx={{ color: '#00BCD4', fontSize: '0.7rem' }}>Right:</Typography>
          <TextField
            type="number"
            value={snap.view.calcMarginRight}
            onChange={handleCalcMarginRightChange}
            disabled={isLocked}
            size="small"
            sx={{ 
              width: '60px',
              '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '2px 4px' },
              '& .MuiOutlinedInput-root': { 
                '& fieldset': { borderColor: '#00BCD4' },
                '&:hover fieldset': { borderColor: '#00BCD4' }
              }
            }}
          />
        </Box>
      </Box>

      {/* Prediction Formulas & Calculations */}
      {isometricEditor.selectedSpriteName && (() => {
        // Get actual sprite dimensions from the sprite manager
        const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(isometricEditor.selectedSpriteName);
        const actualSpriteWidth = spriteFrameSize?.width || 409; // Fallback to 409 if not available
        const actualSpriteHeight = spriteFrameSize?.height || 409; // Fallback to 409 if not available
        
        // Calculate effective dimensions after margins
        const effectiveWidth = actualSpriteWidth - snap.view.calcMarginLeft - snap.view.calcMarginRight;
        const effectiveHeight = actualSpriteHeight - snap.view.calcMarginUp;
        
        // Grid diamond height (half of diamond width)
        const gridDiamondHeight = snap.view.gridDiamondWidth / 2;
        
        // USER'S EXACT FORMULA IMPLEMENTATION
        // Step 1: (WIDTH - (MARGIN + 1)) / 2 --> actual height (isometric diamond bottom height)
        const actualWidth = actualSpriteWidth - (snap.view.spriteInvisibleMargin + 1);
        const isometricDiamondBottomHeight = actualWidth / 2;
        
        // Step 2: empirical height - (margin+1) - margin_above - actual height == vertical offset
        const marginBelow = snap.view.spriteInvisibleMargin; // 8
        const marginAbove = 4; // Your estimated margin above
        const effectiveEmpiricalHeight = actualSpriteHeight - marginBelow - marginAbove - 1;
        const calculatedVerticalOffset = effectiveEmpiricalHeight - isometricDiamondBottomHeight;
        
        // Alternative calculations for comparison
        const formula2_gridBased = Math.round(gridDiamondHeight / 6);
        const formula3_heightBased = Math.round(36 * (effectiveHeight / 249));
        
        // Your back-of-envelope calculation
        const yourAnalysis_offset = 36; // Your calculated offset for Floor_01
        const yourAnalysis_margin = 8;  // Your calculated invisible margin
        
        return (
          <Box sx={{ mb: 2, p: 1, border: '1px solid rgba(255,255,255,0.2)', borderRadius: 1 }}>
            <Typography variant="caption" sx={{ color: '#4CAF50', fontSize: '0.7rem', fontWeight: 'bold' }}>
              🧮 Prediction Formulas (Actual Data)
            </Typography>
            
            <Typography variant="caption" sx={{ opacity: 1.0, fontSize: '0.7rem', display: 'block', mt: 1, color: '#FF5722', fontWeight: 'bold' }}>
              🔍 DEBUG: Using sprite "{isometricEditor.selectedSpriteName}" for calculations
            </Typography>
            
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.65rem', display: 'block', mt: 1, color: '#FFC107' }}>
              📐 Sprite Dimensions: {actualSpriteWidth}×{actualSpriteHeight}px
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.65rem', display: 'block', color: '#FFC107' }}>
              📏 Effective (after margins): {effectiveWidth}×{effectiveHeight}px
            </Typography>
            
            <Typography variant="caption" sx={{ opacity: 1.0, fontSize: '0.7rem', display: 'block', mt: 1, color: '#FF5722', fontWeight: 'bold' }}>
              🧮 YOUR FORMULA CALCULATION:
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.65rem', display: 'block', color: '#FF5722' }}>
              Step 1: ({actualSpriteWidth} - ({snap.view.spriteInvisibleMargin} + 1)) / 2 = {isometricDiamondBottomHeight.toFixed(1)}px (iso diamond height)
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.65rem', display: 'block', color: '#FF5722' }}>
              Step 2: {actualSpriteHeight} - {marginBelow} - {marginAbove} - 1 = {effectiveEmpiricalHeight}px (effective sprite height)
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.65rem', display: 'block', color: '#FF5722' }}>
              Step 3: {effectiveEmpiricalHeight} - {isometricDiamondBottomHeight.toFixed(1)} = {calculatedVerticalOffset.toFixed(1)}px (CALCULATED OFFSET)
            </Typography>
            
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.65rem', display: 'block', mt: 1, color: '#03DAC6' }}>
              🎯 CALCULATED OFFSET: {calculatedVerticalOffset.toFixed(1)}px (from your formula)
            </Typography>
            
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.65rem', display: 'block', color: '#03DAC6' }}>
              🎯 CURRENT SETTINGS: Vertical={snap.view.spriteVerticalOffset}px, Margin={snap.view.spriteInvisibleMargin}px
            </Typography>
            
            <Typography variant="caption" sx={{ opacity: 0.9, fontSize: '0.65rem', display: 'block', color: '#03DAC6' }}>
              📋 Recommended (your analysis): Vertical={yourAnalysis_offset}px, Margin={yourAnalysis_margin}px
            </Typography>
            
            <Typography variant="caption" sx={{ opacity: 0.6, fontSize: '0.6rem', display: 'block', mt: 0.5 }}>
              🔬 Compare your pixel-perfect values with mathematical predictions
            </Typography>
          </Box>
        );
      })()}

      {/* Invisible Margin */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2" sx={{ minWidth: '80px' }}>Invisible Margin (Base):</Typography>
          <TextField
            type="number"
            value={snap.view.spriteInvisibleMargin}
            onChange={handleInvisibleMarginChange}
            disabled={isLocked}
            size="small"
            sx={{ 
              width: '80px',
              '& .MuiInputBase-input': { color: 'white', fontSize: '0.8rem', padding: '4px 8px' },
              '& .MuiOutlinedInput-root': { 
                '& fieldset': { borderColor: '#9C27B0' },
                '&:hover fieldset': { borderColor: '#9C27B0' }
              }
            }}
            inputProps={{ step: 1 }}
          />
          <Typography variant="caption" sx={{ color: '#9C27B0' }}>px</Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton 
              size="small" 
              onClick={() => battlemapActions.setSpriteInvisibleMargin(snap.view.spriteInvisibleMargin - 1)}
              disabled={isLocked}
              sx={{ color: 'white', width: '24px', height: '24px' }}
            >
              <RemoveIcon sx={{ fontSize: '16px' }} />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => battlemapActions.setSpriteInvisibleMargin(snap.view.spriteInvisibleMargin + 1)}
              disabled={isLocked}
              sx={{ color: 'white', width: '24px', height: '24px' }}
            >
              <AddIcon sx={{ fontSize: '16px' }} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      {/* Vertical Offset */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Typography variant="body2" sx={{ minWidth: '80px' }}>Vertical Offset (Base):</Typography>
          <TextField
            type="number"
            value={snap.view.spriteVerticalOffset}
            onChange={handleVerticalOffsetChange}
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
            inputProps={{ step: 1 }}
          />
          <Typography variant="caption" sx={{ color: '#FF9800' }}>px</Typography>
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            <IconButton 
              size="small" 
              onClick={() => battlemapActions.setSpriteVerticalOffset(snap.view.spriteVerticalOffset - 1)}
              disabled={isLocked}
              sx={{ color: 'white', width: '24px', height: '24px' }}
            >
              <RemoveIcon sx={{ fontSize: '16px' }} />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => battlemapActions.setSpriteVerticalOffset(snap.view.spriteVerticalOffset + 1)}
              disabled={isLocked}
              sx={{ color: 'white', width: '24px', height: '24px' }}
            >
              <AddIcon sx={{ fontSize: '16px' }} />
            </IconButton>
          </Box>
        </Box>
      </Box>

      <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', fontSize: '0.7rem' }}>
        📐 Grid: Isometric diamond size<br/>
        🎨 Sprite: Sprite size (independent)<br/>
        🔧 Margin: Internal positioning (fixed)<br/>
        📏 Vertical: Fine-tune Y position (zoom-aware)<br/>
        🔍 Zoom: Use mouse wheel or top controls
      </Typography>
    </Paper>
  );
};

export default IsometricSpriteSelector; 