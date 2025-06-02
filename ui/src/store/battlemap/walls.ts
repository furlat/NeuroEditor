// /store/battlemap/walls.ts
import { battlemapStore, forceRerender } from './core';
import { WallSummary } from '../../types/battlemap_types';
import { IsometricDirection } from '../../game/managers/IsometricSpriteManager';

// Temporary local type definition (should be imported from types later)
interface DirectionalSettings {
  invisibleMarginUp: number;
  invisibleMarginDown: number;
  invisibleMarginLeft: number;
  invisibleMarginRight: number;
  autoComputedVerticalBias: number;
  useAutoComputed: boolean;
  manualVerticalBias: number;
  manualHorizontalOffset?: number;
  manualDiagonalNorthEastOffset?: number;
  manualDiagonalNorthWestOffset?: number;
  relativeAlongEdgeOffset?: number;
  relativeTowardCenterOffset?: number;
  relativeDiagonalAOffset?: number;
  relativeDiagonalBOffset?: number;
  useADivisionForNorthEast?: boolean;
  useSpriteTrimmingForWalls?: boolean;
  spriteBoundingBox?: {
    originalWidth: number;
    originalHeight: number; 
    boundingX: number;
    boundingY: number;
    boundingWidth: number;
    boundingHeight: number;
    anchorOffsetX: number;
    anchorOffsetY: number;
  };
}

