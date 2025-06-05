import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Card,
  CardMedia,
  CardContent,
  CircularProgress,
  Alert,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
  Chip
} from '@mui/material';
import { useSnapshot } from 'valtio';
import { battlemapStore } from '../store';
import { forceRerender } from '../store/battlemap/core';
import { 
  isometricSpriteManager, 
  IsometricDirection, 
  SpriteCategory 
} from '../game/managers/IsometricSpriteManager';
import {
  AssetCategory,
  createDefaultProcessedAsset,
  TemporaryAssetState,
  ProcessedAssetType,
  calculateAutoComputedPositioning
} from '../types/processed_assets';
import { processedAssetsActions } from '../store/battlemap/processedAssets';
import { battlemapEngine } from '../game/BattlemapEngine';
import { getCanvasBoundingBox } from 'pixi.js';
import * as PIXI from 'pixi.js';

interface ProcessedAssetSpriteSelectorProps {
  isLocked: boolean;
}

// Asset categories for organization
enum AssetSourceCategory {
  TILES = 'tiles',
  WALLS = 'walls', 
  DOORS = 'doors',
  STAIRS = 'stairs'
}

// Helper to get sprite height for sorting
const getSpriteHeight = (spriteName: string): number => {
  const frameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
  return frameSize?.height || 0;
};

// Sort sprites by height first, then alphabetically
const sortSpritesByHeight = (sprites: string[]): string[] => {
  return [...sprites].sort((a, b) => {
    const heightA = getSpriteHeight(a);
    const heightB = getSpriteHeight(b);
    
    if (heightA !== heightB) {
      return heightA - heightB;
    }
    
    return a.localeCompare(b);
  });
};

// Get tiles (blocks category)
const getTileSprites = async (): Promise<string[]> => {
  try {
    await isometricSpriteManager.loadAll();
    const blockSprites = isometricSpriteManager.getSpritesInCategory(SpriteCategory.BLOCKS);
    console.log('[ProcessedAssetSpriteSelector] Loaded tile sprites:', blockSprites.length);
    return blockSprites;
  } catch (error) {
    console.error('[ProcessedAssetSpriteSelector] Error loading tile sprites:', error);
    return [];
  }
};

// Get wall sprites (excluding stairs and doors)
const getWallSprites = async (): Promise<string[]> => {
  try {
    await isometricSpriteManager.loadAll();
    const wallSprites = isometricSpriteManager.getSpritesInCategory(SpriteCategory.WALLS);
    // Filter out stairs and doors
    const pureWalls = wallSprites.filter(name => 
      !name.toLowerCase().includes('stair') && 
      !name.toLowerCase().includes('door')
    );
    console.log('[ProcessedAssetSpriteSelector] Loaded wall sprites (excluding stairs and doors):', pureWalls.length);
    return pureWalls;
  } catch (error) {
    console.error('[ProcessedAssetSpriteSelector] Error loading wall sprites:', error);
    return [];
  }
};

// Get door sprites (walls category with "door" in name)
const getDoorSprites = async (): Promise<string[]> => {
  try {
    await isometricSpriteManager.loadAll();
    const wallSprites = isometricSpriteManager.getSpritesInCategory(SpriteCategory.WALLS);
    // Filter for doors (contain "door" in name)
    const doors = wallSprites.filter(name => name.toLowerCase().includes('door'));
    console.log('[ProcessedAssetSpriteSelector] Loaded door sprites:', doors.length);
    return doors;
  } catch (error) {
    console.error('[ProcessedAssetSpriteSelector] Error loading door sprites:', error);
    return [];
  }
};

// Get stair sprites (walls category with "stair" in name)
const getStairSprites = async (): Promise<string[]> => {
  try {
    await isometricSpriteManager.loadAll();
    const wallSprites = isometricSpriteManager.getSpritesInCategory(SpriteCategory.WALLS);
    // Filter for stairs (contain "stair" in name)
    const stairs = wallSprites.filter(name => name.toLowerCase().includes('stair'));
    console.log('[ProcessedAssetSpriteSelector] Loaded stair sprites:', stairs.length);
    return stairs;
  } catch (error) {
    console.error('[ProcessedAssetSpriteSelector] Error loading stair sprites:', error);
    return [];
  }
};

