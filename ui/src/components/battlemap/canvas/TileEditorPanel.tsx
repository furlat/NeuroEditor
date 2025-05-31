import React, { useState, useEffect, useCallback } from 'react';
import { Paper, ToggleButton, ToggleButtonGroup, Box, Typography, Divider, Tabs, Tab, Button } from '@mui/material';
import { Assets, Texture } from 'pixi.js';
import { useTileEditor, TileType } from '../../../hooks/battlemap';
import { useSnapshot } from 'valtio';
import { battlemapStore } from '../../../store';

// Initialize PixiJS Assets
Assets.init({
  basePath: '/',
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
    >
      {value === index && (
        <Box sx={{ p: 1 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

interface TileEditorPanelProps {
  isLocked: boolean;
}

const TileEditorPanel: React.FC<TileEditorPanelProps> = ({ isLocked }) => {
  const [activeTab, setActiveTab] = React.useState(0);
  const {
    selectedTile,
    isEditing,
    selectTile,
    clearAllTiles,
    generateSampleTiles,
    initializeGrid,
  } = useTileEditor();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Paper
      elevation={3}
      sx={{
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        color: 'white',
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
          <Tab label="Utils" sx={{ color: 'white' }} />
          <Tab label="Legacy" sx={{ color: 'white' }} />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        <Typography variant="h6" gutterBottom>
          🛠️ Map Utilities
        </Typography>

        {isLocked && (
          <Typography variant="body2" color="warning.main" sx={{ mb: 2 }}>
            ⚠️ Unlock the map to use utilities
          </Typography>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            onClick={generateSampleTiles}
            disabled={isLocked}
            sx={{ justifyContent: 'flex-start' }}
          >
            🎨 Generate Sample Tiles
          </Button>

          <Button
            variant="outlined"
            onClick={clearAllTiles}
            disabled={isLocked}
            color="warning"
            sx={{ justifyContent: 'flex-start' }}
          >
            🗑️ Clear All Tiles
          </Button>

          <Button
            variant="outlined"
            onClick={() => initializeGrid(30, 20)}
            disabled={isLocked}
            sx={{ justifyContent: 'flex-start' }}
          >
            📐 Reset Grid (30x20)
          </Button>

          <Button
            variant="outlined"
            onClick={() => initializeGrid(50, 30)}
            disabled={isLocked}
            sx={{ justifyContent: 'flex-start' }}
          >
            📐 Large Grid (50x30)
          </Button>
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            💡 Use these utilities to quickly set up your map
          </Typography>
        </Box>
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        <Typography variant="h6" gutterBottom>
          🎮 Legacy Mode Removed
        </Typography>

        <Typography variant="body2" sx={{ opacity: 0.8, mb: 2 }}>
          The legacy colored tile system has been removed. Please use the 
          <strong> Isometric Sprite Editor</strong> above to place sprites on the map.
        </Typography>

        <Typography variant="body2" sx={{ opacity: 0.7, mb: 2 }}>
          Features available in the Sprite Editor:
        </Typography>

        <Box sx={{ pl: 2, mb: 2 }}>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
            • 🎨 Multiple sprite categories (Blocks, Walls)
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
            • 🧭 4-directional sprite rotation (N, E, S, W)
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
            • 📏 Z-level support for layered building
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
            • 🖌️ Brush size for multi-tile painting
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, mb: 1 }}>
            • 🗑️ Eraser tool (select sprite first, then use eraser)
          </Typography>
        </Box>

        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          💡 Select a sprite in the editor above, choose your direction and Z-level, then click on the map to place sprites.
        </Typography>
      </TabPanel>
    </Paper>
  );
};

export default TileEditorPanel; 