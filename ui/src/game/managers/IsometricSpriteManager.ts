import { Assets, Texture, Rectangle } from 'pixi.js';

// Isometric directions for 4-directional sprites
export enum IsometricDirection {
  NORTH = 0,   // Top facing
  EAST = 1,    // Right facing  
  SOUTH = 2,   // Bottom facing
  WEST = 3     // Left facing
}

// Sprite categories based on directory structure
export enum SpriteCategory {
  WALLS = 'walls',
  BLOCKS = 'blocks'
}

// Metadata for each sprite file
export interface SpriteMetadata {
  name: string;
  category: SpriteCategory;
  fileName: string;
  fullPath: string;
  frameWidth: number;
  frameHeight: number;
  totalFrames: number; // Should be 4 for directional sprites
}

// Individual frame data for a direction
export interface SpriteFrame {
  texture: Texture;
  direction: IsometricDirection;
  width: number;
  height: number;
}

// Complete sprite data with all directions
export interface IsometricSprite {
  metadata: SpriteMetadata;
  frames: Map<IsometricDirection, SpriteFrame>;
  isLoaded: boolean;
}

/**
 * IsometricSpriteManager handles loading and managing 4-directional isometric sprites
 * Each sprite sheet contains 4 frames in a single row: N, E, S, W directions
 */
export class IsometricSpriteManager {
  private sprites: Map<string, IsometricSprite> = new Map();
  private loadedCategories: Set<SpriteCategory> = new Set();
  private isInitialized = false;

  // Base path for isometric tiles
  private readonly basePath = '/isometric_tiles';

  // Known sprite files (we'll build this dynamically later)
  private readonly knownSprites: SpriteMetadata[] = [
    // Wall sprites
    {
      name: 'WallBrick_Old_Small_03',
      category: SpriteCategory.WALLS,
      fileName: 'WallBrick_Old_Small_03.png',
      fullPath: '/isometric_tiles/walls/WallBrick_Old_Small_03.png',
      frameWidth: 128, // Updated - most isometric sprites are 128x128 per frame
      frameHeight: 128,
      totalFrames: 4
    },
    {
      name: 'WallBrick_Old_Small_01',
      category: SpriteCategory.WALLS,
      fileName: 'WallBrick_Old_Small_01.png', 
      fullPath: '/isometric_tiles/walls/WallBrick_Old_Small_01.png',
      frameWidth: 128,
      frameHeight: 128,
      totalFrames: 4
    },
    {
      name: 'WallBrick_Old_Small_02',
      category: SpriteCategory.WALLS,
      fileName: 'WallBrick_Old_Small_02.png',
      fullPath: '/isometric_tiles/walls/WallBrick_Old_Small_02.png',
      frameWidth: 128,
      frameHeight: 128,
      totalFrames: 4
    },
    // Block/Floor sprites
    {
      name: 'Floor_01',
      category: SpriteCategory.BLOCKS,
      fileName: 'Floor_01.png',
      fullPath: '/isometric_tiles/blocks/Floor_01.png',
      frameWidth: 128,
      frameHeight: 128,
      totalFrames: 4
    },
    {
      name: 'FloorBlock_01',
      category: SpriteCategory.BLOCKS,
      fileName: 'FloorBlock_01.png',
      fullPath: '/isometric_tiles/blocks/FloorBlock_01.png',
      frameWidth: 128,
      frameHeight: 128,
      totalFrames: 4
    }
  ];

  /**
   * Initialize the sprite manager
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[IsometricSpriteManager] Already initialized');
      return;
    }

    console.log('[IsometricSpriteManager] Initializing...');
    
    // Initialize Assets system
    await Assets.init();
    
    this.isInitialized = true;
    console.log('[IsometricSpriteManager] Initialized successfully');
  }

  /**
   * Load all sprites from a specific category
   */
  async loadCategory(category: SpriteCategory): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (this.loadedCategories.has(category)) {
      console.log(`[IsometricSpriteManager] Category ${category} already loaded`);
      return;
    }

    console.log(`[IsometricSpriteManager] Loading category: ${category}`);

    const spritesToLoad = this.knownSprites.filter(sprite => sprite.category === category);
    
    for (const spriteMetadata of spritesToLoad) {
      try {
        await this.loadSprite(spriteMetadata);
      } catch (error) {
        console.warn(`[IsometricSpriteManager] Failed to load sprite ${spriteMetadata.name}:`, error);
      }
    }