// Component for sprite preview
interface SpritePreviewProps {
  spriteName: string;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

const SpritePreview: React.FC<SpritePreviewProps> = ({ 
  spriteName, 
  isSelected, 
  onSelect, 
  disabled = false
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const generatePreview = () => {
      try {
        // Use SOUTH direction as default for preview
        const texture = isometricSpriteManager.getSpriteTexture(spriteName, IsometricDirection.SOUTH);
        if (texture && texture.source) {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          if (ctx && texture.source.resource) {
            const img = texture.source.resource as HTMLImageElement;
            
            canvas.width = 80;
            canvas.height = 80;
            
            const frameWidth = img.width / 4;
            const frameHeight = img.height;
            const sourceX = 2 * frameWidth; // SOUTH frame
            
            ctx.drawImage(
              img,
              sourceX, 0, frameWidth, frameHeight,
              0, 0, 80, 80
            );
            
            setPreviewUrl(canvas.toDataURL());
          }
        }
      } catch (error) {
        console.warn(`Failed to generate preview for ${spriteName}:`, error);
        setPreviewUrl(null);
      }
    };

    const timeout = setTimeout(generatePreview, 100);
    return () => clearTimeout(timeout);
  }, [spriteName]);

  return (
    <Card
      sx={{
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1.0,
        border: isSelected ? '3px solid #FF9800' : '1px solid rgba(255,255,255,0.2)',
        backgroundColor: isSelected ? 'rgba(255, 152, 0, 0.15)' : 'rgba(0,0,0,0.8)',
        '&:hover': disabled ? {} : {
          border: '3px solid #FF9800',
          backgroundColor: 'rgba(255, 152, 0, 0.1)'
        }
      }}
      onClick={disabled ? undefined : onSelect}
    >
      {previewUrl ? (
        <CardMedia
          component="img"
          height="80"
          image={previewUrl}
          alt={spriteName}
          sx={{
            objectFit: 'contain',
            backgroundColor: 'rgba(255,255,255,0.05)',
            imageRendering: 'pixelated'
          }}
        />
      ) : (
        <Box
          sx={{
            height: 80,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.3)'
          }}
        >
          <Typography variant="caption" sx={{ fontSize: '0.7rem' }}>
            Loading...
          </Typography>
        </Box>
      )}
      
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '0.7rem',
            color: isSelected ? '#FF9800' : 'white',
            fontWeight: isSelected ? 'bold' : 'normal',
            textAlign: 'center',
            display: 'block',
            lineHeight: 1.2
          }}
        >
          {spriteName.replace(/_/g, ' ')}
        </Typography>
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '0.6rem',
            color: 'rgba(255,255,255,0.5)',
            textAlign: 'center',
            display: 'block'
          }}
        >
          {getSpriteHeight(spriteName)}px
        </Typography>
      </CardContent>
    </Card>
  );
};

