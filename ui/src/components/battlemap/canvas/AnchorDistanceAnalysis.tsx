import React from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Button,
  Divider,
  ToggleButton,
  ToggleButtonGroup,
  FormControlLabel,
  Switch,
  Chip
} from '@mui/material';
import { 
  Analytics as AnalyticsIcon,
  Close as CloseIcon,
  Refresh as RefreshIcon,
  GridOn as GridIcon
} from '@mui/icons-material';
import { useSnapshot } from 'valtio';
import { battlemapStore } from '../../../store/battlemap/core';
import { anchorDistanceAnalysisActions } from '../../../store/battlemap/processedAssets';

interface AnchorDistanceAnalysisProps {
  isLocked: boolean;
}

const AnchorDistanceAnalysis: React.FC<AnchorDistanceAnalysisProps> = ({ isLocked }) => {
  // Use selective snapshots to avoid unnecessary re-renders
  const anchorAnalysis = useSnapshot(battlemapStore.processedAssets.anchorDistanceAnalysis);
  const temporaryAssetSnapshot = useSnapshot(battlemapStore.processedAssets);
  const temporaryAsset = temporaryAssetSnapshot.temporaryAsset;
  
  // Don't render if no temporary asset
  if (!temporaryAsset) {
    return null;
  }

  const handleTogglePanel = () => {
    anchorDistanceAnalysisActions.toggleDebugPanel();
  };

  const handleRefreshCalculations = () => {
    anchorDistanceAnalysisActions.calculateDistances();
  };

  const handleSourceAnchorChange = (anchorPoint: string) => {
    anchorDistanceAnalysisActions.setSelectedSourceAnchor(anchorPoint);
  };

  const handleToggleAllSources = () => {
    anchorDistanceAnalysisActions.toggleShowAllSources();
  };

  // Get the current sprite anchor for reference
  const getCurrentSpriteAnchor = () => {
    if (temporaryAsset.directionalBehavior.useSharedSettings) {
      return temporaryAsset.directionalBehavior.sharedSettings.spriteAnchor.spriteAnchorPoint;
    } else {
      // For simplicity, use SOUTH direction when per-direction is enabled
      return temporaryAsset.directionalBehavior.directionalSettings[2].spriteAnchor.spriteAnchorPoint; // IsometricDirection.SOUTH = 2
    }
  };

  const spriteAnchorOptions = [
    'center', 'top_left', 'top_center', 'top_right',
    'middle_left', 'middle_right', 'bottom_left', 'bottom_center', 'bottom_right'
  ];

  // Compact toggle button
  if (!anchorAnalysis.isDebugPanelOpen) {
    return (
      <Box sx={{ 
        position: 'relative',
        mb: 1,
        display: 'flex',
        justifyContent: 'center'
      }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<AnalyticsIcon />}
          onClick={handleTogglePanel}
          disabled={isLocked}
          sx={{
            fontSize: '0.7rem',
            borderColor: '#FFC107',
            color: '#FFC107',
            '&:hover': {
              borderColor: '#FFB300',
              color: '#FFB300',
              backgroundColor: 'rgba(255, 193, 7, 0.1)'
            }
          }}
        >
          📐 Anchor Distances
        </Button>
      </Box>
    );
  }

  // Full panel
  return (
    <Paper sx={{ 
      p: 2, 
      mb: 1,
      backgroundColor: 'rgba(255, 193, 7, 0.1)',  // Changed to yellow/orange like configuration panel
      border: '1px solid #FFC107',                // Changed to match configuration panel border
      color: 'white',
      maxHeight: '600px',  // Increased from 400px to 600px
      overflow: 'auto',
      minWidth: '350px'    // Added minimum width for better layout
    }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AnalyticsIcon sx={{ color: '#FFC107' }} />
          <Typography variant="h6" sx={{ color: '#FFC107', fontSize: '0.9rem' }}>
            📐 Anchor Distance Analysis
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            size="small"
            onClick={handleRefreshCalculations}
            disabled={isLocked}
            sx={{ color: '#FFC107' }}
          >
            <RefreshIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={handleTogglePanel}
            sx={{ color: '#FFC107' }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Controls */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ color: '#FFC107', display: 'block', mb: 1 }}>
          Current Asset: {temporaryAsset.displayName} • Current Sprite Anchor: {getCurrentSpriteAnchor()}
        </Typography>
        
        {/* Source Anchor Selector */}
        <Box sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ color: '#FFC107', fontSize: '0.7rem', mb: 1, display: 'block' }}>
            📍 Analyze From Anchor:
          </Typography>
          <ToggleButtonGroup
            value={anchorAnalysis.selectedSourceAnchor || getCurrentSpriteAnchor()}
            exclusive
            onChange={(_, value) => value && handleSourceAnchorChange(value)}
            size="small"
            sx={{ flexWrap: 'wrap' }}
          >
            <ToggleButton value="current" sx={{ color: 'white', fontSize: '0.6rem', padding: '2px 6px' }}>
              Current
            </ToggleButton>
            {spriteAnchorOptions.map(anchor => (
              <ToggleButton 
                key={anchor} 
                value={anchor} 
                sx={{ color: 'white', fontSize: '0.6rem', padding: '2px 6px' }}
              >
                {anchor.replace('_', '-')}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        {/* Show All Sources Toggle */}
        <FormControlLabel
          control={
            <Switch
              checked={anchorAnalysis.showAllSources}
              onChange={handleToggleAllSources}
              disabled={isLocked}
              size="small"
              sx={{
                '& .MuiSwitch-switchBase.Mui-checked': { color: '#FFC107' },
                '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#FFC107' }
              }}
            />
          }
          label={
            <Typography variant="caption" sx={{ 
              color: anchorAnalysis.showAllSources ? '#FFC107' : 'white',
              fontSize: '0.65rem' 
            }}>
              📊 Show All Sources
            </Typography>
          }
        />
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 193, 7, 0.3)', mb: 2 }} />

      {/* Distance Display */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ color: '#FFC107', fontSize: '0.7rem', mb: 1, display: 'block' }}>
          🎯 Distances to Diamond Corners:
        </Typography>
        
        {anchorAnalysis.showAllSources ? (
          // Show all sprite anchors
          <Box>
            {spriteAnchorOptions.map(spriteAnchor => {
              const distanceData = anchorDistanceAnalysisActions.getDistanceDataForAnchor(spriteAnchor);
              
              return (
                <Box key={spriteAnchor} sx={{ mb: 2, p: 1, border: '1px solid rgba(255, 193, 7, 0.3)', borderRadius: 1 }}>
                  <Typography variant="caption" sx={{ color: '#E8F5E8', fontSize: '0.7rem', mb: 1, display: 'block', fontWeight: 'bold' }}>
                    {spriteAnchor.replace('_', '-').toUpperCase()}:
                  </Typography>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                    {['north', 'east', 'south', 'west'].map(corner => {
                      const data = distanceData[corner];
                      if (!data) return null;
                      
                      return (
                        <Box key={corner} sx={{ fontSize: '0.6rem', color: 'white' }}>
                          <Chip 
                            label={corner.toUpperCase()} 
                            size="small" 
                            sx={{ 
                              fontSize: '0.5rem', 
                              height: '16px', 
                              backgroundColor: getCornerColor(corner),
                              color: 'white',
                              mb: 0.5
                            }} 
                          />
                          <Typography variant="caption" sx={{ fontSize: '0.55rem', display: 'block' }}>
                            📏 {data.distance}px
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.7)' }}>
                            ΔX: {data.deltaX >= 0 ? '+' : ''}{data.deltaX}
                          </Typography>
                          <Typography variant="caption" sx={{ fontSize: '0.5rem', color: 'rgba(255,255,255,0.7)', display: 'block' }}>
                            ΔY: {data.deltaY >= 0 ? '+' : ''}{data.deltaY}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              );
            })}
          </Box>
        ) : (
          // Show single selected anchor
          (() => {
            const selectedAnchor = anchorAnalysis.selectedSourceAnchor || getCurrentSpriteAnchor();
            const distanceData = anchorDistanceAnalysisActions.getDistanceDataForAnchor(selectedAnchor);
            
            return (
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
                {['north', 'east', 'south', 'west'].map(corner => {
                  const data = distanceData[corner];
                  if (!data) return null;
                  
                  return (
                    <Box key={corner} sx={{ 
                      p: 1, 
                      border: '1px solid rgba(255, 193, 7, 0.3)',  // Changed border color
                      borderRadius: 1,
                      backgroundColor: 'rgba(255, 193, 7, 0.05)'   // Changed background color
                    }}>
                      <Chip 
                        label={corner.toUpperCase()} 
                        size="small" 
                        sx={{ 
                          fontSize: '0.6rem', 
                          height: '18px', 
                          backgroundColor: getCornerColor(corner),
                          color: 'white',
                          mb: 1
                        }} 
                      />
                      <Typography variant="body2" sx={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#FFC107' }}>  {/* Changed color */}
                        📏 {data.distance}px
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.8)', display: 'block' }}>
                        ΔX: {data.deltaX >= 0 ? '+' : ''}{data.deltaX}px
                      </Typography>
                      <Typography variant="caption" sx={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.8)', display: 'block' }}>
                        ΔY: {data.deltaY >= 0 ? '+' : ''}{data.deltaY}px
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            );
          })()
        )}
      </Box>

      {/* Footer Info */}
      <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid rgba(255, 193, 7, 0.3)' }}>  {/* Changed border color */}
        <Typography variant="caption" sx={{ 
          color: 'rgba(255, 193, 7, 0.7)',  // Changed from purple to orange
          fontSize: '0.55rem',
          display: 'block'
        }}>
          💡 Distances are zoom/camera invariant • ΔX+: right of corner • ΔY+: below corner
        </Typography>
        {anchorAnalysis.lastCalculationAt && (
          <Typography variant="caption" sx={{ 
            color: 'rgba(255, 193, 7, 0.6)',  // Changed from purple to orange
            fontSize: '0.5rem',
            display: 'block'
          }}>
            🕐 Last calculated: {new Date(anchorAnalysis.lastCalculationAt).toLocaleTimeString()}
          </Typography>
        )}
      </Box>
    </Paper>
  );
};

// Helper function to get corner colors
const getCornerColor = (corner: string): string => {
  switch (corner) {
    case 'north': return '#FF5722'; // Red-orange
    case 'east': return '#4CAF50';  // Green
    case 'south': return '#2196F3'; // Blue
    case 'west': return '#FF9800';  // Orange
    default: return '#9E9E9E';      // Grey
  }
};

export default AnchorDistanceAnalysis; 