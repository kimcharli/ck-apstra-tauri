# User Troubleshooting Guide

Solutions for common issues when using the Apstra Network Configuration Tool.

## Quick Fixes

### Application Won't Start

**Issue:** Application fails to launch or crashes immediately

**Quick Solutions:**
1. **Restart your computer** - Clears memory and background processes
2. **Run as administrator** (Windows) or with `sudo` (Linux) once to check permissions
3. **Check available memory** - Close other applications, ensure 2GB+ free RAM
4. **Disable antivirus temporarily** - Some antivirus software blocks new applications

**Detailed Diagnostics:**
```bash
# Check if application process is running
# Windows
tasklist | findstr apstra

# macOS/Linux  
ps aux | grep apstra

# Check system resources
# Windows: Task Manager > Performance
# macOS: Activity Monitor
# Linux: htop or top
```

**Common Causes:**
- **Insufficient memory** (need 2GB+ available)
- **Antivirus software** blocking execution
- **Corrupted installation** files
- **Missing system dependencies** (especially Linux)

---

### File Upload Problems

#### Issue: "File format not supported" error

**Symptoms:**
- Error message when trying to upload Excel file
- Upload progress bar fails immediately
- File appears to upload but shows error

**Solutions:**

**File Format Check:**
1. **Ensure .xlsx format**: File must be Excel 2007+ format (.xlsx), not .xls or .csv
2. **Test file integrity**: Open file in Excel to ensure it's not corrupted
3. **Check file size**: Maximum 100MB supported
4. **Remove special characters**: Avoid special characters in filename

**File Conversion:**
```
If you have .xls or .csv files:
1. Open in Excel
2. Save As > Excel Workbook (.xlsx)
3. Try uploading the new .xlsx file
```

**Advanced Solutions:**
- **Try with sample data**: Create new Excel file with minimal data to test
- **Check file permissions**: Ensure file is not read-only or locked
- **Copy to local drive**: If file is on network drive, copy locally first

#### Issue: Upload starts but never completes

**Symptoms:**
- Upload progress bar starts but gets stuck
- Application becomes unresponsive during upload
- File upload takes much longer than expected

**Solutions:**

**Immediate Actions:**
1. **Cancel upload**: Click cancel or close dialog
2. **Check file size**: Large files (>50MB) take longer
3. **Close other programs**: Free up system resources
4. **Try smaller file**: Test with subset of data first

**System Optimization:**
- **Available Memory**: Ensure 4GB+ RAM free for large files
- **Disk Space**: Ensure 1GB+ free space for temporary files
- **Background Processes**: Close unnecessary applications

**File Size Management:**
```
For files >50MB:
1. Split into multiple sheets/files
2. Remove unnecessary columns
3. Process in smaller batches
4. Compress images if embedded
```

---

### Connection Problems

#### Issue: Apstra connection fails

**Symptoms:**
- "Connection failed" error message
- "Invalid credentials" despite correct login
- "Timeout" errors during connection test

**Diagnosis Steps:**

**Step 1: Basic Connectivity**
```bash
# Test basic network connectivity
ping your-apstra-host

# Test HTTPS connectivity (should connect)
curl -k https://your-apstra-host:443

# Check if port is reachable
telnet your-apstra-host 443
```

**Step 2: Credential Verification**
1. **Test in web browser**: Try logging into Apstra web interface with same credentials
2. **Check for special characters**: Ensure password doesn't contain characters that need escaping
3. **Verify case sensitivity**: Username and password are case-sensitive
4. **Try different user**: Test with different Apstra user account if available

**Step 3: Network Configuration**
- **Corporate Firewall**: Check if port 443 is blocked outbound
- **Proxy Settings**: Configure proxy if required by your network
- **VPN Connection**: Ensure VPN is connected if Apstra is on private network
- **DNS Resolution**: Verify hostname resolves correctly

**Common Solutions:**

**SSL Certificate Issues:**
```
If using self-signed certificates:
1. Connection may fail due to certificate validation
2. This is expected behavior for security
3. Verify hostname matches certificate
4. Contact network admin about certificate setup
```

**Authentication Issues:**
```
Common authentication problems:
- Password recently changed
- Account locked due to failed attempts  
- User doesn't have API access permissions
- Different credentials for API vs web interface
```

**Network Connectivity:**
```bash
# Corporate network troubleshooting
1. Try from different network (mobile hotspot)
2. Check with network administrator
3. Verify firewall rules allow HTTPS to Apstra
4. Test VPN connection if required
```

#### Issue: Connection works but searches return no results

**Symptoms:**
- Successful Apstra connection
- Tools page searches show "No results found"
- Blueprint operations fail or return empty

**Solutions:**

