import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProvisioningTable from '../ProvisioningTable';
import { NetworkConfigRow } from '../../../types';

// Mock the ApstraApiService
vi.mock('../../../services/ApstraApiService', () => ({
  apstraApiService: {
    getHost: vi.fn(() => 'mock-host'),
    queryConnectivity: vi.fn(),
  }
}));

// Mock the blueprint mapping utilities
vi.mock('../../../utils/blueprintMapping', () => ({
  getBlueprintIdByLabel: vi.fn(() => 'mock-blueprint-id'),
}));

// Mock the Apstra link helpers
vi.mock('../../../utils/apstraLinkHelpers', () => ({
  renderApstraSystemButtonWithLookup: vi.fn(() => 'MockedButton'),
}));

describe('ProvisioningTable', () => {
  const mockOnProvision = vi.fn();
  const mockOnDataUpdate = vi.fn();

  const createMockData = (): NetworkConfigRow[] => [
    {
      blueprint: 'test-blueprint',
      server_label: 'ServerB',
      switch_label: 'SwitchA',
      switch_ifname: 'eth1',
      server_ifname: 'ens1',
      link_speed: '10G',
      link_group_lag_mode: '',
      link_group_ct_names: '',
      link_group_ifname: '',
      is_external: false,
      server_tags: '',
      switch_tags: '',
      link_tags: '',
      comment: ''
    },
    {
      blueprint: 'test-blueprint',
      server_label: 'ServerA',
      switch_label: 'SwitchB',
      switch_ifname: 'eth2',
      server_ifname: 'ens2',
      link_speed: '25G',
      link_group_lag_mode: '',
      link_group_ct_names: '',
      link_group_ifname: '',
      is_external: false,
      server_tags: '',
      switch_tags: '',
      link_tags: '',
      comment: ''
    },
    {
      blueprint: 'test-blueprint',
      server_label: 'ServerB',
      switch_label: 'SwitchC',
      switch_ifname: 'eth3',
      server_ifname: 'ens3',
      link_speed: '10G',
      link_group_lag_mode: '',
      link_group_ct_names: '',
      link_group_ifname: '',
      is_external: false,
      server_tags: '',
      switch_tags: '',
      link_tags: '',
      comment: ''
    },
    {
      blueprint: 'test-blueprint',
      server_label: 'ServerA',
      switch_label: 'SwitchA',
      switch_ifname: 'eth1',
      server_ifname: 'ens1',
      link_speed: '25G',
      link_group_lag_mode: '',
      link_group_ct_names: '',
      link_group_ifname: '',
      is_external: false,
      server_tags: '',
      switch_tags: '',
      link_tags: '',
      comment: ''
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Server Grouping Functionality', () => {
    it('should group connections by server_label alphabetically', () => {
      const testData = createMockData();
      
      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );

      // Get all server name cells
      const serverCells = screen.getAllByText(/Server[AB]/);
      
      // Should be grouped: ServerA, ServerA, ServerB, ServerB
      expect(serverCells[0]).toHaveTextContent('ServerA');
      expect(serverCells[1]).toHaveTextContent('ServerA');
      expect(serverCells[2]).toHaveTextContent('ServerB');
      expect(serverCells[3]).toHaveTextContent('ServerB');
    });

    it('should sort connections within each server group by switch and interface', () => {
      const testData: NetworkConfigRow[] = [
        {
          blueprint: 'test',
          server_label: 'Web01',
          switch_label: 'SwitchB',
          switch_ifname: 'eth2',
          server_ifname: 'ens1',
          link_speed: '10G',
          link_group_lag_mode: '',
          link_group_ct_names: '',
          link_group_ifname: '',
          is_external: false,
          server_tags: '',
          switch_tags: '',
          link_tags: '',
          comment: ''
        },
        {
          blueprint: 'test',
          server_label: 'Web01',
          switch_label: 'SwitchA',
          switch_ifname: 'eth1',
          server_ifname: 'ens2',
          link_speed: '25G',
          link_group_lag_mode: '',
          link_group_ct_names: '',
          link_group_ifname: '',
          is_external: false,
          server_tags: '',
          switch_tags: '',
          link_tags: '',
          comment: ''
        },
        {
          blueprint: 'test',
          server_label: 'Web01',
          switch_label: 'SwitchA',
          switch_ifname: 'eth0',
          server_ifname: 'ens3',
          link_speed: '1G',
          link_group_lag_mode: '',
          link_group_ct_names: '',
          link_group_ifname: '',
          is_external: false,
          server_tags: '',
          switch_tags: '',
          link_tags: '',
          comment: ''
        },
      ];

      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );

      // Get switch interface cells in order
      const switchInterfaceCells = screen.getAllByText(/eth[0-9]/);
      
      // Should be sorted within Web01 group: SwitchA/eth0, SwitchA/eth1, SwitchB/eth2
      expect(switchInterfaceCells[0]).toHaveTextContent('eth0');
      expect(switchInterfaceCells[1]).toHaveTextContent('eth1');
      expect(switchInterfaceCells[2]).toHaveTextContent('eth2');
    });

    it('should handle servers with empty or null server_label', () => {
      const testData: NetworkConfigRow[] = [
        {
          blueprint: 'test',
          server_label: '',
          switch_label: 'SwitchA',
          switch_ifname: 'eth1',
          server_ifname: 'ens1',
          link_speed: '10G',
          link_group_lag_mode: '',
          link_group_ct_names: '',
          link_group_ifname: '',
          is_external: false,
          server_tags: '',
          switch_tags: '',
          link_tags: '',
          comment: ''
        },
        {
          blueprint: 'test',
          server_label: 'ServerA',
          switch_label: 'SwitchB',
          switch_ifname: 'eth2',
          server_ifname: 'ens2',
          link_speed: '25G',
          link_group_lag_mode: '',
          link_group_ct_names: '',
          link_group_ifname: '',
          is_external: false,
          server_tags: '',
          switch_tags: '',
          link_tags: '',
          comment: ''
        },
      ];

      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );

      // Should render without crashing and group properly
      expect(screen.getByText('ServerA')).toBeInTheDocument();
      // The empty server_label should be handled gracefully
    });

    it('should toggle server grouping when checkbox is clicked', () => {
      const testData = createMockData();
      
      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );

      const groupToggle = screen.getByLabelText('Group by Server');
      expect(groupToggle).toBeChecked(); // Should be checked by default

      // Uncheck the grouping
      fireEvent.click(groupToggle);
      expect(groupToggle).not.toBeChecked();

      // Check it again
      fireEvent.click(groupToggle);
      expect(groupToggle).toBeChecked();
    });
  });

  describe('Blueprint-Only Connections', () => {
    it('should apply blueprint-only styling to connections marked as "Only in Blueprint"', () => {
      const testData: NetworkConfigRow[] = [
        {
          blueprint: 'test',
          server_label: 'ServerA',
          switch_label: 'SwitchA',
          switch_ifname: 'eth1',
          server_ifname: 'ens1',
          link_speed: '10G',
          link_group_lag_mode: '',
          link_group_ct_names: '',
          link_group_ifname: '',
          is_external: false,
          server_tags: '',
          switch_tags: '',
          link_tags: '',
          comment: 'Only in Blueprint'
        },
        {
          blueprint: 'test',
          server_label: 'ServerA',
          switch_label: 'SwitchB',
          switch_ifname: 'eth2',
          server_ifname: 'ens2',
          link_speed: '25G',
          link_group_lag_mode: '',
          link_group_ct_names: '',
          link_group_ifname: '',
          is_external: false,
          server_tags: '',
          switch_tags: '',
          link_tags: '',
          comment: ''
        },
      ];

      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );

      // Should display the special comment format
      expect(screen.getByText('🔗 Only in Blueprint')).toBeInTheDocument();
      
      // Should show the legend when blueprint-only connections exist
      expect(screen.getByText(/Blue highlighted rows: Connections found only in Blueprint/)).toBeInTheDocument();
    });
  });

  describe('Data Integrity', () => {
    it('should maintain selection state when grouping is toggled', () => {
      const testData = createMockData();
      
      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );

      // Select first row
      const firstCheckbox = screen.getAllByRole('checkbox')[1]; // Skip header checkbox
      fireEvent.click(firstCheckbox);
      
      expect(firstCheckbox).toBeChecked();

      // Toggle grouping off and on
      const groupToggle = screen.getByLabelText('Group by Server');
      fireEvent.click(groupToggle);
      fireEvent.click(groupToggle);

      // Selection should be maintained (though row order might change)
      const checkboxes = screen.getAllByRole('checkbox');
      const selectedCount = checkboxes.filter(cb => (cb as HTMLInputElement).checked && cb !== screen.getByTitle('Select all visible rows')).length;
      expect(selectedCount).toBe(1);
    });

    it('should filter data correctly while maintaining grouping', () => {
      const testData = createMockData();
      
      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );

      // Filter for ServerA
      const filterInput = screen.getByPlaceholderText('Filter data...');
      fireEvent.change(filterInput, { target: { value: 'ServerA' } });

      // Should only show ServerA rows
      expect(screen.getAllByText('ServerA')).toHaveLength(2);
      expect(screen.queryByText('ServerB')).not.toBeInTheDocument();
    });

    it('should show correct row counts in summary', () => {
      const testData = createMockData();
      
      render(
        <ProvisioningTable
          data={testData}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );

      // Check total row count
      expect(screen.getByText(/Showing 4 of 4 rows/)).toBeInTheDocument();

      // Select some rows
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[1]); // First data row
      fireEvent.click(checkboxes[2]); // Second data row

      // Check selected count
      expect(screen.getByText(/2 selected/)).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty data gracefully', () => {
      render(
        <ProvisioningTable
          data={[]}
          isLoading={false}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );

      expect(screen.getByText('No data available. Please upload and parse an Excel file.')).toBeInTheDocument();
    });

    it('should handle loading state', () => {
      render(
        <ProvisioningTable
          data={[]}
          isLoading={true}
          onProvision={mockOnProvision}
          onDataUpdate={mockOnDataUpdate}
        />
      );

      expect(screen.getByText('Loading network configuration data...')).toBeInTheDocument();
    });
  });
});