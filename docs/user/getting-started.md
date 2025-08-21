# User Guide: Getting Started

Complete user guide for the Apstra Network Configuration Tool.

## What is this Application?

The Apstra Network Configuration Tool is a desktop application that helps network engineers manage and provision network configurations through Excel spreadsheets and direct API integration with Apstra controllers.

**Key Benefits:**
- **Excel Integration**: Upload network configuration data from familiar Excel spreadsheets
- **Data Validation**: Automatic validation and error checking before processing
- **Live API Access**: Real-time search and management of Apstra network infrastructure  
- **Streamlined Workflow**: Step-by-step guided process from data upload to provisioning
- **Comprehensive Logging**: Full audit trail of all operations for troubleshooting

## Installation

### System Requirements

**Supported Operating Systems:**
- macOS 10.15+ (Catalina or later)
- Windows 10/11
- Ubuntu 18.04+ / Debian 10+ / RHEL 8+ / Fedora 35+

**Hardware Requirements:**
- 4GB RAM minimum (8GB recommended)
- 500MB free disk space
- Network connectivity to Apstra controllers

### Download and Install

**macOS:**
1. Download the `.dmg` file from the releases page
2. Open the downloaded `.dmg` file
3. Drag the application to your Applications folder
4. Launch from Applications or Spotlight

**Windows:**
1. Download the `.msi` installer from the releases page
2. Run the installer with administrator privileges
3. Follow the installation wizard
4. Launch from Start Menu or Desktop shortcut

**Linux:**
```bash
# Ubuntu/Debian (.deb package)
sudo dpkg -i apstra-network-tool_X.X.X_amd64.deb

# RHEL/CentOS/Fedora (.rpm package)  
sudo rpm -i apstra-network-tool-X.X.X-1.x86_64.rpm

# Or use AppImage (portable)
chmod +x apstra-network-tool_X.X.X_amd64.AppImage
./apstra-network-tool_X.X.X_amd64.AppImage
```

### First Launch

When you first open the application:

1. **Security Notice** (macOS): You may see a security warning. Go to System Preferences > Security & Privacy and click "Open Anyway"

2. **Windows Defender** (Windows): You may need to click "More info" and then "Run anyway" if Windows Defender SmartScreen appears

3. **Application Opens**: The main dashboard will appear with four main sections

## Application Overview

### Main Dashboard

The application is organized into four main sections accessible from the top navigation:

```
┌─────────────────────────────────────────────────────────┐
│  🏠 Dashboard  │ 1. Connection │ 2. Conversion │ 3. Provisioning │ 4. Tools │
└─────────────────────────────────────────────────────────┘
```

**Navigation Flow:**
1. **Apstra Connection** - Establish connection to your Apstra controller
2. **Conversion Map** - Configure how Excel headers map to network fields
3. **Provisioning** - Upload and process Excel files for network configuration
4. **Tools** - Search and manage existing network infrastructure

### Status Indicators

Throughout the application, you'll see status indicators:

- ✅ **Green**: Connected, configured, or completed successfully
- ⚠️ **Yellow**: Warning or attention required
- ❌ **Red**: Error or connection failed
- 🔄 **Blue**: Processing or in progress
- ℹ️ **Gray**: Information or not yet configured

## Step-by-Step Workflow

### Step 1: Configure Apstra Connection

**Purpose:** Establish secure connection to your Apstra controller for API operations.

**Instructions:**

1. Click **"1. Apstra Connection"** in the navigation bar

2. **Enter Connection Details:**
   - **Host**: Your Apstra controller IP or hostname (e.g., `10.85.192.35`)
   - **Port**: Controller port (typically `443` for HTTPS)
   - **Username**: Your Apstra username
   - **Password**: Your Apstra password

3. **Test Connection:**
   - Click **"Test Connection"** to verify connectivity
   - Wait for green ✅ status indicating successful authentication
   - If connection fails, check your network connectivity and credentials

4. **Configure Blueprint:**
   - Enter the **Blueprint Name** for provisioning operations
   - This specifies which network blueprint will receive configuration changes

**Connection Status:**
- **Connected**: Green status with session information
- **Failed**: Red status with error message and troubleshooting tips
- **Testing**: Blue indicator during connection verification

---

### Step 2: Configure Conversion Mappings

**Purpose:** Define how Excel column headers map to internal network configuration fields.