// Wall management actions
export const wallActions = {
  addWall: (wall: WallSummary) => {
    // Check for existing identical wall (same sprite, position, z_level, wall_direction, sprite_direction)
    const existingWallKey = Object.keys(battlemapStore.grid.walls).find(wallKey => {
      const existingWall = battlemapStore.grid.walls[wallKey] as WallSummary;
      return (
        existingWall.sprite_name === wall.sprite_name &&
        existingWall.position[0] === wall.position[0] &&
        existingWall.position[1] === wall.position[1] &&
        existingWall.z_level === wall.z_level &&
        existingWall.wall_direction === wall.wall_direction &&
        existingWall.sprite_direction === wall.sprite_direction
      );
    });
    if (existingWallKey) {
      // Overwrite existing identical wall instead of creating duplicate
      battlemapStore.grid.walls[existingWallKey] = wall;
      console.log('[battlemapStore] Overwriting identical wall:', wall, '- FORCING RENDER');
    } else {
      // Use the wall's UUID as the key to allow multiple different walls per edge
      const wallKey = wall.uuid;
      battlemapStore.grid.walls[wallKey] = wall;
      console.log('[battlemapStore] Added new wall:', wall, '- FORCING RENDER');
    }
    
    // Update max Z level if necessary
    if (wall.z_level > battlemapStore.grid.maxZLevel) {
      battlemapStore.grid.maxZLevel = wall.z_level;
    }
    
    forceRerender();
  },

  removeWall: (x: number, y: number, z: number, direction: IsometricDirection) => {
    // Remove ALL walls at the specified edge (not just one)
    const wallsToRemove: string[] = [];
    
    // Find all walls at this edge
    Object.keys(battlemapStore.grid.walls).forEach(wallKey => {
      const wall = battlemapStore.grid.walls[wallKey] as WallSummary;
      if (wall.position[0] === x && 
          wall.position[1] === y && 
          wall.z_level === z && 
          wall.wall_direction === direction) {
        wallsToRemove.push(wallKey);
      }
    });
    
    // Remove all found walls
    wallsToRemove.forEach(wallKey => {
      delete battlemapStore.grid.walls[wallKey];
    });
    
    console.log(`[battlemapStore] Removed ${wallsToRemove.length} wall(s) at (${x}, ${y}, Z:${z}, Edge:${direction}) - FORCING RENDER`);
    forceRerender();
  },

  updateWall: (wallUuid: string, updates: Partial<WallSummary>) => {
    // Update wall by UUID instead of position+direction
    const existingWall = battlemapStore.grid.walls[wallUuid] as WallSummary;
    if (existingWall) {
      battlemapStore.grid.walls[wallUuid] = { ...existingWall, ...updates };
      console.log('[battlemapStore] Updated wall:', wallUuid, '- FORCING RENDER');
      forceRerender();
    }
  },

  getWallsAtPosition: (x: number, y: number, z: number): WallSummary[] => {
    const walls: WallSummary[] = [];
    Object.values(battlemapStore.grid.walls).forEach(wall => {
      const typedWall = wall as WallSummary;
      if (typedWall.position[0] === x && typedWall.position[1] === y && typedWall.z_level === z) {
        walls.push(typedWall);
      }
    });
    return walls;
  },

  getWallsAtEdge: (x: number, y: number, z: number, direction: IsometricDirection): WallSummary[] => {
    const walls: WallSummary[] = [];
    Object.values(battlemapStore.grid.walls).forEach(wall => {
      const typedWall = wall as WallSummary;
      if (typedWall.position[0] === x && 
          typedWall.position[1] === y && 
          typedWall.z_level === z && 
          typedWall.wall_direction === direction) {
        walls.push(typedWall);
      }
    });
    return walls;
  },

  clearAllWalls: () => {
    battlemapStore.grid.walls = {};
    console.log('[battlemapStore] Cleared all walls locally');
  },

  // Wall editor controls
  setWallMode: (enabled: boolean) => {
    const wasWallMode = battlemapStore.controls.isometricEditor.wallMode;
    const currentSprite = battlemapStore.controls.isometricEditor.selectedSpriteName;
    
    // Remember the current sprite for the mode we're leaving
    if (currentSprite) {
      if (wasWallMode) {
        battlemapStore.controls.isometricEditor.lastSelectedWallSprite = currentSprite;
      } else {
        battlemapStore.controls.isometricEditor.lastSelectedBlockSprite = currentSprite;
      }
    }
    
    // Switch to the new mode
    battlemapStore.controls.isometricEditor.wallMode = enabled;
    
    // Auto-select the remembered sprite for the new mode
    if (enabled) {
      // Switching TO wall mode - select last wall sprite
      const lastWallSprite = battlemapStore.controls.isometricEditor.lastSelectedWallSprite;
      if (lastWallSprite) {
        battlemapStore.controls.isometricEditor.selectedSpriteName = lastWallSprite;
        console.log(`[battlemapStore] Wall mode enabled - auto-selected last wall sprite: ${lastWallSprite}`);
      } else {
        // No previous wall sprite - clear selection so user can pick one
        battlemapStore.controls.isometricEditor.selectedSpriteName = null;
        console.log(`[battlemapStore] Wall mode enabled - no previous wall sprite remembered`);
      }
    } else {
      // Switching TO block mode - select last block sprite
      const lastBlockSprite = battlemapStore.controls.isometricEditor.lastSelectedBlockSprite;
      if (lastBlockSprite) {
        battlemapStore.controls.isometricEditor.selectedSpriteName = lastBlockSprite;
        console.log(`[battlemapStore] Block mode enabled - auto-selected last block sprite: ${lastBlockSprite}`);
      } else {
        // No previous block sprite - clear selection so user can pick one
        battlemapStore.controls.isometricEditor.selectedSpriteName = null;
        console.log(`[battlemapStore] Block mode enabled - no previous block sprite remembered`);
      }
    }
    
    console.log(`[battlemapStore] Wall mode ${enabled ? 'enabled' : 'disabled'}`);
  },

  toggleWallMode: () => {
    const newWallMode = !battlemapStore.controls.isometricEditor.wallMode;
    wallActions.setWallMode(newWallMode);
  },

  setSelectedWallType: (wallType: 'brick' | 'stone' | 'wood' | 'custom') => {
    battlemapStore.controls.isometricEditor.selectedWallType = wallType;
  },

  setWallPlacementDirection: (direction: IsometricDirection) => {
    battlemapStore.controls.isometricEditor.wallPlacementDirection = direction;
  },

  setWallSpriteDirection: (direction: IsometricDirection) => {
    battlemapStore.controls.isometricEditor.wallSpriteDirection = direction;
  },

  // Wall positioning settings
  setWallPositioningSettings: (spriteName: string, settings: DirectionalSettings & {
    manualHorizontalOffset: number;
    manualDiagonalNorthEastOffset: number;
    manualDiagonalNorthWestOffset: number;
    relativeAlongEdgeOffset: number;
    relativeTowardCenterOffset: number;
    relativeDiagonalAOffset: number;
    relativeDiagonalBOffset: number;
    useADivisionForNorthEast: boolean;
    useSpriteTrimmingForWalls: boolean;
    spriteBoundingBox?: {
      originalWidth: number;
      originalHeight: number; 
      boundingX: number;
      boundingY: number;
      boundingWidth: number;
      boundingHeight: number;
      anchorOffsetX: number;
      anchorOffsetY: number;
    };
  }) => {
    // Preserve existing useSharedSettings and directionalSettings when updating positioning
    const existingSettings = battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName];
    
    // Merge new settings with existing settings to preserve useSharedSettings and directionalSettings
    const updatedSettings = {
      ...settings,
      // Preserve the per-direction configuration fields if they exist
      useSharedSettings: existingSettings?.useSharedSettings ?? true, // Default to shared if not set
      directionalSettings: existingSettings?.directionalSettings // Preserve existing directional settings
    };
    
    battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName] = updatedSettings;
    console.log(`[battlemapActions] Set wall positioning settings for ${spriteName}:`, updatedSettings);
  },

  getWallPositioningSettings: (spriteName: string, direction?: IsometricDirection) => {
    const wallSettings = battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName];
    if (!wallSettings) return null;
    
    // Check if using per-direction settings and direction is specified
    if (!wallSettings.useSharedSettings && direction !== undefined && wallSettings.directionalSettings?.[direction]) {
      return wallSettings.directionalSettings[direction];
    }
    
    // Return shared settings (default)
    return {
      invisibleMarginUp: wallSettings.invisibleMarginUp,
      invisibleMarginDown: wallSettings.invisibleMarginDown,
      invisibleMarginLeft: wallSettings.invisibleMarginLeft,
      invisibleMarginRight: wallSettings.invisibleMarginRight,
      autoComputedVerticalBias: wallSettings.autoComputedVerticalBias,
      useAutoComputed: wallSettings.useAutoComputed,
      manualVerticalBias: wallSettings.manualVerticalBias,
      manualHorizontalOffset: wallSettings.manualHorizontalOffset,
      manualDiagonalNorthEastOffset: wallSettings.manualDiagonalNorthEastOffset,
      manualDiagonalNorthWestOffset: wallSettings.manualDiagonalNorthWestOffset,
      relativeAlongEdgeOffset: wallSettings.relativeAlongEdgeOffset,
      relativeTowardCenterOffset: wallSettings.relativeTowardCenterOffset,
      relativeDiagonalAOffset: wallSettings.relativeDiagonalAOffset,
      relativeDiagonalBOffset: wallSettings.relativeDiagonalBOffset,
      useADivisionForNorthEast: wallSettings.useADivisionForNorthEast,
      useSpriteTrimmingForWalls: wallSettings.useSpriteTrimmingForWalls,
      spriteBoundingBox: wallSettings.spriteBoundingBox,
    };
  },

  // Calculate wall positioning (SIMPLE MANUAL DEFAULTS - no auto calculation for now)
  calculateWallPositioning: (spriteWidth: number, spriteHeight: number, margins?: {
    up?: number; down?: number; left?: number; right?: number;
  }) => {
    // Use provided margins or defaults from store
    const marginUp = margins?.up ?? battlemapStore.view.invisibleMarginUp;
    const marginDown = margins?.down ?? battlemapStore.view.invisibleMarginDown;
    const marginLeft = margins?.left ?? battlemapStore.view.invisibleMarginLeft;
    const marginRight = margins?.right ?? battlemapStore.view.invisibleMarginRight;
    
    // SIMPLIFIED: Return manual defaults with 0 offset for walls
    return {
      invisibleMarginUp: marginUp,
      invisibleMarginDown: marginDown,
      invisibleMarginLeft: marginLeft,
      invisibleMarginRight: marginRight,
      autoComputedVerticalBias: 0, // Simple default, not actually computed
      useAutoComputed: false, // Default to manual mode
      manualVerticalBias: 0, // Default to 0 offset for clear understanding
      manualHorizontalOffset: 0, // Default to 0 horizontal offset for clear understanding
      manualDiagonalNorthEastOffset: 0,
      manualDiagonalNorthWestOffset: 0,
      relativeAlongEdgeOffset: 0,
      relativeTowardCenterOffset: 0,
      relativeDiagonalAOffset: 8, // PERFECT: Default to 8 for universal positioning
      relativeDiagonalBOffset: 3, // PERFECT: Default to 3 for universal positioning
      useADivisionForNorthEast: true, // Default to true (current behavior with division)
      useSpriteTrimmingForWalls: false, // Default to false (current behavior without trimming)
    };
  },

  // Wall-specific functions to manage shared vs per-direction settings
  setWallUseSharedSettings: (spriteName: string, useShared: boolean) => {
    console.log(`[battlemapStore] setWallUseSharedSettings called for ${spriteName} with useShared=${useShared}`);
    
    let existingSettings = battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName];
    
    // If no settings exist, create default ones first
    if (!existingSettings) {
      console.log(`[battlemapStore] No existing wall settings for ${spriteName}, creating defaults`);
      existingSettings = {
        invisibleMarginUp: 8,
        invisibleMarginDown: 8,
        invisibleMarginLeft: 8,
        invisibleMarginRight: 8,
        autoComputedVerticalBias: 0,
        useAutoComputed: false,
        manualVerticalBias: 0,
        manualHorizontalOffset: 0,
        manualDiagonalNorthEastOffset: 0,
        manualDiagonalNorthWestOffset: 0,
        relativeAlongEdgeOffset: 0,
        relativeTowardCenterOffset: 0,
        relativeDiagonalAOffset: 8,
        relativeDiagonalBOffset: 3,
        useADivisionForNorthEast: true,
        useSpriteTrimmingForWalls: false,
        useSharedSettings: true
      };
      battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName] = existingSettings;
    }
    
    console.log(`[battlemapStore] Setting wall useSharedSettings from ${existingSettings.useSharedSettings} to ${useShared}`);
    
    // Use full object assignment to ensure Valtio reactivity
    const updatedSettings = {
      ...existingSettings,
      useSharedSettings: useShared
    };
    
    // Also ensure directional settings exist with different default values so user can see the difference
    if (!updatedSettings.directionalSettings) {
      const baseSettings = {
        invisibleMarginUp: updatedSettings.invisibleMarginUp,
        invisibleMarginDown: updatedSettings.invisibleMarginDown,
        invisibleMarginLeft: updatedSettings.invisibleMarginLeft,
        invisibleMarginRight: updatedSettings.invisibleMarginRight,
        autoComputedVerticalBias: updatedSettings.autoComputedVerticalBias,
        useAutoComputed: updatedSettings.useAutoComputed,
        manualVerticalBias: updatedSettings.manualVerticalBias,
        manualHorizontalOffset: updatedSettings.manualHorizontalOffset,
        manualDiagonalNorthEastOffset: updatedSettings.manualDiagonalNorthEastOffset,
        manualDiagonalNorthWestOffset: updatedSettings.manualDiagonalNorthWestOffset,
        relativeAlongEdgeOffset: updatedSettings.relativeAlongEdgeOffset,
        relativeTowardCenterOffset: updatedSettings.relativeTowardCenterOffset,
        relativeDiagonalAOffset: updatedSettings.relativeDiagonalAOffset,
        relativeDiagonalBOffset: updatedSettings.relativeDiagonalBOffset,
        useADivisionForNorthEast: updatedSettings.useADivisionForNorthEast,
        useSpriteTrimmingForWalls: updatedSettings.useSpriteTrimmingForWalls,
      };
      
      updatedSettings.directionalSettings = {
        [IsometricDirection.NORTH]: { 
          ...baseSettings, 
          invisibleMarginUp: 0, invisibleMarginDown: 0, 
          invisibleMarginLeft: 0, invisibleMarginRight: 0,
          relativeDiagonalAOffset: 0, relativeDiagonalBOffset: 0
        },
        [IsometricDirection.EAST]: { 
          ...baseSettings, 
          invisibleMarginUp: 0, invisibleMarginDown: 0, 
          invisibleMarginLeft: 0, invisibleMarginRight: 0,
          relativeDiagonalAOffset: 0, relativeDiagonalBOffset: 0
        },
        [IsometricDirection.SOUTH]: { 
          ...baseSettings, 
          invisibleMarginUp: 0, invisibleMarginDown: 0, 
          invisibleMarginLeft: 0, invisibleMarginRight: 0,
          relativeDiagonalAOffset: 0, relativeDiagonalBOffset: 0
        },
        [IsometricDirection.WEST]: { 
          ...baseSettings, 
          invisibleMarginUp: 0, invisibleMarginDown: 0, 
          invisibleMarginLeft: 0, invisibleMarginRight: 0,
          relativeDiagonalAOffset: 0, relativeDiagonalBOffset: 0
        }
      };
    }
    
    // Assign the entire updated object to trigger Valtio reactivity properly
    battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName] = updatedSettings;
    
    console.log(`[battlemapStore] Final wall settings for ${spriteName}:`, updatedSettings);
    console.log(`[battlemapStore] Set ${spriteName} wall to use ${useShared ? 'shared' : 'per-direction'} settings`);
    
    forceRerender();
  },

  getWallUseSharedSettings: (spriteName: string): boolean => {
    const wallSettings = battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName];
    return wallSettings?.useSharedSettings ?? true; // Default to shared
  },

  // Set direction-specific wall settings
  setWallDirectionalSettings: (spriteName: string, direction: IsometricDirection, settings: DirectionalSettings & {
    manualHorizontalOffset: number;
    manualDiagonalNorthEastOffset: number;
    manualDiagonalNorthWestOffset: number;
    relativeAlongEdgeOffset: number;
    relativeTowardCenterOffset: number;
    relativeDiagonalAOffset: number;
    relativeDiagonalBOffset: number;
    useADivisionForNorthEast: boolean;
    useSpriteTrimmingForWalls: boolean;
  }) => {
    const existingSettings = battlemapStore.controls.isometricEditor.wallPositioningSettings[spriteName];
    if (existingSettings) {
      if (!existingSettings.directionalSettings) {
        existingSettings.directionalSettings = {};
      }
      existingSettings.directionalSettings[direction] = settings;
      console.log(`[battlemapStore] Set direction-specific wall settings for ${spriteName} direction ${direction}`);
      forceRerender();
    }
  },
};