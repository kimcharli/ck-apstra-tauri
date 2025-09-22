# Device Filtering Implementation

## Overview

Implemented automatic filtering of non-blueprint switches during the "Fetch & Compare" operation to remove devices that don't exist in the selected Apstra blueprint.

## Problem Statement

Users reported that devices like `CHA08P26NMS01-3` and `STG15ANAE037` were appearing in the provisioning table even though they are not actual switches in the Apstra blueprint. These devices should be filtered out automatically.

## Solution Design

### Filtering Strategy: "Upon Fetching"

**Decision**: Implement filtering during the API comparison process rather than during Excel parsing.

**Rationale**:
- Avoids data loss issues that occurred with pre-filtering approaches
- Uses authoritative Apstra API data to determine which devices are valid switches
- Maintains blueprint auto-detection functionality
- Prevents table from going blank due to batch filtering operations

### Implementation Details

#### Location
- **Primary Logic**: `src/components/ProvisioningTable/ProvisioningTable.tsx`
- **Function**: `compareAndUpdateConnectivityData()`
- **Lines**: 813-850

#### Algorithm

1. **Build Switch Inventory**: During API response processing, collect all switches that actually exist in the blueprint
   ```typescript
   const switchesInBlueprint = new Set<string>();
   apiConnectionsMap.forEach((connectionData, connectionKey) => {
     if (connectionData.switchName) {
       switchesInBlueprint.add(connectionData.switchName);
     }
   });
   ```

2. **Filter Excel Data**: Remove rows where switch is not found in blueprint
   ```typescript
   const filteredData = groupedData.filter(row => {
     if (!row.switch_label) return true;

     const isInBlueprint = switchesInBlueprint.has(row.switch_label);

     if (!isInBlueprint) {
       console.log(`🗑️ Filtering out switch not in blueprint: ${row.switch_label}`);
     }

     return isInBlueprint;
   });
   ```

3. **Update Parent Data**: Trigger data updates when filtering occurs
   ```typescript
   const rowsWereFiltered = filteredRowCount < originalRowCount;

   if ((newRowsAdded > 0 || rowsWereFiltered) && onDataUpdate) {
     onDataUpdate(updatedData);
   }
   ```

#### Key Features

- **Line-by-line filtering**: Each row is evaluated individually
- **Authoritative validation**: Uses actual Apstra API connectivity data as source of truth
- **Automatic updates**: Parent component data is updated automatically
- **Detailed logging**: Console logs show which devices are filtered and why
- **Safety-first**: Preserves rows without switch labels rather than erroring

#### Logging Output

```
🔍 Blueprint filtering results: {
  originalRows: 50,
  filteredRows: 45,
  switchesInBlueprint: ["CHA08P26L03", "CHA08P26L04", ...],
  removedRows: 5
}

🗑️ Filtering out switch not in blueprint: CHA08P26NMS01-3 (et-0/0/1) -> SomeServer
🗑️ Filtering out switch not in blueprint: STG15ANAE037 (N/A) -> AnotherServer
```

## Integration Points

### Existing Features Preserved

- ✅ **Blueprint Auto-detection**: Continues to work correctly
- ✅ **"Hide Non-Apstra Switches" Toggle**: Remains available for user control
- ✅ **Multi-chunk API Merging**: LAG and CT data merging still functions
- ✅ **LAG Processing**: Auto-generation and validation unaffected

### Data Flow

```
Excel Upload → Sheet Selection → Blueprint Detection → "Fetch & Compare" → Device Filtering → Updated Table
```

## Testing Scenarios

### Expected Behavior

**Devices that should be filtered out**:
- `CHA08P26NMS01-3` (NMS devices - network management, not switches)
- `STG15ANAE037` (STG devices - staging/temporary, not production switches)
- Any device appearing in Excel but not found in blueprint connectivity data

**Devices that should remain**:
- `CHA08P26L03` (Valid switches found in blueprint)
- Any device that has actual connectivity data in Apstra

### Validation Steps

1. Upload Excel with mixed device types (switches, NMS, STG devices)
2. Select sheet and verify blueprint auto-detection works
3. Click "Fetch & Compare"
4. Verify non-blueprint devices are automatically removed
5. Check console logs for filtering details

## Previous Attempts and Lessons Learned

### Failed Approach: Pre-filtering During Excel Parsing

**Issues**:
- Caused table to go blank when batch filtering was applied
- Required complex device validation queries during parsing
- Interfered with blueprint auto-detection
- Created race conditions with authentication checks

**Key Learning**: Filtering should happen after authoritative data is available, not before.

### Successful Approach: Post-fetch Filtering

**Advantages**:
- Uses actual blueprint connectivity data as filter criteria
- No risk of removing all data due to API issues
- Maintains separation of concerns (parsing vs validation)
- Provides clear audit trail of what was filtered and why

## Future Considerations

### Potential Enhancements

1. **User Control**: Add toggle to disable automatic filtering if needed
2. **Filter Criteria**: Allow custom regex patterns for device name filtering
3. **Reporting**: Generate summary reports of filtered devices
4. **Bulk Operations**: Extend filtering to other operations beyond "Fetch & Compare"

### Maintenance Notes

- Monitor console logs for unexpected filtering behavior
- Verify filtering doesn't interfere with valid switch names that might contain "NMS" or "STG"
- Consider performance impact with very large datasets (>1000 rows)

## Implementation Date

**Date**: January 2025
**Files Modified**:
- `src/components/ProvisioningTable/ProvisioningTable.tsx`

**Changes**:
- Added device filtering logic in `compareAndUpdateConnectivityData()`
- Enhanced parent data update logic to handle filtering scenarios
- Added comprehensive logging for troubleshooting

---

**Status**: ✅ Implemented and ready for testing