**Instructions:**

1. Click **"2. Conversion Map"** in the navigation bar

2. **Review Default Mappings:**
   - The application comes with pre-configured mappings for common Excel formats
   - Default mappings include: "Switch Name" → switch_label, "Port" → switch_ifname, etc.

3. **Customize Mappings (if needed):**
   - Click **"Manage Conversion Map"** to modify mappings
   - **Add New Mapping**: Click "+" and enter Excel header and internal field name
   - **Edit Mapping**: Click the edit icon next to existing mappings
   - **Remove Mapping**: Click the delete icon to remove mappings

4. **Save Configuration:**
   - Click **"Save Conversion Map"** to persist your changes
   - **Export**: Save mappings to file for sharing with other users
   - **Import**: Load mappings from previously saved files

**Common Mapping Examples:**
```
Excel Header          →  Internal Field
"Switch Name"         →  switch_label
"Port"                →  switch_ifname
"Host Name"           →  server_label
"Slot/Port"           →  server_ifname
"Speed (GB)"          →  link_speed
"LACPNeeded"          →  link_group_lag_mode
"External"            →  is_external
```

---

### Step 3: Upload and Process Excel Files

**Purpose:** Upload Excel files containing network configuration data and validate before processing.

**Instructions:**

1. Click **"3. Provisioning"** in the navigation bar

2. **Upload Excel File:**
   - **Drag and drop** an Excel file (.xlsx) into the upload area, OR
   - **Click "Choose File"** to browse and select a file
   - Maximum file size: 100MB
   - Only .xlsx format is supported

3. **Select Sheet:**
   - If your Excel file has multiple sheets, select the one containing configuration data
   - The application will show a preview of available sheets

4. **Review Data:**
   - The parsed data appears in an interactive table
   - **Sort columns** by clicking column headers
   - **Review mappings** to ensure Excel headers are correctly interpreted
   - **Check for errors** highlighted in red

5. **Validate Data:**
   - Review any validation warnings or errors
   - **Duplicate Detection**: Rows with identical switch+interface combinations are flagged
   - **Missing Fields**: Required fields that are empty are highlighted
   - **Format Issues**: Invalid data formats are marked for attention

6. **Process Data:**
   - Once validation passes, click **"Process Configuration"**
   - Monitor progress bar for large files
   - Review processing results and any errors

**Supported Excel Structure:**
- **Header Row**: Typically row 1 or 2 (configurable)
- **Data Rows**: Network configuration data starting after headers
- **Required Columns**: At minimum, switch name and interface information
- **Optional Columns**: Speed, LACP settings, server information, etc.

---

### Step 4: Search and Management Tools

**Purpose:** Search existing network infrastructure and manage Apstra blueprints directly.

**Instructions:**

1. Click **"4. Tools"** in the navigation bar

2. **System Search:**
   - Enter device name in **"Search Systems"** field
   - **Live search** shows results as you type
   - Results include device details and blueprint information
   - **Click device names** to navigate to Apstra web interface

3. **IP Address Search:**
   - Enter IP address or CIDR range in **"Search IP Addresses"** field
   - **Filter by blueprint** using the dropdown
   - Results show IP allocation and associated devices
   - **Click IP addresses** for detailed information

4. **Blueprint Operations:**
   - **Leafs Operation**: Retrieve leaf switch information from blueprint
   - **Dump Operation**: Export complete blueprint configuration
   - Results are displayed in expandable sections
   - **Copy data** for external use or documentation

5. **Navigate to Apstra:**
   - **System URLs**: Click device names to open Apstra device details
   - **Blueprint URLs**: Click blueprint names to open blueprint overview
   - **Interface URLs**: Click interface information for port details

**Search Tips:**
- **Partial names work**: Search for "leaf" to find all leaf switches
- **Case insensitive**: Search terms are not case sensitive
- **Real-time results**: Results update as you type (300ms delay)
- **Multiple blueprints**: Search across all configured blueprints

## Data Management

### Excel File Requirements

**Supported Format:**
- **.xlsx files only** (Excel 2007+ format)
- **Maximum size**: 100MB per file
- **Encoding**: UTF-8 or standard Excel encoding

**Expected Structure:**
```
Row 1: (Optional title or metadata)
Row 2: Column headers (Switch Name, Port, Host Name, etc.)
Row 3+: Configuration data
```

