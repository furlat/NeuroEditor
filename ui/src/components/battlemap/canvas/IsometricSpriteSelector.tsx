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
  CardContent,
  Button,
  Switch,
  FormControlLabel
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

// Helper function to get sprite height for sorting
const getSpriteHeight = (spriteName: string): number => {
  const frameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
  return frameSize?.height || 0;
};

// Sort sprites by height (shorter first, then alphabetically)
const sortSpritesByHeight = (sprites: string[]): string[] => {
  return [...sprites].sort((a, b) => {
    const heightA = getSpriteHeight(a);
    const heightB = getSpriteHeight(b);
    
    // First sort by height (shorter sprites first)
    if (heightA !== heightB) {
      return heightA - heightB;
    }
    
    // Then sort alphabetically for sprites of same height
    return a.localeCompare(b);
  });
};

// Dynamic sprite loading functions that get sprites from the sprite manager
const getAllBlockSprites = async (): Promise<string[]> => {
  try {
    // Ensure sprites are loaded first
    await isometricSpriteManager.loadAll();
    
    // Get actually loaded block sprites from the sprite manager
    const blockSprites = isometricSpriteManager.getSpritesInCategory(SpriteCategory.BLOCKS);
    console.log('[IsometricSpriteSelector] Loaded block sprites from sprite manager:', blockSprites);
    return blockSprites;
  } catch (error) {
    console.error('[IsometricSpriteSelector] Error loading block sprites:', error);
    // Fallback to a minimal set if loading fails
    return ['Floor_01', 'FloorBlock_01', 'GardenFloor_01'];
  }
};

