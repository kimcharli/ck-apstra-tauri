import React, { useState } from 'react';
import { EnhancedDataViewer } from './EnhancedDataViewer';
import { useEnhancedConversion } from '../hooks/useEnhancedConversion';

/**
 * Example component demonstrating how to integrate the enhanced conversion system
 * into the existing Excel processing workflow.
 * 
 * This replaces the existing DataViewer component with enhanced capabilities:
 * - Dynamic field mapping based on enhanced conversion maps
 * - Real-time data transformation and validation
 * - Generated UI based on field definitions
 * - Multiple view modes (table, form, split)
 */
export const EnhancedConversionExample: React.FC = () => {
  // Example Excel data that would come from the existing file processing
  const [excelData] = useState([
    {
      'Switch Name': 'switch-001',
      'Port': '2',
      'Host Name': 'server-web-01',
      'Server Interface': 'eth0',
      'Speed': '25G',
      'External': 'false',
      'Switch Tags': 'production,web',
      'Link Tags': 'uplink',
      'CTs': 'generic_system,l2_server',
      'AE': 'ae0',
      'LAG Mode': 'lacp'
    },
    {
      'Switch Name': 'switch-001',
      'Port': '3',
      'Host Name': 'server-web-02',
      'Server Interface': 'eth0',
      'Speed': '10G',
      'External': 'false',
      'Switch Tags': 'production,web',
      'Link Tags': 'uplink',
      'CTs': 'generic_system,l2_server',
      'AE': 'ae1',
      'LAG Mode': 'lacp'
    },
    {
      'Switch Name': 'switch-002',
      'Port': '1',
      'Host Name': 'server-db-01',
      'Server Interface': 'eth1',
      'Speed': '100G',
      'External': 'false',
      'Switch Tags': 'production,database',
      'Link Tags': 'critical',
      'CTs': 'generic_system,l3_server',
      'AE': '',
      'LAG Mode': ''
    }
  ]);

  const excelHeaders = Object.keys(excelData[0] || {});
  
  const [processedData, setProcessedData] = useState<Array<Record<string, any>>>([]);
  const [validationResult, setValidationResult] = useState<any>(null);

  // Use the enhanced conversion hook for state management
  const {
    state,
    loadMap,
    saveMap,
    clearError
  } = useEnhancedConversion({
    autoLoad: true,
    onError: (error) => {
      console.error('Enhanced conversion error:', error);
    },
    onSuccess: (map) => {
      console.log('Enhanced conversion map loaded successfully:', map);
    }
  });

  const handleDataReady = (data: Array<Record<string, any>>) => {
    setProcessedData(data);
    console.log('Processed data ready:', data);
  };

  const handleValidationChange = (result: any) => {
    setValidationResult(result);
    console.log('Validation result:', result);
  };

  const handleExportData = () => {
    if (processedData.length === 0) {
      alert('No data to export');
      return;
    }

    const jsonData = JSON.stringify(processedData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `processed-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveConversionMap = async () => {
    if (!state.enhancedMap) {
      alert('No conversion map to save');
      return;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `enhanced_conversion_map_${timestamp}.json`;
      
      // In a real application, you would use a file save dialog
      await saveMap(state.enhancedMap, filename);
      alert(`Conversion map saved as ${filename}`);
    } catch (error) {
      alert(`Failed to save conversion map: ${error}`);
    }
  };

  if (state.loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">Loading enhanced conversion system...</div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="error-container">
        <div className="error-message">
          <h3>Error Loading Enhanced Conversion System</h3>
          <p>{state.error}</p>
          <div className="error-actions">
            <button onClick={clearError} className="retry-button">
              Retry
            </button>
            <button onClick={() => loadMap()} className="reload-button">
              Reload Default Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="enhanced-conversion-example">
      <header className="example-header">
        <h1>Enhanced Excel Processing Demo</h1>
        <div className="header-info">
          <div className="data-summary">
            <span>Excel Rows: {excelData.length}</span>
            <span>Headers: {excelHeaders.length}</span>
            <span>Processed: {processedData.length}</span>
          </div>
          <div className="header-actions">
            <button onClick={handleExportData} className="export-button">
              Export JSON
            </button>
            <button onClick={handleSaveConversionMap} className="save-button">
              Save Conversion Map
            </button>
          </div>
        </div>
      </header>

      <div className="conversion-status">
        <div className="status-item">
          <span className="status-label">Conversion Map:</span>
          <span className={`status-value ${state.enhancedMap ? 'loaded' : 'not-loaded'}`}>
            {state.enhancedMap ? 'Loaded' : 'Not Loaded'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Last Updated:</span>
          <span className="status-value">
            {state.lastUpdated ? state.lastUpdated.toLocaleString() : 'Never'}
          </span>
        </div>
        <div className="status-item">
          <span className="status-label">Validation:</span>
          <span className={`status-value ${validationResult?.is_valid ? 'valid' : 'invalid'}`}>
            {validationResult ? (validationResult.is_valid ? 'Valid' : 'Issues Found') : 'Not Validated'}
          </span>
        </div>
      </div>

      <main className="example-content">
        <EnhancedDataViewer
          excelHeaders={excelHeaders}
          excelData={excelData}
          onDataReady={handleDataReady}
          onValidationChange={handleValidationChange}
        />
      </main>

      <footer className="example-footer">
        <div className="footer-info">
          <p>
            This example demonstrates the enhanced conversion system with dynamic UI generation,
            field transformations, and comprehensive validation.
          </p>
          <div className="feature-list">
            <span className="feature">✓ Dynamic Field Mapping</span>
            <span className="feature">✓ Real-time Transformation</span>
            <span className="feature">✓ Comprehensive Validation</span>
            <span className="feature">✓ Generated UI Components</span>
            <span className="feature">✓ Multiple View Modes</span>
          </div>
        </div>
      </footer>

      <style>{`
        .enhanced-conversion-example {
          width: 100%;
          height: 100vh;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .example-header {
          background-color: #f8f9fa;
          border-bottom: 1px solid #dee2e6;
          padding: 20px;
        }

        .example-header h1 {
          margin: 0 0 16px 0;
          color: #212529;
        }

        .header-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .data-summary {
          display: flex;
          gap: 20px;
          font-size: 14px;
          color: #6c757d;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .export-button,
        .save-button,
        .retry-button,
        .reload-button {
          padding: 8px 16px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          background-color: white;
          color: #495057;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
        }

        .export-button:hover,
        .save-button:hover {
          background-color: #007bff;
          color: white;
          border-color: #007bff;
        }

        .retry-button:hover {
          background-color: #28a745;
          color: white;
          border-color: #28a745;
        }

        .reload-button:hover {
          background-color: #ffc107;
          color: #212529;
          border-color: #ffc107;
        }

        .conversion-status {
          background-color: #e9ecef;
          padding: 12px 20px;
          border-bottom: 1px solid #dee2e6;
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }

        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .status-label {
          font-weight: bold;
          color: #495057;
        }

        .status-value {
          padding: 2px 8px;
          border-radius: 3px;
          font-weight: bold;
        }

        .status-value.loaded,
        .status-value.valid {
          background-color: #d4edda;
          color: #155724;
        }

        .status-value.not-loaded,
        .status-value.invalid {
          background-color: #f8d7da;
          color: #721c24;
        }

        .example-content {
          flex: 1;
          overflow: hidden;
        }

        .example-footer {
          background-color: #f8f9fa;
          border-top: 1px solid #dee2e6;
          padding: 16px 20px;
        }

        .footer-info p {
          margin: 0 0 12px 0;
          color: #6c757d;
          font-size: 14px;
        }

        .feature-list {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .feature {
          font-size: 12px;
          background-color: #e3f2fd;
          color: #1976d2;
          padding: 4px 8px;
          border-radius: 3px;
          font-weight: bold;
        }

        .loading-container,
        .error-container {
          display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh;
          padding: 20px;
        }

        .loading-spinner {
          font-size: 18px;
          color: #007bff;
          text-align: center;
        }

        .error-message {
          text-align: center;
          max-width: 500px;
        }

        .error-message h3 {
          color: #dc3545;
          margin-bottom: 16px;
        }

        .error-message p {
          color: #6c757d;
          margin-bottom: 24px;
        }

        .error-actions {
          display: flex;
          gap: 12px;
          justify-content: center;
        }
      `}</style>
    </div>
  );
};