import { NetworkConfigRow } from '../../../../types';

/**
 * Test data fixtures for ProvisioningTable tests
 */

export const multiServerTestData: NetworkConfigRow[] = [
  // Web servers with multiple interfaces (intentionally unsorted to test grouping)
  {
    blueprint: 'test-blueprint',
    server_label: 'Web01',
    switch_label: 'SW2',
    switch_ifname: 'eth1',
    server_ifname: 'ens192',
    link_speed: '10G',
    link_group_lag_mode: '',
    link_group_ct_names: 'Web_CT',
    link_group_ifname: '',
    is_external: false,
    server_tags: 'web,frontend',
    switch_tags: 'access',
    link_tags: 'prod',
    comment: ''
  },
  {
    blueprint: 'test-blueprint',
    server_label: 'DB01',
    switch_label: 'SW1',
    switch_ifname: 'eth3',
    server_ifname: 'ens192',
    link_speed: '25G',
    link_group_lag_mode: 'active',
    link_group_ct_names: 'DB_CT',
    link_group_ifname: 'ae0',
    is_external: false,
    server_tags: 'database,backend',
    switch_tags: 'core',
    link_tags: 'prod',
    comment: ''
  },
  {
    blueprint: 'test-blueprint',
    server_label: 'Web01',
    switch_label: 'SW1',
    switch_ifname: 'eth2',
    server_ifname: 'ens224',
    link_speed: '10G',
    link_group_lag_mode: '',
    link_group_ct_names: 'Web_CT',
    link_group_ifname: '',
    is_external: false,
    server_tags: 'web,frontend',
    switch_tags: 'access',
    link_tags: 'prod',
    comment: ''
  },
  {
    blueprint: 'test-blueprint',
    server_label: 'App01',
    switch_label: 'SW3',
    switch_ifname: 'eth1',
    server_ifname: 'ens192',
    link_speed: '25G',
    link_group_lag_mode: '',
    link_group_ct_names: 'App_CT',
    link_group_ifname: '',
    is_external: true,
    server_tags: 'application,middleware',
    switch_tags: 'dmz',
    link_tags: 'prod',
    comment: 'DMZ connection'
  },
  {
    blueprint: 'test-blueprint',
    server_label: 'DB01',
    switch_label: 'SW2',
    switch_ifname: 'eth4',
    server_ifname: 'ens224',
    link_speed: '25G',
    link_group_lag_mode: 'active',
    link_group_ct_names: 'DB_CT',
    link_group_ifname: 'ae0',
    is_external: false,
    server_tags: 'database,backend',
    switch_tags: 'core',
    link_tags: 'prod',
    comment: ''
  }
];

export const singleServerTestData: NetworkConfigRow[] = [
  {
    blueprint: 'test-blueprint',
    server_label: 'Standalone01',
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
    comment: ''
  }
];

export const blueprintOnlyTestData: NetworkConfigRow[] = [
  {
    blueprint: 'test-blueprint',
    server_label: 'Web01',
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
    comment: ''
  },
  {
    blueprint: 'test-blueprint',
    server_label: 'Web01',
    switch_label: 'SW2',
    switch_ifname: 'eth3',
    server_ifname: 'ens224',
    link_speed: '25G',
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
    blueprint: 'test-blueprint',
    server_label: 'DB01',
    switch_label: 'SW1',
    switch_ifname: 'eth5',
    server_ifname: 'ens256',
    link_speed: '40G',
    link_group_lag_mode: '',
    link_group_ct_names: '',
    link_group_ifname: '',
    is_external: false,
    server_tags: '',
    switch_tags: '',
    link_tags: '',
    comment: 'Only in Blueprint'
  }
];