const getAllWallSprites = async (): Promise<string[]> => {
  try {
    // Ensure sprites are loaded first
    await isometricSpriteManager.loadAll();
    
    // Get actually loaded wall sprites from the sprite manager
    const wallSprites = isometricSpriteManager.getSpritesInCategory(SpriteCategory.WALLS);
    console.log('[IsometricSpriteSelector] Loaded wall sprites from sprite manager:', wallSprites);
    return wallSprites;
  } catch (error) {
    console.error('[IsometricSpriteSelector] Error loading wall sprites:', error);
    // Fallback to a minimal set if loading fails
    return ['WallBrick_Small_01', 'Door_01', 'Window_Small_01'];
  }
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
  // Performance-optimized snapshots
  const controlsSnap = useSnapshot(battlemapStore.controls);
  const isometricEditor = controlsSnap.isometricEditor;
  
  // Local state
  const [availableSprites, setAvailableSprites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Current selections
  const selectedSprite = isometricEditor.selectedSpriteName;
  const selectedDirection = isometricEditor.wallMode ? isometricEditor.wallSpriteDirection : isometricEditor.selectedSpriteDirection;
  const isWallMode = isometricEditor.wallMode;

  // Mode-aware sprite loading using actual folder structure
  useEffect(() => {
    const loadSprites = async () => {
      try {
        setIsLoading(true);
        
        // Load sprites based on current mode using the sprite manager
        let sprites: string[] = [];
        if (isWallMode) {
          sprites = await getAllWallSprites();
          console.log(`[IsometricSpriteSelector] Loaded ${sprites.length} wall sprites from sprite manager`);
        } else {
          sprites = await getAllBlockSprites();
          console.log(`[IsometricSpriteSelector] Loaded ${sprites.length} block sprites from sprite manager`);
        }
        
        // Sort sprites by height (shorter first, then alphabetically)
        const sortedSprites = sortSpritesByHeight(sprites);
        setAvailableSprites(sortedSprites);
        
        console.log(`[IsometricSpriteSelector] Sorted ${sortedSprites.length} ${isWallMode ? 'wall' : 'block'} sprites by height`);
      } catch (error) {
        console.error('[IsometricSpriteSelector] Failed to load sprites:', error);
        setAvailableSprites([]); // Set empty array on error
      } finally {
        setIsLoading(false);
      }
    };

    loadSprites();
  }, [isWallMode]); // React to wall mode changes

  const handleSpriteSelect = (spriteName: string) => {
    if (isLocked) return;
    
    battlemapActions.setSelectedSprite(spriteName);
    console.log(`[IsometricSpriteSelector] Selected ${isWallMode ? 'wall' : 'block'} sprite: ${spriteName}`);
  };

  const handleDirectionChange = (direction: IsometricDirection) => {
    if (isLocked) return;
    
    if (isWallMode) {
      // For walls: update BOTH sprite direction (how it faces) AND placement direction (which edge)
      battlemapActions.setWallSpriteDirection(direction);
      battlemapActions.setWallPlacementDirection(direction);
      console.log(`[IsometricSpriteSelector] Changed wall direction to: ${direction} (both sprite facing and placement edge)`);
    } else {
      // For blocks: only update sprite direction (blocks are center-placed)
      battlemapActions.setSelectedSpriteDirection(direction);
      console.log(`[IsometricSpriteSelector] Changed block direction to: ${direction}`);
    }
  };

  // NEW: Wall/Block mode toggle handler
  const handleModeToggle = () => {
    if (isLocked) return;
    battlemapActions.toggleWallMode();
  };

  const getDirectionIcon = (direction: IsometricDirection) => {
    const icons = ['🔼', '▶️', '🔽', '◀️'];
    return icons[direction] || '🔼';
  };

  return (
    <Paper sx={{ 
      p: 2, 
      backgroundColor: 'rgba(0, 0, 0, 0.9)', 
      color: 'white',
      maxHeight: '70vh',
      overflow: 'auto',
      minWidth: '300px'
    }}>
      {/* NEW: Mode Toggle at the top - more intuitive */}
      <Box sx={{ mb: 2, pb: 2, borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        <FormControlLabel
          control={
            <Switch
              checked={isWallMode}
              onChange={handleModeToggle}
              disabled={isLocked}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#E91E63' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#E91E63' }
              }}
            />
          }
          label={
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="h6" sx={{ color: isWallMode ? '#E91E63' : '#2196F3' }}>
                {isWallMode ? '🧱 Wall Mode' : '🧊 Block Mode'}
              </Typography>
              <Typography variant="caption" sx={{ 
                color: isWallMode ? '#E91E63' : '#2196F3', 
                fontSize: '0.65rem',
                opacity: 0.8
              }}>
                {isWallMode ? 'Edge-based wall placement' : 'Center-based block placement'}
              </Typography>
              <Typography variant="caption" sx={{ 
                color: 'rgba(255,255,255,0.5)', 
                fontSize: '0.6rem'
              }}>
                💡 Hotkey: Q (Toggle Mode)
              </Typography>
            </Box>
          }
        />
      </Box>

      {isLocked && (
        <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
          ⚠️ Unlock the map to select sprites
        </Typography>
      )}

      {/* Direction Controls - Show different labels for walls vs blocks */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ color: '#FFC107' }}>
          {isWallMode ? '🧭 Wall Sprite Direction:' : '🧭 Block Sprite Direction:'}
        </Typography>
        
        <ToggleButtonGroup
          value={selectedDirection}
          exclusive
          onChange={(_, value) => value !== null && handleDirectionChange(value)}
          size="small"
          disabled={isLocked}
          sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}
        >
          <ToggleButton value={IsometricDirection.NORTH} sx={{ color: 'white', minWidth: '60px' }}>
            {getDirectionIcon(IsometricDirection.NORTH)} North
          </ToggleButton>
          <ToggleButton value={IsometricDirection.EAST} sx={{ color: 'white', minWidth: '60px' }}>
            {getDirectionIcon(IsometricDirection.EAST)} East
          </ToggleButton>
          <ToggleButton value={IsometricDirection.SOUTH} sx={{ color: 'white', minWidth: '60px' }}>
            {getDirectionIcon(IsometricDirection.SOUTH)} South
          </ToggleButton>
          <ToggleButton value={IsometricDirection.WEST} sx={{ color: 'white', minWidth: '60px' }}>
            {getDirectionIcon(IsometricDirection.WEST)} West
          </ToggleButton>
        </ToggleButtonGroup>
        
        <Typography variant="caption" sx={{ 
          color: '#FFC107', 
          fontSize: '0.65rem', 
          display: 'block', 
          mt: 0.5 
        }}>
          {isWallMode 
            ? '🔄 Direction the wall sprite faces (independent of placement edge)'
            : '🔄 Use Z/X keys for quick rotation while editing'
          }
        </Typography>
      </Box>

      {/* Current Selection Display */}
      {selectedSprite && (
        <Box sx={{ mb: 2, p: 1, border: '1px solid #FFC107', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ color: '#FFC107', mb: 1 }}>
            📌 Selected {isWallMode ? 'Wall' : 'Block'}:
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SpritePreview 
              spriteName={selectedSprite} 
              isSelected={true}
              onSelect={() => {}} 
              disabled={true}
              direction={selectedDirection}
            />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                {selectedSprite.replace(/_/g, ' ')}
              </Typography>
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                {getDirectionIcon(selectedDirection)} {['North', 'East', 'South', 'West'][selectedDirection]}
              </Typography>
              <Typography variant="caption" sx={{ 
                color: 'rgba(255,255,255,0.5)', 
                fontSize: '0.6rem',
                display: 'block'
              }}>
                Height: {getSpriteHeight(selectedSprite)}px
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Available Sprites Grid */}
      <Typography variant="subtitle2" gutterBottom sx={{ color: '#4CAF50' }}>
        🎨 Available {isWallMode ? 'Wall' : 'Block'} Sprites:
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Loading {isWallMode ? 'wall' : 'block'} sprites...
          </Typography>
        </Box>
      )}

      {!isLoading && availableSprites.length === 0 && (
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', p: 2 }}>
          No {isWallMode ? 'wall' : 'block'} sprites available
        </Typography>
      )}

      {!isLoading && availableSprites.length > 0 && (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
          gap: 1,
          maxHeight: '300px',
          overflow: 'auto'
        }}>
          {availableSprites.map((spriteName) => (
            <SpritePreview
              key={spriteName}
              spriteName={spriteName}
              isSelected={selectedSprite === spriteName}
              onSelect={() => handleSpriteSelect(spriteName)}
              disabled={isLocked}
              direction={selectedDirection}
            />
          ))}
        </Box>
      )}

      {/* Footer with sprite count and mode info */}
      <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <Typography variant="caption" sx={{ 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: '0.65rem' 
        }}>
          {availableSprites.length} {isWallMode ? 'wall' : 'block'} sprites loaded (sorted by height)
          <br />
          {isWallMode ? '🎯 Click edges to place walls' : '🎯 Click centers to place blocks'}
        </Typography>
      </Box>
    </Paper>
  );
};

export default IsometricSpriteSelector; 