import { 
  SpriteConfiguration, 
  DirectionalSpriteSettings, 
  SpriteBoundingBoxData,
  SpriteConfigurationManager as ISpriteConfigurationManager 
} from '../types/battlemap_types';
import { IsometricDirection } from '../game/managers/IsometricSpriteManager';
import { battlemapStore, battlemapActions } from '../store';
import { isometricSpriteManager } from '../game/managers/IsometricSpriteManager';
import { getCanvasBoundingBox } from 'pixi.js';

/**
 * Service for managing sprite configurations with JSON persistence
 * Handles loading, saving, and synchronization between store and config files
 */
class SpriteConfigurationManagerImpl implements ISpriteConfigurationManager {
  private configCache: Map<string, SpriteConfiguration> = new Map();
  private initialized: boolean = false;

  /**
   * Initialize the configuration system by creating default configs for all sprites
   */
  async initializeDefaultConfigs(): Promise<void> {
    if (this.initialized) return;
    
    try {
      console.log('[SpriteConfigurationManager] Initializing default configurations...');
      
      const response = await fetch('/api/sprite-config/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('[SpriteConfigurationManager] Initialization result:', result);
      
      this.initialized = true;
    } catch (error) {
      console.error('[SpriteConfigurationManager] Failed to initialize configs:', error);
      throw error;
    }
  }

  /**
   * Load configuration for a specific sprite
   */
  async loadConfig(spriteName: string, spriteType: 'block' | 'wall'): Promise<SpriteConfiguration | null> {
    const cacheKey = `${spriteType}:${spriteName}`;
    
    // Check cache first
    if (this.configCache.has(cacheKey)) {
      return this.configCache.get(cacheKey)!;
    }
    
    try {
      const response = await fetch(`/api/sprite-config/load?spriteName=${encodeURIComponent(spriteName)}&spriteType=${encodeURIComponent(spriteType)}`);
      
      if (response.status === 404) {
        // Config doesn't exist, create default
        const defaultConfig = this.createDefaultConfig(spriteName, spriteType);
        await this.saveConfig(defaultConfig);
        this.configCache.set(cacheKey, defaultConfig);
        return defaultConfig;
      }
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const config = await response.json() as SpriteConfiguration;
      
      // Ensure bounding box data is computed
      if (!config.spriteBoundingBox) {
        const updatedConfig = await this.computeAndAddBoundingBox(config);
        await this.saveConfig(updatedConfig);
        this.configCache.set(cacheKey, updatedConfig);
        return updatedConfig;
      }
      
      this.configCache.set(cacheKey, config);
      return config;
    } catch (error) {
      console.error(`[SpriteConfigurationManager] Failed to load config for ${spriteType}:${spriteName}:`, error);
      return null;
    }
  }

  /**
   * Save configuration for a specific sprite
   */
  async saveConfig(config: SpriteConfiguration): Promise<boolean> {
    try {
      // Update last modified timestamp
      const updatedConfig = {
        ...config,
        lastModified: new Date().toISOString()
      };
      
      const response = await fetch('/api/sprite-config/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedConfig)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      console.log(`[SpriteConfigurationManager] Saved config for ${config.spriteType}:${config.spriteName}:`, result);
      
      // Update cache
      const cacheKey = `${config.spriteType}:${config.spriteName}`;
      this.configCache.set(cacheKey, updatedConfig);
      
      return true;
    } catch (error) {
      console.error(`[SpriteConfigurationManager] Failed to save config for ${config.spriteType}:${config.spriteName}:`, error);
      return false;
    }
  }

  /**
   * Synchronize configuration from JSON file to store
   */
  async syncConfigToStore(spriteName: string, spriteType: 'block' | 'wall'): Promise<void> {
    const config = await this.loadConfig(spriteName, spriteType);
    if (!config) {
      console.warn(`[SpriteConfigurationManager] No config found for ${spriteType}:${spriteName}`);
      return;
    }
    
    console.log(`[SpriteConfigurationManager] Syncing config to store for ${spriteType}:${spriteName}`);
    
    if (spriteType === 'block') {
      // Update block settings in store
      const settings = config.useSharedSettings 
        ? config.sharedSettings 
        : config.directionalSettings[IsometricDirection.SOUTH]; // Use South as default
      
      // FIXED: Recalculate autoComputedVerticalBias if useAutoComputed is true
      let finalAutoComputedVerticalBias = settings.autoComputedVerticalBias;
      if (settings.useAutoComputed) {
        const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
        if (spriteFrameSize) {
          const recalculated = battlemapActions.calculateSpriteTypePositioning(
            spriteFrameSize.width, 
            spriteFrameSize.height,
            {
              up: settings.invisibleMarginUp,
              down: settings.invisibleMarginDown,
              left: settings.invisibleMarginLeft,
              right: settings.invisibleMarginRight
            }
          );
          finalAutoComputedVerticalBias = recalculated.autoComputedVerticalBias;
          console.log(`[SpriteConfigurationManager] Recalculated stale autoComputedVerticalBias for ${spriteName}: ${settings.autoComputedVerticalBias} -> ${finalAutoComputedVerticalBias}`);
        }
      }
      
      battlemapActions.setSpriteTypeSettings(spriteName, {
        invisibleMarginUp: settings.invisibleMarginUp,
        invisibleMarginDown: settings.invisibleMarginDown,
        invisibleMarginLeft: settings.invisibleMarginLeft,
        invisibleMarginRight: settings.invisibleMarginRight,
        autoComputedVerticalBias: finalAutoComputedVerticalBias, // Use recalculated value
        useAutoComputed: settings.useAutoComputed,
        manualVerticalBias: settings.manualVerticalBias
      });
    } else {
      // Update wall settings in store
      const settings = config.useSharedSettings 
        ? config.sharedSettings 
        : config.directionalSettings[IsometricDirection.SOUTH]; // Use South as default
      
      // FIXED: Recalculate autoComputedVerticalBias if useAutoComputed is true (same logic for walls)
      let finalAutoComputedVerticalBias = settings.autoComputedVerticalBias;
      if (settings.useAutoComputed) {
        const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(spriteName);
        if (spriteFrameSize) {
          const recalculated = battlemapActions.calculateSpriteTypePositioning(
            spriteFrameSize.width, 
            spriteFrameSize.height,
            {
              up: settings.invisibleMarginUp,
              down: settings.invisibleMarginDown,
              left: settings.invisibleMarginLeft,
              right: settings.invisibleMarginRight
            }
          );
          finalAutoComputedVerticalBias = recalculated.autoComputedVerticalBias;
          console.log(`[SpriteConfigurationManager] Recalculated stale autoComputedVerticalBias for wall ${spriteName}: ${settings.autoComputedVerticalBias} -> ${finalAutoComputedVerticalBias}`);
        }
      }
      
      battlemapActions.setWallPositioningSettings(spriteName, {
        invisibleMarginUp: settings.invisibleMarginUp,
        invisibleMarginDown: settings.invisibleMarginDown,
        invisibleMarginLeft: settings.invisibleMarginLeft,
        invisibleMarginRight: settings.invisibleMarginRight,
        autoComputedVerticalBias: finalAutoComputedVerticalBias, // Use recalculated value
        useAutoComputed: settings.useAutoComputed,
        manualVerticalBias: settings.manualVerticalBias,
        manualHorizontalOffset: settings.manualHorizontalOffset || 0,
        manualDiagonalNorthEastOffset: settings.manualDiagonalNorthEastOffset || 0,
        manualDiagonalNorthWestOffset: settings.manualDiagonalNorthWestOffset || 0,
        relativeAlongEdgeOffset: settings.relativeAlongEdgeOffset || 0,
        relativeTowardCenterOffset: settings.relativeTowardCenterOffset || 0,
        relativeDiagonalAOffset: settings.relativeDiagonalAOffset || 8,
        relativeDiagonalBOffset: settings.relativeDiagonalBOffset || 3,
        useADivisionForNorthEast: settings.useADivisionForNorthEast ?? true,
        useSpriteTrimmingForWalls: settings.useSpriteTrimmingForWalls ?? true,
        spriteBoundingBox: config.spriteBoundingBox
      });
    }
  }

  /**
   * Synchronize store settings to configuration and return the config
   */
  async syncStoreToConfig(spriteName: string, spriteType: 'block' | 'wall'): Promise<SpriteConfiguration> {
    // Load existing config or create default
    let config = await this.loadConfig(spriteName, spriteType);
    if (!config) {
      config = this.createDefaultConfig(spriteName, spriteType);
    }
    
    console.log(`[SpriteConfigurationManager] Syncing store to config for ${spriteType}:${spriteName}`);
    
    if (spriteType === 'block') {
      const storeSettings = battlemapActions.getSpriteTypeSettings(spriteName);
      if (storeSettings) {
        const newSettings: DirectionalSpriteSettings = {
          invisibleMarginUp: storeSettings.invisibleMarginUp,
          invisibleMarginDown: storeSettings.invisibleMarginDown,
          invisibleMarginLeft: storeSettings.invisibleMarginLeft,
          invisibleMarginRight: storeSettings.invisibleMarginRight,
          autoComputedVerticalBias: storeSettings.autoComputedVerticalBias,
          useAutoComputed: storeSettings.useAutoComputed,
          manualVerticalBias: storeSettings.manualVerticalBias
        };
        
        // Update config with current store settings
        config = {
          ...config,
          sharedSettings: newSettings,
          directionalSettings: {
            [IsometricDirection.NORTH]: newSettings,
            [IsometricDirection.EAST]: newSettings,
            [IsometricDirection.SOUTH]: newSettings,
            [IsometricDirection.WEST]: newSettings
          }
        };
      }
    } else {
      const storeSettings = battlemapActions.getWallPositioningSettings(spriteName);
      if (storeSettings) {
        const newSettings: DirectionalSpriteSettings = {
          invisibleMarginUp: storeSettings.invisibleMarginUp,
          invisibleMarginDown: storeSettings.invisibleMarginDown,
          invisibleMarginLeft: storeSettings.invisibleMarginLeft,
          invisibleMarginRight: storeSettings.invisibleMarginRight,
          autoComputedVerticalBias: storeSettings.autoComputedVerticalBias,
          useAutoComputed: storeSettings.useAutoComputed,
          manualVerticalBias: storeSettings.manualVerticalBias,
          manualHorizontalOffset: storeSettings.manualHorizontalOffset,
          manualDiagonalNorthEastOffset: storeSettings.manualDiagonalNorthEastOffset,
          manualDiagonalNorthWestOffset: storeSettings.manualDiagonalNorthWestOffset,
          relativeAlongEdgeOffset: storeSettings.relativeAlongEdgeOffset,
          relativeTowardCenterOffset: storeSettings.relativeTowardCenterOffset,
          relativeDiagonalAOffset: storeSettings.relativeDiagonalAOffset,
          relativeDiagonalBOffset: storeSettings.relativeDiagonalBOffset,
          useADivisionForNorthEast: storeSettings.useADivisionForNorthEast,
          useSpriteTrimmingForWalls: storeSettings.useSpriteTrimmingForWalls
        };
        
        // Update config with current store settings
        config = {
          ...config,
          sharedSettings: newSettings,
          directionalSettings: {
            [IsometricDirection.NORTH]: newSettings,
            [IsometricDirection.EAST]: newSettings,
            [IsometricDirection.SOUTH]: newSettings,
            [IsometricDirection.WEST]: newSettings
          },
          spriteBoundingBox: storeSettings.spriteBoundingBox
        };
      }
    }
    
    return config;
  }

  /**
   * Create a default configuration for a sprite
   */
  createDefaultConfig(spriteName: string, spriteType: 'block' | 'wall'): SpriteConfiguration {
    const defaultDirectionalSettings: DirectionalSpriteSettings = {
      invisibleMarginUp: 8,
      invisibleMarginDown: 8,
      invisibleMarginLeft: 8,
      invisibleMarginRight: 8,
      autoComputedVerticalBias: 0,
      useAutoComputed: spriteType === 'block', // Blocks use auto, walls use manual by default
      manualVerticalBias: 0,
      ...(spriteType === 'wall' && {
        manualHorizontalOffset: 0,
        manualDiagonalNorthEastOffset: 0,
        manualDiagonalNorthWestOffset: 0,
        relativeAlongEdgeOffset: 0,
        relativeTowardCenterOffset: 0,
        relativeDiagonalAOffset: 8, // Default values from user's perfect setup
        relativeDiagonalBOffset: 3,
        useADivisionForNorthEast: true,
        useSpriteTrimmingForWalls: true // Default to using bounding box
      })
    };

    return {
      spriteName,
      spriteType,
      version: '1.0.0',
      lastModified: new Date().toISOString(),
      useSharedSettings: true, // Default to shared settings
      sharedSettings: defaultDirectionalSettings,
      directionalSettings: {
        [IsometricDirection.NORTH]: { ...defaultDirectionalSettings },
        [IsometricDirection.EAST]: { ...defaultDirectionalSettings },
        [IsometricDirection.SOUTH]: { ...defaultDirectionalSettings },
        [IsometricDirection.WEST]: { ...defaultDirectionalSettings }
      }
      // spriteBoundingBox will be computed when needed
    };
  }

  /**
   * Get the file path for a sprite configuration
   */
  getConfigPath(spriteName: string, spriteType: 'block' | 'wall'): string {
    return `/isometric_tiles/configs/${spriteType}s/${spriteName}.json`;
  }

  /**
   * Compute and add bounding box data to a configuration
   */
  private async computeAndAddBoundingBox(config: SpriteConfiguration): Promise<SpriteConfiguration> {
    try {
      const spriteFrameSize = isometricSpriteManager.getSpriteFrameSize(config.spriteName);
      if (!spriteFrameSize) {
        console.warn(`[SpriteConfigurationManager] Could not get frame size for ${config.spriteName}`);
        return config;
      }

      // Try to get the texture and compute bounding box
      const texture = isometricSpriteManager.getSpriteTexture(config.spriteName, IsometricDirection.SOUTH);
      if (!texture || !texture.baseTexture.resource) {
        console.warn(`[SpriteConfigurationManager] Could not get texture for ${config.spriteName}`);
        return config;
      }

      // Create temporary canvas for bounding box computation
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      if (!context) {
        console.warn(`[SpriteConfigurationManager] Could not create canvas context for ${config.spriteName}`);
        return config;
      }

      canvas.width = texture.width;
      canvas.height = texture.height;

      const img = texture.baseTexture.resource.source as HTMLImageElement;
      if (!img || !img.complete) {
        console.warn(`[SpriteConfigurationManager] Image not ready for ${config.spriteName}`);
        return config;
      }

      // Draw texture to canvas
      context.drawImage(
        img,
        texture.frame.x, texture.frame.y, texture.frame.width, texture.frame.height,
        0, 0, texture.frame.width, texture.frame.height
      );

      // Get bounding box
      const boundingBox = getCanvasBoundingBox(canvas, 1);
      
      const spriteBoundingBox: SpriteBoundingBoxData = {
        originalWidth: spriteFrameSize.width,
        originalHeight: spriteFrameSize.height,
        boundingX: boundingBox.x,
        boundingY: boundingBox.y,
        boundingWidth: boundingBox.width,
        boundingHeight: boundingBox.height,
        anchorOffsetX: boundingBox.x / spriteFrameSize.width,
        anchorOffsetY: boundingBox.y / spriteFrameSize.height
      };

      console.log(`[SpriteConfigurationManager] Computed bounding box for ${config.spriteName}:`, spriteBoundingBox);

      return {
        ...config,
        spriteBoundingBox
      };
    } catch (error) {
      console.error(`[SpriteConfigurationManager] Failed to compute bounding box for ${config.spriteName}:`, error);
      return config;
    }
  }

  /**
   * Clear the configuration cache
   */
  clearCache(): void {
    this.configCache.clear();
    console.log('[SpriteConfigurationManager] Cache cleared');
  }

  /**
   * Get cached configuration without loading from file
   */
  getCachedConfig(spriteName: string, spriteType: 'block' | 'wall'): SpriteConfiguration | null {
    const cacheKey = `${spriteType}:${spriteName}`;
    return this.configCache.get(cacheKey) || null;
  }
}

// Export singleton instance
export const spriteConfigurationManager = new SpriteConfigurationManagerImpl(); 