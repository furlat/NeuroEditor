import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  IconButton, 
  Button,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  Slider,
  Switch,
  FormControlLabel,
  Chip,
  Grid,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  ExpandMore as ExpandMoreIcon,
  Settings as SettingsIcon,
  Crop as CropIcon,
  Transform as TransformIcon,
  Gamepad as GamepadIcon,
  Preview as PreviewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useSnapshot } from 'valtio';
import { battlemapStore } from '../store';
import { processedAssetsActions } from '../store/battlemap/processedAssets';

interface ProcessedAssetConfigurationPanelProps {
  isLocked: boolean;
}

const ProcessedAssetConfigurationPanel: React.FC<ProcessedAssetConfigurationPanelProps> = ({ isLocked }) => {
  // Store subscriptions
  const processedAssetsSnap = useSnapshot(battlemapStore.processedAssets);
  const temporaryAsset = processedAssetsSnap.temporaryAsset;

  // Handle refreshing the preview
  const handleRefreshPreview = () => {
    if (temporaryAsset) {
      // Clear existing instances first
      const existingInstances = processedAssetsActions.instances.getAllInstances();
      Object.keys(existingInstances).forEach(instanceKey => {
        processedAssetsActions.instances.removeAssetInstance(instanceKey);
      });
      
      // Re-place directional instances
      const placements = [
        { position: [0, 0] as const, direction: 0 }, // North
        { position: [0, 2] as const, direction: 1 }, // East
        { position: [2, 0] as const, direction: 2 }, // South
        { position: [2, 2] as const, direction: 3 }, // West
      ];
      
      placements.forEach(({ position, direction }) => {
        processedAssetsActions.instances.placeAssetInstance(
          temporaryAsset.id,
          position,
          0, // Z level 0
          direction as any,
          'above' // Snap position
        );
      });
      
      console.log(`[ProcessedAssetConfigurationPanel] Refreshed preview for asset: ${temporaryAsset.id}`);
    }
  };

  return (
    <Paper sx={{ 
      p: 3, 
      backgroundColor: 'rgba(0, 0, 0, 0.9)', 
      color: 'white',
      maxHeight: '85vh',
      overflow: 'auto',
      minWidth: '500px',
      maxWidth: '600px'
    }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" sx={{ color: '#FF9800', mb: 1 }}>
          ⚙️ Asset Configuration
        </Typography>
        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
          Configure positioning and gameplay properties
        </Typography>
      </Box>

      {isLocked && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Unlock the map to configure assets
        </Alert>
      )}

      {/* Current Asset Info */}
      {temporaryAsset && (
        <Box sx={{ 
          mb: 3, 
          p: 3, 
          border: '2px solid #FF9800', 
          borderRadius: 2,
          backgroundColor: 'rgba(255, 152, 0, 0.05)'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
            <Typography variant="h6" sx={{ color: '#FF9800' }}>
              📌 Current Asset:
            </Typography>
            <Button
              size="medium"
              startIcon={<RefreshIcon />}
              onClick={handleRefreshPreview}
              sx={{ color: '#FF9800', borderColor: '#FF9800' }}
              variant="outlined"
              disabled={isLocked}
            >
              Refresh Preview
            </Button>
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 1 }}>
            {temporaryAsset.displayName}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.8)', display: 'block', mb: 1 }}>
            <strong>Category:</strong> {temporaryAsset.category} • <strong>Source:</strong> {temporaryAsset.sourceProcessing.sourceImagePath.split('/').pop()}
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', display: 'block' }}>
            <strong>Preview:</strong> All 4 directions displayed on grid at (0,0), (0,2), (2,0), (2,2)
          </Typography>
        </Box>
      )}

      {!temporaryAsset && (
        <Box sx={{ 
          mb: 3, 
          p: 3, 
          border: '1px solid rgba(255,255,255,0.2)', 
          borderRadius: 2,
          backgroundColor: 'rgba(255,255,255,0.02)',
          textAlign: 'center'
        }}>
          <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.5)', mb: 1 }}>
            📝 No Asset Selected
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.4)' }}>
            Select a PNG from the left panel to start configuring an asset
          </Typography>
        </Box>
      )}

      {/* Source Processing Operations Panel */}
      <Accordion sx={{ backgroundColor: 'rgba(33, 150, 243, 0.1)', mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#2196F3' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CropIcon sx={{ color: '#2196F3' }} />
            <Typography variant="h6" sx={{ color: '#2196F3' }}>
              1. Source Processing Operations
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              (Coming Soon)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
            Configure cropping, resizing, rotation, and other processing operations to be applied to the source image.
          </Typography>
          <Box sx={{ mt: 3, p: 3, backgroundColor: 'rgba(33, 150, 243, 0.1)', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ color: '#2196F3' }}>
              🚧 Coming Soon: Crop tool, resize controls, rotation, filters, and compositing operations
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Directional Positioning Panel */}
      <Accordion sx={{ backgroundColor: 'rgba(76, 175, 80, 0.1)', mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#4CAF50' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TransformIcon sx={{ color: '#4CAF50' }} />
            <Typography variant="h6" sx={{ color: '#4CAF50' }}>
              2. Directional Positioning & Anchoring
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              (Coming Soon)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
            Configure positioning, anchoring, margins, and directional behavior. Extends the existing sophisticated positioning system.
          </Typography>
          <Box sx={{ mt: 3, p: 3, backgroundColor: 'rgba(76, 175, 80, 0.1)', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ color: '#4CAF50' }}>
              🚧 Coming Soon: Invisible margins, vertical bias, anchor points, wall-relative positioning, shared vs per-direction settings
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Gameplay Properties Panel */}
      <Accordion sx={{ backgroundColor: 'rgba(156, 39, 176, 0.1)', mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#9C27B0' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GamepadIcon sx={{ color: '#9C27B0' }} />
            <Typography variant="h6" sx={{ color: '#9C27B0' }}>
              3. Gameplay Properties
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              (Coming Soon)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
            Configure walkability, sight blocking, interaction properties, and other gameplay mechanics.
          </Typography>
          <Box sx={{ mt: 3, p: 3, backgroundColor: 'rgba(156, 39, 176, 0.1)', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ color: '#9C27B0' }}>
              🚧 Coming Soon: Walkable, blocks sight, interactable, destructible, light level, movement cost, tags
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Preview Controls Panel */}
      <Accordion sx={{ backgroundColor: 'rgba(255, 193, 7, 0.1)' }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: '#FFC107' }} />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PreviewIcon sx={{ color: '#FFC107' }} />
            <Typography variant="h6" sx={{ color: '#FFC107' }}>
              4. Preview & Testing
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>
              (Coming Soon)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.9)', mb: 2 }}>
            Test positioning, anchoring, and gameplay properties with live preview on the isometric grid.
          </Typography>
          <Box sx={{ mt: 3, p: 3, backgroundColor: 'rgba(255, 193, 7, 0.1)', borderRadius: 1 }}>
            <Typography variant="body2" sx={{ color: '#FFC107' }}>
              🚧 Coming Soon: Grid preview, anchor visualization, test placement, save/load configurations
            </Typography>
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Footer */}
      <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
        <Typography variant="body2" sx={{ 
          color: 'rgba(255,255,255,0.5)', 
          fontSize: '0.75rem' 
        }}>
          ⚙️ This panel configures the selected asset from the left panel. Processing operations, positioning, and gameplay properties will be added in future updates.
        </Typography>
      </Box>
    </Paper>
  );
};

export default ProcessedAssetConfigurationPanel; 