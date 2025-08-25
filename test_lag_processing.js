#!/usr/bin/env node

/**
 * Quick test for LAG/Bond Name processing logic
 * This tests the same logic as implemented in ProvisioningTable.tsx
 */

// Mock data matching the user's example
const testData = [
  {
    switch_label: 'CRL01P24L09',
    server_label: 'r2lb103945',
    switch_ifname: 'et-0/0/47',
    server_ifname: 'OCP Slot 1 Port 2',
    link_group_lag_mode: 'lacp_active',
    link_group_ifname: '', // Empty - should get auto-generated
  },
  {
    switch_label: 'CRL01P24L10', 
    server_label: 'r2lb103945',
    switch_ifname: 'et-0/0/47',
    server_ifname: 'OCP Slot 2 Port 2', 
    link_group_lag_mode: 'lacp_active',
    link_group_ifname: '', // Empty - should get auto-generated 
  },
  {
    switch_label: 'CRL01P24L09',
    server_label: 'r2lb103946', 
    switch_ifname: 'et-0/0/44',
    server_ifname: 'OCP Slot 1 Port 2',
    link_group_lag_mode: 'lacp_active', 
    link_group_ifname: '', // Empty - should get auto-generated
  },
  {
    switch_label: 'CRL01P24L10',
    server_label: 'r2lb103946',
    switch_ifname: 'et-0/0/44', 
    server_ifname: 'OCP Slot 2 Port 2',
    link_group_lag_mode: 'lacp_active',
    link_group_ifname: '', // Empty - should get auto-generated
  }
];

function processLagBondNames(tableData) {
  let nextLagNumber = 900; // Starting LAG number for auto-generation
  const processedData = [...tableData];
  
  // Group connections that need LAG assignment (empty LAG name but lacp_active mode)
  const lagGroups = new Map();
  
  processedData.forEach((row, index) => {
    // Check if this connection needs LAG name auto-generation
    const needsLagName = !row.link_group_ifname && row.link_group_lag_mode === 'lacp_active';
    
    if (needsLagName) {
      // Create a LAG group key based on server only
      // All interfaces from the same server should share the same LAG regardless of switches
      const lagGroupKey = `${row.server_label}`;
      
      if (!lagGroups.has(lagGroupKey)) {
        lagGroups.set(lagGroupKey, []);
      }
      lagGroups.get(lagGroupKey).push({ ...row, __originalIndex: index });
    }
  });
  
  // Assign the SAME LAG name to ALL connections in each group
  lagGroups.forEach((connections, lagGroupKey) => {
    const lagName = `ae${nextLagNumber}`;
    nextLagNumber++;
    
    console.log(`🔗 Auto-generating LAG name "${lagName}" for ${connections.length} connections in group: ${lagGroupKey}`);
    console.log(`   Interfaces: ${connections.map(c => `${c.switch_ifname}↔${c.server_ifname}`).join(', ')}`);
    
    // Apply the SAME LAG name to ALL connections in this group
    connections.forEach(conn => {
      const originalIndex = conn.__originalIndex;
      if (originalIndex !== undefined) {
        processedData[originalIndex] = {
          ...processedData[originalIndex],
          link_group_ifname: lagName
        };
      }
    });
  });
  
  return processedData;
}

console.log('🧪 Testing LAG/Bond Name Processing Logic\n');

console.log('📋 Input Data:');
testData.forEach((row, index) => {
  console.log(`  ${index}: ${row.switch_label} → ${row.server_label} (${row.switch_ifname} ↔ ${row.server_ifname})`);
});

console.log('\n🔧 Processing LAG groups...\n');

const result = processLagBondNames(testData);

console.log('\n✅ Final Results:');
result.forEach((row, index) => {
  const lagName = row.link_group_ifname || 'none';
  console.log(`  ${index}: ${row.switch_label} → ${row.server_label} (${row.switch_ifname} ↔ ${row.server_ifname}) = ${lagName}`);
});

console.log('\n🎯 Expected Results:');
console.log('  Group 1: r2lb103945 → ae900 (all connections for this server)');  
console.log('  Group 2: r2lb103946 → ae901 (all connections for this server)');

console.log('\n✨ Test completed!');