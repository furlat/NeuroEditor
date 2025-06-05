import React, { useState, useEffect } from 'react';
import { useSnapshot } from 'valtio';
import { battlemapStore } from '../../store';
import { 
  processedAssetModeActions,
  assetCreationActions,
  assetInstanceActions,
  processedAssetsActions
} from '../../store/battlemap/processedAssets';
import { IsometricDirection, isometricSpriteManager } from '../../game/managers/IsometricSpriteManager';
import { getCanvasBoundingBox } from 'pixi.js';
import * as PIXI from 'pixi.js';
import { gameManager } from '../../game/GameManager';
import { battlemapEngine } from '../../game/BattlemapEngine';
import {
  AssetCategory,
  createDefaultProcessedAsset,
  TemporaryAssetState,
  MutableDirectionalPositioningSettings,
  ProcessedAssetType,
  calculateAutoComputedPositioning
} from '../../types/processed_assets';

export const useProcessedAssetConfigurationHandlers = () => {
  const [selectedDirection, setSelectedDirection] = useState<IsometricDirection>(IsometricDirection.NORTH);
  const [configStatus, setConfigStatus] = useState('');
  
  const processedAssetsSnap = useSnapshot(battlemapStore.processedAssets);
  const temporaryAsset = processedAssetsSnap.temporaryAsset;

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

  // Function to get sprite bounding box info
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
    if (!temporaryAsset) return;
    
    console.log('[ProcessedAssetConfigurationPanel] 🔄 Refreshing preview...');
    
    // Clear existing instances that reference this temporary asset
    const allInstances = processedAssetsActions.instances.getAllInstances();
    Object.keys(allInstances).forEach(instanceKey => {
      const instance = allInstances[instanceKey];
      if (instance.assetId === temporaryAsset.id) {
        processedAssetsActions.instances.removeAssetInstance(instanceKey);
      }
    });
    
    // Create preview positions in a diamond pattern around center
    const centerX = Math.floor(battlemapStore.grid.width / 2);
    const centerY = Math.floor(battlemapStore.grid.height / 2);
    
    const previewPositions = [
      { position: [centerX, centerY] as [number, number], direction: IsometricDirection.NORTH },
      { position: [centerX + 1, centerY] as [number, number], direction: IsometricDirection.EAST },
      { position: [centerX, centerY + 1] as [number, number], direction: IsometricDirection.SOUTH },
      { position: [centerX - 1, centerY] as [number, number], direction: IsometricDirection.WEST },
    ];
    
    // Place instances for preview
    previewPositions.forEach(({ position, direction }) => {
      processedAssetsActions.instances.placeAssetInstance(
        temporaryAsset.id,
        position,
        0,
        direction,
        'above'
      );
    });
    
    console.log('[ProcessedAssetConfigurationPanel] ✅ Preview refreshed with 4 directional instances');
  };

  // Handle shared settings toggle
  const handleSharedSettingsToggle = () => {
    if (!temporaryAsset) return;
    
    const currentSharedMode = temporaryAsset.directionalBehavior.useSharedSettings;
    
    if (!currentSharedMode) {
      // Switching TO shared mode - copy current direction settings to shared
      const currentDirectionSettings = temporaryAsset.directionalBehavior.directionalSettings[selectedDirection];
      
      const updatedDirectionalSettings = {
        ...temporaryAsset.directionalBehavior.directionalSettings
      };
      
      // When switching TO shared mode, populate shared settings with current direction
      updatedDirectionalSettings[IsometricDirection.NORTH] = { ...currentDirectionSettings };
      updatedDirectionalSettings[IsometricDirection.EAST] = { ...currentDirectionSettings };
      updatedDirectionalSettings[IsometricDirection.SOUTH] = { ...currentDirectionSettings };
      updatedDirectionalSettings[IsometricDirection.WEST] = { ...currentDirectionSettings };
      
      assetCreationActions.updateTemporaryAsset({
        directionalBehavior: {
          ...temporaryAsset.directionalBehavior,
          useSharedSettings: true,
          sharedSettings: { ...currentDirectionSettings },
          directionalSettings: updatedDirectionalSettings
        }
      });
    } else {
      // Switching FROM shared mode - directional settings already exist, just change the flag
      assetCreationActions.updateTemporaryAsset({
        directionalBehavior: {
          ...temporaryAsset.directionalBehavior,
          useSharedSettings: false
        }
      });
    }
  };

  // Handle toggle auto mode
  const handleToggleAutoMode = () => {
    if (!currentSettings) return;
    
    updateCurrentSettings({
      useAutoComputed: !currentSettings.useAutoComputed
    });
  };

  // Update current settings based on shared vs per-direction mode
  const updateCurrentSettings = (updates: any) => {
    if (!temporaryAsset) return;
    
    if (temporaryAsset.directionalBehavior.useSharedSettings) {
      // Update shared settings
      assetCreationActions.updateTemporaryAsset({
        directionalBehavior: {
          ...temporaryAsset.directionalBehavior,
          sharedSettings: {
            ...temporaryAsset.directionalBehavior.sharedSettings,
            ...updates
          }
        }
      });
    } else {
      // Update current direction settings
      assetCreationActions.updateTemporaryAsset({
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
    updateCurrentSettings({ [`invisibleMargin${marginType.charAt(0).toUpperCase() + marginType.slice(1)}`]: value });
  };

  // Handle manual vertical bias change
  const handleManualVerticalBiasChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value) || 0;
    updateCurrentSettings({
      manualVerticalBias: value,
      useAutoComputed: false
    });
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
          console.log(`[Handlers] 🔄 Manual recalculate for ${spriteName}: ${spriteFrameSize.width}x${spriteFrameSize.height}`);
          
          // Use actual sprite dimensions and current bounding box anchor setting
          const useBoundingBoxAnchor = currentSettings.spriteAnchor?.useBoundingBoxAnchor || false;
          
          // FIXED: Use actual sprite dimensions, bounding box setting, sprite name, and asset type
          const calculatedPositioning = calculateAutoComputedPositioning(
            spriteFrameSize.width,
            spriteFrameSize.height,
            useBoundingBoxAnchor,
            spriteName,
            temporaryAsset.assetType
          );
          
          console.log(`[Handlers] 🎯 Recalculated positioning:`, calculatedPositioning);
          
          // Update both auto-computed reference AND manual value
          updateCurrentSettings({
            autoComputedVerticalBias: calculatedPositioning.autoComputedVerticalBias,
            manualVerticalBias: calculatedPositioning.autoComputedVerticalBias, // Set manual to computed value
            verticalOffset: calculatedPositioning.verticalOffset,
            horizontalOffset: calculatedPositioning.horizontalOffset
          });
          
          console.log(`[Handlers] ✅ Updated positioning: VerticalBias=${calculatedPositioning.autoComputedVerticalBias}, VerticalOffset=${calculatedPositioning.verticalOffset}, HorizontalOffset=${calculatedPositioning.horizontalOffset}`);
        } else {
          console.warn(`[Handlers] ⚠️ Could not get sprite frame size for: ${spriteName}`);
        }
      } catch (error) {
        console.error(`[Handlers] ❌ Error recalculating positioning:`, error);
      }
    }
  };

  return {
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
  };
}; 