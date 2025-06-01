import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton,
  Tooltip,
  Button,
  Checkbox
} from '@mui/material';
import { 
  Layers as LayersIcon,
  RadioButtonChecked as ActiveIcon,
  RadioButtonUnchecked as InactiveIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Opacity as ShadowingOnIcon,
  BlurOff as ShadowingOffIcon
} from '@mui/icons-material';
import { useSnapshot } from 'valtio';
import { battlemapStore, battlemapActions, Z_LAYER_CONFIG, LayerVisibilityMode } from '../../../store';

interface ZLayerSelectorProps {
  isLocked: boolean;
}

/**
 * Z-Layer selector component
 * PERFORMANCE OPTIMIZED: Only subscribes to view properties needed for layer management
 */
const ZLayerSelector: React.FC<ZLayerSelectorProps> = ({ isLocked }) => {
  // PERFORMANCE FIX: Only subscribe to the specific view properties we need
  // Avoid subscribing to offset that changes during WASD movement
  const viewSnap = useSnapshot(battlemapStore.view);
  const activeZLayer = viewSnap.activeZLayer;
  const gridLayerVisibility = viewSnap.gridLayerVisibility;
  const layerVisibilityMode = viewSnap.layerVisibilityMode;
  
  const handleLayerSelect = (zLayer: number) => {
    if (isLocked) return;
    battlemapActions.setActiveZLayer(zLayer);
  };
  
  // Toggle grid layer visibility for individual layers
  const handleToggleGridLayerVisibility = (zLayer: number) => {
    if (isLocked) return;
    battlemapActions.toggleGridLayerVisibility(zLayer);
  };
  
  // Toggle layer shadowing effect
  const handleToggleShadowing = () => {
    if (isLocked) return;
    battlemapActions.cycleLayerVisibilityMode();
  };
  
  // Show/hide all grid layers
  const handleShowAllGridLayers = () => {
    if (isLocked) return;
    battlemapActions.showAllGridLayers();
  };
  
  const handleHideAllGridLayers = () => {
    if (isLocked) return;
    battlemapActions.hideAllGridLayers();
  };
  
  const visibleLayerCount = Object.values(gridLayerVisibility).filter(Boolean).length;
  
  return (
    <Paper 
      sx={{ 
        position: 'absolute', 
        left: 16,
        bottom: 16,
        padding: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        zIndex: 1000,
        maxWidth: 'calc(100vw - 32px)',
        flexWrap: 'wrap'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <LayersIcon sx={{ fontSize: '16px', color: '#00BCD4' }} />
        <Typography variant="caption" sx={{ color: '#00BCD4', fontSize: '0.7rem' }}>
          Z Layers
        </Typography>
      </Box>
      
      {/* Layer visibility mode toggle button */}
      <Tooltip 
        title={`Current: ${layerVisibilityMode.toUpperCase()} mode. Click to cycle: NORMAL → SHADOW → INVISIBLE → NORMAL...`}
        placement="top"
      >
        <Button
          size="small"
          variant="contained"
          disabled={isLocked}
          onClick={handleToggleShadowing}
          sx={{
            minWidth: 'auto',
            padding: '4px 8px',
            fontSize: '0.6rem',
            color: 'white',
            borderColor: layerVisibilityMode === LayerVisibilityMode.NORMAL ? '#4CAF50' : 
                        layerVisibilityMode === LayerVisibilityMode.SHADOW ? '#FF9800' : '#F44336',
            backgroundColor: layerVisibilityMode === LayerVisibilityMode.NORMAL ? '#4CAF50' : 
                           layerVisibilityMode === LayerVisibilityMode.SHADOW ? '#FF9800' : '#F44336',
            '&:hover': {
              backgroundColor: layerVisibilityMode === LayerVisibilityMode.NORMAL ? '#45a049' :
                             layerVisibilityMode === LayerVisibilityMode.SHADOW ? '#F57C00' : '#e53935',
            },
            '&:disabled': {
              opacity: 0.5
            }
          }}
          startIcon={layerVisibilityMode === LayerVisibilityMode.NORMAL ? <VisibilityIcon sx={{ fontSize: '12px' }} /> :
                    layerVisibilityMode === LayerVisibilityMode.SHADOW ? <ShadowingOnIcon sx={{ fontSize: '12px' }} /> :
                    <ShadowingOffIcon sx={{ fontSize: '12px' }} />}
        >
          {layerVisibilityMode.toUpperCase()}
        </Button>
      </Tooltip>
      
      {isLocked && (
        <Typography variant="caption" color="warning.main" sx={{ fontSize: '0.6rem' }}>
          🔒 Locked
        </Typography>
      )}
      
      {/* Individual layer controls */}
      {battlemapActions.getAllZLayerConfigs().map((layerConfig, index) => {
        const isActive = activeZLayer === index;
        const isGridVisible = gridLayerVisibility[index] ?? false;
        const layerColor = `#${layerConfig.color.toString(16).padStart(6, '0')}`;
        
        return (
          <Box
            key={index}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              p: 0.5,
              borderRadius: 1,
              backgroundColor: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: isActive ? '1px solid #00BCD4' : '1px solid transparent',
              minWidth: 'auto' // Allow compact sizing
            }}
          >
            {/* Layer selection button */}
            <Tooltip 
              title={`Select ${layerConfig.name} as Active Layer (Z:${layerConfig.z}, Offset:${layerConfig.verticalOffset}px)`}
              placement="top"
            >
              <IconButton
                size="small"
                disabled={isLocked}
                onClick={() => handleLayerSelect(index)}
                sx={{ 
                  color: isActive ? '#00BCD4' : layerColor,
                  p: 0.25,
                  '&:hover': { 
                    backgroundColor: isLocked ? 'transparent' : 'rgba(255,255,255,0.1)' 
                  }
                }}
              >
                {isActive ? <ActiveIcon sx={{ fontSize: '18px' }} /> : <InactiveIcon sx={{ fontSize: '18px' }} />}
              </IconButton>
            </Tooltip>
            
            {/* Layer info - now horizontal */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '0.65rem', 
                  color: isActive ? '#00BCD4' : 'white',
                  fontWeight: isActive ? 'bold' : 'normal'
                }}
              >
                {layerConfig.name}
              </Typography>
              
              <Typography 
                variant="caption" 
                sx={{ 
                  fontSize: '0.5rem', 
                  color: layerColor,
                  opacity: 0.8
                }}
              >
                (Z:{layerConfig.z})
              </Typography>
              
              {layerConfig.verticalOffset > 0 && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontSize: '0.5rem', 
                    color: layerColor,
                    opacity: 0.6
                  }}
                >
                  +{layerConfig.verticalOffset}px
                </Typography>
              )}
            </Box>
            
            {/* Grid visibility toggle */}
            <Tooltip 
              title={
                isActive 
                  ? "Current layer grid is always visible" 
                  : (isGridVisible ? "Hide Grid Layer" : "Show Grid Layer")
              }
              placement="top"
            >
              <Checkbox
                checked={isGridVisible}
                onChange={() => handleToggleGridLayerVisibility(index)}
                disabled={isLocked || isActive}
                size="small"
                icon={<VisibilityOffIcon sx={{ fontSize: '14px', color: 'rgba(255,255,255,0.3)' }} />}
                checkedIcon={<VisibilityIcon sx={{ fontSize: '14px', color: layerColor }} />}
                sx={{
                  p: 0.25,
                  '&:hover': {
                    backgroundColor: (isLocked || isActive) ? 'transparent' : 'rgba(255,255,255,0.1)'
                  },
                  opacity: isActive ? 0.5 : 1.0
                }}
              />
            </Tooltip>
          </Box>
        );
      })}
      
      {/* Status info - now horizontal and compact */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 1 }}>
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '0.5rem', 
            color: 'rgba(255,255,255,0.5)'
          }}
        >
          Active: {battlemapActions.getAllZLayerConfigs()[activeZLayer].name}
        </Typography>
        
        <Typography 
          variant="caption" 
          sx={{ 
            fontSize: '0.45rem', 
            color: 'rgba(255,255,255,0.3)'
          }}
        >
          Grids: {visibleLayerCount}/3 | Tiles: {layerVisibilityMode.toUpperCase()}
        </Typography>
      </Box>
    </Paper>
  );
};

export default ZLayerSelector; 