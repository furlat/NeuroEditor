import React from 'react';
import { battlemapStore, battlemapActions } from '../store';
import { useSnapshot } from 'valtio';

/**
 * Toggle component for switching between battlemap tiles and processed assets mode
 */
export const ProcessedAssetModeToggle: React.FC = () => {
  const snap = useSnapshot(battlemapStore);
  
  const handleToggle = () => {
    battlemapActions.processedAssets.mode.toggleProcessedAssetMode();
  };
  
  const isProcessedAssetMode = snap.processedAssets.isProcessedAssetMode;
  
  return (
    <div className="processed-asset-mode-toggle">
      <button
        onClick={handleToggle}
        className={`toggle-button ${isProcessedAssetMode ? 'active' : ''}`}
        style={{
          padding: '8px 16px',
          border: '2px solid #333',
          borderRadius: '4px',
          backgroundColor: isProcessedAssetMode ? '#4CAF50' : '#f0f0f0',
          color: isProcessedAssetMode ? 'white' : '#333',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'all 0.2s ease',
          userSelect: 'none',
        }}
        title={
          isProcessedAssetMode 
            ? 'Switch to Battlemap Tiles Mode' 
            : 'Switch to Processed Assets Mode'
        }
      >
        {isProcessedAssetMode ? '🎨 Assets Mode' : '🧱 Tiles Mode'}
      </button>
      
      <div style={{ 
        marginTop: '4px', 
        fontSize: '12px', 
        color: '#666',
        textAlign: 'center'
      }}>
        {isProcessedAssetMode 
          ? 'Using Processed Assets Renderer' 
          : 'Using Battlemap Tiles Renderer'
        }
      </div>
      
      {isProcessedAssetMode && (
        <div style={{ 
          marginTop: '8px', 
          padding: '8px', 
          backgroundColor: '#e8f5e8',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#2e7d32'
        }}>
          <div><strong>Assets Mode Features:</strong></div>
          <div>• Smaller grid (10x10)</div>
          <div>• Processed asset library</div>
          <div>• Advanced positioning controls</div>
          <div>• Asset preview system</div>
        </div>
      )}
      
      {!isProcessedAssetMode && (
        <div style={{ 
          marginTop: '8px', 
          padding: '8px', 
          backgroundColor: '#f0f0f0',
          borderRadius: '4px',
          fontSize: '12px',
          color: '#333'
        }}>
          <div><strong>Tiles Mode Features:</strong></div>
          <div>• Full battlemap tiles</div>
          <div>• Wall placement</div>
          <div>• Large grid editing</div>
          <div>• Original tile system</div>
        </div>
      )}
    </div>
  );
};

export default ProcessedAssetModeToggle; 