**Blueprint Configuration:**
1. **Verify blueprint name**: Must match exactly (case-sensitive)
2. **Check blueprint status**: Blueprint must be committed/deployed
3. **Test different blueprint**: Try with known working blueprint name
4. **Verify permissions**: User must have read access to blueprint

**Search Troubleshooting:**
```
Search debugging steps:
1. Try very simple search (single letter)
2. Search for known device names
3. Test with different blueprint
4. Check if devices exist in Apstra web interface
5. Verify search syntax (no special characters)
```

---

### Data Processing Issues

#### Issue: Excel data not displaying correctly

**Symptoms:**
- Sheet loads but table shows wrong data
- Headers not recognized properly
- Missing columns or rows

**Header Mapping Issues:**

**Diagnosis:**
1. **Check conversion map**: Go to "2. Conversion Map" page
2. **Review header matching**: Look for unmapped Excel headers
3. **Check header row**: Headers might be in different row than expected
4. **Verify field mappings**: Ensure Excel headers map to correct internal fields

**Solutions:**
```
Header mapping troubleshooting:
1. Click "Manage Conversion Map"
2. Add missing header mappings
3. Edit existing mappings if needed
4. Export/import mappings from working configuration
5. Reset to default mappings if corrupted
```

**Data Format Issues:**

**Common Problems:**
- **Merged cells**: Excel merged cells can cause parsing issues
- **Hidden rows/columns**: Hidden data might not be processed
- **Special formatting**: Date formats, currency symbols may cause issues
- **Empty rows**: Large gaps in data can affect processing

**Solutions:**
1. **Clean Excel file**: Remove merged cells, unhide rows/columns
2. **Simple formatting**: Use plain text format for data
3. **Remove empty rows**: Delete large gaps between data rows
4. **Test with minimal data**: Create simple test file to isolate issues

#### Issue: Validation errors for seemingly correct data

**Symptoms:**
- Red error highlighting on valid-looking data
- "Missing required fields" for populated columns
- "Duplicate entries" for unique data

**Validation Troubleshooting:**

**Required Fields Check:**
```
Common validation issues:
- Headers not mapped to required internal fields
- Empty cells in required columns
- Whitespace-only cells (appear filled but are empty)
- Different data types than expected
```

**Duplicate Detection:**
```
Duplicate logic:
- System checks switch + interface combination
- Both values must be identical to trigger duplicate warning
- Case-sensitive comparison
- Whitespace differences matter ("port1" ≠ "port 1")
```

**Solutions:**
1. **Review conversion map**: Ensure required fields are mapped
2. **Check for whitespace**: Remove extra spaces from data
3. **Verify data types**: Numbers should be numeric, not text
4. **Clean duplicates**: Remove or modify duplicate entries

---

### Performance Issues

#### Issue: Application runs slowly

**Symptoms:**
- Slow response to clicks and navigation
- Long delays during file processing
- High CPU or memory usage

**System Resource Check:**

**Memory Usage:**
```
Memory requirements:
- Minimum: 4GB total RAM
- Recommended: 8GB+ total RAM
- Available for app: 2GB+ free
- Large files (>25MB): 4GB+ free
```

**Performance Optimization:**
1. **Close other applications**: Free up system resources
2. **Process smaller files**: Split large Excel files into smaller batches
3. **Restart application**: Clear memory and reset performance
4. **Check system resources**: Monitor CPU and RAM usage

**File Size Management:**
```
For large files (>25MB):
1. Process in smaller batches
2. Remove unnecessary columns
3. Split by functionality (switches, servers, etc.)
4. Use more powerful computer if available
```

#### Issue: Search operations are slow

**Symptoms:**
- Long delays when typing in search fields
- Timeout errors during API searches
- Search results take >10 seconds to appear

**Network Performance:**
1. **Check connection speed**: Ensure stable, fast connection to Apstra
2. **Reduce search scope**: Use more specific search terms
3. **Test from different location**: Try from different network
4. **Check Apstra performance**: Verify Apstra controller performance

**Search Optimization:**
```
Search performance tips:
- Use more specific search terms
- Search one blueprint at a time
- Avoid very broad searches (single letters)
- Wait for results before typing more
```

---

## Data-Specific Troubleshooting

### Excel File Structure Issues

#### Issue: "No valid data found" after file upload

**Common Causes:**
1. **Headers in wrong row**: Application expects headers in row 2 by default
2. **Empty sheet**: Selected sheet has no data
3. **All data filtered out**: Validation rules exclude all rows
4. **Encoding issues**: Special characters causing parsing problems

**Step-by-Step Diagnosis:**

**Check File Structure:**
```
Expected Excel structure:
Row 1: Optional title or metadata
Row 2: Column headers (Switch Name, Port, etc.)
Row 3+: Data rows
```

