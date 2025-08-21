# Excel Format Guide

Complete guide for preparing Excel files for the Apstra Network Configuration Tool.

## File Format Requirements

### Basic Requirements

**File Format:**
- **.xlsx only** (Excel 2007+ format)
- **Maximum size**: 100MB per file
- **Encoding**: UTF-8 or standard Excel encoding
- **Extensions supported**: .xlsx (not .xls, .csv, or .txt)

**File Structure:**
```
Row 1: [Optional] Title, metadata, or comments
Row 2: Column headers (Switch Name, Port, Host Name, etc.)
Row 3: First data row
Row 4: Second data row
...
```

### Supported Excel Features

**✅ Supported:**
- Multiple worksheets (you select which to process)
- Standard text and number formatting
- Empty rows between data sections
- Comments and notes (ignored during processing)
- Basic cell formatting (colors, fonts) - ignored but allowed

**❌ Not Supported:**
- **Merged cells** - Can cause data parsing issues
- **Complex formulas** - Only formula results are read
- **Embedded charts/images** - Ignored but may slow processing
- **Password-protected files** - Must be unprotected
- **Very wide tables** (>100 columns) - May cause performance issues

## Column Header Requirements

### Header Mapping System

The application uses a **conversion mapping system** to translate Excel column headers into internal field names. This allows flexibility in Excel file formats.

**How It Works:**
1. Your Excel headers are matched against a conversion map
2. Default mappings are provided for common formats
3. You can customize mappings for your specific Excel layout
4. Unmapped headers are ignored (no error)

### Default Header Mappings

The application comes pre-configured with mappings for common Excel formats:

| Excel Header | Internal Field | Description |
|--------------|----------------|-------------|
| Switch Name | switch_label | Switch hostname or identifier |
| Port | switch_ifname | Switch interface name |
| Host Name | server_label | Connected server name |
| Slot/Port | server_ifname | Server interface name |
| Speed (GB) | link_speed | Link speed in gigabits |
| LACPNeeded | link_group_lag_mode | LACP configuration |
| CTs | link_group_ct_names | Connectivity template names |
| AE | link_group_ifname | Aggregated ethernet interface |
| External | is_external | External connection flag |
| Server Tags | server_tags | Server tag assignments |
| Switch Tags | switch_tags | Switch tag assignments |
| Link Tags | link_tags | Link tag assignments |
| Comment | comment | Configuration comments |

### Header Variations

The system recognizes multiple variations for each field:

**Switch Identifier:**
- "Switch Name", "Switch Label", "Switch", "Hostname"
- Case-insensitive: "SWITCH NAME" = "switch name" = "Switch Name"

**Interface/Port Fields:**
- "Port", "Interface", "Switch Port", "Switch Interface"
- "Slot/Port", "Server Port", "Server Interface"

**Speed Fields:**
- "Speed (GB)", "Speed", "Link Speed", "Bandwidth"
- "Speed (Gbps)", "Speed GB", "BW"

**Boolean Fields:**
- "External", "Is External", "External Connection"
- "LACP Needed", "LACP", "LAG Mode"

### Creating Custom Headers

If your Excel file uses different headers, you have options:

**Option 1: Modify Excel File (Easiest)**
```
Change your Excel headers to match defaults:
Your Header: "Device Name" → Change to: "Switch Name"
Your Header: "Port Number" → Change to: "Port"
Your Header: "Connected Host" → Change to: "Host Name"
```

**Option 2: Configure Custom Mapping**
1. Go to "2. Conversion Map" in the application
2. Click "Manage Conversion Map"
3. Add your custom headers and their corresponding fields
4. Save configuration for reuse

## Data Format Requirements

### Required Fields

**Minimum Required:**
- **Switch identifier** - Name, label, or hostname of the switch
- **Switch interface** - Port or interface name on the switch

**Recommended Additional:**
- **Server identifier** - Name of connected server/device
- **Link speed** - Connection speed for validation
- **External flag** - Whether connection goes outside the fabric

### Field Data Formats

#### Text Fields (Switch/Server Names)
```
✅ Good formats:
- "leaf-01", "spine-02", "switch.domain.com"
- "server-web-01", "db-cluster-node-1"
- "core-sw-1", "access-switch-floor2"

❌ Avoid:
- Names with spaces: "leaf 01" (use "leaf-01")
- Special characters: "switch@domain" (use "switch.domain")  
- Very long names (>64 characters)
```

