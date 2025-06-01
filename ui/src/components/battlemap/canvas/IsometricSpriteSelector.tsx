import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  ToggleButton,
  ToggleButtonGroup,
  Chip,
  TextField,
  Divider,
  Card,
  CardMedia,
  CardContent
} from '@mui/material';
import { 
  North as NorthIcon,
  East as EastIcon, 
  South as SouthIcon,
  West as WestIcon
} from '@mui/icons-material';
import { useSnapshot } from 'valtio';
import { battlemapStore, battlemapActions } from '../../../store';
import { 
  isometricSpriteManager, 
  IsometricDirection, 
  SpriteCategory 
} from '../../../game/managers/IsometricSpriteManager';
import { Texture } from 'pixi.js';

interface IsometricSpriteSelectorProps {
  isLocked: boolean;
}

// Get all sprite names from the blocks directory
const getAllBlockSprites = (): string[] => {
  const spriteNames = [
    'UnderBlock_01',
    'UnderBlock_Corner_01', 
    'UnderBlock_Bottom_Tall_01',
    'UnderBlock_Mid_Tall_01',
    'FloorBlock_Tall_01',
    'FloorBlock_Corner_Tall_01',
    'FloorBlock_Top_Corner_01',
    'FloorBlock_01',
    'FloorBlock_Corner_01',
    'GardenFloor_Path_03',
    'GardenFloor_Path_01',
    'GardenFloor_01',
    'GardenFloor_HalfSquare_02',
    'GardenFloor_HalfSquare_01',
    'GardenFloor_Square_01',
    'GardenFloor_Path_02',
    'FloorBlock_Mid_01',
    'FloorBlock_Bottom_01',
    'UnderBlock_Tall_01',
    'GardenBlock_Path_03',
    'GardenBlock_Path_01',
    'GardenBlock_01',
    'GardenBlock_HalfSquare_02',
    'GardenBlock_HalfSquare_01',
    'GardenBlock_Square_01',
    'GardenBlock_Path_02',
    'UnderBlock_Corner_Tall_01',
    'UnderFloor_01',
    'Floor_01',
    'Floor_Corner_01',
    'FloorBlock_Top_01'
  ];
  
  return spriteNames.sort(); // Sort alphabetically
};

// Component for sprite preview
interface SpritePreviewProps {
  spriteName: string;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  direction: IsometricDirection;
}

const SpritePreview: React.FC<SpritePreviewProps> = ({ 
  spriteName, 
  isSelected, 
  onSelect, 
  disabled = false,
  direction
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    // Generate preview URL for the sprite
    const generatePreview = () => {
      try {
        const texture = isometricSpriteManager.getSpriteTexture(spriteName, direction);
        if (texture && texture.source) {
          // Create a canvas to generate a preview image
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (ctx && texture.source.resource) {
            const img = texture.source.resource as HTMLImageElement;
            
            // Set canvas size for preview (small)
            canvas.width = 64;
            canvas.height = 64;
            
            // Calculate source rectangle for the selected direction
            const frameWidth = img.width / 4;
            const frameHeight = img.height;
            
            // Calculate frame index based on direction
            let frameIndex = 0;
            switch (direction) {
              case IsometricDirection.NORTH: frameIndex = 0; break;
              case IsometricDirection.EAST: frameIndex = 1; break;
              case IsometricDirection.SOUTH: frameIndex = 2; break;
              case IsometricDirection.WEST: frameIndex = 3; break;
            }
            
            const sourceX = frameIndex * frameWidth;
            
            // Draw the sprite frame scaled down
            ctx.drawImage(
              img,
              sourceX, 0, frameWidth, frameHeight, // Source rectangle
              0, 0, 64, 64 // Destination rectangle
            );
            
            setPreviewUrl(canvas.toDataURL());
          }
        }
      } catch (error) {
        console.warn(`Failed to generate preview for ${spriteName} (${direction}):`, error);
        setPreviewUrl(null);
      }
    };

    // Wait a bit for textures to load, then generate preview
    const timeout = setTimeout(generatePreview, 100);
    return () => clearTimeout(timeout);
  }, [spriteName, direction]);

  return (
    <Card
      sx={{
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1.0,
        border: isSelected ? '2px solid #2196F3' : '1px solid rgba(255,255,255,0.2)',
        backgroundColor: isSelected ? 'rgba(33, 150, 243, 0.1)' : 'rgba(0,0,0,0.7)',
        '&:hover': disabled ? {} : {
          border: '2px solid #2196F3',
          backgroundColor: 'rgba(33, 150, 243, 0.05)'
        }
      }}
      onClick={disabled ? undefined : onSelect}
    >
      {previewUrl ? (
        <CardMedia
          component="img"
          height="64"
          image={previewUrl}
          alt={`${spriteName} (${direction})`}
          sx={{
            objectFit: 'contain',
            backgroundColor: 'rgba(255,255,255,0.05)',
            imageRendering: 'pixelated' // Keep pixel art crisp
          }}
        />
      ) : (
        <Box
          sx={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.3)'
          }}
        >
          <Typography variant="caption" sx={{ fontSize: '0.6rem' }}>
            Loading...
          </Typography>
        </Box>
      )}
      
      <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '0.65rem',
            color: isSelected ? '#2196F3' : 'white',
            fontWeight: isSelected ? 'bold' : 'normal',
            textAlign: 'center',
            display: 'block',
            lineHeight: 1.2
          }}
        >
          {spriteName.replace(/_/g, ' ')}
        </Typography>
      </CardContent>
    </Card>
  );
};