export const edgeCaseTestData: NetworkConfigRow[] = [
  // Empty server label
  {
    blueprint: 'test-blueprint',
    server_label: '',
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
    comment: ''
  },
  // Null-like values
  {
    blueprint: 'test-blueprint',
    server_label: 'ValidServer',
    switch_label: '',
    switch_ifname: '',
    server_ifname: '',
    link_speed: '',
    link_group_lag_mode: '',
    link_group_ct_names: '',
    link_group_ifname: '',
    is_external: false,
    server_tags: '',
    switch_tags: '',
    link_tags: '',
    comment: ''
  },
  // Special characters in names
  {
    blueprint: 'test-blueprint',
    server_label: 'Server-With-Dashes_And_Underscores',
    switch_label: 'SW.1',
    switch_ifname: 'eth0/0/1',
    server_ifname: 'bond0.100',
    link_speed: '100G',
    link_group_lag_mode: 'active-backup',
    link_group_ct_names: 'Special_CT-Name',
    link_group_ifname: 'ae-0',
    is_external: true,
    server_tags: 'tag1,tag2,tag3',
    switch_tags: 'switch-tag',
    link_tags: 'link-tag',
    comment: 'Special characters test'
  }
];

/**
 * Mock API response data for Fetch & Compare tests
 */
export const mockApiResponseData = [
  // Existing connection (should match)
  {
    switch: { label: 'SW1', hostname: 'switch1.example.com' },
    server: { label: 'Web01', hostname: 'web01.example.com' },
    switch_intf: { if_name: 'eth2' },
    server_intf: { if_name: 'ens224' },
    link: { id: 'link1' }
  },
  // New connection for existing server (should be added as "Only in Blueprint")
  {
    switch: { label: 'SW3', hostname: 'switch3.example.com' },
    server: { label: 'Web01', hostname: 'web01.example.com' },
    switch_intf: { if_name: 'eth1' },
    server_intf: { if_name: 'ens256' },
    link: { id: 'link2' }
  },
  // Connection to different server (should be added)
  {
    switch: { label: 'SW1', hostname: 'switch1.example.com' },
    server: { label: 'NewServer01', hostname: 'new01.example.com' },
    switch_intf: { if_name: 'eth10' },
    server_intf: { if_name: 'ens192' },
    link: { id: 'link3' }
  }
];

/**
 * Expected results after server grouping
 */
export const expectedGroupedOrder = [
  'App01', 'DB01', 'DB01', 'Web01', 'Web01' // Alphabetical server grouping
];

/**
 * Expected results for Fetch & Compare operation
 */
export interface ExpectedComparisonResult {
  matches: number;
  missing: number;
  extra: number;
  newRowsAdded: number;
  totalRowsAfter: number;
}

export const expectedComparisonResults: ExpectedComparisonResult = {
  matches: 1, // SW1-Web01-eth2 match
  missing: 4, // Original rows not found in API
  extra: 2,   // SW3-Web01-eth1 and SW1-NewServer01-eth10
  newRowsAdded: 2,
  totalRowsAfter: 7 // Original 5 + 2 new
};

/**
 * Performance test data - large dataset for stress testing
 */
export const generateLargeTestDataset = (serverCount: number, connectionsPerServer: number): NetworkConfigRow[] => {
  const data: NetworkConfigRow[] = [];
  
  for (let s = 1; s <= serverCount; s++) {
    for (let c = 1; c <= connectionsPerServer; c++) {
      data.push({
        blueprint: 'perf-test',
        server_label: `Server${s.toString().padStart(3, '0')}`,
        switch_label: `SW${((c - 1) % 10 + 1).toString().padStart(2, '0')}`,
        switch_ifname: `eth${c}`,
        server_ifname: `ens${192 + c}`,
        link_speed: c % 2 === 0 ? '25G' : '10G',
        link_group_lag_mode: c > 2 ? 'active' : '',
        link_group_ct_names: `CT_${s}`,
        link_group_ifname: c > 2 ? `ae${c - 2}` : '',
        is_external: s % 10 === 0, // Every 10th server is external
        server_tags: `server-${s}`,
        switch_tags: `switch-tag`,
        link_tags: `link-${c}`,
        comment: ''
      });
    }
  }
  
  return data;
};