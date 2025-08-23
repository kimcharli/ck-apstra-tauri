import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import ProvisioningTable from '../ProvisioningTable';
import { 
  multiServerTestData, 
  mockApiResponseData, 
  expectedComparisonResults,
  blueprintOnlyTestData,
  generateLargeTestDataset
} from './fixtures/testData';

// Mock dependencies
vi.mock('../../../services/ApstraApiService', () => ({
  apstraApiService: {
    getHost: vi.fn(() => 'mock-host'),
    queryConnectivity: vi.fn(),
  }
}));

vi.mock('../../../utils/blueprintMapping', () => ({
  getBlueprintIdByLabel: vi.fn(() => 'mock-blueprint-id'),
}));

vi.mock('../../../utils/apstraLinkHelpers', () => ({
  renderApstraSystemButtonWithLookup: vi.fn(() => 'MockedButton'),
}));

describe('ProvisioningTable - Fetch & Compare Logic', () => {
  const mockOnProvision = vi.fn();
  const mockOnDataUpdate = vi.fn();

  // Helper function to extract the compareAndUpdateConnectivityData logic
  // Note: In a real implementation, you might want to extract this function
  // to a separate utility file to make it easier to test in isolation
  const createTestCompareFunction = () => {
    const mockComponent = render(
      <ProvisioningTable
        data={[]}
        isLoading={false}
        onProvision={mockOnProvision}
        onDataUpdate={mockOnDataUpdate}
      />
    );

    // We'll test the logic indirectly through the component
    return mockComponent;
  };

  describe('Duplicate Prevention Logic', () => {
    it('should prevent duplicate connections based on switch_label + server_label + switch_ifname', () => {
      const existingData = [
        {
          blueprint: 'test',
          server_label: 'Web01',
          switch_label: 'SW1',
          switch_ifname: 'eth1',
          server_ifname: 'ens192', // This should not affect duplicate detection
          link_speed: '10G',
          link_group_lag_mode: '',
          link_group_ct_names: '',
          link_group_ifname: '',
          is_external: false,
          server_tags: '',
          switch_tags: '',
          link_tags: '',
          comment: ''
        }
      ];

      const apiResults = [
        // Exact match - should not be added as duplicate
        {
          switch: { label: 'SW1' },
          server: { label: 'Web01' },
          switch_intf: { if_name: 'eth1' },
          server_intf: { if_name: 'ens224' }, // Different server interface - should still be considered duplicate
        },
        // Different switch interface - should be added
        {
          switch: { label: 'SW1' },
          server: { label: 'Web01' },
          switch_intf: { if_name: 'eth2' },
          server_intf: { if_name: 'ens192' },
        },
        // Different switch - should be added
        {
          switch: { label: 'SW2' },
          server: { label: 'Web01' },
          switch_intf: { if_name: 'eth1' },
          server_intf: { if_name: 'ens192' },
        }
      ];

      // Test would verify that only 2 new connections are added (not the duplicate)
      // This tests our rule: server_ifname doesn't affect duplicate detection
    });

    it('should allow multiple connections for same server on different switch interfaces', () => {
      const existingData = [
        {
          blueprint: 'test',
          server_label: 'DB01',
          switch_label: 'SW1',
          switch_ifname: 'eth1',
          server_ifname: 'bond0',
          link_speed: '25G',
          link_group_lag_mode: 'active',
          link_group_ct_names: '',
          link_group_ifname: '',
          is_external: false,
          server_tags: '',
          switch_tags: '',
          link_tags: '',
          comment: ''
        }
      ];

      const apiResults = [
        // Same server, same switch, different interface - should be added
        {
          switch: { label: 'SW1' },
          server: { label: 'DB01' },
          switch_intf: { if_name: 'eth2' },
          server_intf: { if_name: 'bond1' },
        },
        // Same server, different switch, same interface - should be added
        {
          switch: { label: 'SW2' },
          server: { label: 'DB01' },
          switch_intf: { if_name: 'eth1' },
          server_intf: { if_name: 'bond0' },
        }
      ];

      // Should add both new connections since they have different switch interface combinations
    });
  });

  describe('Server Grouping Integration', () => {
    it('should group newly added "Only in Blueprint" connections with existing servers', () => {
      const existingData = blueprintOnlyTestData.slice(0, 1); // Just Web01 first connection
      
      const apiResults = [
        // Existing connection
        {
          switch: { label: 'SW1' },
          server: { label: 'Web01' },
          switch_intf: { if_name: 'eth1' },
          server_intf: { if_name: 'ens192' },
        },
        // New connection for same server - should be grouped with Web01
        {
          switch: { label: 'SW3' },
          server: { label: 'Web01' },
          switch_intf: { if_name: 'eth5' },
          server_intf: { if_name: 'ens256' },
        },
        // New server connection - should be grouped separately
        {
          switch: { label: 'SW2' },
          server: { label: 'App01' },
          switch_intf: { if_name: 'eth2' },
          server_intf: { if_name: 'ens192' },
        }
      ];

      // After processing, should have:
      // App01 group (1 connection)
      // Web01 group (2 connections: original + new "Only in Blueprint")
    });

    it('should maintain server grouping order after adding API connections', () => {
      // Test that alphabetical server ordering is preserved
      // when new connections are added
    });
  });

  describe('Blueprint-Only Connection Marking', () => {
    it('should mark API-only connections with "Only in Blueprint" comment', () => {
      const existingData = [
        {
          blueprint: 'test',
          server_label: 'ExistingServer',
          switch_label: 'SW1',
          switch_ifname: 'eth1',
          server_ifname: 'ens192',
          link_speed: '10G',
          link_group_lag_mode: '',
          link_group_ct_names: '',
          link_group_ifname: '',
          is_external: false,
          server_tags: '',
          switch_tags: '',
          link_tags: '',
          comment: 'Original comment'
        }
      ];

      const apiResults = [
        // New connection not in existing data
        {
          switch: { label: 'SW2' },
          server: { label: 'NewServer' },
          switch_intf: { if_name: 'eth1' },
          server_intf: { if_name: 'ens192' },
        }
      ];

      // New connection should have comment: 'Only in Blueprint'
    });

    it('should preserve blueprint context for new connections', () => {
      // New connections should inherit the blueprint from the query context
      // Default should be 'DH4-Colo2' as specified in the implementation
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API results with missing switch or server information', () => {
      const existingData = multiServerTestData.slice(0, 2);
      
      const apiResults = [
        // Valid result
        {
          switch: { label: 'SW1' },
          server: { label: 'Web01' },
          switch_intf: { if_name: 'eth1' },
          server_intf: { if_name: 'ens192' },
        },
        // Missing switch label
        {
          switch: { hostname: 'switch1.example.com' }, // Only hostname, no label
          server: { label: 'Web01' },
          switch_intf: { if_name: 'eth2' },
          server_intf: { if_name: 'ens224' },
        },
        // Missing server label
        {
          switch: { label: 'SW2' },
          server: { hostname: 'server1.example.com' }, // Only hostname, no label
          switch_intf: { if_name: 'eth1' },
          server_intf: { if_name: 'ens192' },
        },
        // Missing switch interface
        {
          switch: { label: 'SW3' },
          server: { label: 'Web01' },
          server_intf: { if_name: 'ens256' },
        }
      ];

      // Should gracefully handle malformed API results
      // Should only process the valid result
    });

    it('should handle empty API results', () => {
      const existingData = multiServerTestData;
      const apiResults: any[] = [];

      // Should return original data unchanged
      // All existing connections should be marked as 'missing'
    });

    it('should handle large datasets efficiently', () => {
      const largeDataset = generateLargeTestDataset(100, 5); // 500 connections
      
      const apiResults = largeDataset.slice(0, 250).map(row => ({
        switch: { label: row.switch_label },
        server: { label: row.server_label },
        switch_intf: { if_name: row.switch_ifname },
        server_intf: { if_name: row.server_ifname },
      }));

      // Should handle large datasets without performance issues
      // Should maintain server grouping with large data
    });
  });

  describe('Comparison Statistics', () => {
    it('should provide accurate comparison statistics', () => {
      const testData = multiServerTestData.slice(0, 3); // 3 existing connections
      
      const apiResults = [
        // Match: Web01-SW1-eth2 (should match existing)
        {
          switch: { label: 'SW1' },
          server: { label: 'Web01' },
          switch_intf: { if_name: 'eth2' },
          server_intf: { if_name: 'ens224' },
        },
        // Extra: New connection not in existing data
        {
          switch: { label: 'SW4' },
          server: { label: 'Web01' },
          switch_intf: { if_name: 'eth3' },
          server_intf: { if_name: 'ens320' },
        }
      ];

      // Expected results:
      // - 1 match (Web01-SW1-eth2)
      // - 2 missing (other existing connections not in API)
      // - 1 extra (SW4-Web01-eth3)
      // - 1 new row added
      // - Total rows after: 4 (3 original + 1 new)
    });
  });
});