const IsometricSpriteSelector: React.FC<IsometricSpriteSelectorProps> = ({ isLocked }) => {
  // PERFORMANCE FIX: Only subscribe to isometric editor controls, not the entire store
  // This avoids re-renders when offset changes during WASD movement
  const controlsSnap = useSnapshot(battlemapStore.controls);
  const isometricEditor = controlsSnap.isometricEditor;
  
  const [availableSprites, setAvailableSprites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  // Load available sprites when component mounts
  useEffect(() => {
    const loadSprites = async () => {
      setIsLoading(true);
      try {
        await isometricSpriteManager.loadAll();
        const allBlockSprites = getAllBlockSprites();
        setAvailableSprites(allBlockSprites);
        
        // Auto-select first sprite if none selected
        if (!isometricEditor.selectedSpriteName && allBlockSprites.length > 0) {
          handleSpriteSelect(allBlockSprites[0]);
        }
      } catch (error) {
        console.error('Failed to load sprites:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSprites();
  }, []);

  const handleSpriteSelect = (spriteName: string) => {
    battlemapActions.setSelectedSprite(spriteName);
    
    // Check if we have existing settings for this sprite
    const existingSettings = controlsSnap.isometricEditor.spriteTypeSettings[spriteName];
    
    if (!existingSettings) {
      // Auto-calculate using user's exact formula for new sprites
      const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
      if (spriteFrameSize) {
        // Use the store's calculation function which includes current rounding method
        const calculated = battlemapActions.calculateSpriteTypePositioning(spriteFrameSize.width, spriteFrameSize.height);
        
        // Save calculated settings
        battlemapActions.setSpriteTypeSettings(spriteName, calculated);
        
        console.log(`[IsometricSpriteSelector] Auto-calculated settings for ${spriteName}:`, calculated);
      }
    } else {
      console.log(`[IsometricSpriteSelector] Using existing settings for ${spriteName}:`, existingSettings);
    }
  };

  const handleDirectionChange = (direction: IsometricDirection) => {
    battlemapActions.setSelectedSpriteDirection(direction);
  };

  const getDirectionIcon = (direction: IsometricDirection) => {
    switch (direction) {
      case IsometricDirection.NORTH: return <NorthIcon />;
      case IsometricDirection.EAST: return <EastIcon />;
      case IsometricDirection.SOUTH: return <SouthIcon />;
      case IsometricDirection.WEST: return <WestIcon />;
    }
  };

  // Filter sprites based on search
  const filteredSprites = availableSprites.filter(sprite =>
    sprite.toLowerCase().includes(searchFilter.toLowerCase())
  );

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
      width: '420px'
    }}>
      <Typography variant="h6" gutterBottom>
        🎨 Sprite Selection
      </Typography>

      {isLocked && (
        <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
          ⚠️ Unlock the map to select sprites
        </Typography>
      )}

      {/* Search Filter */}
      <TextField
        label="Search Sprites"
        value={searchFilter}
        onChange={(e) => setSearchFilter(e.target.value)}
        onFocus={(e) => {
          console.log('[IsometricSpriteSelector] Search focused - blocking WASD movement');
        }}
        onBlur={(e) => {
          console.log('[IsometricSpriteSelector] Search blurred - enabling WASD movement');
        }}
        disabled={isLocked}
        size="small"
        autoComplete="off"
        spellCheck={false}
        sx={{ 
          width: '100%',
          mb: 2,
          '& .MuiInputBase-input': { 
            color: 'white', 
            fontSize: '0.8rem'
          },
          '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' },
          '& .MuiOutlinedInput-root': { 
            '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
            '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
            '&.Mui-focused fieldset': { borderColor: '#2196F3' }
          }
        }}
      />

      {/* Current Selection */}
      {isometricEditor.selectedSpriteName && (
        <Box sx={{ 
          mb: 2, 
          p: 1, 
          border: '1px solid rgba(76, 175, 80, 0.5)',
          borderRadius: 1,
          backgroundColor: 'rgba(76, 175, 80, 0.1)'
        }}>
          <Typography variant="caption" sx={{ color: '#4CAF50' }}>
            ✅ Selected: {isometricEditor.selectedSpriteName}
          </Typography>
          <Typography variant="caption" sx={{ 
            color: '#00BCD4', 
            display: 'block', 
            fontSize: '0.65rem' 
          }}>
            🎯 Z-Level: {isometricEditor.selectedZLevel} | Direction: {isometricEditor.selectedSpriteDirection}
          </Typography>
        </Box>
      )}
      
      {/* Sprite Grid with Previews */}
      <Box sx={{ 
        maxHeight: '400px', 
        overflow: 'auto', 
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 1,
        p: 1,
        mb: 2
      }}>
        <Typography variant="caption" sx={{ mb: 1, display: 'block', color: '#FFC107' }}>
          📦 Available Sprites ({filteredSprites.length} found):
        </Typography>
        
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
          gap: 1
        }}>
          {filteredSprites.map((spriteName) => (
            <SpritePreview
              key={spriteName}
              spriteName={spriteName}
              isSelected={isometricEditor.selectedSpriteName === spriteName}
              onSelect={() => handleSpriteSelect(spriteName)}
              disabled={isLocked}
              direction={isometricEditor.selectedSpriteDirection}
            />
          ))}
        </Box>
      </Box>

      {/* Direction & Z-Level Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#FF9800' }}>
            🧭 Direction:
          </Typography>
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
        </Box>
        
        <Box>
          <Typography variant="caption" sx={{ display: 'block', mb: 0.5, color: '#9C27B0' }}>
            🏔️ Z-Level:
          </Typography>
          <TextField
            type="number"
            value={isometricEditor.selectedZLevel}
            onChange={(e) => battlemapActions.setSelectedZLevel(parseInt(e.target.value) || 0)}
            onFocus={() => console.log('[IsometricSpriteSelector] Z-level input focused')}
            onBlur={() => console.log('[IsometricSpriteSelector] Z-level input blurred')}
            disabled={isLocked}
            size="small"
            sx={{ 
              width: '80px',
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

      <Typography variant="caption" sx={{ opacity: 0.6, display: 'block', fontSize: '0.7rem' }}>
        💡 Click a sprite to select it, then use left/right-click to place tiles.<br/>
        🖱️ Middle-click to delete | 🎹 Keys 1-3 to switch layers
      </Typography>
    </Paper>
  );
};

export default IsometricSpriteSelector; 