#### Interface Names
```
✅ Common valid formats:
- Juniper: "xe-0/0/1", "et-0/0/48", "ae0"
- Cisco: "Ethernet1/1", "GigabitEthernet1/0/1"
- Arista: "Ethernet1", "Ethernet49/1"
- Generic: "port1", "int1", "1/1"

❌ Avoid:
- Spaces: "port 1" (use "port1")
- Special descriptions: "Management Port" (use "mgmt0")
```

#### Speed Values
```
✅ Numeric values only:
- "1", "10", "25", "40", "100"
- "1.25", "2.5" (for fractional speeds)

❌ Don't include units:
- "10GB", "25 Gbps", "100G"
- "10-Gigabit", "Fast Ethernet"

Common speeds:
- 1 = 1 Gigabit
- 10 = 10 Gigabit  
- 25 = 25 Gigabit
- 40 = 40 Gigabit
- 100 = 100 Gigabit
```

#### Boolean Fields (True/False Values)
```
✅ Supported formats:
- true/false (preferred)
- yes/no
- 1/0
- TRUE/FALSE
- Yes/No

❌ Avoid:
- "Y"/"N"
- "True"/"False" (with quotes)
- "1.0"/"0.0"
```

#### Tag Fields
```
✅ Tag format examples:
- Single tag: "production"
- Multiple tags: "production,critical,monitored"
- With spaces: "web tier, production, critical"

❌ Avoid:
- Brackets: "[production,critical]"
- Quotes: "\"production\",\"critical\""
```

## Excel File Examples

### Basic Network Connectivity

**Simple switch-to-server connections:**

| Switch Name | Port     | Host Name    | Speed (GB) | External |
|-------------|----------|--------------|------------|----------|
| leaf-01     | xe-0/0/1 | web-server-1 | 10         | false    |
| leaf-01     | xe-0/0/2 | web-server-2 | 10         | false    |
| leaf-02     | xe-0/0/1 | db-server-1  | 25         | false    |
| spine-01    | et-0/0/1 | router-wan   | 100        | true     |

### Advanced Configuration

**With server interfaces and aggregation:**

| Switch Name | Port     | Host Name    | Slot/Port | Speed (GB) | LACPNeeded | AE   | Comment          |
|-------------|----------|--------------|-----------|------------|------------|------|------------------|
| leaf-01     | xe-0/0/1 | web-server-1 | eno1      | 10         | No         |      | Primary web      |
| leaf-01     | xe-0/0/2 | web-server-1 | eno2      | 10         | Yes        | ae0  | Backup link      |
| leaf-02     | xe-0/0/1 | db-server-1  | eth0      | 25         | No         |      | Database primary |
| spine-01    | et-0/0/1 | leaf-01      | et-0/0/48 | 100        | No         |      | Fabric link      |

### Complex Enterprise Example

**Full feature utilization:**

| Blueprint | Switch Label | Switch Interface | Server Label | Server Interface | Link Speed | External | Server Tags        | Switch Tags | Link Tags   | Comment         |
|-----------|--------------|------------------|--------------|------------------|------------|----------|--------------------|-------------|-------------|-----------------|
| datacenter | leaf-01      | xe-0/0/1        | web-01       | eno1             | 10         | false    | production,web     | access      | production  | Web tier        |
| datacenter | leaf-01      | xe-0/0/2        | web-02       | eno1             | 10         | false    | production,web     | access      | production  | Web tier        |
| datacenter | leaf-02      | xe-0/0/1        | db-01        | eth0             | 25         | false    | production,database| access      | critical    | Primary DB      |
| datacenter | spine-01     | et-0/0/1        | router-01    | ge-1/0/0         | 100        | true     | network,external   | spine       | external    | Internet uplink |

## Data Validation Rules

### Automatic Validation

The application automatically validates your data:

**Duplicate Detection:**
- **Rule**: No two rows can have identical switch + interface combination
- **Example**: Two rows both with "leaf-01" + "xe-0/0/1" will be flagged
- **Action**: Remove duplicate or modify one of the entries

**Required Field Validation:**
- **Switch identifier** and **interface** are always required
- Empty cells in required fields cause validation errors
- Whitespace-only cells are treated as empty

