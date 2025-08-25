/**
 * DOM Rendering Test for ProvisioningPage
 * 
 * This test specifically checks for blank page issues that can occur
 * during sheet selection and data processing.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { invoke } from '@tauri-apps/api/tauri';
import ProvisioningPage from '../components/ProvisioningPage/ProvisioningPage';
import { ApstraConfig } from '../types';
import { EnhancedConversionMap } from '../services/EnhancedConversionService';

// Mock the invoke function from Tauri
vi.mock('@tauri-apps/api/tauri', () => ({
  invoke: vi.fn()
}));

// Mock logging service
vi.mock('../services/LoggingService', () => ({
  logger: {
    logButtonClick: vi.fn(),
    logWorkflowStep: vi.fn(),
    logFileOperation: vi.fn(),
    logDataChange: vi.fn(),
    logWorkflowComplete: vi.fn(),
    logError: vi.fn(),
    logWarn: vi.fn()
  }
}));

// Mock components that might cause rendering issues
vi.mock('../components/NavigationHeader/NavigationHeader', () => ({
  default: function MockNavigationHeader() {
    return <div data-testid="navigation-header">Navigation Header</div>;
  }
}));

vi.mock('../components/FileUpload/FileUpload', () => ({
  default: function MockFileUpload({ onSheetsLoaded }: any) {
    return (
      <div data-testid="file-upload">
        <button 
          onClick={() => onSheetsLoaded(['Sheet1', 'Sheet2'], '/test/file.xlsx')}
        >
          Upload File
        </button>
      </div>
    );
  }
}));

vi.mock('../components/SheetSelector/SheetSelector', () => ({
  default: function MockSheetSelector({ sheets, onSheetSelect }: any) {
    return (
      <div data-testid="sheet-selector">
        {sheets.map((sheet: string) => (
          <button 
            key={sheet}
            onClick={() => onSheetSelect(sheet)}
            data-testid={`sheet-option-${sheet}`}
          >
            {sheet}
          </button>
        ))}
      </div>
    );
  }
}));

vi.mock('../components/ProvisioningTable/ProvisioningTable', () => ({
  default: function MockProvisioningTable({ data, isLoading }: any) {
    if (isLoading) {
      return <div data-testid="provisioning-table-loading">Loading...</div>;
    }
    return (
      <div data-testid="provisioning-table">
        <div data-testid="table-row-count">{data.length} rows</div>
        {data.map((row: any, index: number) => (
          <div key={index} data-testid={`table-row-${index}`}>
            {row.server_label} - {row.switch_label}
          </div>
        ))}
      </div>
    );
  }
}));

describe('ProvisioningPage DOM Rendering Tests', () => {
  const mockApstraConfig: ApstraConfig = {
    host: '10.85.192.59',
    port: 443,
    username: 'test',
    password: 'test',
    blueprint_name: 'test-blueprint'
  };

  const mockConversionMap: EnhancedConversionMap = {
    version: '1.0.0',
    header_row: 2,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    field_definitions: {}
  };

  const mockNetworkData = [
    {
      blueprint: 'test-blueprint',
      server_label: 'server1',
      switch_label: 'switch1',
      switch_ifname: 'et-0/0/1',
      server_ifname: 'ens8',
      link_speed: '25G',
      link_group_lag_mode: 'lacp_active',
      link_group_ct_names: 'CT1',
      link_group_ifname: '',
      is_external: false,
      server_tags: '',
      switch_tags: '',
      link_tags: '',
      comment: ''
    },
    {
      blueprint: 'test-blueprint',
      server_label: 'server1',
      switch_label: 'switch1',
      switch_ifname: 'et-0/0/2',
      server_ifname: 'ens9',
      link_speed: '25G',
      link_group_lag_mode: 'lacp_active',
      link_group_ct_names: 'CT1',
      link_group_ifname: '',
      is_external: false,
      server_tags: '',
      switch_tags: '',
      link_tags: '',
      comment: ''
    }
  ];

  const mockInvoke = vi.mocked(invoke);

  beforeEach(() => {
    mockInvoke.mockClear();
    // Mock console methods to avoid noise during tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'log').mockImplementation(() => {});
    // Mock window.alert for JSDOM
    Object.defineProperty(window, 'alert', {
      writable: true,
      value: vi.fn()
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('should render initial page structure without blank page', () => {
    render(
      <ProvisioningPage
        isVisible={true}
        onClose={() => {}}
        onNavigate={() => {}}
        conversionMap={mockConversionMap}
        apstraConfig={mockApstraConfig}
      />
    );

    // Check that main page elements are present
    expect(screen.getByTestId('navigation-header')).toBeInTheDocument();
    expect(screen.getByText('Step 1: Select File')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Select Sheet')).toBeInTheDocument();
    expect(screen.getByText('Step 3: Select Blueprint & Actions')).toBeInTheDocument();
    expect(screen.getByTestId('file-upload')).toBeInTheDocument();
  });

  test('should show sheet selector after file upload without blank page', async () => {
    render(
      <ProvisioningPage
        isVisible={true}
        onClose={() => {}}
        onNavigate={() => {}}
        conversionMap={mockConversionMap}
        apstraConfig={mockApstraConfig}
      />
    );

    // Trigger file upload
    const uploadButton = screen.getByText('Upload File');
    fireEvent.click(uploadButton);

    // Verify sheet selector appears
    await waitFor(() => {
      expect(screen.getByTestId('sheet-selector')).toBeInTheDocument();
    });

    expect(screen.getByTestId('sheet-option-Sheet1')).toBeInTheDocument();
    expect(screen.getByTestId('sheet-option-Sheet2')).toBeInTheDocument();

    // Verify no blank page - main content should still be visible
    expect(screen.getByText('Step 1: Select File')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Select Sheet')).toBeInTheDocument();
  });

  test('should render provisioning table after sheet selection without blank page', async () => {
    mockInvoke.mockResolvedValueOnce(mockNetworkData);

    render(
      <ProvisioningPage
        isVisible={true}
        onClose={() => {}}
        onNavigate={() => {}}
        conversionMap={mockConversionMap}
        apstraConfig={mockApstraConfig}
      />
    );

    // Upload file
    const uploadButton = screen.getByText('Upload File');
    fireEvent.click(uploadButton);

    // Select sheet
    await waitFor(() => {
      const sheetButton = screen.getByTestId('sheet-option-Sheet1');
      fireEvent.click(sheetButton);
    });

    // Verify loading state appears
    await waitFor(() => {
      expect(screen.getByTestId('provisioning-table-loading')).toBeInTheDocument();
    });

    // Verify table renders after loading
    await waitFor(() => {
      expect(screen.getByTestId('provisioning-table')).toBeInTheDocument();
    });

    expect(screen.getByTestId('table-row-count')).toHaveTextContent('2 rows');
    expect(screen.getByTestId('table-row-0')).toHaveTextContent('server1 - switch1');
    expect(screen.getByTestId('table-row-1')).toHaveTextContent('server1 - switch1');

    // Verify all page sections are still visible (not blank page)
    expect(screen.getByText('Step 1: Select File')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Select Sheet')).toBeInTheDocument();
    expect(screen.getByText('Step 3: Select Blueprint & Actions')).toBeInTheDocument();
  });

  test('should handle sheet parsing errors without causing blank page', async () => {
    // Mock parsing failure
    mockInvoke.mockRejectedValueOnce(new Error('Failed to parse Excel sheet'));

    render(
      <ProvisioningPage
        isVisible={true}
        onClose={() => {}}
        onNavigate={() => {}}
        conversionMap={mockConversionMap}
        apstraConfig={mockApstraConfig}
      />
    );

    // Upload file and select sheet
    const uploadButton = screen.getByText('Upload File');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      const sheetButton = screen.getByTestId('sheet-option-Sheet1');
      fireEvent.click(sheetButton);
    });

    // Wait for error handling
    await waitFor(() => {
      // Should not show the table due to error
      expect(screen.queryByTestId('provisioning-table')).not.toBeInTheDocument();
      // But page structure should remain visible (not blank)
      expect(screen.getByText('Step 1: Select File')).toBeInTheDocument();
      expect(screen.getByText('Step 2: Select Sheet')).toBeInTheDocument();
    });

    // Verify invoke was called with correct parameters
    expect(mockInvoke).toHaveBeenCalledWith('parse_excel_sheet', {
      filePath: '/test/file.xlsx',
      sheetName: 'Sheet1',
      enhancedConversionMap: mockConversionMap
    });
  });

  test('should handle empty data response without blank page', async () => {
    mockInvoke.mockResolvedValueOnce([]);

    render(
      <ProvisioningPage
        isVisible={true}
        onClose={() => {}}
        onNavigate={() => {}}
        conversionMap={mockConversionMap}
        apstraConfig={mockApstraConfig}
      />
    );

    // Upload file and select sheet
    const uploadButton = screen.getByText('Upload File');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      const sheetButton = screen.getByTestId('sheet-option-Sheet1');
      fireEvent.click(sheetButton);
    });

    // Wait for empty data handling
    await waitFor(() => {
      expect(screen.getByTestId('provisioning-table')).toBeInTheDocument();
    });

    expect(screen.getByTestId('table-row-count')).toHaveTextContent('0 rows');

    // Verify page structure remains (not blank)
    expect(screen.getByText('Step 1: Select File')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Select Sheet')).toBeInTheDocument();
    expect(screen.getByText('Step 3: Select Blueprint & Actions')).toBeInTheDocument();
  });

  test('should handle null/undefined data gracefully without blank page', async () => {
    mockInvoke.mockResolvedValueOnce(null);

    render(
      <ProvisioningPage
        isVisible={true}
        onClose={() => {}}
        onNavigate={() => {}}
        conversionMap={mockConversionMap}
        apstraConfig={mockApstraConfig}
      />
    );

    // Upload file and select sheet
    const uploadButton = screen.getByText('Upload File');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      const sheetButton = screen.getByTestId('sheet-option-Sheet1');
      fireEvent.click(sheetButton);
    });

    // Wait for null data handling
    await waitFor(() => {
      expect(screen.getByTestId('provisioning-table')).toBeInTheDocument();
    });

    expect(screen.getByTestId('table-row-count')).toHaveTextContent('0 rows');

    // Verify page structure remains (not blank)
    expect(screen.getByText('Step 1: Select File')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Select Sheet')).toBeInTheDocument();
  });

  test('should detect LAG processing integration without blank page', async () => {
    // Test that LAG processing doesn't cause blank page
    const dataWithLAG = [
      {
        ...mockNetworkData[0],
        link_group_lag_mode: 'lacp_active',
        link_group_ifname: '', // Empty, should trigger auto-generation
      },
      {
        ...mockNetworkData[1],
        link_group_lag_mode: 'lacp_active',
        link_group_ifname: '', // Empty, should trigger auto-generation
      }
    ];

    mockInvoke.mockResolvedValueOnce(dataWithLAG);

    render(
      <ProvisioningPage
        isVisible={true}
        onClose={() => {}}
        onNavigate={() => {}}
        conversionMap={mockConversionMap}
        apstraConfig={mockApstraConfig}
      />
    );

    // Upload file and select sheet
    const uploadButton = screen.getByText('Upload File');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      const sheetButton = screen.getByTestId('sheet-option-Sheet1');
      fireEvent.click(sheetButton);
    });

    // Wait for LAG processing to complete
    await waitFor(() => {
      expect(screen.getByTestId('provisioning-table')).toBeInTheDocument();
    });

    expect(screen.getByTestId('table-row-count')).toHaveTextContent('2 rows');

    // Verify the table component receives the processed data
    expect(screen.getByTestId('table-row-0')).toBeInTheDocument();
    expect(screen.getByTestId('table-row-1')).toBeInTheDocument();

    // Verify page structure remains intact (LAG processing doesn't cause blank page)
    expect(screen.getByText('Step 1: Select File')).toBeInTheDocument();
    expect(screen.getByText('Step 2: Select Sheet')).toBeInTheDocument();
    expect(screen.getByText('Step 3: Select Blueprint & Actions')).toBeInTheDocument();
  });

  test('should show data summary when table data is present', async () => {
    mockInvoke.mockResolvedValueOnce(mockNetworkData);

    render(
      <ProvisioningPage
        isVisible={true}
        onClose={() => {}}
        onNavigate={() => {}}
        conversionMap={mockConversionMap}
        apstraConfig={mockApstraConfig}
      />
    );

    // Upload file and select sheet
    const uploadButton = screen.getByText('Upload File');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      const sheetButton = screen.getByTestId('sheet-option-Sheet1');
      fireEvent.click(sheetButton);
    });

    // Wait for data summary to appear
    await waitFor(() => {
      expect(screen.getByText('Lines:')).toBeInTheDocument();
    });

    expect(screen.getByText('Servers:')).toBeInTheDocument();
    expect(screen.getByText('Switches:')).toBeInTheDocument();

    // Verify summary shows correct counts - just check that the counts are visible
    expect(screen.getByText('2')).toBeInTheDocument(); // Lines count
    expect(screen.getByText('1')).toBeInTheDocument(); // Servers/Switches count (both are 1, so one check is sufficient)
  });
});