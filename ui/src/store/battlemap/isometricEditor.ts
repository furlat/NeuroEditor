// /store/battlemap/isometricEditor.ts
import { battlemapStore, forceRerender } from './core';
import { IsometricDirection, SpriteCategory, isometricSpriteManager } from '../../game/managers/IsometricSpriteManager';

// Local type definitions (exported for re-export from store index)
export enum VerticalBiasComputationMode {
  ROUND_DOWN = 'round_down',
  ROUND_UP = 'round_up',
  SNAP_TO_NEAREST = 'snap_to_nearest'
}

export interface DirectionalSettings {
  invisibleMarginUp: number;
  invisibleMarginDown: number;
  invisibleMarginLeft: number;
  invisibleMarginRight: number;
  autoComputedVerticalBias: number;
  useAutoComputed: boolean;
  manualVerticalBias: number;
}

// Enhanced isometric editor actions
export const isometricEditorActions = {
  setSelectedSprite: (spriteName: string | null) => {
    const wasWallMode = battlemapStore.controls.isometricEditor.wallMode;
    
    // Remember the last selected sprite for the current mode
    if (spriteName) {
      if (wasWallMode) {
        battlemapStore.controls.isometricEditor.lastSelectedWallSprite = spriteName;
      } else {
        battlemapStore.controls.isometricEditor.lastSelectedBlockSprite = spriteName;
      }
    }
    
    battlemapStore.controls.isometricEditor.selectedSpriteName = spriteName;
  },
  
  setSelectedSpriteDirection: (direction: IsometricDirection) => {
    battlemapStore.controls.isometricEditor.selectedSpriteDirection = direction;
  },
  
  setSelectedZLevel: (zLevel: number) => {
    battlemapStore.controls.isometricEditor.selectedZLevel = Math.max(0, zLevel);
  },
  
  setSelectedSpriteCategory: (category: SpriteCategory) => {
    battlemapStore.controls.isometricEditor.selectedSpriteCategory = category;
  },
  
  setBrushSize: (size: number) => {
    battlemapStore.controls.isometricEditor.brushSize = Math.max(1, Math.min(10, size));
  },
  
  setDirectionalMode: (enabled: boolean) => {
    battlemapStore.controls.isometricEditor.isDirectionalMode = enabled;
  },
  
  // Per-sprite-type positioning settings
  setSpriteTypeSettings: (spriteName: string, settings: DirectionalSettings & {
    useSharedSettings?: boolean;
    directionalSettings?: {
      [IsometricDirection.NORTH]?: DirectionalSettings;
      [IsometricDirection.EAST]?: DirectionalSettings;
      [IsometricDirection.SOUTH]?: DirectionalSettings;
      [IsometricDirection.WEST]?: DirectionalSettings;
    };
  }) => {
    console.log(`[battlemapStore] Setting sprite type settings for ${spriteName}:`, settings);
    
    // Initialize or update sprite settings with backward compatibility
    if (!battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName]) {
      // When creating new settings, initialize BOTH shared AND all directional settings
      const baseSettings = {
        invisibleMarginUp: settings.invisibleMarginUp,
        invisibleMarginDown: settings.invisibleMarginDown,
        invisibleMarginLeft: settings.invisibleMarginLeft,
        invisibleMarginRight: settings.invisibleMarginRight,
        autoComputedVerticalBias: settings.autoComputedVerticalBias,
        useAutoComputed: settings.useAutoComputed,
        manualVerticalBias: settings.manualVerticalBias,
      };
      
      battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName] = {
        ...settings,
        useSharedSettings: settings.useSharedSettings ?? true, // Default to shared
        // ALWAYS populate directional settings with DIFFERENT values so user can see the difference
        directionalSettings: settings.directionalSettings || {
          [IsometricDirection.NORTH]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          },
          [IsometricDirection.EAST]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          },
          [IsometricDirection.SOUTH]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          },
          [IsometricDirection.WEST]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          }
        }
      };
      
      console.log(`[battlemapStore] Initialized ${spriteName} with BOTH shared and directional settings`);
    } else {
      // Update existing settings
      const existingSettings = battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName];
      
      // Update the settings
      Object.assign(existingSettings, settings);
      
      // Ensure directional settings exist even when updating
      if (!existingSettings.directionalSettings) {
        const baseSettings = {
          invisibleMarginUp: settings.invisibleMarginUp,
          invisibleMarginDown: settings.invisibleMarginDown,
          invisibleMarginLeft: settings.invisibleMarginLeft,
          invisibleMarginRight: settings.invisibleMarginRight,
          autoComputedVerticalBias: settings.autoComputedVerticalBias,
          useAutoComputed: settings.useAutoComputed,
          manualVerticalBias: settings.manualVerticalBias,
        };
        
        existingSettings.directionalSettings = {
          [IsometricDirection.NORTH]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          },
          [IsometricDirection.EAST]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          },
          [IsometricDirection.SOUTH]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          },
          [IsometricDirection.WEST]: { 
            ...baseSettings, 
            invisibleMarginUp: 0, invisibleMarginDown: 0, 
            invisibleMarginLeft: 0, invisibleMarginRight: 0 
          }
        };
        
        console.log(`[battlemapStore] Added missing directional settings for ${spriteName}`);
      }
    }
    
    forceRerender();
  },
  
  getSpriteTypeSettings: (spriteName: string, direction?: IsometricDirection) => {
    const spriteSettings = battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName];
    if (!spriteSettings) return null;
    
    // Check if using per-direction settings and direction is specified
    if (!spriteSettings.useSharedSettings && direction !== undefined && spriteSettings.directionalSettings?.[direction]) {
      return spriteSettings.directionalSettings[direction];
    }
    
    // Return shared settings (default)
    return {
      invisibleMarginUp: spriteSettings.invisibleMarginUp,
      invisibleMarginDown: spriteSettings.invisibleMarginDown,
      invisibleMarginLeft: spriteSettings.invisibleMarginLeft,
      invisibleMarginRight: spriteSettings.invisibleMarginRight,
      autoComputedVerticalBias: spriteSettings.autoComputedVerticalBias,
      useAutoComputed: spriteSettings.useAutoComputed,
      manualVerticalBias: spriteSettings.manualVerticalBias,
    };
  },

  // Functions to manage shared vs per-direction settings
  setSpriteUseSharedSettings: (spriteName: string, useShared: boolean) => {
    console.log(`[battlemapStore] setSpriteUseSharedSettings called for ${spriteName} with useShared=${useShared}`);
    
    let existingSettings = battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName];
    
    // If no settings exist, create default ones first
    if (!existingSettings) {
      console.log(`[battlemapStore] No existing settings for ${spriteName}, creating defaults`);
      existingSettings = {
        invisibleMarginUp: 8,
        invisibleMarginDown: 8,
        invisibleMarginLeft: 8,
        invisibleMarginRight: 8,
        autoComputedVerticalBias: 36,
        useAutoComputed: true,
        manualVerticalBias: 36,
        useSharedSettings: true
      };
      battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName] = existingSettings;
    }
    
    console.log(`[battlemapStore] Setting useSharedSettings from ${existingSettings.useSharedSettings} to ${useShared}`);
    existingSettings.useSharedSettings = useShared;
    
    console.log(`[battlemapStore] Final settings for ${spriteName}:`, existingSettings);
    console.log(`[battlemapStore] Set ${spriteName} to use ${useShared ? 'shared' : 'per-direction'} settings`);
    
    forceRerender();
  },

  getSpriteUseSharedSettings: (spriteName: string): boolean => {
    const spriteSettings = battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName];
    return spriteSettings?.useSharedSettings ?? true; // Default to shared
  },

  // Set direction-specific settings
  setSpriteDirectionalSettings: (spriteName: string, direction: IsometricDirection, settings: DirectionalSettings) => {
    const existingSettings = battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName];
    if (existingSettings) {
      if (!existingSettings.directionalSettings) {
        existingSettings.directionalSettings = {};
      }
      existingSettings.directionalSettings[direction] = settings;
      console.log(`[battlemapStore] Set direction-specific settings for ${spriteName} direction ${direction}`);
      forceRerender();
    }
  },
  
  // Calculate positioning using 4-directional margins and width/2 formula
  calculateSpriteTypePositioning: (spriteWidth: number, spriteHeight: number, margins?: {
    up?: number; down?: number; left?: number; right?: number;
  }) => {
    // Use provided margins or defaults from store
    const marginUp = margins?.up ?? battlemapStore.view.invisibleMarginUp;
    const marginDown = margins?.down ?? battlemapStore.view.invisibleMarginDown;
    const marginLeft = margins?.left ?? battlemapStore.view.invisibleMarginLeft;
    const marginRight = margins?.right ?? battlemapStore.view.invisibleMarginRight;
    
    // USER'S EXACT FORMULA:
    // 1. Take sprite width/2
    const spriteWidthHalf = spriteWidth / 2;
    
    // 2. Normalize dimensions by removing margins
    const normalizedWidth = spriteWidth - marginLeft - marginRight;
    const normalizedHeight = spriteHeight - marginUp - marginDown;
    
    // 3. Calculate vertical bias: normalized height - (normalized width / 2)
    const autoComputedVerticalBias = normalizedHeight - (normalizedWidth / 2);
    
    // Apply user's preferred computation method
    let roundedBias: number;
    
    switch (battlemapStore.view.verticalBiasComputationMode) {
      case VerticalBiasComputationMode.ROUND_UP:
        roundedBias = Math.ceil(autoComputedVerticalBias);
        break;
      case VerticalBiasComputationMode.ROUND_DOWN:
        roundedBias = Math.floor(autoComputedVerticalBias);
        break;
      case VerticalBiasComputationMode.SNAP_TO_NEAREST:
        // Compute the value, then snap to nearest between 36 and 196
        const computedValue = autoComputedVerticalBias;
        
        // Define the target values (36 and 196 are the key offsets for sprites)
        const targetValues = [36, 196];
        
        // Find the closest target value
        let closestValue = targetValues[0];
        let minDistance = Math.abs(computedValue - targetValues[0]);
        
        for (const target of targetValues) {
          const distance = Math.abs(computedValue - target);
          if (distance < minDistance) {
            minDistance = distance;
            closestValue = target;
          }
        }
        
        roundedBias = closestValue;
        console.log(`[battlemapStore] Snap-to-nearest: computed ${computedValue.toFixed(1)} -> snapped to ${closestValue} (distance: ${minDistance.toFixed(1)})`);
        break;
      default:
        roundedBias = Math.floor(autoComputedVerticalBias);
    }
    
    return {
      invisibleMarginUp: marginUp,
      invisibleMarginDown: marginDown,
      invisibleMarginLeft: marginLeft,
      invisibleMarginRight: marginRight,
      autoComputedVerticalBias: roundedBias,
      useAutoComputed: true,
      manualVerticalBias: roundedBias // Initially set to auto-computed
    };
  },

  // Recalculate all auto-computed sprite settings when computation mode changes
  recalculateAutoComputedSettings: () => {
    const spriteSettings = battlemapStore.controls.isometricEditor.spriteTypeSettings;
    console.log(`[battlemapStore] Found ${Object.keys(spriteSettings).length} sprite settings to check`);
    
    Object.keys(spriteSettings).forEach(spriteName => {
      const settings = spriteSettings[spriteName];
      console.log(`[battlemapStore] Checking ${spriteName}: useAutoComputed=${settings.useAutoComputed}, current autoComputedVerticalBias=${settings.autoComputedVerticalBias}`);
      
      if (settings.useAutoComputed) {
        // Get actual sprite frame size for proper recalculation
        const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
        if (spriteFrameSize) {
          // Recalculate using the new rounding method with actual sprite dimensions
          const recalculated = isometricEditorActions.calculateSpriteTypePositioning(
            spriteFrameSize.width, 
            spriteFrameSize.height,
            {
              up: settings.invisibleMarginUp,
              down: settings.invisibleMarginDown,
              left: settings.invisibleMarginLeft,
              right: settings.invisibleMarginRight
            }
          );
          
          // Properly update the settings object to trigger Valtio reactivity
          battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName] = {
            ...settings,
            autoComputedVerticalBias: recalculated.autoComputedVerticalBias
          };
          
          console.log(`[battlemapStore] Recalculated ${spriteName}: ${settings.autoComputedVerticalBias} -> ${recalculated.autoComputedVerticalBias}px`);
        } else {
          console.warn(`[battlemapStore] Could not get sprite frame size for ${spriteName}`);
        }
      }
    });
    
    console.log(`[battlemapStore] Finished recalculating sprite settings`);
  },
  
  // LEGACY COMPATIBILITY: Functions for backward compatibility (deprecated)
  setSpritePositioning: (spriteName: string, verticalOffset: number, invisibleMargin: number, isAutoCalculated: boolean = false) => {
    // Convert old single margin to 4-directional for backward compatibility
    console.warn('[battlemapStore] setSpritePositioning is deprecated, use setSpriteTypeSettings instead');
    battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName] = {
      invisibleMarginUp: invisibleMargin,
      invisibleMarginDown: invisibleMargin,
      invisibleMarginLeft: invisibleMargin,
      invisibleMarginRight: invisibleMargin,
      autoComputedVerticalBias: verticalOffset,
      useAutoComputed: isAutoCalculated,
      manualVerticalBias: verticalOffset
    };
  },
  
  getSpritePositioning: (spriteName: string) => {
    // Convert new structure back to old single margin for backward compatibility
    console.warn('[battlemapStore] getSpritePositioning is deprecated, use getSpriteTypeSettings instead');
    const settings = battlemapStore.controls.isometricEditor.spriteTypeSettings[spriteName];
    if (!settings) return null;
    
    return {
      verticalOffset: settings.useAutoComputed ? settings.autoComputedVerticalBias : settings.manualVerticalBias,
      invisibleMargin: settings.invisibleMarginDown, // Use down margin as primary
      isAutoCalculated: settings.useAutoComputed
    };
  },
  
  // Calculate positioning using the user's formula (deprecated)
  calculateSpritePositioning: (spriteWidth: number, spriteHeight: number, invisibleMargin: number = 8) => {
    console.warn('[battlemapStore] calculateSpritePositioning is deprecated, use calculateSpriteTypePositioning instead');
    const result = isometricEditorActions.calculateSpriteTypePositioning(spriteWidth, spriteHeight, {
      up: invisibleMargin, down: invisibleMargin, left: invisibleMargin, right: invisibleMargin
    });
    
    return {
      verticalOffset: result.autoComputedVerticalBias,
      invisibleMargin: result.invisibleMarginDown
    };
  },
};