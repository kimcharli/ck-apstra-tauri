import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import { NetworkConfigRow, ConversionMap, ApstraConfig } from '../../types';
import FileUpload from '../FileUpload/FileUpload';
import SheetSelector from '../SheetSelector/SheetSelector';
import ProvisioningTable from '../ProvisioningTable/ProvisioningTable';
import './ProvisioningPage.css';

interface ProvisioningPageProps {
  isVisible: boolean;
  onClose: () => void;
  conversionMap?: ConversionMap | null;
  apstraConfig?: ApstraConfig | null;
}

const ProvisioningPage: React.FC<ProvisioningPageProps> = ({
  isVisible,
  onClose,
  conversionMap,
  apstraConfig
}) => {
  const [sheets, setSheets] = useState<string[]>([]);
  const [filePath, setFilePath] = useState<string>('');
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [tableData, setTableData] = useState<NetworkConfigRow[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);

  const handleSheetsLoaded = (loadedSheets: string[], loadedFilePath: string) => {
    setSheets(loadedSheets);
    setFilePath(loadedFilePath);
    setSelectedSheet(''); // Reset sheet selection
    setTableData([]); // Clear previous data
    console.log('Provisioning: Sheets loaded:', loadedSheets);
  };

  const handleSheetSelect = async (sheetName: string) => {
    setSelectedSheet(sheetName);
    setIsLoadingData(true);
    
    try {
      console.log('Provisioning: Parsing sheet:', sheetName, 'from file:', filePath);
      console.log('Provisioning: Using conversion map:', conversionMap);
      const parsedData = await invoke<NetworkConfigRow[]>('parse_excel_sheet', { 
        filePath, 
        sheetName,
        conversionMap: conversionMap 
      });
      
      console.log('Provisioning: Parsed data rows:', parsedData?.length || 0);
      setTableData(parsedData || []);
    } catch (error) {
      console.error('Failed to parse sheet data:', error);
      setTableData([]);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleProvisionData = async (selectedRows: NetworkConfigRow[]) => {
    if (!apstraConfig) {
      alert('Please configure Apstra connection settings first');
      return;
    }

    if (selectedRows.length === 0) {
      alert('Please select at least one row to provision');
      return;
    }

    try {
      console.log('Starting provisioning process for', selectedRows.length, 'rows');
      console.log('Using Apstra config:', apstraConfig);
      
      // TODO: Implement actual provisioning logic
      // For now, just show a success message
      alert(`Successfully initiated provisioning for ${selectedRows.length} network configurations`);
    } catch (error) {
      console.error('Provisioning failed:', error);
      alert(`Provisioning failed: ${error}`);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="provisioning-overlay">
      <div className="provisioning-modal">
        <div className="provisioning-header">
          <h2>Network Provisioning</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="provisioning-content">
          <div className="provisioning-workflow">
            <div className="workflow-step">
              <h3>1. Upload Excel File</h3>
              <FileUpload onSheetsLoaded={handleSheetsLoaded} />
            </div>

            {sheets.length > 0 && (
              <div className="workflow-step">
                <h3>2. Select Sheet</h3>
                <SheetSelector 
                  sheets={sheets}
                  filePath={filePath}
                  selectedSheet={selectedSheet}
                  onSheetSelect={handleSheetSelect}
                />
              </div>
            )}

            {tableData.length > 0 && (
              <div className="workflow-step">
                <h3>3. Review and Provision</h3>
                <ProvisioningTable 
                  data={tableData} 
                  isLoading={isLoadingData}
                  onProvision={handleProvisionData}
                  apstraConfig={apstraConfig}
                />
              </div>
            )}

            {tableData.length === 0 && selectedSheet && !isLoadingData && (
              <div className="no-data-message">
                <p>No data found in the selected sheet. Please check the conversion map configuration or try a different sheet.</p>
              </div>
            )}
          </div>

          <div className="provisioning-status">
            {!conversionMap && (
              <div className="status-warning">
                ⚠️ No conversion map configured. Using default field mapping.
              </div>
            )}
            {!apstraConfig && (
              <div className="status-warning">
                ⚠️ No Apstra configuration set. Please configure connection settings before provisioning.
              </div>
            )}
            {conversionMap && apstraConfig && (
              <div className="status-success">
                ✅ Ready for provisioning with custom configuration
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProvisioningPage;