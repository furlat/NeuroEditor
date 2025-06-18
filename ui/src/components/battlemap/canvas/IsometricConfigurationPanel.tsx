import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button,
  TextField,
  Divider,
  Switch,
  FormControlLabel
} from '@mui/material';
import { useSnapshot } from 'valtio';
import { battlemapStore, battlemapActions } from '../../../store';

interface IsometricConfigurationPanelProps {
  isLocked: boolean;
}

/**
 * CLEANED UP Configuration panel - all positioning logic removed
 * Now only handles basic grid utilities and controls
 */
const IsometricConfigurationPanel: React.FC<IsometricConfigurationPanelProps> = ({ isLocked }) => {
  // Basic view controls only
  const viewSnap = useSnapshot(battlemapStore.view);
  const controlsSnap = useSnapshot(battlemapStore.controls);
  
  const gridDiamondWidth = viewSnap.gridDiamondWidth;

  // Simple utility functions
  const clearAllTiles = () => battlemapActions.clearAllTiles();
  const generateSampleTiles = () => battlemapActions.generateSampleTiles();
  const initializeGrid = (width: number, height: number) => battlemapActions.initializeLocalGrid(width, height);

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
        ⚙️ Grid Controls & Utilities
      </Typography>

      {isLocked && (
        <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
          ⚠️ Unlock the map to edit configuration
        </Typography>
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

      {/* Basic Grid Controls */}
      <Typography variant="subtitle2" gutterBottom sx={{ color: '#FFC107' }}>
        🎯 Basic Grid Controls
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

      {/* Ratio Lock Toggle */}
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
                {viewSnap.isRatioLocked ? 'Grid controls locked together' : 'Grid controls independent'}
              </Typography>
            </Box>
          }
        />
      </Box>

      {/* Z-Layer Heights */}
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
            ? '🔒 Heights scale with Grid when ratio locked'
            : '💡 Individual layer vertical offsets (independent scaling)'
          }
        </Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.3)', my: 2 }} />

      {/* Visibility Controls */}
      <Typography variant="subtitle2" gutterBottom sx={{ color: '#4CAF50' }}>
        👁️ Visibility Controls
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
        <FormControlLabel
          control={
            <Switch
              checked={controlsSnap.isGridVisible}
              onChange={() => battlemapActions.setGridVisible(!controlsSnap.isGridVisible)}
              disabled={isLocked}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#4CAF50' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#4CAF50' }
              }}
            />
          }
          label={
            <Typography variant="body2" sx={{ color: controlsSnap.isGridVisible ? '#4CAF50' : 'white' }}>
              {controlsSnap.isGridVisible ? '🟢 Grid Visible' : '🔴 Grid Hidden'}
            </Typography>
          }
        />

        <FormControlLabel
          control={
            <Switch
              checked={controlsSnap.isTilesVisible}
              onChange={() => battlemapActions.setTilesVisible(!controlsSnap.isTilesVisible)}
              disabled={isLocked}
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#4CAF50' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#4CAF50' }
              }}
            />
          }
          label={
            <Typography variant="body2" sx={{ color: controlsSnap.isTilesVisible ? '#4CAF50' : 'white' }}>
              {controlsSnap.isTilesVisible ? '🟩 Tiles Visible' : '🔴 Tiles Hidden'}
            </Typography>
          }
        />
      </Box>

      <Typography variant="body2" sx={{ opacity: 0.7, color: '#4CAF50', fontSize: '0.8rem' }}>
        💡 Basic grid controls and utilities only. All complex positioning configuration removed.
      </Typography>
    </Paper>
  );
};

export default IsometricConfigurationPanel;