    this.loadedCategories.add(category);
    console.log(`[IsometricSpriteManager] Category ${category} loaded successfully`);
  }

  /**
   * Load all available sprites
   */
  async loadAll(): Promise<void> {
    console.log('[IsometricSpriteManager] Loading all sprites...');
    
    await Promise.all([
      this.loadCategory(SpriteCategory.WALLS),
      this.loadCategory(SpriteCategory.BLOCKS)
    ]);

    console.log('[IsometricSpriteManager] All sprites loaded successfully');
  }

  /**
   * Load a specific sprite and parse its 4 directions
   */
  private async loadSprite(metadata: SpriteMetadata): Promise<void> {
    try {
      console.log(`[IsometricSpriteManager] Loading sprite: ${metadata.name}`);

      // Load the texture
      const baseTexture = await Assets.load(metadata.fullPath);
      
      // Calculate frame dimensions (assuming 4 frames in a row)
      const frameWidth = baseTexture.width / 4;
      const frameHeight = baseTexture.height;

      // Update metadata with actual dimensions
      metadata.frameWidth = frameWidth;
      metadata.frameHeight = frameHeight;

      // Create frames for each direction
      const frames = new Map<IsometricDirection, SpriteFrame>();

      for (let i = 0; i < 4; i++) {
        const direction = i as IsometricDirection;
        
        // Create rectangle for this frame
        const frameRect = new Rectangle(
          i * frameWidth, // x position
          0,              // y position (single row)
          frameWidth,     // width
          frameHeight     // height
        );

        // Create texture from the rectangle
        const frameTexture = new Texture({
          source: baseTexture.source,
          frame: frameRect
        });

        frames.set(direction, {
          texture: frameTexture,
          direction,
          width: frameWidth,
          height: frameHeight
        });
      }

      // Store the complete sprite
      const isometricSprite: IsometricSprite = {
        metadata,
        frames,
        isLoaded: true
      };

      this.sprites.set(metadata.name, isometricSprite);
      console.log(`[IsometricSpriteManager] Successfully loaded sprite: ${metadata.name}`);

    } catch (error) {
      console.error(`[IsometricSpriteManager] Error loading sprite ${metadata.name}:`, error);
      throw error;
    }
  }

  /**
   * Get a sprite texture for a specific direction
   */
  getSpriteTexture(spriteName: string, direction: IsometricDirection): Texture | null {
    const sprite = this.sprites.get(spriteName);
    if (!sprite?.isLoaded) {
      console.warn(`[IsometricSpriteManager] Sprite ${spriteName} not loaded`);
      return null;
    }

    const frame = sprite.frames.get(direction);
    return frame?.texture || null;
  }

  /**
   * Get all available sprite names for a category
   */
  getSpritesInCategory(category: SpriteCategory): string[] {
    return Array.from(this.sprites.values())
      .filter(sprite => sprite.metadata.category === category && sprite.isLoaded)
      .map(sprite => sprite.metadata.name);
  }

  /**
   * Get all loaded sprite names
   */
  getAllLoadedSprites(): string[] {
    return Array.from(this.sprites.keys());
  }

  /**
   * Check if a sprite is loaded
   */
  isSpriteLoaded(spriteName: string): boolean {
    return this.sprites.get(spriteName)?.isLoaded || false;
  }

  /**
   * Get sprite metadata
   */
  getSpriteMetadata(spriteName: string): SpriteMetadata | null {
    return this.sprites.get(spriteName)?.metadata || null;
  }

  /**
   * Get sprite frame size for scaling calculations
   */
  getSpriteFrameSize(spriteName: string): { width: number; height: number } | null {
    const sprite = this.sprites.get(spriteName);
    if (!sprite?.isLoaded) {
      return null;
    }

    return {
      width: sprite.metadata.frameWidth,
      height: sprite.metadata.frameHeight
    };
  }

  /**
   * Get all frames for a sprite (all directions)
   */
  getSpriteFrames(spriteName: string): Map<IsometricDirection, SpriteFrame> | null {
    const sprite = this.sprites.get(spriteName);
    return sprite?.isLoaded ? sprite.frames : null;
  }

  /**
   * Calculate grid direction from world coordinates for proper sprite selection
   * This helps choose the right sprite direction based on viewing angle
   */
  getDirectionFromGridPosition(x: number, y: number, viewAngle = 0): IsometricDirection {
    // For now, return SOUTH as default
    // This can be enhanced later for dynamic direction selection
    return IsometricDirection.SOUTH;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    console.log('[IsometricSpriteManager] Destroying sprite manager...');
    
    // Destroy all textures
    this.sprites.forEach(sprite => {
      sprite.frames.forEach(frame => {
        if (frame.texture && !frame.texture.destroyed) {
          frame.texture.destroy();
        }
      });
    });

    this.sprites.clear();
    this.loadedCategories.clear();
    this.isInitialized = false;
    
    console.log('[IsometricSpriteManager] Destroyed successfully');
  }
}

// Create and export a singleton instance
export const isometricSpriteManager = new IsometricSpriteManager(); 