const ProcessedAssetSpriteSelector: React.FC<ProcessedAssetSpriteSelectorProps> = ({ isLocked }) => {
  // Store subscriptions
  const processedAssetsSnap = useSnapshot(battlemapStore.processedAssets);
  
  // Local state
  const [availableSprites, setAvailableSprites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSpriteName, setSelectedSpriteName] = useState<string | null>(null);
  const [isCreatingAsset, setIsCreatingAsset] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AssetSourceCategory>(AssetSourceCategory.TILES);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load sprites based on selected category
  useEffect(() => {
    const loadSprites = async () => {
      try {
        setIsLoading(true);
        
        let sprites: string[] = [];
        switch (selectedCategory) {
          case AssetSourceCategory.TILES:
            sprites = await getTileSprites();
            break;
          case AssetSourceCategory.WALLS:
            sprites = await getWallSprites();
            break;
          case AssetSourceCategory.DOORS:
            sprites = await getDoorSprites();
            break;
          case AssetSourceCategory.STAIRS:
            sprites = await getStairSprites();
            break;
        }
        
        const sortedSprites = sortSpritesByHeight(sprites);
        setAvailableSprites(sortedSprites);
        
        console.log(`[ProcessedAssetSpriteSelector] Loaded ${sortedSprites.length} ${selectedCategory} sprites`);
      } catch (error) {
        console.error('[ProcessedAssetSpriteSelector] Failed to load sprites:', error);
        setAvailableSprites([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadSprites();
  }, [selectedCategory]);

  // Filter sprites based on search query
  const filteredSprites = availableSprites.filter(spriteName =>
    spriteName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Place 4 directional instances on the grid at specified positions
  const placeDirectionalInstances = async (assetId: string) => {
    try {
      // Clear existing instances first
      const existingInstances = processedAssetsActions.instances.getAllInstances();
      Object.keys(existingInstances).forEach(instanceKey => {
        processedAssetsActions.instances.removeAssetInstance(instanceKey);
      });
      
      // Place directional instances at specified positions
      const placements = [
        { position: [0, 0] as const, direction: IsometricDirection.NORTH },
        { position: [0, 2] as const, direction: IsometricDirection.EAST },
        { position: [2, 0] as const, direction: IsometricDirection.SOUTH },
        { position: [2, 2] as const, direction: IsometricDirection.WEST },
      ];
      
      placements.forEach(({ position, direction }) => {
        processedAssetsActions.instances.placeAssetInstance(
          assetId,
          position,
          0, // Z level 0
          direction,
          'above' // Snap position
        );
      });
      
      console.log(`[ProcessedAssetSpriteSelector] Placed 4 directional instances for asset: ${assetId}`);
      
    } catch (error) {
      console.error('[ProcessedAssetSpriteSelector] Error placing directional instances:', error);
    }
  };

  // Handle sprite selection and asset creation
  const handleSpriteSelect = async (spriteName: string) => {
    if (isLocked || isCreatingAsset) return;
    
    setSelectedSpriteName(spriteName);
    
    // Automatically create a processed asset from the selected sprite
    setIsCreatingAsset(true);
    
    try {
      // Determine category based on selected category
      let assetCategory: AssetCategory;
      switch (selectedCategory) {
        case AssetSourceCategory.TILES:
          assetCategory = AssetCategory.TILE;
          break;
        case AssetSourceCategory.WALLS:
          assetCategory = AssetCategory.WALL;
          break;
        case AssetSourceCategory.DOORS:
          assetCategory = AssetCategory.WALL; // Doors are a type of wall
          break;
        case AssetSourceCategory.STAIRS:
          assetCategory = AssetCategory.STAIR;
          break;
      }
      
      // Create default processed asset
      const newAsset = createDefaultProcessedAsset(assetCategory, 'default');
      
      // Auto-populate with sprite information
      newAsset.displayName = spriteName.replace(/_/g, ' ');
      
      // Determine source path based on category
      const metadata = isometricSpriteManager.getSpriteMetadata(spriteName);
      const spritePath = metadata?.fullPath || `/isometric_tiles/${selectedCategory === AssetSourceCategory.TILES ? 'blocks' : 'walls'}/${spriteName}.png`;
      
      // Clear validation errors since we have a source image
      newAsset.validationErrors = [];
      newAsset.isValid = true;
      
      // Save the asset to the library first, then place instances
      processedAssetsActions.library.addAsset(newAsset);
      
      // FIXED: Don't call startCreatingAsset as it creates a fresh asset - just set the temporary asset directly
      battlemapStore.processedAssets.assetCreation.isCreating = true;
      battlemapStore.processedAssets.assetCreation.isEditing = false;
      battlemapStore.processedAssets.assetCreation.currentStep = 'directional'; // Skip to directional config
      battlemapStore.processedAssets.assetCreation.selectedCategory = assetCategory;
      battlemapStore.processedAssets.assetCreation.selectedSubcategory = 'default';
      
      // Convert to temporary asset state
      const temporaryAsset: TemporaryAssetState = {
        ...newAsset,
        isTemporary: true,
        hasUnsavedChanges: true,
        sourceProcessing: {
          ...newAsset.sourceProcessing,
          sourceImagePath: spritePath
        }
      };
      
      // CRITICAL FIX: Recalculate auto values using actual sprite dimensions, not default 100x100
      if (temporaryAsset.assetType === ProcessedAssetType.TILE) {
        try {
          const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
          if (spriteFrameSize) {
            console.log(`[ProcessedAssetSpriteSelector] 🔄 Auto-calculating for ${spriteName}: ${spriteFrameSize.width}x${spriteFrameSize.height}`);
            
            // Get current settings for bounding box anchor setting
            const useBoundingBoxAnchor = temporaryAsset.directionalBehavior.sharedSettings.spriteAnchor.useBoundingBoxAnchor;
            
            // USE THE SAME CALCULATION FUNCTION AS handleRecalculate - NO MORE DUPLICATES!
            const calculatedPositioning = calculateAutoComputedPositioning(
              spriteFrameSize.width,
              spriteFrameSize.height,
              useBoundingBoxAnchor,
              spriteName,
              temporaryAsset.assetType
            );
            
            console.log(`[ProcessedAssetSpriteSelector] 🎯 Calculated positioning:`, calculatedPositioning);
            
            // Update all directional settings with calculated values - SAME LOGIC AS handleRecalculate
            const updateSettings = (settings: any) => ({
              ...settings,
              autoComputedVerticalBias: calculatedPositioning.autoComputedVerticalBias,
              manualVerticalBias: calculatedPositioning.autoComputedVerticalBias, // Set manual to computed value
              verticalOffset: calculatedPositioning.verticalOffset,
              horizontalOffset: calculatedPositioning.horizontalOffset,
              snapAboveYOffset: calculatedPositioning.snapAboveYOffset  // NEW: Store above positioning offset
            });
            
            temporaryAsset.directionalBehavior.sharedSettings = updateSettings(temporaryAsset.directionalBehavior.sharedSettings);
            temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.NORTH] = updateSettings(temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.NORTH]);
            temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.EAST] = updateSettings(temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.EAST]);
            temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.SOUTH] = updateSettings(temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.SOUTH]);
            temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.WEST] = updateSettings(temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.WEST]);
            
            console.log(`[ProcessedAssetSpriteSelector] ✅ Auto-calculated: VerticalBias=${calculatedPositioning.autoComputedVerticalBias}, VerticalOffset=${calculatedPositioning.verticalOffset}, HorizontalOffset=${calculatedPositioning.horizontalOffset}, SnapAboveYOffset=${calculatedPositioning.snapAboveYOffset}`);
          }
        } catch (error) {
          console.warn('[ProcessedAssetSpriteSelector] Failed to recalculate auto values:', error);
        }
      }
      
      // CRITICAL FIX: Compute and store bounding box data for ALL asset types!
      try {
        console.log(`[ProcessedAssetSpriteSelector] 🔍 Computing bounding box for ${spriteName}...`);
        
        // Get the texture and compute its bounding box
        const texture = isometricSpriteManager.getSpriteTexture(spriteName, IsometricDirection.SOUTH);
        if (texture && battlemapEngine?.app?.renderer) {
          // Create temporary canvas with correct dimensions
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          if (context) {
            canvas.width = texture.width;
            canvas.height = texture.height;
            
            // Extract texture data
            const tempSprite = new PIXI.Sprite(texture);
            const extractedCanvas = battlemapEngine.app.renderer.extract.canvas(tempSprite) as HTMLCanvasElement;
            context.drawImage(extractedCanvas, 0, 0);
            tempSprite.destroy();
            
            // Compute bounding box
            const boundingBox = getCanvasBoundingBox(canvas, 1);
            
            const spriteBoundingBoxData = {
              originalWidth: texture.width,
              originalHeight: texture.height,
              boundingX: boundingBox.x,
              boundingY: boundingBox.y,
              boundingWidth: boundingBox.width,
              boundingHeight: boundingBox.height,
              anchorOffsetX: boundingBox.x / texture.width,
              anchorOffsetY: boundingBox.y / texture.height
            };
            
            console.log(`[ProcessedAssetSpriteSelector] 📦 Computed bounding box:`, spriteBoundingBoxData);
            
            // CRITICAL: Store bounding box data in ALL directional settings!
            const updateWithBoundingBox = (settings: any) => ({
              ...settings,
              spriteBoundingBox: spriteBoundingBoxData
            });
            
            temporaryAsset.directionalBehavior.sharedSettings = updateWithBoundingBox(temporaryAsset.directionalBehavior.sharedSettings);
            temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.NORTH] = updateWithBoundingBox(temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.NORTH]);
            temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.EAST] = updateWithBoundingBox(temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.EAST]);
            temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.SOUTH] = updateWithBoundingBox(temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.SOUTH]);
            temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.WEST] = updateWithBoundingBox(temporaryAsset.directionalBehavior.directionalSettings[IsometricDirection.WEST]);
            
            console.log(`[ProcessedAssetSpriteSelector] ✅ Stored bounding box data in all directional settings`);
          }
        }
      } catch (error) {
        console.warn('[ProcessedAssetSpriteSelector] Failed to compute bounding box:', error);
      }
      
      // Set the temporary asset directly (this preserves the correct wall defaults like A=8, B=3)
      battlemapStore.processedAssets.temporaryAsset = temporaryAsset;
      
      // Force re-render to update the UI
      forceRerender();
      
      // Now place 4 directional instances with the saved asset ID
      await placeDirectionalInstances(newAsset.id);
      
      console.log(`[ProcessedAssetSpriteSelector] Created and saved processed asset from sprite: ${spriteName}`);
      
    } catch (error) {
      console.error('[ProcessedAssetSpriteSelector] Error creating asset:', error);
    } finally {
      setIsCreatingAsset(false);
    }
  };

  const getCategoryIcon = (category: AssetSourceCategory): string => {
    switch (category) {
      case AssetSourceCategory.TILES: return '🧊';
      case AssetSourceCategory.WALLS: return '🧱';
      case AssetSourceCategory.DOORS: return '🚪';
      case AssetSourceCategory.STAIRS: return '🪜';
      default: return '📦';
    }
  };

  const getCategoryColor = (category: AssetSourceCategory): string => {
    switch (category) {
      case AssetSourceCategory.TILES: return '#4CAF50';
      case AssetSourceCategory.WALLS: return '#2196F3';
      case AssetSourceCategory.DOORS: return '#9C27B0';
      case AssetSourceCategory.STAIRS: return '#FF9800';
      default: return '#9E9E9E';
    }
  };

  return (
    <Paper sx={{ 
      p: 3, 
      backgroundColor: 'rgba(0, 0, 0, 0.9)', 
      color: 'white',
      maxHeight: '85vh',
      overflow: 'auto',
      minWidth: '420px',
      maxWidth: '480px'
    }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#FF9800', mb: 1 }}>
          🖼️ Source PNG Selection
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Choose PNG source for processed asset
        </Typography>
      </Box>

      {isLocked && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Unlock the map to select sprites
        </Alert>
      )}

      {/* Category Toggle */}
      <Box sx={{ mb: 3, pb: 2, borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
        <Typography variant="subtitle2" gutterBottom sx={{ color: '#FFC107' }}>
          📂 Asset Category:
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0.5 }}>
          <ToggleButtonGroup
            value={selectedCategory}
            exclusive
            onChange={(_, value) => value !== null && setSelectedCategory(value)}
            size="small"
            disabled={isLocked}
            sx={{ gridColumn: '1 / -1', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 0.5 }}
          >
            <ToggleButton 
              value={AssetSourceCategory.TILES} 
              sx={{ 
                color: 'white', 
                '&.Mui-selected': { backgroundColor: getCategoryColor(AssetSourceCategory.TILES), color: 'white' }
              }}
            >
              {getCategoryIcon(AssetSourceCategory.TILES)} Tiles
            </ToggleButton>
            <ToggleButton 
              value={AssetSourceCategory.WALLS} 
              sx={{ 
                color: 'white', 
                '&.Mui-selected': { backgroundColor: getCategoryColor(AssetSourceCategory.WALLS), color: 'white' }
              }}
            >
              {getCategoryIcon(AssetSourceCategory.WALLS)} Walls
            </ToggleButton>
            <ToggleButton 
              value={AssetSourceCategory.DOORS} 
              sx={{ 
                color: 'white', 
                '&.Mui-selected': { backgroundColor: getCategoryColor(AssetSourceCategory.DOORS), color: 'white' }
              }}
            >
              {getCategoryIcon(AssetSourceCategory.DOORS)} Doors
            </ToggleButton>
            <ToggleButton 
              value={AssetSourceCategory.STAIRS} 
              sx={{ 
                color: 'white', 
                '&.Mui-selected': { backgroundColor: getCategoryColor(AssetSourceCategory.STAIRS), color: 'white' }
              }}
            >
              {getCategoryIcon(AssetSourceCategory.STAIRS)} Stairs
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Search Bar */}
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search sprites..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          disabled={isLocked}
          sx={{
            '& .MuiOutlinedInput-root': {
              color: 'white',
              '& fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
              '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.5)' },
              '&.Mui-focused fieldset': { borderColor: '#FF9800' }
            },
            '& .MuiInputLabel-root': { color: 'rgba(255,255,255,0.7)' }
          }}
        />
      </Box>

      {/* Sprites Grid */}
      <Typography variant="subtitle2" gutterBottom sx={{ color: getCategoryColor(selectedCategory) }}>
        {getCategoryIcon(selectedCategory)} Available {selectedCategory}:
        {searchQuery && (
          <Chip 
            label={`"${searchQuery}"`} 
            size="small" 
            onDelete={() => setSearchQuery('')}
            sx={{ ml: 1, backgroundColor: 'rgba(255,255,255,0.1)', color: 'white' }}
          />
        )}
      </Typography>

      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress size={50} sx={{ color: '#FF9800' }} />
          <Typography variant="body1" sx={{ ml: 3, color: 'rgba(255,255,255,0.7)' }}>
            Loading {selectedCategory}...
          </Typography>
        </Box>
      )}

      {!isLoading && filteredSprites.length === 0 && availableSprites.length > 0 && (
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', p: 3 }}>
          No {selectedCategory} found matching "{searchQuery}"
        </Typography>
      )}

      {!isLoading && availableSprites.length === 0 && (
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', p: 3 }}>
          No {selectedCategory} available
        </Typography>
      )}

      {!isLoading && filteredSprites.length > 0 && (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: 2,
          maxHeight: '400px',
          overflow: 'auto',
          p: 1
        }}>
          {filteredSprites.map((spriteName) => (
            <SpritePreview
              key={spriteName}
              spriteName={spriteName}
              isSelected={selectedSpriteName === spriteName}
              onSelect={() => handleSpriteSelect(spriteName)}
              disabled={isLocked || isCreatingAsset}
            />
          ))}
        </Box>
      )}

      {isCreatingAsset && (
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 2, 
          mt: 3, 
          p: 2, 
          backgroundColor: 'rgba(255, 152, 0, 0.1)', 
          borderRadius: 1 
        }}>
          <CircularProgress size={20} sx={{ color: '#FF9800' }} />
          <Typography variant="body2" sx={{ color: '#FF9800' }}>
            Creating asset...
          </Typography>
        </Box>
      )}

      {/* Footer */}
      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <Typography variant="caption" sx={{ 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: '0.75rem' 
        }}>
          {filteredSprites.length} of {availableSprites.length} {selectedCategory} shown
          <br />
          📏 Sorted by height, then alphabetically
        </Typography>
      </Box>
    </Paper>
  );
};

export default ProcessedAssetSpriteSelector; 