**Verify Sheet Content:**
1. Open Excel file manually
2. Navigate to the sheet you're trying to process
3. Verify headers are in row 2
4. Check that data starts in row 3
5. Ensure no empty rows between headers and data

**Solutions:**
- **Move headers**: Ensure column headers are in row 2
- **Remove empty rows**: Delete blank rows between headers and data
- **Check sheet selection**: Verify you're selecting the correct sheet
- **Simple test**: Create minimal Excel file with just a few rows to test

### Network Configuration Data Issues

#### Issue: "Invalid network configuration" errors

**Symptoms:**
- Data uploads successfully but shows validation errors
- Red highlighting on network configuration fields
- Warning messages about invalid values

**Field-Specific Validation:**

**Switch and Interface Names:**
```
Valid formats:
- Switch: "leaf-01", "spine-02", "switch.domain.com"
- Interfaces: "xe-0/0/1", "et-0/0/48", "Ethernet1/1"
- Avoid spaces, special characters in identifiers
```

**Speed and Numeric Values:**
```
Speed field validation:
- Must be numeric: "10", "25", "100"
- No units in data: "10" not "10GB" or "10 Gbps"
- Common speeds: 1, 10, 25, 40, 100
```

**Boolean Fields:**
```
Boolean field formats:
- true/false (preferred)
- yes/no
- 1/0
- Avoid: "True", "FALSE", "Y", "N"
```

**Common Data Issues:**
1. **Extra spaces**: " leaf-01 " should be "leaf-01"
2. **Inconsistent naming**: Mix of "leaf01" and "leaf-01"
3. **Special characters**: Avoid @, #, $, %, etc. in identifiers
4. **Case consistency**: Be consistent with capitalization

---

## Error Messages and Solutions

### File Processing Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "File too large (>100MB)" | File exceeds size limit | Split file or reduce data |
| "Invalid Excel format" | Not .xlsx format | Convert to .xlsx in Excel |
| "Corrupted file header" | File is corrupted | Re-create or repair file |
| "No sheets found" | Excel file has no worksheets | Add data to Excel file |
| "Cannot read file" | File permissions or locks | Close Excel, check permissions |

### Network and API Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Connection timeout" | Network or firewall issue | Check network connectivity |
| "Invalid credentials" | Wrong username/password | Verify Apstra login details |
| "SSL certificate error" | Self-signed certificate | Expected for some controllers |
| "Blueprint not found" | Blueprint name incorrect | Check spelling and case |
| "API permission denied" | User lacks API access | Contact Apstra administrator |

### Data Validation Errors

| Error Message | Cause | Solution |
|---------------|-------|----------|
| "Missing required field" | Empty required column | Fill in required data |
| "Duplicate entry" | Same switch+interface | Remove or modify duplicates |
| "Invalid format" | Wrong data type | Check number/text formatting |
| "Field not mapped" | Header not in conversion map | Add header to conversion map |
| "Value out of range" | Invalid numeric value | Check valid ranges for field |

## Getting Additional Help

### Collecting Diagnostic Information

When reporting issues, include:

**Application Logs:**
1. Click **📥 Download Logs** in top navigation
2. Select **JSON format** for detailed technical information
3. Include logs from when the problem occurred

**System Information:**
- Operating system and version
- Available RAM and disk space
- Network configuration (corporate/home)
- Apstra controller version (if known)

**Problem Description:**
- Exact steps that cause the issue
- Expected vs. actual behavior
- Error messages (copy exact text)
- Files that reproduce the problem (if possible)

### Support Resources

**Self-Help:**
- **Complete documentation**: See README.md for links to all guides
- **Development troubleshooting**: [Development troubleshooting guide](../development/troubleshooting.md)
- **Architecture documentation**: Understanding how the application works

**Community Support:**
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and community help
- **Documentation Issues**: Suggest improvements to guides

### Creating Good Issue Reports

**Include This Information:**
1. **Clear title**: Describe the problem briefly
2. **Steps to reproduce**: Exact sequence that causes the issue
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **System information**: OS, version, hardware
6. **Application logs**: JSON log file from when issue occurred
7. **Sample data**: Excel file that reproduces issue (if safe to share)

**Example Good Issue Report:**
```
Title: "Excel upload fails with large files on Windows 11"

Steps to reproduce:
1. Open application on Windows 11
2. Navigate to Provisioning page
3. Upload Excel file larger than 50MB
4. Select first sheet
5. Application becomes unresponsive

Expected: File should process successfully
Actual: Application freezes, requires task manager to close

System: Windows 11, 8GB RAM, Excel file is 75MB
Logs: Attached JSON log file showing memory error
```

---

*This troubleshooting guide covers the most common user issues. For technical development issues, see the [development troubleshooting guide](../development/troubleshooting.md).*