**Data Type Validation:**
- **Numeric fields** (Speed) must contain valid numbers
- **Boolean fields** must use supported true/false formats
- **Text fields** are validated for length and special characters

### Data Cleanup Recommendations

**Before uploading your Excel file:**

1. **Remove merged cells:**
   - Select all data
   - Home tab > Merge & Center > Unmerge Cells

2. **Clean up extra spaces:**
   - Find & Replace (Ctrl+H)
   - Find: "  " (two spaces)
   - Replace: " " (one space)
   - Repeat until no more double spaces

3. **Standardize boolean values:**
   - Find & Replace common variations:
   - "Y" → "yes", "N" → "no"
   - "True" → "true", "False" → "false"

4. **Remove empty rows:**
   - Delete any completely empty rows in your data
   - Keep header row and data rows only

5. **Verify data types:**
   - Speed columns should be formatted as numbers
   - Text columns should be formatted as text
   - Avoid "numbers stored as text" warnings

## Troubleshooting Excel Files

### Common File Issues

#### Issue: "No valid data found"

**Possible Causes:**
- Headers in wrong row (should be row 2)
- All data filtered out by validation
- Wrong sheet selected
- No data in selected sheet

**Solutions:**
1. Verify headers are in row 2
2. Check that data starts in row 3
3. Select correct worksheet
4. Ensure sheet contains data

#### Issue: "Headers not recognized"

**Possible Causes:**
- Excel headers don't match conversion map
- Headers contain special characters
- Headers have extra spaces

**Solutions:**
1. Check conversion map configuration
2. Add custom header mappings
3. Standardize header names
4. Remove special characters from headers

#### Issue: "Too many validation errors"

**Possible Causes:**
- Data format doesn't match expected types
- Many duplicate entries
- Required fields are empty
- Inconsistent data formatting

**Solutions:**
1. Review data format requirements above
2. Remove duplicate switch+interface combinations
3. Fill in required fields
4. Standardize data formatting

### Excel File Optimization

**For large files (>25MB):**

1. **Split into multiple files:**
   - Separate by switch type (leaf, spine)
   - Split by data center or location
   - Process separately and combine results

2. **Remove unnecessary columns:**
   - Only include columns you need for configuration
   - Remove description or documentation columns
   - Keep only active/current data

3. **Optimize data format:**
   - Remove embedded objects (charts, images)
   - Use simple text formatting
   - Avoid complex formulas

**For better performance:**

1. **Clean data structure:**
   - Remove empty rows and columns
   - Use consistent data formatting
   - Avoid merged cells

2. **Simplify formatting:**
   - Use plain text format
   - Remove cell borders and colors (not required)
   - Minimize use of formulas

## Best Practices

### File Organization

**Naming Convention:**
```
Good file names:
- "network-config-datacenter1-2024.xlsx"
- "switch-connections-floor2-jan2024.xlsx"
- "leaf-spine-fabric-production.xlsx"

Avoid:
- "data.xlsx" (too generic)
- "Network Config (Final) v2 - Copy.xlsx" (too complex)
```

**Version Control:**
- Include date or version in filename
- Keep backup copies before making changes
- Document changes in file comments or separate log

### Data Quality

**Consistency:**
- Use consistent naming conventions
- Standardize abbreviations (don't mix "int" and "interface")
- Keep case conventions consistent

**Completeness:**
- Fill in all required fields
- Provide speed information where available
- Include comments for complex configurations

**Accuracy:**
- Verify device names match actual network devices
- Confirm interface names are correct
- Validate speed settings match physical connections

### Workflow Integration

**Before Upload:**
1. **Review data** for consistency and completeness
2. **Test with small subset** if file is large
3. **Backup original file** before any modifications
4. **Document any custom mappings** used

**During Processing:**
1. **Review validation results** carefully
2. **Fix errors** before proceeding
3. **Verify mappings** are correct
4. **Check processed data** in table view

**After Processing:**
1. **Save conversion map** if customized
2. **Export logs** for record keeping
3. **Document successful configurations**
4. **Keep processed file** as reference

---

*This Excel format guide ensures your files will process successfully with the Apstra Network Configuration Tool. For additional help with data issues, see the [User Troubleshooting Guide](troubleshooting.md).*