import * as React from 'react';
import { Box, Snackbar, Alert } from '@mui/material';
import { BattleMapCanvas } from '../components/battlemap';

// Simple local error hook since we can't find the imported one
const useError = () => {
  const [error, setError] = React.useState<string | null>(null);
  const clearError = React.useCallback(() => setError(null), []);
  return { error, setError, clearError };
};

/**
 * BattleMapPage is responsible for overall layout of the tile editor
 * Simplified for local tile editing - removed entity management, music, and API polling
 */
const BattleMapPage: React.FC = () => {
  const { error, clearError } = useError();

  return (
    <Box sx={{ 
      position: 'absolute',
      top: 64, // Height of AppBar
      left: 0,
      right: 0,
      bottom: 0,
      bgcolor: '#000000',
      display: 'flex',
      overflow: 'hidden'
    }}>
      {/* Error Snackbar */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={clearError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={clearError} 
          severity="error"
          variant="filled"
        >
          {error}
        </Alert>
      </Snackbar>

      {/* Main content area - Tile Editor Canvas */}
      <Box 
        sx={{ 
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          bgcolor: '#000000',
        }}
      >
        {/* BattleMap Canvas - takes full area */}
        <BattleMapCanvas />
      </Box>
    </Box>
  );
};

export default BattleMapPage; 