**Required Data:**
- **Switch identifier**: Switch name, hostname, or label
- **Interface identifier**: Port name, interface name, or slot/port
- **Additional fields**: Depend on your network configuration needs

**Data Validation Rules:**
- **No duplicate switch+interface combinations**
- **Required fields must not be empty**
- **Numeric fields must contain valid numbers**
- **Boolean fields must be true/false or yes/no**

### Common Excel Format Examples

**Basic Network Configuration:**
| Switch Name | Port      | Host Name   | Speed (GB) | LACP Needed |
|-------------|-----------|-------------|------------|-------------|
| leaf-01     | xe-0/0/1  | server-01   | 10         | No          |
| leaf-01     | xe-0/0/2  | server-02   | 25         | Yes         |
| leaf-02     | xe-0/0/1  | server-03   | 10         | No          |

**Extended Configuration:**
| Switch Label | Switch Interface | Server Label | Server Interface | Link Speed | External | Comments |
|--------------|------------------|--------------|------------------|------------|----------|----------|
| spine-01     | et-0/0/0        | leaf-01      | et-0/0/48       | 100        | false    | Fabric   |
| leaf-01      | xe-0/0/1        | srv-web-01   | eno1            | 10         | false    | Web tier |

## Troubleshooting

### Common Issues and Solutions

#### Issue: Excel file won't upload
**Symptoms:** File upload fails or shows error message

**Solutions:**
1. **Check file format**: Ensure file is .xlsx (not .xls or .csv)
2. **Check file size**: Maximum 100MB supported
3. **Check file integrity**: Try opening in Excel first
4. **Try different file**: Test with a smaller sample file

#### Issue: No data appears after sheet selection
**Symptoms:** Sheet loads but table is empty

**Solutions:**
1. **Check header row**: Headers might be in row 1 instead of row 2
2. **Check conversion map**: Excel headers might not match configured mappings
3. **Check for empty sheet**: Verify the selected sheet contains data
4. **Review logs**: Check application logs for detailed error messages

#### Issue: Apstra connection fails
**Symptoms:** Connection test shows red error status

**Solutions:**
1. **Check network connectivity**: Ping the Apstra controller host
2. **Verify credentials**: Ensure username/password are correct
3. **Check HTTPS/SSL**: Some controllers use self-signed certificates
4. **Check firewall**: Ensure port 443 is accessible
5. **Try different blueprint**: Blueprint name must exist in Apstra

#### Issue: Search returns no results
**Symptoms:** Tools page searches don't return expected devices

**Solutions:**
1. **Check Apstra connection**: Ensure you're still authenticated
2. **Verify blueprint**: Make sure the blueprint contains the devices
3. **Try partial search**: Search for part of the device name
4. **Check spelling**: Device names must match exactly
5. **Review permissions**: Ensure your Apstra user has read access

### Getting Help

**Application Logs:**
1. Click the **📥 Download Logs** button in the top navigation
2. Choose format (TXT for readable, JSON for detailed)
3. Include logs when reporting issues

**Log Information Includes:**
- All user interactions (button clicks, navigation)
- API requests and responses
- Error messages with context
- File processing details
- Performance metrics

**Support Resources:**
- **GitHub Issues**: Report bugs and feature requests
- **Documentation**: Complete technical documentation available
- **Community**: GitHub Discussions for questions and tips

## Advanced Features

### Batch Processing

For processing multiple Excel files:

1. **Process files individually** through the standard workflow
2. **Use consistent conversion maps** for similar file formats
3. **Export and import** conversion maps between sessions
4. **Monitor logs** for batch operation tracking

### Session Management

**Session Persistence:**
- Apstra connections remain active during application session
- Conversion maps are automatically saved
- Application state is preserved until restart

**Session Security:**
- Credentials are stored securely in memory only
- Sessions automatically expire per Apstra controller settings
- No sensitive data is written to disk

### Performance Optimization

**For Large Files:**
- **Process in smaller batches** if memory issues occur
- **Close other applications** to free system resources
- **Use SSD storage** for better I/O performance
- **Ensure stable network** for API operations

**For Multiple Operations:**
- **Complete one operation** before starting the next
- **Monitor system resources** during processing
- **Use tools page** for quick searches without file uploads

---

This user guide covers all the essential functionality of the Apstra Network Configuration Tool. For technical documentation and development information, see the complete documentation suite linked from the main README.