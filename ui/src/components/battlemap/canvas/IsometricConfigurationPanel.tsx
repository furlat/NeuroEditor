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
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Chip
} from '@mui/material';
import { useSnapshot } from 'valtio';
import { battlemapStore, battlemapActions, VerticalBiasComputationMode } from '../../../store';
import { isometricSpriteManager, IsometricDirection } from '../../../game/managers/IsometricSpriteManager';
import { useTileEditor } from '../../../hooks/battlemap';
import { getCanvasBoundingBox } from 'pixi.js';
import { spriteConfigurationManager } from '../../../services/SpriteConfigurationManager';

interface IsometricConfigurationPanelProps {
  isLocked: boolean;
}

/**
 * Configuration panel for isometric editor settings
 * PERFORMANCE OPTIMIZED: Only subscribes to editor controls and relevant view settings
 * NOW SUPPORTS: Both blocks and walls with complete separation AND JSON persistence
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

  // NEW: Wall mode state
  const isWallMode = isometricEditor.wallMode;

  // FIXED: Get the actual shared settings state from store (DIRECTLY from Valtio state, not function call)
  // WORKS FOR BOTH BLOCKS AND WALLS
  const actualSharedSettings = isometricEditor.selectedSpriteName 
    ? (isWallMode 
        ? (isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName]?.useSharedSettings ?? true)
        : (isometricEditor.spriteTypeSettings[isometricEditor.selectedSpriteName]?.useSharedSettings ?? true)
      )
    : true;

  // NEW: Config management state (remove shared from here - use store instead)
  const [configStatus, setConfigStatus] = React.useState<{
    loaded: boolean;
    lastSaved?: string;
    error?: string;
  }>({ loaded: false });

  // Debug logging to track what values we're getting
  React.useEffect(() => {
    if (isometricEditor.selectedSpriteName) {
      console.log(`[IsometricConfigurationPanel] DEBUG - Current sprite: ${isometricEditor.selectedSpriteName}`);
      console.log(`[IsometricConfigurationPanel] DEBUG - Current direction: ${isWallMode ? isometricEditor.wallSpriteDirection : isometricEditor.selectedSpriteDirection}`);
      console.log(`[IsometricConfigurationPanel] DEBUG - Actual shared setting from store: ${actualSharedSettings}`);
      
      if (isWallMode) {
        const rawWallStoreData = isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName];
        console.log(`[IsometricConfigurationPanel] DEBUG - Raw WALL store data:`, rawWallStoreData);
        console.log(`[IsometricConfigurationPanel] DEBUG - useSharedSettings value:`, rawWallStoreData?.useSharedSettings);
        
        const currentWallSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection);
        console.log(`[IsometricConfigurationPanel] DEBUG - Current wall settings:`, currentWallSettings);
      } else {
        const currentSettings = battlemapActions.getSpriteTypeSettings(isometricEditor.selectedSpriteName, isometricEditor.selectedSpriteDirection);
        console.log(`[IsometricConfigurationPanel] DEBUG - Current settings:`, currentSettings);
        
        const rawStoreData = isometricEditor.spriteTypeSettings[isometricEditor.selectedSpriteName];
        console.log(`[IsometricConfigurationPanel] DEBUG - Raw store data:`, rawStoreData);
      }
    }
  }, [
    isometricEditor.selectedSpriteName, 
    isometricEditor.selectedSpriteDirection, 
    isometricEditor.wallSpriteDirection,
    isWallMode
    // REMOVED: actualSharedSettings - this was causing infinite loops because it's calculated from store data
  ]);

  // NEW: Initialize configs on mount
  React.useEffect(() => {
    const initializeConfigs = async () => {
      try {
        await spriteConfigurationManager.initializeDefaultConfigs();
        console.log('[IsometricConfigurationPanel] Default configs initialized');
      } catch (error) {
        console.error('[IsometricConfigurationPanel] Failed to initialize configs:', error);
        setConfigStatus(prev => ({ ...prev, error: 'Failed to initialize configs' }));
      }
    };
    
    initializeConfigs();
  }, []);

  // NEW: Load config when sprite changes
  React.useEffect(() => {
    const loadConfigForCurrentSprite = async () => {
      if (!isometricEditor.selectedSpriteName) {
        setConfigStatus({ loaded: false });
        return;
      }

      try {
        const spriteType = isWallMode ? 'wall' : 'block';
        
        // FIXED: Check if settings already exist in store first
        // Only load from JSON if no settings exist in store
        const existingSettings = isWallMode 
          ? isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName]
          : isometricEditor.spriteTypeSettings[isometricEditor.selectedSpriteName];

        if (existingSettings) {
          // Settings already exist in store - don't overwrite with JSON
          console.log(`[IsometricConfigurationPanel] Using existing store settings for ${spriteType}:${isometricEditor.selectedSpriteName} - not loading from JSON`);
          setConfigStatus({
            loaded: true,
            lastSaved: 'In-memory (not saved to JSON)',
            error: undefined
          });
          return;
        }

        // No settings in store - try to load from JSON
        console.log(`[IsometricConfigurationPanel] No store settings found for ${spriteType}:${isometricEditor.selectedSpriteName} - loading from JSON config`);
        const config = await spriteConfigurationManager.loadConfig(isometricEditor.selectedSpriteName, spriteType);
        
        if (config) {
          setConfigStatus({
            loaded: true,
            lastSaved: config.lastModified,
            error: undefined
          });
          
          // Sync config to store (only when no settings existed)
          await spriteConfigurationManager.syncConfigToStore(isometricEditor.selectedSpriteName, spriteType);
          console.log(`[IsometricConfigurationPanel] Loaded settings from JSON config for ${spriteType}:${isometricEditor.selectedSpriteName}`);
        } else {
          console.log(`[IsometricConfigurationPanel] No JSON config found for ${spriteType}:${isometricEditor.selectedSpriteName} - will use defaults`);
          setConfigStatus({ loaded: false, error: 'No config file found - using defaults' });
        }
      } catch (error) {
        console.error('[IsometricConfigurationPanel] Failed to load config:', error);
        setConfigStatus(prev => ({ ...prev, error: 'Failed to load config' }));
      }
    };

    loadConfigForCurrentSprite();
  }, [isometricEditor.selectedSpriteName, isWallMode]);

  // Get utilities from useTileEditor hook
  const {
    clearAllTiles,
    generateSampleTiles,
    initializeGrid,
  } = useTileEditor();

  // Get current BLOCK sprite settings for display (FIXED: Use store function that handles shared vs per-direction)
  const currentSpriteSettings = isometricEditor.selectedSpriteName && !isWallMode
    ? battlemapActions.getSpriteTypeSettings(isometricEditor.selectedSpriteName, isometricEditor.selectedSpriteDirection)
    : null;

  // NEW: Get current WALL sprite settings for display (SAME SYSTEM AS BLOCKS NOW)
  const currentWallSettings = isometricEditor.selectedSpriteName && isWallMode
    ? battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection)
    : null;

  // NEW: Config management handlers
  const handleSyncFromConfig = async () => {
    if (!isometricEditor.selectedSpriteName) return;
    
    try {
      const spriteType = isWallMode ? 'wall' : 'block';
      await spriteConfigurationManager.syncConfigToStore(isometricEditor.selectedSpriteName, spriteType);
      setConfigStatus(prev => ({ ...prev, error: undefined }));
      console.log(`[IsometricConfigurationPanel] Synced config to store for ${spriteType}:${isometricEditor.selectedSpriteName}`);
    } catch (error) {
      console.error('[IsometricConfigurationPanel] Failed to sync from config:', error);
      setConfigStatus(prev => ({ ...prev, error: 'Failed to sync from config' }));
    }
  };

  const handleSaveToConfig = async () => {
    if (!isometricEditor.selectedSpriteName) return;
    
    try {
      const spriteType = isWallMode ? 'wall' : 'block';
      const config = await spriteConfigurationManager.syncStoreToConfig(isometricEditor.selectedSpriteName, spriteType);
      
      // Update shared setting in config
      const updatedConfig = {
        ...config,
        useSharedSettings: actualSharedSettings
      };
      
      const success = await spriteConfigurationManager.saveConfig(updatedConfig);
      
      if (success) {
        setConfigStatus(prev => ({ 
          ...prev, 
          loaded: true,
          lastSaved: new Date().toISOString(),
          error: undefined 
        }));
        console.log(`[IsometricConfigurationPanel] Saved config for ${spriteType}:${isometricEditor.selectedSpriteName}`);
      } else {
        setConfigStatus(prev => ({ ...prev, error: 'Failed to save config' }));
      }
    } catch (error) {
      console.error('[IsometricConfigurationPanel] Failed to save config:', error);
      setConfigStatus(prev => ({ ...prev, error: 'Failed to save config' }));
    }
  };

  const handleSharedSettingsToggle = () => {
    console.log(`[IsometricConfigurationPanel] === TOGGLE CLICKED ===`);
    console.log(`[IsometricConfigurationPanel] Selected sprite: ${isometricEditor.selectedSpriteName}`);
    console.log(`[IsometricConfigurationPanel] Current mode: ${isWallMode ? 'WALL' : 'BLOCK'}`);
    console.log(`[IsometricConfigurationPanel] Current actualSharedSettings: ${actualSharedSettings}`);
    
    if (isWallMode) {
      console.log(`[IsometricConfigurationPanel] Raw WALL store data BEFORE:`, isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName!]);
    } else {
      console.log(`[IsometricConfigurationPanel] Raw BLOCK store data BEFORE:`, isometricEditor.spriteTypeSettings[isometricEditor.selectedSpriteName!]);
    }
    
    // Actually update the store settings
    if (isometricEditor.selectedSpriteName) {
      const newSharedState = !actualSharedSettings;
      console.log(`[IsometricConfigurationPanel] Setting new shared state to: ${newSharedState}`);
      
      if (isWallMode) {
        // WALLS: Use wall-specific function
        battlemapActions.setWallUseSharedSettings(isometricEditor.selectedSpriteName, newSharedState);
      } else {
        // BLOCKS: Use block-specific function
        battlemapActions.setSpriteUseSharedSettings(isometricEditor.selectedSpriteName, newSharedState);
      }
      
      // Log AFTER the action
      setTimeout(() => {
        if (isWallMode) {
          console.log(`[IsometricConfigurationPanel] Raw WALL store data AFTER:`, isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName!]);
        } else {
          console.log(`[IsometricConfigurationPanel] Raw BLOCK store data AFTER:`, isometricEditor.spriteTypeSettings[isometricEditor.selectedSpriteName!]);
        }
        console.log(`[IsometricConfigurationPanel] New actualSharedSettings should be: ${newSharedState}`);
      }, 100);
    }
  };

  // NEW: Wall mode toggle handler
  const handleWallModeToggle = () => {
    battlemapActions.toggleWallMode();
  };

  // NEW: Function to get sprite bounding box info
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
      if (!texture || !texture.baseTexture.resource) {
        return { 
          original: spriteFrameSize, 
          boundingBox: null, 
          error: 'Texture not loaded' 
        };
      }

      // Create temporary canvas
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

      const img = texture.baseTexture.resource.source as HTMLImageElement;
      if (!img || !img.complete) {
        return { 
          original: spriteFrameSize, 
          boundingBox: null, 
          error: 'Image not ready' 
        };
      }

      // Draw texture to canvas
      context.drawImage(
        img,
        texture.frame.x, texture.frame.y, texture.frame.width, texture.frame.height,
        0, 0, texture.frame.width, texture.frame.height
      );

      // Get bounding box
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
    } catch (error) {
      return { 
        original: { width: 0, height: 0 }, 
        boundingBox: null, 
        error: `Error: ${error}` 
      };
    }
  };

  // NEW: Wall-specific handlers (NOW USE SAME SYSTEM AS BLOCKS)
  const handleWallMarginChange = (marginType: 'up' | 'down' | 'left' | 'right', value: number) => {
    if (!isWallMode || !isometricEditor.selectedSpriteName) return;
    
    // Check if using shared settings or per-direction (SAME LOGIC AS BLOCKS)
    const useSharedSettings = isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName]?.useSharedSettings ?? true;
    
    if (useSharedSettings) {
      // SHARED MODE: Update shared settings (affects all directions)
      const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName);
      if (!currentSettings) return;
      
      const updatedSharedSettings = {
        ...currentSettings,
        [`invisibleMargin${marginType.charAt(0).toUpperCase() + marginType.slice(1)}`]: value
      };
      
      console.log(`[IsometricConfigurationPanel] Updating SHARED wall ${marginType} margin for ${isometricEditor.selectedSpriteName}: ${value}px`);
      battlemapActions.setWallPositioningSettings(isometricEditor.selectedSpriteName, updatedSharedSettings as any);
    } else {
      // PER-DIRECTION MODE: Update only current direction
      const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection);
      if (!currentSettings) return;
      
      const updatedDirectionalSettings = {
        ...currentSettings,
        [`invisibleMargin${marginType.charAt(0).toUpperCase() + marginType.slice(1)}`]: value
      };
      
      console.log(`[IsometricConfigurationPanel] Updating PER-DIRECTION wall ${marginType} margin for ${isometricEditor.selectedSpriteName} direction ${isometricEditor.wallSpriteDirection}: ${value}px`);
      battlemapActions.setWallDirectionalSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection, updatedDirectionalSettings as any);
    }
  };

  const handleWallManualVerticalBiasChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isWallMode) return;
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && isometricEditor.selectedSpriteName) {
      // Check if using shared settings or per-direction (SAME LOGIC AS BLOCKS)
      const useSharedSettings = isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName]?.useSharedSettings ?? true;
      
      if (useSharedSettings) {
        // SHARED MODE: Update shared settings (affects all directions)
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName);
        if (currentSettings) {
          const updatedSharedSettings = {
            ...currentSettings,
            manualVerticalBias: value,
            useAutoComputed: false // Switch to manual mode when user changes value
          };
          console.log(`[IsometricConfigurationPanel] Setting SHARED manual wall vertical bias for ${isometricEditor.selectedSpriteName}: ${value}px`);
          battlemapActions.setWallPositioningSettings(isometricEditor.selectedSpriteName, updatedSharedSettings);
        }
      } else {
        // PER-DIRECTION MODE: Update only current direction
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection);
        if (currentSettings) {
          const updatedDirectionalSettings = {
            ...currentSettings,
            manualVerticalBias: value,
            useAutoComputed: false // Switch to manual mode when user changes value
          };
          console.log(`[IsometricConfigurationPanel] Setting PER-DIRECTION manual wall vertical bias for ${isometricEditor.selectedSpriteName} direction ${isometricEditor.wallSpriteDirection}: ${value}px`);
          battlemapActions.setWallDirectionalSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection, updatedDirectionalSettings);
        }
      }
    }
  };

  const handleWallManualHorizontalOffsetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isWallMode) return;
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && isometricEditor.selectedSpriteName) {
      // Check if using shared settings or per-direction (SAME LOGIC AS BLOCKS)
      const useSharedSettings = isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName]?.useSharedSettings ?? true;
      
      if (useSharedSettings) {
        // SHARED MODE: Update shared settings (affects all directions)
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName);
        if (currentSettings) {
          const updatedSharedSettings = {
            ...currentSettings,
            manualHorizontalOffset: value
          };
          console.log(`[IsometricConfigurationPanel] Setting SHARED manual wall horizontal offset for ${isometricEditor.selectedSpriteName}: ${value}px`);
          battlemapActions.setWallPositioningSettings(isometricEditor.selectedSpriteName, updatedSharedSettings);
        }
      } else {
        // PER-DIRECTION MODE: Update only current direction
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection);
        if (currentSettings) {
          const updatedDirectionalSettings = {
            ...currentSettings,
            manualHorizontalOffset: value
          };
          console.log(`[IsometricConfigurationPanel] Setting PER-DIRECTION manual wall horizontal offset for ${isometricEditor.selectedSpriteName} direction ${isometricEditor.wallSpriteDirection}: ${value}px`);
          battlemapActions.setWallDirectionalSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection, updatedDirectionalSettings);
        }
      }
    }
  };

  const handleWallManualDiagonalNEOffsetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isWallMode) return;
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && isometricEditor.selectedSpriteName) {
      // Check if using shared settings or per-direction (SAME LOGIC AS BLOCKS)
      const useSharedSettings = isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName]?.useSharedSettings ?? true;
      
      if (useSharedSettings) {
        // SHARED MODE: Update shared settings (affects all directions)
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName);
        if (currentSettings) {
          const updatedSharedSettings = {
            ...currentSettings,
            manualDiagonalNorthEastOffset: value
          };
          console.log(`[IsometricConfigurationPanel] Setting SHARED manual wall NE diagonal offset for ${isometricEditor.selectedSpriteName}: ${value}px`);
          battlemapActions.setWallPositioningSettings(isometricEditor.selectedSpriteName, updatedSharedSettings);
        }
      } else {
        // PER-DIRECTION MODE: Update only current direction
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection);
        if (currentSettings) {
          const updatedDirectionalSettings = {
            ...currentSettings,
            manualDiagonalNorthEastOffset: value
          };
          console.log(`[IsometricConfigurationPanel] Setting PER-DIRECTION manual wall NE diagonal offset for ${isometricEditor.selectedSpriteName} direction ${isometricEditor.wallSpriteDirection}: ${value}px`);
          battlemapActions.setWallDirectionalSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection, updatedDirectionalSettings);
        }
      }
    }
  };

  const handleWallManualDiagonalNWOffsetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isWallMode) return;
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && isometricEditor.selectedSpriteName) {
      // Check if using shared settings or per-direction (SAME LOGIC AS BLOCKS)
      const useSharedSettings = isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName]?.useSharedSettings ?? true;
      
      if (useSharedSettings) {
        // SHARED MODE: Update shared settings (affects all directions)
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName);
        if (currentSettings) {
          const updatedSharedSettings = {
            ...currentSettings,
            manualDiagonalNorthWestOffset: value
          };
          console.log(`[IsometricConfigurationPanel] Setting SHARED manual wall NW diagonal offset for ${isometricEditor.selectedSpriteName}: ${value}px`);
          battlemapActions.setWallPositioningSettings(isometricEditor.selectedSpriteName, updatedSharedSettings);
        }
      } else {
        // PER-DIRECTION MODE: Update only current direction
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection);
        if (currentSettings) {
          const updatedDirectionalSettings = {
            ...currentSettings,
            manualDiagonalNorthWestOffset: value
          };
          console.log(`[IsometricConfigurationPanel] Setting PER-DIRECTION manual wall NW diagonal offset for ${isometricEditor.selectedSpriteName} direction ${isometricEditor.wallSpriteDirection}: ${value}px`);
          battlemapActions.setWallDirectionalSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection, updatedDirectionalSettings);
        }
      }
    }
  };

  const handleWallAutoModeToggle = (spriteName: string) => {
    if (!isWallMode) return;
    // Check if using shared settings or per-direction (SAME LOGIC AS BLOCKS)
    const useSharedSettings = isometricEditor.wallPositioningSettings[spriteName]?.useSharedSettings ?? true;
    
    if (useSharedSettings) {
      // SHARED MODE: Update shared settings (affects all directions)
      const currentSettings = battlemapActions.getWallPositioningSettings(spriteName);
      if (currentSettings) {
        const updatedSharedSettings = {
          ...currentSettings,
          useAutoComputed: !currentSettings.useAutoComputed
        };
        console.log(`[IsometricConfigurationPanel] Toggling SHARED wall auto mode for ${spriteName}: ${updatedSharedSettings.useAutoComputed ? 'AUTO' : 'MANUAL'}`);
        battlemapActions.setWallPositioningSettings(spriteName, updatedSharedSettings);
      }
    } else {
      // PER-DIRECTION MODE: Update only current direction
      const currentSettings = battlemapActions.getWallPositioningSettings(spriteName, isometricEditor.wallSpriteDirection);
      if (currentSettings) {
        const updatedDirectionalSettings = {
          ...currentSettings,
          useAutoComputed: !currentSettings.useAutoComputed
        };
        console.log(`[IsometricConfigurationPanel] Toggling PER-DIRECTION wall auto mode for ${spriteName} direction ${isometricEditor.wallSpriteDirection}: ${updatedDirectionalSettings.useAutoComputed ? 'AUTO' : 'MANUAL'}`);
        battlemapActions.setWallDirectionalSettings(spriteName, isometricEditor.wallSpriteDirection, updatedDirectionalSettings);
      }
    }
  };

  const handleWallRecalculate = (spriteName: string) => {
    if (!isWallMode) return;
    const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
    if (spriteFrameSize) {
      // Use wall calculation function (now returns simple manual defaults)
      const calculated = battlemapActions.calculateWallPositioning(
        spriteFrameSize.width, 
        spriteFrameSize.height
      );
      
      // Check if using shared settings or per-direction (SAME LOGIC AS BLOCKS)
      const useSharedSettings = isometricEditor.wallPositioningSettings[spriteName]?.useSharedSettings ?? true;
      
      if (useSharedSettings) {
        // SHARED MODE: Update shared settings (affects all directions)
        console.log(`[IsometricConfigurationPanel] Reset SHARED wall positioning to manual defaults for ${spriteName}:`, calculated);
        battlemapActions.setWallPositioningSettings(spriteName, calculated);
      } else {
        // PER-DIRECTION MODE: Update only current direction
        console.log(`[IsometricConfigurationPanel] Reset PER-DIRECTION wall positioning for ${spriteName} direction ${isometricEditor.wallSpriteDirection}:`, calculated);
        battlemapActions.setWallDirectionalSettings(spriteName, isometricEditor.wallSpriteDirection, calculated as any);
      }
    }
  };

  // UNCHANGED: Block-specific handlers (completely separate from wall handlers)
  const handleManualVerticalBiasChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (isWallMode) return; // Don't interfere with wall mode
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

  // UNCHANGED: Toggle between auto-computed and manual mode (blocks only)
  const handleToggleAutoMode = (spriteName: string) => {
    if (isWallMode) return; // Don't interfere with wall mode
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

  // UNCHANGED: Recalculate auto-computed values (blocks only)
  const handleRecalculate = (spriteName: string) => {
    if (isWallMode) return; // Don't interfere with wall mode
    const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
    if (spriteFrameSize) {
      // Use the store's calculation function which includes current rounding method
      const calculated = battlemapActions.calculateSpriteTypePositioning(spriteFrameSize.width, spriteFrameSize.height);
      battlemapActions.setSpriteTypeSettings(spriteName, calculated);
      console.log(`[IsometricConfigurationPanel] Recalculated ${spriteName} with current rounding method:`, calculated);
    }
  };

  // UNCHANGED: Handle margin changes (blocks only)
  const handleMarginChange = (marginType: 'up' | 'down' | 'left' | 'right', value: number) => {
    if (isWallMode || !isometricEditor.selectedSpriteName) return; // Don't interfere with wall mode
    
    // Check if using shared settings or per-direction (FIXED: Use direct store access)
    const useSharedSettings = isometricEditor.spriteTypeSettings[isometricEditor.selectedSpriteName]?.useSharedSettings ?? true;
    
    if (useSharedSettings) {
      // SHARED MODE: Update shared settings (affects all directions)
    const currentSettings = battlemapActions.getSpriteTypeSettings(isometricEditor.selectedSpriteName);
    if (!currentSettings) return;
    
      const updatedSharedSettings = {
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
        
          updatedSharedSettings.autoComputedVerticalBias = recalculated.autoComputedVerticalBias;
        console.log(`[IsometricConfigurationPanel] Recalculated auto bias for ${isometricEditor.selectedSpriteName}: ${recalculated.autoComputedVerticalBias}px (${verticalBiasComputationMode})`);
      }
    }
    
      console.log(`[IsometricConfigurationPanel] Updating SHARED ${marginType} margin for ${isometricEditor.selectedSpriteName}: ${value}px`);
      battlemapActions.setSpriteTypeSettings(isometricEditor.selectedSpriteName, updatedSharedSettings as any);
    } else {
      // PER-DIRECTION MODE: Update only the current sprite direction
      const currentDirection = isometricEditor.selectedSpriteDirection;
      const currentSettings = battlemapActions.getSpriteTypeSettings(isometricEditor.selectedSpriteName, currentDirection);
      if (!currentSettings) return;
      
      const updatedDirectionalSettings = {
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
          
          updatedDirectionalSettings.autoComputedVerticalBias = recalculated.autoComputedVerticalBias;
          console.log(`[IsometricConfigurationPanel] Recalculated auto bias for ${isometricEditor.selectedSpriteName} direction ${currentDirection}: ${recalculated.autoComputedVerticalBias}px (${verticalBiasComputationMode})`);
        }
      }
      
      console.log(`[IsometricConfigurationPanel] Updating DIRECTION-SPECIFIC ${marginType} margin for ${isometricEditor.selectedSpriteName} direction ${currentDirection}: ${value}px`);
      battlemapActions.setSpriteDirectionalSettings(isometricEditor.selectedSpriteName, currentDirection, updatedDirectionalSettings);
    }
  };

  // NEW: Wall-relative offset handlers
  const handleWallRelativeAlongEdgeOffsetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isWallMode) return;
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && isometricEditor.selectedSpriteName) {
      // Check if using shared settings or per-direction (SAME LOGIC AS BLOCKS)
      const useSharedSettings = isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName]?.useSharedSettings ?? true;
      
      if (useSharedSettings) {
        // SHARED MODE: Update shared settings (affects all directions)
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName);
        if (currentSettings) {
          const updatedSharedSettings = {
            ...currentSettings,
            relativeAlongEdgeOffset: value
          };
          console.log(`[IsometricConfigurationPanel] Setting SHARED wall relative along-edge offset for ${isometricEditor.selectedSpriteName}: ${value}px`);
          battlemapActions.setWallPositioningSettings(isometricEditor.selectedSpriteName, updatedSharedSettings);
        }
      } else {
        // PER-DIRECTION MODE: Update only current direction
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection);
        if (currentSettings) {
          const updatedDirectionalSettings = {
            ...currentSettings,
            relativeAlongEdgeOffset: value
          };
          console.log(`[IsometricConfigurationPanel] Setting PER-DIRECTION wall relative along-edge offset for ${isometricEditor.selectedSpriteName} direction ${isometricEditor.wallSpriteDirection}: ${value}px`);
          battlemapActions.setWallDirectionalSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection, updatedDirectionalSettings);
        }
      }
    }
  };

  const handleWallRelativeTowardCenterOffsetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isWallMode) return;
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && isometricEditor.selectedSpriteName) {
      // Check if using shared settings or per-direction (SAME LOGIC AS BLOCKS)
      const useSharedSettings = isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName]?.useSharedSettings ?? true;
      
      if (useSharedSettings) {
        // SHARED MODE: Update shared settings (affects all directions)
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName);
        if (currentSettings) {
          const updatedSharedSettings = {
            ...currentSettings,
            relativeTowardCenterOffset: value
          };
          console.log(`[IsometricConfigurationPanel] Setting SHARED wall relative toward-center offset for ${isometricEditor.selectedSpriteName}: ${value}px`);
          battlemapActions.setWallPositioningSettings(isometricEditor.selectedSpriteName, updatedSharedSettings);
        }
      } else {
        // PER-DIRECTION MODE: Update only current direction
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection);
        if (currentSettings) {
          const updatedDirectionalSettings = {
            ...currentSettings,
            relativeTowardCenterOffset: value
          };
          console.log(`[IsometricConfigurationPanel] Setting PER-DIRECTION wall relative toward-center offset for ${isometricEditor.selectedSpriteName} direction ${isometricEditor.wallSpriteDirection}: ${value}px`);
          battlemapActions.setWallDirectionalSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection, updatedDirectionalSettings);
        }
      }
    }
  };

  const handleWallRelativeDiagonalAOffsetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isWallMode) return;
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && isometricEditor.selectedSpriteName) {
      // Check if using shared settings or per-direction (SAME LOGIC AS BLOCKS)
      const useSharedSettings = isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName]?.useSharedSettings ?? true;
      
      if (useSharedSettings) {
        // SHARED MODE: Update shared settings (affects all directions)
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName);
        if (currentSettings) {
          const updatedSharedSettings = {
            ...currentSettings,
            relativeDiagonalAOffset: value
          };
          console.log(`[IsometricConfigurationPanel] Setting SHARED wall relative diagonal A offset for ${isometricEditor.selectedSpriteName}: ${value}px`);
          battlemapActions.setWallPositioningSettings(isometricEditor.selectedSpriteName, updatedSharedSettings);
        }
      } else {
        // PER-DIRECTION MODE: Update only current direction
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection);
        if (currentSettings) {
          const updatedDirectionalSettings = {
            ...currentSettings,
            relativeDiagonalAOffset: value
          };
          console.log(`[IsometricConfigurationPanel] Setting PER-DIRECTION wall relative diagonal A offset for ${isometricEditor.selectedSpriteName} direction ${isometricEditor.wallSpriteDirection}: ${value}px`);
          battlemapActions.setWallDirectionalSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection, updatedDirectionalSettings);
        }
      }
    }
  };

  const handleWallRelativeDiagonalBOffsetChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isWallMode) return;
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && isometricEditor.selectedSpriteName) {
      // Check if using shared settings or per-direction (SAME LOGIC AS BLOCKS)
      const useSharedSettings = isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName]?.useSharedSettings ?? true;
      
      if (useSharedSettings) {
        // SHARED MODE: Update shared settings (affects all directions)
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName);
        if (currentSettings) {
          const updatedSharedSettings = {
            ...currentSettings,
            relativeDiagonalBOffset: value
          };
          console.log(`[IsometricConfigurationPanel] Setting SHARED wall relative diagonal B offset for ${isometricEditor.selectedSpriteName}: ${value}px`);
          battlemapActions.setWallPositioningSettings(isometricEditor.selectedSpriteName, updatedSharedSettings);
        }
      } else {
        // PER-DIRECTION MODE: Update only current direction
        const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection);
        if (currentSettings) {
          const updatedDirectionalSettings = {
            ...currentSettings,
            relativeDiagonalBOffset: value
          };
          console.log(`[IsometricConfigurationPanel] Setting PER-DIRECTION wall relative diagonal B offset for ${isometricEditor.selectedSpriteName} direction ${isometricEditor.wallSpriteDirection}: ${value}px`);
          battlemapActions.setWallDirectionalSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection, updatedDirectionalSettings);
        }
      }
    }
  };

  // NEW: Handle A division flag toggle
  const handleWallADivisionToggle = () => {
    if (!isWallMode) return;
    if (!isometricEditor.selectedSpriteName) return;
    
    // Check if using shared settings or per-direction (SAME LOGIC AS BLOCKS)
    const useSharedSettings = isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName]?.useSharedSettings ?? true;
    
    if (useSharedSettings) {
      // SHARED MODE: Update shared settings (affects all directions)
      const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName);
      if (currentSettings) {
        const updatedSharedSettings = {
          ...currentSettings,
          useADivisionForNorthEast: !currentSettings.useADivisionForNorthEast
        };
        console.log(`[IsometricConfigurationPanel] Toggling SHARED wall A division for ${isometricEditor.selectedSpriteName}: ${updatedSharedSettings.useADivisionForNorthEast ? 'ENABLED' : 'DISABLED'}`);
        battlemapActions.setWallPositioningSettings(isometricEditor.selectedSpriteName, updatedSharedSettings);
      }
    } else {
      // PER-DIRECTION MODE: Update only current direction
      const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection);
      if (currentSettings) {
        const updatedDirectionalSettings = {
          ...currentSettings,
          useADivisionForNorthEast: !currentSettings.useADivisionForNorthEast
        };
        console.log(`[IsometricConfigurationPanel] Toggling PER-DIRECTION wall A division for ${isometricEditor.selectedSpriteName} direction ${isometricEditor.wallSpriteDirection}: ${updatedDirectionalSettings.useADivisionForNorthEast ? 'ENABLED' : 'DISABLED'}`);
        battlemapActions.setWallDirectionalSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection, updatedDirectionalSettings);
      }
    }
  };

  // NEW: Sprite Trimming Toggle Control
  const handleWallSpriteTrimmingToggle = () => {
    if (!isWallMode) return;
    if (!isometricEditor.selectedSpriteName) return;
    
    // Check if using shared settings or per-direction (SAME LOGIC AS BLOCKS)
    const useSharedSettings = isometricEditor.wallPositioningSettings[isometricEditor.selectedSpriteName]?.useSharedSettings ?? true;
    
    if (useSharedSettings) {
      // SHARED MODE: Update shared settings (affects all directions)
      const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName);
      if (currentSettings) {
        const newEnabled = !currentSettings.useSpriteTrimmingForWalls;
        
        const updatedSharedSettings = {
          ...currentSettings,
          useSpriteTrimmingForWalls: newEnabled
        };
        
        console.log(`[IsometricConfigurationPanel] Toggling SHARED wall sprite trimming for ${isometricEditor.selectedSpriteName}: ${newEnabled ? 'ON' : 'OFF'}`);
        battlemapActions.setWallPositioningSettings(isometricEditor.selectedSpriteName, updatedSharedSettings);
      }
    } else {
      // PER-DIRECTION MODE: Update only current direction
      const currentSettings = battlemapActions.getWallPositioningSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection);
      if (currentSettings) {
        const newEnabled = !currentSettings.useSpriteTrimmingForWalls;
        
        const updatedDirectionalSettings = {
          ...currentSettings,
          useSpriteTrimmingForWalls: newEnabled
        };
        
        console.log(`[IsometricConfigurationPanel] Toggling PER-DIRECTION wall sprite trimming for ${isometricEditor.selectedSpriteName} direction ${isometricEditor.wallSpriteDirection}: ${newEnabled ? 'ON' : 'OFF'}`);
        battlemapActions.setWallDirectionalSettings(isometricEditor.selectedSpriteName, isometricEditor.wallSpriteDirection, updatedDirectionalSettings);
      }
    }
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

      {/* NEW: Mode Toggle with Visual Distinction */}
      <Box sx={{ mb: 2, p: 1, border: '2px solid #2196F3', borderRadius: 1, backgroundColor: 'rgba(33,150,243,0.1)' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="subtitle2" sx={{ color: '#2196F3', fontWeight: 'bold' }}>
            {isWallMode ? '🧱 Wall Mode' : '🧊 Block Mode'}
          </Typography>
          <Button
            variant="outlined"
            onClick={handleWallModeToggle}
            disabled={isLocked}
            size="small"
            sx={{
              borderColor: '#2196F3',
              color: '#2196F3',
              '&:hover': { borderColor: '#1976D2', color: '#1976D2' }
            }}
          >
            Switch to {isWallMode ? 'Block' : 'Wall'} Mode
          </Button>
        </Box>
        
        <Typography variant="caption" sx={{ color: 'rgba(33,150,243,0.8)', fontSize: '0.65rem' }}>
          {isWallMode 
            ? '🧱 Editing wall sprites that anchor to grid edges (N/E/S/W borders)'
            : '🧊 Editing block sprites that anchor to grid cell centers'
          }
        </Typography>
      </Box>

      {/* NEW: Configuration Management */}
      {isometricEditor.selectedSpriteName && (
        <Box sx={{ mb: 2, p: 1, border: '2px solid #4CAF50', borderRadius: 1, backgroundColor: 'rgba(76,175,80,0.1)' }}>
          <Typography variant="subtitle2" sx={{ color: '#4CAF50', fontWeight: 'bold', mb: 1 }}>
            💾 Configuration Management
          </Typography>
          
          {/* Config Status */}
          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Chip
                label={configStatus.loaded ? 'Config Loaded' : 'No Config'}
                color={configStatus.loaded ? 'success' : 'default'}
                size="small"
                sx={{ fontSize: '0.65rem' }}
              />
              <Chip
                label={actualSharedSettings ? 'Shared Settings' : 'Per-Direction'}
                color={actualSharedSettings ? 'primary' : 'secondary'}
                size="small"
                sx={{ fontSize: '0.65rem' }}
              />
            </Box>
            
            {configStatus.lastSaved && (
              <Typography variant="caption" sx={{ color: '#4CAF50', fontSize: '0.6rem' }}>
                Last saved: {new Date(configStatus.lastSaved).toLocaleString()}
              </Typography>
            )}
            
            {configStatus.error && (
              <Alert severity="error" sx={{ mt: 0.5, py: 0 }}>
                <Typography variant="caption" sx={{ fontSize: '0.65rem' }}>
                  {configStatus.error}
                </Typography>
              </Alert>
            )}
          </Box>

          {/* Shared/Per-Direction Toggle */}
          <Box sx={{ mb: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={actualSharedSettings}
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
                  <Typography variant="body2" sx={{ color: actualSharedSettings ? '#4CAF50' : 'white', fontSize: '0.75rem' }}>
                    {actualSharedSettings ? '🔗 Shared Settings' : '🎯 Per-Direction Settings'}
                  </Typography>
                </Box>
              }
            />
            <Typography variant="caption" sx={{ 
              color: 'rgba(76,175,80,0.7)', 
              fontSize: '0.6rem',
              display: 'block'
            }}>
              {actualSharedSettings 
                ? 'Same settings for all directions (N/E/S/W)' 
                : 'Different settings for each direction (for complex sprites)'
              }
            </Typography>
          </Box>

          {/* Config Actions */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              onClick={handleSyncFromConfig}
              disabled={isLocked || !configStatus.loaded}
              size="small"
              sx={{
                flex: 1,
                fontSize: '0.65rem',
                borderColor: '#2196F3',
                color: '#2196F3',
                '&:hover': { borderColor: '#1976D2', color: '#1976D2' }
              }}
            >
              📂 Load from File
            </Button>
            
            <Button
              variant="outlined"
              onClick={handleSaveToConfig}
              disabled={isLocked}
              size="small"
              sx={{
                flex: 1,
                fontSize: '0.65rem',
                borderColor: '#4CAF50',
                color: '#4CAF50',
                '&:hover': { borderColor: '#388E3C', color: '#388E3C' }
              }}
            >
              💾 Save to File
            </Button>
          </Box>
          
          <Typography variant="caption" sx={{ 
            color: 'rgba(76,175,80,0.7)', 
            fontSize: '0.6rem',
            display: 'block',
            mt: 0.5
          }}>
            💡 Files saved to: /public/isometric_tiles/configs/{isWallMode ? 'walls' : 'blocks'}/{isometricEditor.selectedSpriteName}.json
          </Typography>
        </Box>
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

        <Button
          variant="outlined"
          onClick={() => battlemapActions.clearAllWalls()}
          disabled={isLocked}
          color="error"
          size="small"
          sx={{ justifyContent: 'flex-start' }}
        >
          🧱 Clear All Walls
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

      {/* NEW: Ratio Lock Toggle */}
      <Box sx={{ mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={viewSnap.isRatioLocked}
              onChange={() => battlemapActions.toggleRatioLock()}
              disabled={isLocked}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#2196F3' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#2196F3' }
              }}
            />
          }
          label={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: viewSnap.isRatioLocked ? '#2196F3' : 'white' }}>
                {viewSnap.isRatioLocked ? '🔒 Ratio Locked' : '🔓 Ratio Free'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#2196F3', fontSize: '0.65rem' }}>
                {viewSnap.isRatioLocked ? 'Grid & Sprite move together' : 'Grid & Sprite independent'}
              </Typography>
            </Box>
          }
        />
      </Box>

      {/* NEW: Z-Layer Heights */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ mb: 1, color: '#9C27B0' }}>
          🏔️ Z-Layer Heights:
        </Typography>
        
        {viewSnap.zLayerHeights.map((layer, index) => (
          <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <Typography variant="body2" sx={{ 
              minWidth: '60px', 
              color: `#${layer.color.toString(16).padStart(6, '0')}`,
              fontSize: '0.8rem'
            }}>
              {layer.name}:
            </Typography>
            <TextField
              type="number"
              value={layer.verticalOffset}
              onChange={(e) => {
                const value = parseInt(e.target.value) || 0;
                battlemapActions.setZLayerHeight(index, value);
              }}
              onFocus={() => console.log(`[IsometricConfigurationPanel] Z-layer ${index} height input focused`)}
              onBlur={() => console.log(`[IsometricConfigurationPanel] Z-layer ${index} height input blurred`)}
              disabled={isLocked}
              size="small"
              sx={{ 
                width: '80px',
                '& .MuiInputBase-input': { color: 'white', fontSize: '0.7rem', padding: '4px 6px' },
                '& .MuiOutlinedInput-root': { 
                  '& fieldset': { borderColor: `#${layer.color.toString(16).padStart(6, '0')}` },
                  '&:hover fieldset': { borderColor: `#${layer.color.toString(16).padStart(6, '0')}` }
                }
              }}
              inputProps={{ min: 0, max: 500, step: 1 }}
            />
            <Typography variant="caption" sx={{ color: `#${layer.color.toString(16).padStart(6, '0')}` }}>px</Typography>
            
            {viewSnap.isRatioLocked && (
              <Typography variant="caption" sx={{ color: '#2196F3', fontSize: '0.6rem' }}>
                🔒
              </Typography>
            )}
          </Box>
        ))}
        
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button
            variant="outlined"
            onClick={() => battlemapActions.resetZLayerHeights()}
            disabled={isLocked}
            size="small"
            sx={{
              fontSize: '0.6rem',
              padding: '2px 8px',
              borderColor: '#9C27B0',
              color: '#9C27B0',
              '&:hover': { borderColor: '#7B1FA2', color: '#7B1FA2' }
            }}
          >
            🔄 Reset to Defaults
          </Button>
          
          <Button
            variant="outlined"
            onClick={() => battlemapActions.setBaseValues()}
            disabled={isLocked}
            size="small"
            sx={{
              fontSize: '0.6rem',
              padding: '2px 8px',
              borderColor: '#2196F3',
              color: '#2196F3',
              '&:hover': { borderColor: '#1976D2', color: '#1976D2' }
            }}
          >
            📌 Set as Base
          </Button>
        </Box>
        
        <Typography variant="caption" sx={{ 
          color: '#9C27B0', 
          fontSize: '0.6rem', 
          display: 'block', 
          mt: 0.5 
        }}>
          {viewSnap.isRatioLocked 
            ? '🔒 Heights scale with Grid/Sprite when ratio locked'
            : '💡 Individual layer vertical offsets (independent scaling)'
          }
        </Typography>
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

      {/* Per-Sprite Settings - BLOCKS ONLY */}
      {!isWallMode && isometricEditor.selectedSpriteName && (
        <>
          <Typography variant="subtitle2" gutterBottom sx={{ color: '#4CAF50' }}>
            🖼️ {isometricEditor.selectedSpriteName.replace(/_/g, ' ')} Block Settings
          </Typography>

          {/* Direction Indicator for Per-Direction Mode */}
          {!actualSharedSettings && (
            <Box sx={{ mb: 2, p: 1, backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: 1, border: '1px solid #FFC107' }}>
              <Typography variant="body2" sx={{ color: '#FFC107', fontSize: '0.75rem', fontWeight: 'bold' }}>
                🎯 Currently Configuring Direction: 
              </Typography>
              <Typography variant="body2" sx={{ color: '#FFC107', fontSize: '0.8rem', mt: 0.5 }}>
                {isometricEditor.selectedSpriteDirection === 0 && '🔼 NORTH (0)'}
                {isometricEditor.selectedSpriteDirection === 1 && '▶️ EAST (1)'}
                {isometricEditor.selectedSpriteDirection === 2 && '🔽 SOUTH (2)'}
                {isometricEditor.selectedSpriteDirection === 3 && '◀️ WEST (3)'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#FFC107', fontSize: '0.65rem', fontStyle: 'italic', display: 'block', mt: 0.5 }}>
                💡 Use Z/X keys to rotate and see different direction settings
              </Typography>
            </Box>
          )}

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
              📋 No block settings configured yet. Settings will be auto-calculated when you place a tile.
            </Typography>
          )}
        </>
      )}

      {/* Per-Sprite Settings - WALLS ONLY */}
      {isWallMode && isometricEditor.selectedSpriteName && (
        <>
          <Typography variant="subtitle2" gutterBottom sx={{ color: '#E91E63' }}>
            🧱 {isometricEditor.selectedSpriteName.replace(/_/g, ' ')} Wall Settings
          </Typography>

          {/* Wall Direction Controls */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" sx={{ mb: 1, color: '#FF9800' }}>
              🧭 Wall Placement Direction:
            </Typography>
            <ToggleButtonGroup
              value={isometricEditor.wallPlacementDirection}
              exclusive
              onChange={(_, value) => value !== null && battlemapActions.setWallPlacementDirection(value)}
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

          {currentWallSettings && (
            <>
              {/* Wall Auto/Manual Mode Toggle */}
              <Box sx={{ mb: 2 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={currentWallSettings.useAutoComputed}
                      onChange={() => handleWallAutoModeToggle(isometricEditor.selectedSpriteName!)}
                      disabled={true} // DISABLED: Auto calculation removed for walls
                      sx={{
                        '& .MuiSwitch-switchBase.Mui-checked': { color: '#E91E63' },
                        '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#E91E63' }
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                        ✋ Manual Mode Only
                      </Typography>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleWallRecalculate(isometricEditor.selectedSpriteName!)}
                        disabled={isLocked}
                        sx={{
                          minWidth: 'auto',
                          padding: '2px 6px',
                          fontSize: '0.6rem',
                          borderColor: '#E91E63',
                          color: '#E91E63',
                          '&:hover': { borderColor: '#C2185B', color: '#C2185B' }
                        }}
                      >
                        🔄 Reset to 0
                      </Button>
                    </Box>
                  }
                  sx={{ mb: 1 }}
                />
                <Typography variant="caption" sx={{ 
                  color: '#FF9800', 
                  fontSize: '0.65rem',
                  display: 'block',
                  fontStyle: 'italic'
                }}>
                  💡 Auto calculation disabled for walls - manual positioning only
                </Typography>
              </Box>

              {/* Wall Vertical Bias Settings */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#FF5722' }}>
                  📏 Vertical Positioning:
                </Typography>
                
                {/* Manual positioning */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: '60px', color: '#FF5722' }}>Offset:</Typography>
                  <TextField
                    type="number"
                    value={currentWallSettings.manualVerticalBias}
                    onChange={handleWallManualVerticalBiasChange}
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
                        '& fieldset': { borderColor: '#FF5722' },
                        '&:hover fieldset': { borderColor: '#D84315' }
                      }
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#FF5722' }}>px</Typography>
                </Box>

                {/* Active value display */}
                <Typography variant="caption" sx={{ 
                  color: '#E91E63', 
                  fontSize: '0.65rem',
                  fontWeight: 'bold'
                }}>
                  ✅ Active: {currentWallSettings.manualVerticalBias}px (manual)
                </Typography>
              </Box>

              {/* NEW: Wall Horizontal Offset Settings */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#9C27B0' }}>
                  📐 Horizontal Positioning:
                </Typography>
                
                {/* Manual horizontal offset */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: '60px', color: '#9C27B0' }}>X Offset:</Typography>
                  <TextField
                    type="number"
                    value={currentWallSettings.manualHorizontalOffset}
                    onChange={handleWallManualHorizontalOffsetChange}
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
                        '& fieldset': { borderColor: '#9C27B0' },
                        '&:hover fieldset': { borderColor: '#7B1FA2' }
                      }
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#9C27B0' }}>px</Typography>
                </Box>

                {/* Active value display */}
                <Typography variant="caption" sx={{ 
                  color: '#9C27B0', 
                  fontSize: '0.65rem',
                  fontWeight: 'bold'
                }}>
                  ✅ Active: {currentWallSettings.manualHorizontalOffset}px (manual)
                </Typography>
              </Box>

              {/* NEW: Wall Diagonal NE Offset Settings */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#FF9800' }}>
                  ↗️ Northeast Diagonal Axis:
                </Typography>
                
                {/* Manual diagonal NE offset */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: '60px', color: '#FF9800' }}>NE Offset:</Typography>
                  <TextField
                    type="number"
                    value={currentWallSettings.manualDiagonalNorthEastOffset}
                    onChange={handleWallManualDiagonalNEOffsetChange}
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
                        '& fieldset': { borderColor: '#FF9800' },
                        '&:hover fieldset': { borderColor: '#F57C00' }
                      }
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#FF9800' }}>px</Typography>
                </Box>

                {/* Active value display */}
                <Typography variant="caption" sx={{ 
                  color: '#FF9800', 
                  fontSize: '0.65rem',
                  fontWeight: 'bold'
                }}>
                  ✅ Active: {currentWallSettings.manualDiagonalNorthEastOffset}px
                </Typography>
                <Typography variant="caption" sx={{ 
                  color: 'rgba(255,152,0,0.7)', 
                  fontSize: '0.6rem',
                  display: 'block'
                }}>
                  💡 + moves toward northeast ↗️, - toward southwest ↙️
                </Typography>
              </Box>

              {/* NEW: Wall Diagonal NW Offset Settings */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1, color: '#FF9800' }}>
                  ↖️ Northwest Diagonal Axis:
                </Typography>
                
                {/* Manual diagonal NW offset */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" sx={{ minWidth: '60px', color: '#FF9800' }}>NW Offset:</Typography>
                  <TextField
                    type="number"
                    value={currentWallSettings.manualDiagonalNorthWestOffset}
                    onChange={handleWallManualDiagonalNWOffsetChange}
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
                        '& fieldset': { borderColor: '#FF9800' },
                        '&:hover fieldset': { borderColor: '#F57C00' }
                      }
                    }}
                  />
                  <Typography variant="caption" sx={{ color: '#FF9800' }}>px</Typography>
                </Box>

                {/* Active value display */}
                <Typography variant="caption" sx={{ 
                  color: '#FF9800', 
                  fontSize: '0.65rem',
                  fontWeight: 'bold'
                }}>
                  ✅ Active: {currentWallSettings.manualDiagonalNorthWestOffset}px
                </Typography>
                <Typography variant="caption" sx={{ 
                  color: 'rgba(255,152,0,0.7)', 
                  fontSize: '0.6rem',
                  display: 'block'
                }}>
                  💡 + moves toward northwest ↖️, - toward southeast ↘️
                </Typography>
              </Box>

              {/* Visual Guide for All Offsets */}
              <Box sx={{ mb: 2, p: 1, border: '1px solid rgba(255,152,0,0.3)', borderRadius: 1, backgroundColor: 'rgba(255,152,0,0.05)' }}>
                <Typography variant="caption" sx={{ 
                  color: '#FF9800', 
                  fontSize: '0.65rem',
                  fontWeight: 'bold',
                  display: 'block',
                  mb: 0.5
                }}>
                  🎯 Offset Direction Guide:
                </Typography>
                <Typography variant="caption" sx={{ 
                  color: 'rgba(255,152,0,0.8)', 
                  fontSize: '0.6rem',
                  display: 'block',
                  fontFamily: 'monospace',
                  lineHeight: 1.2
                }}>
                  {`Vertical: ⬆️ + up, ⬇️ - down
Horizontal: ➡️ + right, ⬅️ - left  
NE Diagonal: ↗️ + northeast, ↙️ - southwest
NW Diagonal: ↖️ + northwest, ↘️ - southeast`}
                </Typography>
              </Box>

              {/* NEW: Wall-Relative Positioning Section */}
              <Box sx={{ mb: 2, p: 1, border: '2px solid #4CAF50', borderRadius: 1, backgroundColor: 'rgba(76,175,80,0.05)' }}>
                <Typography variant="subtitle2" sx={{ 
                  color: '#4CAF50', 
                  fontSize: '0.8rem',
                  fontWeight: 'bold',
                  display: 'block',
                  mb: 1
                }}>
                  🎯 NEW: Wall-Relative Positioning
                </Typography>
                <Typography variant="caption" sx={{ 
                  color: 'rgba(76,175,80,0.8)', 
                  fontSize: '0.65rem',
                  display: 'block',
                  mb: 1
                }}>
                  These offsets are relative to the wall's edge direction. Same values work for all walls!
                </Typography>

                {/* Along Edge Offset */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5, color: '#4CAF50', fontSize: '0.75rem' }}>
                    ↔️ Along Edge:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" sx={{ minWidth: '50px', color: '#4CAF50', fontSize: '0.7rem' }}>Edge:</Typography>
                    <TextField
                      type="number"
                      value={currentWallSettings.relativeAlongEdgeOffset}
                      onChange={handleWallRelativeAlongEdgeOffsetChange}
                      disabled={isLocked}
                      size="small"
                      sx={{ 
                        width: '70px',
                        '& .MuiInputBase-input': { 
                          color: 'white', 
                          fontSize: '0.7rem', 
                          padding: '3px 6px' 
                        },
                        '& .MuiOutlinedInput-root': { 
                          '& fieldset': { borderColor: '#4CAF50' },
                          '&:hover fieldset': { borderColor: '#45a049' }
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#4CAF50', fontSize: '0.65rem' }}>px</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ 
                    color: 'rgba(76,175,80,0.7)', 
                    fontSize: '0.55rem',
                    display: 'block'
                  }}>
                    + moves right along edge, - moves left along edge
                  </Typography>
                </Box>

                {/* Toward Center Offset */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5, color: '#4CAF50', fontSize: '0.75rem' }}>
                    ⬌ Toward/Away Center:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" sx={{ minWidth: '50px', color: '#4CAF50', fontSize: '0.7rem' }}>Center:</Typography>
                    <TextField
                      type="number"
                      value={currentWallSettings.relativeTowardCenterOffset}
                      onChange={handleWallRelativeTowardCenterOffsetChange}
                      disabled={isLocked}
                      size="small"
                      sx={{ 
                        width: '70px',
                        '& .MuiInputBase-input': { 
                          color: 'white', 
                          fontSize: '0.7rem', 
                          padding: '3px 6px' 
                        },
                        '& .MuiOutlinedInput-root': { 
                          '& fieldset': { borderColor: '#4CAF50' },
                          '&:hover fieldset': { borderColor: '#45a049' }
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#4CAF50', fontSize: '0.65rem' }}>px</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ 
                    color: 'rgba(76,175,80,0.7)', 
                    fontSize: '0.55rem',
                    display: 'block'
                  }}>
                    + moves toward diamond center, - moves away from center
                  </Typography>
                </Box>

                {/* Diagonal A Offset */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5, color: '#4CAF50', fontSize: '0.75rem' }}>
                    🎯 Diagonal A (NORMALIZED):
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" sx={{ minWidth: '50px', color: '#4CAF50', fontSize: '0.7rem' }}>Diag A:</Typography>
                    <TextField
                      type="number"
                      value={currentWallSettings.relativeDiagonalAOffset}
                      onChange={handleWallRelativeDiagonalAOffsetChange}
                      disabled={isLocked}
                      size="small"
                      sx={{ 
                        width: '70px',
                        '& .MuiInputBase-input': { 
                          color: 'white', 
                          fontSize: '0.7rem', 
                          padding: '3px 6px' 
                        },
                        '& .MuiOutlinedInput-root': { 
                          '& fieldset': { borderColor: '#4CAF50' },
                          '&:hover fieldset': { borderColor: '#45a049' }
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#4CAF50', fontSize: '0.65rem' }}>px</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ 
                    color: 'rgba(76,175,80,0.7)', 
                    fontSize: '0.55rem',
                    display: 'block'
                  }}>
                    Use positive values (e.g., 8) - auto-normalized per wall direction
                  </Typography>
                </Box>

                {/* Diagonal B Offset */}
                <Box sx={{ mb: 1 }}>
                  <Typography variant="body2" sx={{ mb: 0.5, color: '#4CAF50', fontSize: '0.75rem' }}>
                    🎯 Diagonal B (NORMALIZED):
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                    <Typography variant="body2" sx={{ minWidth: '50px', color: '#4CAF50', fontSize: '0.7rem' }}>Diag B:</Typography>
                    <TextField
                      type="number"
                      value={currentWallSettings.relativeDiagonalBOffset}
                      onChange={handleWallRelativeDiagonalBOffsetChange}
                      disabled={isLocked}
                      size="small"
                      sx={{ 
                        width: '70px',
                        '& .MuiInputBase-input': { 
                          color: 'white', 
                          fontSize: '0.7rem', 
                          padding: '3px 6px' 
                        },
                        '& .MuiOutlinedInput-root': { 
                          '& fieldset': { borderColor: '#4CAF50' },
                          '&:hover fieldset': { borderColor: '#45a049' }
                        }
                      }}
                    />
                    <Typography variant="caption" sx={{ color: '#4CAF50', fontSize: '0.65rem' }}>px</Typography>
                  </Box>
                  <Typography variant="caption" sx={{ 
                    color: 'rgba(76,175,80,0.7)', 
                    fontSize: '0.55rem',
                    display: 'block'
                  }}>
                    Use positive values (e.g., 3) - auto-normalized per wall direction
                  </Typography>
                </Box>

                {/* Current Wall Direction Display */}
                <Typography variant="caption" sx={{ 
                  color: '#4CAF50', 
                  fontSize: '0.6rem',
                  fontWeight: 'bold',
                  display: 'block',
                  mt: 1,
                  p: 0.5,
                  backgroundColor: 'rgba(76,175,80,0.1)',
                  borderRadius: 0.5
                }}>
                  🧭 Current Wall: {['North', 'East', 'South', 'West'][isometricEditor.wallPlacementDirection]} Edge
                </Typography>

                {/* NEW: A Division Toggle Control */}
                <Box sx={{ mt: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={currentWallSettings.useADivisionForNorthEast}
                        onChange={handleWallADivisionToggle}
                        disabled={isLocked}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: '#4CAF50' },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#4CAF50' }
                        }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: currentWallSettings.useADivisionForNorthEast ? '#4CAF50' : 'white', fontSize: '0.7rem' }}>
                          {currentWallSettings.useADivisionForNorthEast ? '➗ A÷2 for North/East' : '🔢 A×1 for North/East'}
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: 0.5 }}
                  />
                  <Typography variant="caption" sx={{ 
                    color: 'rgba(76,175,80,0.7)', 
                    fontSize: '0.55rem',
                    display: 'block'
                  }}>
                    {currentWallSettings.useADivisionForNorthEast 
                      ? 'North/East walls use A÷2 (current system)' 
                      : 'North/East walls use A×1 (test mode)'
                    }
                  </Typography>
                </Box>

                {/* NEW: Sprite Trimming Toggle Control */}
                <Box sx={{ mt: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={currentWallSettings.useSpriteTrimmingForWalls}
                        onChange={handleWallSpriteTrimmingToggle}
                        disabled={isLocked}
                        sx={{
                          '& .MuiSwitch-switchBase.Mui-checked': { color: '#FF9800' },
                          '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#FF9800' }
                        }}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ color: currentWallSettings.useSpriteTrimmingForWalls ? '#FF9800' : 'white', fontSize: '0.7rem' }}>
                          {currentWallSettings.useSpriteTrimmingForWalls ? '✂️ Sprite Trimming ON' : '🖼️ Sprite Trimming OFF'}
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: 0.5 }}
                  />
                  <Typography variant="caption" sx={{ 
                    color: 'rgba(255,152,0,0.7)', 
                    fontSize: '0.55rem',
                    display: 'block'
                  }}>
                    {currentWallSettings.useSpriteTrimmingForWalls 
                      ? 'Trims transparent pixels and adjusts anchor to bounding box' 
                      : 'Uses original sprite dimensions and anchor'
                    }
                  </Typography>
                </Box>

                {/* NEW: Sprite Dimensions Display */}
                {(() => {
                  // Check if we have stored bounding box data first
                  const storedBbox = currentWallSettings?.spriteBoundingBox;
                  const boundingInfo = storedBbox ? {
                    original: { width: storedBbox.originalWidth, height: storedBbox.originalHeight },
                    boundingBox: {
                      x: storedBbox.boundingX,
                      y: storedBbox.boundingY,
                      width: storedBbox.boundingWidth,
                      height: storedBbox.boundingHeight
                    }
                  } : getSpriteBoundingBoxInfo(isometricEditor.selectedSpriteName);
                  
                  return (
                    <Box sx={{ mt: 1, p: 1, border: '1px solid rgba(255,152,0,0.3)', borderRadius: 1, backgroundColor: 'rgba(255,152,0,0.05)' }}>
                      <Typography variant="caption" sx={{ 
                        color: '#FF9800', 
                        fontSize: '0.65rem',
                        fontWeight: 'bold',
                        display: 'block',
                        mb: 0.5
                      }}>
                        📐 Sprite Dimensions {storedBbox ? '(Stored)' : '(Live)'}:
                      </Typography>
                      
                      <Typography variant="caption" sx={{ 
                        color: 'rgba(255,152,0,0.8)', 
                        fontSize: '0.55rem',
                        display: 'block',
                        fontFamily: 'monospace'
                      }}>
                        Original: {boundingInfo.original.width}×{boundingInfo.original.height}px
                      </Typography>
                      
                      {boundingInfo.boundingBox ? (
                        <>
                          <Typography variant="caption" sx={{ 
                            color: 'rgba(76,175,80,0.8)', 
                            fontSize: '0.55rem',
                            display: 'block',
                            fontFamily: 'monospace'
                          }}>
                            Trimmed: {boundingInfo.boundingBox.width}×{boundingInfo.boundingBox.height}px
                            <br />
                            Offset: ({boundingInfo.boundingBox.x}, {boundingInfo.boundingBox.y})
                          </Typography>
                          
                          {storedBbox && (
                            <Typography variant="caption" sx={{ 
                              color: 'rgba(76,175,80,0.8)', 
                              fontSize: '0.55rem',
                              display: 'block',
                              fontFamily: 'monospace'
                            }}>
                              Anchor: ({storedBbox.anchorOffsetX.toFixed(3)}, {storedBbox.anchorOffsetY.toFixed(3)})
                            </Typography>
                          )}
                        </>
                      ) : (
                        <Typography variant="caption" sx={{ 
                          color: 'rgba(244,67,54,0.8)', 
                          fontSize: '0.55rem',
                          display: 'block',
                          fontFamily: 'monospace'
                        }}>
                          Trimmed: {boundingInfo.error || 'Not available'}
                        </Typography>
                      )}
                      
                      {boundingInfo.boundingBox && (
                        <Typography variant="caption" sx={{ 
                          color: 'rgba(255,152,0,0.6)', 
                          fontSize: '0.5rem',
                          display: 'block',
                          mt: 0.5
                        }}>
                          Savings: {boundingInfo.original.width - boundingInfo.boundingBox.width}×{boundingInfo.original.height - boundingInfo.boundingBox.height}px borders removed
                        </Typography>
                      )}
                    </Box>
                  );
                })()}

                {/* NORMALIZATION GUIDE */}
                <Box sx={{ mt: 1, p: 0.5, border: '1px solid rgba(76,175,80,0.4)', borderRadius: 1, backgroundColor: 'rgba(76,175,80,0.1)' }}>
                  <Typography variant="caption" sx={{ 
                    color: '#4CAF50', 
                    fontSize: '0.6rem',
                    fontWeight: 'bold',
                    display: 'block'
                  }}>
                    🎯 Perfect Setup Found: A=8, B=3
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: 'rgba(76,175,80,0.8)', 
                    fontSize: '0.55rem',
                    display: 'block',
                    fontFamily: 'monospace'
                  }}>
                    Same positive values work for ALL walls!
                  </Typography>
                  <Typography variant="caption" sx={{ 
                    color: 'rgba(76,175,80,0.7)', 
                    fontSize: '0.5rem',
                    display: 'block',
                    fontFamily: 'monospace',
                    mt: 0.5
                  }}>
                    {`Auto-converted per wall:
North: A=-4 (8÷2), B=-3  ✅
East:  A=-4 (8÷2), B=+3  ✅  
South: A=+8,       B=+3  ✅
West:  A=+8,       B=-3  ✅`}
                  </Typography>
                </Box>
              </Box>

              {/* 4-Directional Margins for Walls */}
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
                      value={currentWallSettings.invisibleMarginUp}
                      onChange={(e) => handleWallMarginChange('up', parseInt(e.target.value) || 0)}
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
                      value={currentWallSettings.invisibleMarginDown}
                      onChange={(e) => handleWallMarginChange('down', parseInt(e.target.value) || 0)}
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
                      value={currentWallSettings.invisibleMarginLeft}
                      onChange={(e) => handleWallMarginChange('left', parseInt(e.target.value) || 0)}
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
                      value={currentWallSettings.invisibleMarginRight}
                      onChange={(e) => handleWallMarginChange('right', parseInt(e.target.value) || 0)}
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

          {!currentWallSettings && (
            <Typography variant="body2" sx={{ opacity: 0.7, mb: 2 }}>
              📋 No wall settings configured yet. Settings will be auto-calculated when you place a wall.
            </Typography>
          )}
        </>
      )}

      {/* Mode-specific guidance */}
      {!isometricEditor.selectedSpriteName && (
        <Typography variant="body2" sx={{ opacity: 0.7, color: isWallMode ? '#E91E63' : '#4CAF50' }}>
          💡 Select a sprite to configure its {isWallMode ? 'wall edge positioning' : 'block positioning'} settings and manage configurations
        </Typography>
      )}
    </Paper>
  );
};

export default IsometricConfigurationPanel; 