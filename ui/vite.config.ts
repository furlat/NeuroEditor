import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Custom plugin for sprite configuration management
function spriteConfigPlugin() {
  return {
    name: 'sprite-config',
    configureServer(server) {
      // API endpoint to save sprite configurations
      server.middlewares.use('/api/sprite-config/save', async (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const config = JSON.parse(body);
            const { spriteName, spriteType } = config;
            
            // Determine config directory and ensure it exists
            const configDir = path.join(process.cwd(), 'public', 'isometric_tiles', 'configs', spriteType + 's');
            if (!fs.existsSync(configDir)) {
              fs.mkdirSync(configDir, { recursive: true });
            }
            
            // Save config file
            const configPath = path.join(configDir, `${spriteName}.json`);
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            
            console.log(`[SpriteConfig] Saved ${spriteType} config: ${configPath}`);
            
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true, path: configPath }));
          } catch (error) {
            console.error('[SpriteConfig] Save error:', error);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: error.message }));
          }
        });
      });

      // API endpoint to load sprite configurations
      server.middlewares.use('/api/sprite-config/load', async (req, res, next) => {
        if (req.method !== 'GET') {
          return next();
        }

        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const spriteName = url.searchParams.get('spriteName');
          const spriteType = url.searchParams.get('spriteType');
          
          if (!spriteName || !spriteType) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing spriteName or spriteType' }));
            return;
          }
          
          const configPath = path.join(process.cwd(), 'public', 'isometric_tiles', 'configs', spriteType + 's', `${spriteName}.json`);
          
          if (!fs.existsSync(configPath)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Config not found' }));
            return;
          }
          
          const configData = fs.readFileSync(configPath, 'utf8');
          const config = JSON.parse(configData);
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(config));
        } catch (error) {
          console.error('[SpriteConfig] Load error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });

      // API endpoint to list all available sprites for initialization
      server.middlewares.use('/api/sprite-config/list-sprites', async (req, res, next) => {
        if (req.method !== 'GET') {
          return next();
        }

        try {
          const url = new URL(req.url, `http://${req.headers.host}`);
          const spriteType = url.searchParams.get('spriteType');
          
          if (!spriteType) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Missing spriteType' }));
            return;
          }
          
          const spritesDir = path.join(process.cwd(), 'public', 'isometric_tiles', spriteType + 's');
          
          if (!fs.existsSync(spritesDir)) {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Sprites directory not found' }));
            return;
          }
          
          const files = fs.readdirSync(spritesDir);
          const sprites = files
            .filter(file => file.endsWith('.png'))
            .map(file => file.replace('.png', ''));
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ sprites }));
        } catch (error) {
          console.error('[SpriteConfig] List sprites error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });

      // API endpoint to initialize default configs
      server.middlewares.use('/api/sprite-config/initialize', async (req, res, next) => {
        if (req.method !== 'POST') {
          return next();
        }

        try {
          console.log('[SpriteConfig] Initializing default configs...');
          
          // Initialize configs for both blocks and walls
          const results = { blocks: [], walls: [] };
          
          for (const spriteType of ['block', 'wall']) {
            const spritesDir = path.join(process.cwd(), 'public', 'isometric_tiles', spriteType + 's');
            const configDir = path.join(process.cwd(), 'public', 'isometric_tiles', 'configs', spriteType + 's');
            
            // Ensure config directory exists
            if (!fs.existsSync(configDir)) {
              fs.mkdirSync(configDir, { recursive: true });
            }
            
            if (fs.existsSync(spritesDir)) {
              const files = fs.readdirSync(spritesDir);
              const sprites = files
                .filter(file => file.endsWith('.png'))
                .map(file => file.replace('.png', ''));
              
              for (const spriteName of sprites) {
                const configPath = path.join(configDir, `${spriteName}.json`);
                
                // Only create if doesn't exist
                if (!fs.existsSync(configPath)) {
                  const defaultConfig = createDefaultSpriteConfig(spriteName, spriteType);
                  fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
                  results[spriteType + 's'].push(spriteName);
                  console.log(`[SpriteConfig] Created default config for ${spriteType}: ${spriteName}`);
                }
              }
            }
          }
          
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            success: true, 
            initialized: results,
            message: `Initialized ${results.blocks.length} block configs and ${results.walls.length} wall configs`
          }));
        } catch (error) {
          console.error('[SpriteConfig] Initialize error:', error);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: error.message }));
        }
      });
    }
  };
}

// Helper function to create default sprite configuration
function createDefaultSpriteConfig(spriteName, spriteType) {
  const defaultDirectionalSettings = {
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
      0: { ...defaultDirectionalSettings }, // NORTH
      1: { ...defaultDirectionalSettings }, // EAST  
      2: { ...defaultDirectionalSettings }, // SOUTH
      3: { ...defaultDirectionalSettings }  // WEST
    }
    // spriteBoundingBox will be computed and added when first loaded
  };
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), spriteConfigPlugin()],
  server: {
    port: 3000, // Match CRA's default port
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path
      }
    }
  }
}) 