import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';
import { useGrid, useMapControls, useTileEditor } from '../../../hooks/battlemap';
import { battlemapStore, battlemapActions } from '../../../store';
import { useSnapshot } from 'valtio';
import { CanvasControls } from './CanvasControls';
import { gameManager } from '../../../game';

/**
 * Custom hook to track component mount state
 */
const useMountedRef = () => {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
};

/**
 * Main component that renders the PixiJS application for the battlemap
 */
const BattleMapCanvas: React.FC = () => {
  const boxRef = useRef<HTMLDivElement>(null);
  const engineInitialized = useRef(false);
  const localGridInitialized = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const maxRetries = 3;
  const mountedRef = useMountedRef();
  
  const { 
    setContainerSize
  } = useGrid();

  const { 
    isLocked
  } = useMapControls();

  const {
    isEditing,
    isEditorVisible
  } = useTileEditor();
  
  const snap = useSnapshot(battlemapStore);

  // Function to initialize the engine with proper error handling
  const initializeEngine = async () => {
    if (!boxRef.current || !mountedRef.current) return false;
    
    // Make sure the container has actual dimensions before initialization
    if (boxRef.current.clientWidth <= 0 || boxRef.current.clientHeight <= 0) {
      console.log('[BattleMapCanvas] Container has zero dimensions, delaying initialization');
      return false;
    }
    
    try {
      console.log('[BattleMapCanvas] Attempting to initialize game manager, attempt:', retryCount + 1);
      await gameManager.initialize(boxRef.current);
      engineInitialized.current = true;
      
      // Initialize local grid and sample tiles after engine is ready
      if (!localGridInitialized.current) {
        console.log('[BattleMapCanvas] Initializing local grid and sample tiles');
        battlemapActions.initializeLocalGrid(30, 20);
        battlemapActions.generateSampleTiles();
        localGridInitialized.current = true;
      }
      
      return true;
    } catch (err) {
      console.error('[BattleMapCanvas] Failed to initialize game engine:', err);
      
      // Only update state if component is still mounted
      if (mountedRef.current) {
        // If we've tried too many times, show an error
        if (retryCount >= maxRetries) {
          setError(`Failed to initialize the battlemap after ${maxRetries} attempts. Please try refreshing the page.`);
        } else {
          // Otherwise increment the retry count and try again later
          setRetryCount(prev => prev + 1);
        }
      }
      
      return false;
    }
  };

  // Update container size when the box ref is available
  useEffect(() => {
    console.log('[BattleMapCanvas] Setting up tile editor');
    
    // Wait for the DOM to be fully ready with proper dimensions
    const readyTimeout = setTimeout(() => {
      if (!boxRef.current) {
        console.log('[BattleMapCanvas] Box reference not available yet');
        return;
      }
      
      const updateSize = async () => {
        if (!boxRef.current || !mountedRef.current) return;
        
        const width = boxRef.current.clientWidth;
        const height = boxRef.current.clientHeight;
        console.log('[BattleMapCanvas] Container size:', width, height);
        
        // Skip if container dimensions are not ready
        if (width <= 0 || height <= 0) {
          console.log('[BattleMapCanvas] Container not ready yet, width or height is zero');
          return;
        }
        
        setContainerSize({ width, height });
        
        // Initialize engine if needed
        if (!engineInitialized.current) {
          await initializeEngine();
        } else {
          // Resize engine if already initialized
          try {
            gameManager.resize(width, height);
          } catch (err) {
            console.error('[BattleMapCanvas] Failed to resize game engine:', err);
          }
        }
      };

      // Initial size calculation
      updateSize();
      
      // Add resize listener
      window.addEventListener('resize', updateSize);
      
      return () => {
        window.removeEventListener('resize', updateSize);
        
        // Clean up engine when component unmounts
        if (engineInitialized.current) {
          try {
            console.log('[BattleMapCanvas] Destroying game engine on unmount');
            gameManager.destroy();
          } catch (err) {
            console.error('[BattleMapCanvas] Failed to destroy game engine:', err);
          }
          engineInitialized.current = false;
          localGridInitialized.current = false;
        }
      };
    }, 500); // Give the DOM time to render
    
    return () => {
      clearTimeout(readyTimeout);
    };
  }, [setContainerSize, retryCount, mountedRef]);

  // Add another effect to retry initialization after a delay if needed
  useEffect(() => {
    if (!mountedRef.current) return;
    
    if (retryCount > 0 && retryCount <= maxRetries && !engineInitialized.current) {
      console.log(`[BattleMapCanvas] Scheduling retry attempt ${retryCount} in 1 second`);
      const retryTimeoutId = setTimeout(() => {
        if (mountedRef.current) {
          initializeEngine();
        }
      }, 1000);
      
      return () => {
        clearTimeout(retryTimeoutId);
      };
    }
  }, [retryCount, mountedRef]);

  // If there's an error, show an error message with retry button
  if (error) {
    return (
      <Box 
        sx={{ 
          width: '100%', 
          height: '100%', 
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center', 
          bgcolor: '#000000',
          color: 'white',
          textAlign: 'center',
          p: 3
        }}
      >
        <Alert severity="error" sx={{ mb: 2, maxWidth: '600px' }}>
          <Typography variant="h5" component="h2" gutterBottom>
            Tile Editor Error
          </Typography>
          <Typography variant="body1" paragraph>
            {error}
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => {
                setError(null);
                setRetryCount(0);
                engineInitialized.current = false;
                localGridInitialized.current = false;
              }}
            >
              Try Again
            </Button>
            <Button 
              variant="outlined" 
              color="primary"
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </Box>
        </Alert>
      </Box>
    );
  }

  return (
    <Box 
      ref={boxRef}
      sx={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative', 
        overflow: 'hidden',
        bgcolor: '#000000'
      }}
    >
      {/* Canvas Controls - These remain as React components */}
      <CanvasControls />
    </Box>
  );
};

export default BattleMapCanvas; 