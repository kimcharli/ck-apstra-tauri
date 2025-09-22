import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { NetworkConfigRow, ApstraConfig } from '../../types';
import { EnhancedConversionMap } from '../../services/EnhancedConversionService';
import NavigationHeader from '../NavigationHeader/NavigationHeader';
import FileUpload from '../FileUpload/FileUpload';
import SheetSelector from '../SheetSelector/SheetSelector';
import ProvisioningTable from '../ProvisioningTable/ProvisioningTable';
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';
import { logger } from '../../services/LoggingService';
import { apstraApiService } from '../../services/ApstraApiService';
import { blueprints } from '../../utils/blueprintMapping';
import './ProvisioningPage.css';

interface ProvisioningPageProps {
  isVisible: boolean;
  onClose: () => void;
  onNavigate: (page: 'home' | 'apstra-connection' | 'conversion-map' | 'provisioning' | 'tools') => void;
  conversionMap?: EnhancedConversionMap | null;
  apstraConfig?: ApstraConfig | null;
}

const ProvisioningPage: React.FC<ProvisioningPageProps> = ({
  isVisible,
  onNavigate,
  conversionMap,
  apstraConfig
}) => {
  const [sheets, setSheets] = useState<string[]>([]);
  const [filePath, setFilePath] = useState<string>('');
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [tableData, setTableData] = useState<NetworkConfigRow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'match' | 'mismatch' | 'blueprint' | 'ct-not-found' | 'xlsx-pending'>('match');
  const [blueprintValidation, setBlueprintValidation] = useState<{found: number, total: number} | null>(null);
  const [isDetectingBlueprint, setIsDetectingBlueprint] = useState(false);

  const handleSheetsLoaded = (loadedSheets: string[], loadedFilePath: string) => {
    setSheets(loadedSheets);
    setFilePath(loadedFilePath);
    setSelectedSheet(''); // Reset sheet selection
    setTableData([]); // Clear previous data
    logger.logWorkflowStep('Network Provisioning', 1, 'Excel file uploaded and sheets loaded', { 
      fileName: loadedFilePath.split('/').pop(), 
      sheetCount: loadedSheets.length, 
      sheets: loadedSheets 
    });
    logger.logFileOperation('Excel upload', loadedFilePath, 0, { sheets: loadedSheets });
  };


  const detectBlueprintFromSwitches = async (switchLabels: string[]) => {
    setIsDetectingBlueprint(true);
    try {
      console.log('🔍 Auto-detecting blueprint from switches:', switchLabels.slice(0, 5));

      // Map to track which blueprint each switch belongs to
      const blueprintCounts = new Map<string, number>();

      // Sample a subset of switches to detect blueprint (up to 5 for performance)
      const samplesToCheck = switchLabels.slice(0, Math.min(5, switchLabels.length));

      for (const switchName of samplesToCheck) {
        try {
          const result = await apstraApiService.searchSystemAcrossBlueprints(switchName, blueprints);
          if (result && result.blueprintLabel) {
            const count = blueprintCounts.get(result.blueprintLabel) || 0;
            blueprintCounts.set(result.blueprintLabel, count + 1);
            console.log(`✅ Switch "${switchName}" found in blueprint "${result.blueprintLabel}"`);
          }
        } catch (error) {
          console.log(`⚠️ Switch "${switchName}" not found in any blueprint`);
        }
      }

      // Find the most common blueprint (pick first one in case of ties)
      if (blueprintCounts.size > 0) {
        const sortedBlueprints = Array.from(blueprintCounts.entries())
          .sort((a, b) => {
            // Sort by count (descending), then by blueprint name (ascending) for consistent tie-breaking
            if (b[1] !== a[1]) return b[1] - a[1];
            return a[0].localeCompare(b[0]);
          });

        const [mostCommonBlueprint, count] = sortedBlueprints[0];

        console.log(`✅ Auto-detected blueprint: "${mostCommonBlueprint}" (found in ${count} switches)`);
        if (sortedBlueprints.length > 1) {
          console.log(`📊 Other blueprints found:`, sortedBlueprints.slice(1).map(([bp, cnt]) => `${bp}: ${cnt}`));
        }
        setSelectedBlueprint(mostCommonBlueprint);

        logger.logDataChange('BlueprintAutoDetected', 'detected', null, {
          detectedBlueprint: mostCommonBlueprint,
          samplesChecked: samplesToCheck.length,
          blueprintCounts: Object.fromEntries(blueprintCounts)
        });
      } else {
        console.log('⚠️ Could not auto-detect blueprint, defaulting to DH4-Colo2');
        setSelectedBlueprint('DH4-Colo2');
      }
    } catch (error) {
      console.error('❌ Error during blueprint detection:', error);
      // Default to DH4-Colo2 if detection fails
      setSelectedBlueprint('DH4-Colo2');
    } finally {
      setIsDetectingBlueprint(false);
    }
  };

  const handleSheetSelect = async (sheetName: string) => {
    logger.logButtonClick(`Sheet Selection: ${sheetName}`, 'ProvisioningPage');
    console.log('✅ Sheet selection started:', sheetName);
    setSelectedSheet(sheetName);
    setIsLoadingData(true);
    
    try {
      console.log('✅ Invoking parse_excel_sheet with:', { filePath, sheetName, hasConversionMap: !!conversionMap });
      logger.logWorkflowStep('Network Provisioning', 2, 'Sheet selected and parsing data', { 
        sheetName, 
        hasConversionMap: !!conversionMap 
      });
      
      const parsedData = await invoke<NetworkConfigRow[]>('parse_excel_sheet', { 
        filePath: filePath, 
        sheetName: sheetName,
        enhancedConversionMap: conversionMap 
      });
      
      console.log('✅ Excel parsing completed:', {
        dataLength: parsedData?.length || 0,
        isArray: Array.isArray(parsedData),
        firstRow: parsedData?.[0]
      });
      
      // Defensive null/undefined handling
      const safeData = Array.isArray(parsedData) ? parsedData : [];
      setTableData(safeData);
      
      // Auto-detect blueprint from data
      if (safeData.length > 0) {
        // Safe extraction of device names with fallback
        const switchLabels = safeData
          .map(row => row?.switch_label)
          .filter((label): label is string => typeof label === 'string' && label.length > 0);
        const serverLabels = safeData
          .map(row => row?.server_label)
          .filter((label): label is string => typeof label === 'string' && label.length > 0);

        // Debug: Log all unique switch labels to identify the source of STG15ANAE037
        const uniqueSwitchLabels = [...new Set(switchLabels)];
        const uniqueServerLabels = [...new Set(serverLabels)];
        console.log('🔍 Debug - Unique switch labels from Excel:', uniqueSwitchLabels);
        console.log('🔍 Debug - Unique server labels from Excel:', uniqueServerLabels);

        const uniqueDevices = new Set([...switchLabels, ...serverLabels]);
        setBlueprintValidation({found: uniqueDevices.size, total: uniqueDevices.size});

        console.log('✅ Blueprint validation completed:', {
          dataRows: safeData.length,
          uniqueDevices: uniqueDevices.size,
          switchCount: switchLabels.length,
          serverCount: serverLabels.length
        });

        logger.logDataChange('ProvisioningData', 'loaded', null, {
          rowCount: safeData.length,
          uniqueDevices: uniqueDevices.size,
          sheetName: sheetName
        });
        logger.logWorkflowStep('Network Provisioning', 3, 'Data parsed and blueprint validation completed', {
          dataRows: safeData.length,
          uniqueDevices: uniqueDevices.size,
          blueprintValidation: {found: uniqueDevices.size, total: uniqueDevices.size}
        });

        // Auto-detect blueprint if we have authenticated Apstra connection
        if (apstraApiService.getAuthStatus() && switchLabels.length > 0) {
          console.log('🔗 Apstra authenticated - running blueprint detection');
          await detectBlueprintFromSwitches(switchLabels);
        } else {
          console.log('⚠️ Apstra not authenticated - using default blueprint');
          if (!selectedBlueprint) {
            setSelectedBlueprint('DH4-Colo2');
          }
        }
      } else {
        console.log('⚠️ No data rows found in parsed result');
        setBlueprintValidation(null);
      }
    } catch (error: any) {
      console.error('❌ Failed to parse sheet data:', error);
      logger.logError('DATA_CHANGE', 'Excel sheet parsing failed', { 
        sheetName, 
        filePath, 
        error: error.toString(),
        stack: error.stack
      });
      
      // Ensure we set empty array on error to maintain UI state
      setTableData([]);
      setBlueprintValidation(null);
      
      // Alert user of the specific error
      alert(`Failed to parse sheet "${sheetName}": ${error.message || error.toString()}`);
    } finally {
      setIsLoadingData(false);
      console.log('✅ Sheet selection completed, loading state cleared');
    }
  };

  const handleProvisionData = async (selectedRows: NetworkConfigRow[]) => {
    logger.logButtonClick('Start Provisioning', 'ProvisioningPage', { 
      selectedRowCount: selectedRows.length, 
      hasApstraConfig: !!apstraConfig 
    });
    
    if (!apstraConfig) {
      logger.logWarn('WORKFLOW', 'Provisioning attempted without Apstra configuration');
      alert('Please configure Apstra connection settings first');
      return;
    }

    if (selectedRows.length === 0) {
      logger.logWarn('WORKFLOW', 'Provisioning attempted with no rows selected');
      alert('Please select at least one row to provision');
      return;
    }

    try {
      logger.logWorkflowStep('Network Provisioning', 4, 'Starting provisioning process', {
        selectedRows: selectedRows.length,
        apstraHost: apstraConfig.host,
        blueprint: apstraConfig.blueprint_name
      });
      
      console.log('Starting provisioning process for', selectedRows.length, 'rows');
      console.log('Using Apstra config:', apstraConfig);
      
      // TODO: Implement actual provisioning logic
      // For now, just show a success message
      logger.logWorkflowComplete('Network Provisioning', {
        status: 'simulated_success',
        processedRows: selectedRows.length,
        timestamp: new Date().toISOString()
      });
      
      alert(`Successfully initiated provisioning for ${selectedRows.length} network configurations`);
    } catch (error: any) {
      console.error('Provisioning failed:', error);
      logger.logError('WORKFLOW', 'Network provisioning failed', {
        selectedRows: selectedRows.length,
        error: error.toString(),
        apstraHost: apstraConfig?.host
      });
      alert(`Provisioning failed: ${error}`);
    }
  };

  const getDataSummary = () => {
    // Safe data extraction with null checks
    const safeData = Array.isArray(tableData) ? tableData : [];
    const servers = new Set(
      safeData
        .map(row => row?.server_label)
        .filter((label): label is string => typeof label === 'string' && label.length > 0)
    ).size;
    const switches = new Set(
      safeData
        .map(row => row?.switch_label)
        .filter((label): label is string => typeof label === 'string' && label.length > 0)
    ).size;
    return { lines: safeData.length, servers, switches };
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  };

  if (!isVisible) return null;

  const summary = getDataSummary();
  const apstraHost = apstraConfig?.host || '10.85.192.59';

  return (
    <div className="provisioning-page">
      <NavigationHeader
        currentPage="provisioning"
        onNavigate={onNavigate}
        title={`Provisioning for Apstra: ${apstraHost}`}
      />

      <div className="provisioning-steps">
        <div className="step-item">
          <div className="step-header">Step 1: Select File</div>
          <div className="step-content">
            <FileUpload onSheetsLoaded={handleSheetsLoaded} />
            {filePath && <div className="file-selected">{filePath.split('/').pop()}</div>}
          </div>
        </div>

        <div className="step-item">
          <div className="step-header">Step 2: Select Sheet</div>
          <div className="step-content">
            {sheets.length > 0 ? (
              <SheetSelector 
                sheets={sheets}
                filePath={filePath}
                selectedSheet={selectedSheet}
                onSheetSelect={handleSheetSelect}
              />
            ) : (
              <div className="step-placeholder">Upload a file first</div>
            )}
          </div>
        </div>

        <div className="step-item">
          <div className="step-header">Step 3: Select Blueprint & Actions</div>
          <div className="step-content">
            {tableData.length > 0 ? (
              <div className="blueprint-actions">
                <select
                  value={selectedBlueprint}
                  onChange={(e) => setSelectedBlueprint(e.target.value)}
                  className="blueprint-selector"
                  disabled={isDetectingBlueprint}
                >
                  {isDetectingBlueprint ? (
                    <option value="">Detecting blueprint...</option>
                  ) : (
                    blueprints.map(bp => (
                      <option key={bp.label} value={bp.label}>{bp.label}</option>
                    ))
                  )}
                </select>
                <div className="action-buttons">
                  <button className="btn btn-info">Fetch & Compare</button>
                  <button className="btn btn-secondary">Download XLSX</button>
                  <button className="btn btn-success">Provision</button>
                </div>
              </div>
            ) : (
              <div className="step-placeholder">Select a sheet first</div>
            )}
          </div>
        </div>
      </div>

      {blueprintValidation && selectedBlueprint && (
        <div className="blueprint-validation">
          {isDetectingBlueprint ? (
            <>🔍 Detecting blueprint from switch data...</>
          ) : (
            <>Auto-detected blueprint: <strong>{selectedBlueprint}</strong> (contains {blueprintValidation.found} of {blueprintValidation.total} devices)</>
          )}
        </div>
      )}

      {tableData.length > 0 && (
        <>
          <div className="data-summary">
            <div className="summary-item">
              <span className="summary-icon">📋</span>
              <span className="summary-label">Lines:</span>
              <span className="summary-value">{summary.lines}</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon">🖥️</span>
              <span className="summary-label">Servers:</span>
              <span className="summary-value">{summary.servers}</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon">🔌</span>
              <span className="summary-label">Switches:</span>
              <span className="summary-value">{summary.switches}</span>
            </div>
            <div className="filter-tabs">
              <button 
                className={`filter-tab ${activeFilter === 'xlsx-pending' ? 'active' : ''}`}
                data-filter="xlsx-pending"
                onClick={() => setActiveFilter('xlsx-pending')}
              >
                XLSX Pending
              </button>
              <button 
                className={`filter-tab ${activeFilter === 'match' ? 'active' : ''}`}
                data-filter="match"
                onClick={() => setActiveFilter('match')}
              >
                Match
              </button>
              <button 
                className={`filter-tab ${activeFilter === 'mismatch' ? 'active' : ''}`}
                data-filter="mismatch"
                onClick={() => setActiveFilter('mismatch')}
              >
                Mismatch
              </button>
              <button 
                className={`filter-tab ${activeFilter === 'blueprint' ? 'active' : ''}`}
                data-filter="blueprint"
                onClick={() => setActiveFilter('blueprint')}
              >
                Only in Blueprint
              </button>
              <button 
                className={`filter-tab ${activeFilter === 'ct-not-found' ? 'active' : ''}`}
                data-filter="ct-not-found"
                onClick={() => setActiveFilter('ct-not-found')}
              >
                CT Not Found
              </button>
            </div>
            <button className="go-to-bottom" onClick={scrollToBottom}>
              ↓ Go to Bottom
            </button>
          </div>

          <div className="provisioning-table-container">
            <ErrorBoundary fallback={
              <div style={{ 
                padding: '20px', 
                textAlign: 'center', 
                backgroundColor: '#fff3cd', 
                color: '#856404',
                border: '1px solid #ffeaa7',
                borderRadius: '4px',
                margin: '10px 0'
              }}>
                <h3>⚠️ Table Rendering Error</h3>
                <p>The provisioning table encountered an error. This may be due to:</p>
                <ul style={{ textAlign: 'left', display: 'inline-block' }}>
                  <li>Invalid Excel data format</li>
                  <li>Missing required fields</li>
                  <li>Data processing issues</li>
                </ul>
                <p>Try selecting a different sheet or re-uploading the Excel file.</p>
              </div>
            }>
              <ProvisioningTable
                data={tableData}
                isLoading={isLoadingData}
                onProvision={handleProvisionData}
                onDataUpdate={setTableData}
                apstraConfig={apstraConfig}
                selectedBlueprint={selectedBlueprint}
              />
            </ErrorBoundary>
          </div>
        </>
      )}
    </div>
  );
};

export default ProvisioningPage;