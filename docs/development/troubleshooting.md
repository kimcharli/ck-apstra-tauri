# Development Troubleshooting Guide

Comprehensive troubleshooting guide for common development issues in the Apstra Network Configuration Tool.

## Error Categories

### Build and Setup Errors
[Quick fixes for development environment issues](#build-and-setup-errors-1)

### Runtime and Processing Errors  
[Issues during application execution](#runtime-and-processing-errors-1)

### API Integration Errors
[Apstra API connectivity and authentication issues](#api-integration-errors-1)

### File Processing Errors
[Excel parsing and data validation problems](#file-processing-errors-1)

## Build and Setup Errors

### Error: `command not found: tauri`

**Symptoms:**
```bash
$ npm run tauri:dev
tauri: command not found
```

**Root Cause:** Tauri CLI not installed or not in PATH

**Solutions:**
```bash
# Solution 1: Install globally
npm install -g @tauri-apps/cli

# Solution 2: Use npx (temporary)
npx tauri dev

# Solution 3: Install locally and update package.json
npm install --save-dev @tauri-apps/cli
# Update scripts to use: "tauri": "tauri"
```

**Verification:**
```bash
tauri --version  # Should show version number
which tauri      # Should show installation path
```

---

### Error: Rust compilation failures on Windows

**Symptoms:**
```
error: Microsoft Visual C++ 14.0 is required
linking with `link.exe` failed: exit code: 1181
```

**Root Cause:** Missing Visual Studio Build Tools

**Solutions:**
```powershell
# Solution 1: Install Visual Studio Build Tools
# Download: https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Select: "C++ build tools" workload

# Solution 2: Install full Visual Studio Community
# Download: https://visualstudio.microsoft.com/vs/community/
# Select: "Desktop development with C++" workload

# Solution 3: Use Windows Subsystem for Linux (WSL2)
wsl --install
# Then develop within WSL2 environment
```

**Verification:**
```powershell
# Check for Visual Studio installation
dir "C:\Program Files (x86)\Microsoft Visual Studio"
# Or
dir "C:\Program Files\Microsoft Visual Studio"

# Test Rust compilation
cd src-tauri
cargo check
```

---

### Error: `webkit2gtk` missing on Linux

**Symptoms:**
```
Package webkit2gtk-4.0 was not found in the pkg-config search path
```

**Root Cause:** Missing WebKit development libraries

**Solutions:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# RHEL/CentOS/Fedora  
sudo dnf install webkit2gtk3-devel \
    openssl-devel \
    curl \
    wget \
    libappindicator-gtk3-devel \
    librsvg2-devel
sudo dnf groupinstall "C Development Tools and Libraries"

# Arch Linux
sudo pacman -S webkit2gtk \
    base-devel \
    curl \
    wget \
    openssl \
    appmenu-gtk-module \
    gtk3 \
    libappindicator-gtk3 \
    librsvg
```

**Verification:**
```bash
pkg-config --modversion webkit2gtk-4.0
# Should show version number

# Test build
npm run tauri:build
```

---

### Error: Node.js version conflicts

**Symptoms:**
```bash
$ npm install
npm ERR! engine Unsupported engine
npm ERR! required: {"node":">=18.0.0"}
```

**Root Cause:** Incompatible Node.js version

**Solutions:**
```bash
# Solution 1: Use Node Version Manager (nvm) - Recommended
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20
nvm alias default 20

# Solution 2: Update Node.js directly
# macOS with Homebrew
brew upgrade node

# Windows with Chocolatey
choco upgrade nodejs

# Solution 3: Download from official website
# Visit: https://nodejs.org/
# Download LTS version (20.x.x)
```

**Verification:**
```bash
node --version  # Should show v20.x.x
npm --version   # Should show 9.x.x or higher
```

---

## Runtime and Processing Errors

### Error: Temporary file cleanup failures

**Symptoms:**
```
Error in console: Failed to cleanup temporary file
Permission denied (os error 13)
```

**Root Cause:** File permission issues or files in use

**Debugging Steps:**
```bash
# Check temp directory permissions
ls -la /tmp/ck-apstra-*  # Linux/macOS
dir %TEMP%\ck-apstra-*   # Windows

# Check for file locks
lsof /tmp/ck-apstra-*    # Linux/macOS
handle ck-apstra         # Windows (requires handle.exe)
```

**Solutions:**
```rust
// Backend fix: Ensure proper file closing
fn cleanup_temp_file(path: &Path) -> Result<(), String> {
    // Ensure file handles are closed first
    drop(file_handle);
    
    // Add retry logic for Windows file locking
    for attempt in 0..3 {
        match fs::remove_file(path) {
            Ok(()) => return Ok(()),
            Err(e) if attempt < 2 => {
                std::thread::sleep(Duration::from_millis(100));
                continue;
            }
            Err(e) => return Err(format!("Cleanup failed: {}", e)),
        }
    }
    unreachable!()
}
```

**Prevention:**
```rust
// Use RAII pattern for file management
struct TempFile {
    path: PathBuf,
}

impl Drop for TempFile {
    fn drop(&mut self) {
        let _ = fs::remove_file(&self.path);
    }
}
```

---

### Error: Memory exhaustion with large Excel files

**Symptoms:**
```
Error: Out of memory
Process killed (signal 9)
Application crashed unexpectedly
```

**Root Cause:** Loading entire Excel file into memory

**Debugging Steps:**
```bash
# Monitor memory usage during processing
# macOS
top -p $(pgrep "ck-apstra")

# Linux  
htop -p $(pgrep "ck-apstra")

# Windows
tasklist /FI "IMAGENAME eq ck-apstra*"
```

**Solutions:**
```rust
// Stream processing for large files
use calamine::{open_workbook, Reader, Xlsx};

fn process_large_excel_stream(path: &Path) -> Result<Vec<Row>, String> {
    let mut workbook: Xlsx<_> = open_workbook(path)
        .map_err(|e| format!("Failed to open workbook: {}", e))?;
    
    let mut results = Vec::new();
    let range = workbook.worksheet_range("Sheet1")
        .ok_or("Sheet1 not found")??;
    
    // Process in chunks to limit memory usage
    const CHUNK_SIZE: usize = 1000;
    
    for chunk in range.rows().collect::<Vec<_>>().chunks(CHUNK_SIZE) {
        let processed_chunk = process_chunk(chunk)?;
        results.extend(processed_chunk);
        
        // Optional: Trigger garbage collection between chunks
        // This is a workaround for memory pressure
    }
    
    Ok(results)
}
```

**Configuration:**
```bash
# Increase memory limit for development
export NODE_OPTIONS="--max-old-space-size=8192"  # 8GB
npm run tauri:dev
```

---

### Error: Data validation pipeline failures

**Symptoms:**
```
ProcessingError: Row validation failed at line 150
Expected field 'switch_label' not found
```

**Root Cause:** Inconsistent field mapping or data format

**Debugging Steps:**
```rust
// Add detailed logging to validation
pub fn validate_row_detailed(
    row: &HashMap<String, String>, 
    line_number: usize
) -> Result<NetworkConfigRow, ValidationError> {
    log::debug!("Validating row {}: {:?}", line_number, row);
    
    // Check each required field individually
    let required_fields = ["switch_label", "switch_ifname"];
    for field in &required_fields {
        if !row.contains_key(*field) {
            log::error!(
                "Row {}: Missing required field '{}'. Available fields: {:?}", 
                line_number, 
                field, 
                row.keys().collect::<Vec<_>>()
            );
            return Err(ValidationError::MissingField {
                field: field.to_string(),
                row: line_number,
                available_fields: row.keys().cloned().collect(),
            });
        }
    }
    
    // ... rest of validation
}
```

**Solutions:**
```rust
// Implement fuzzy field matching for header variations
pub fn find_field_variations(
    headers: &[String], 
    target_field: &str
) -> Option<String> {
    let variations = match target_field {
        "switch_label" => vec![
            "switch_label", "Switch Label", "Switch Name", 
            "switch", "Switch", "switch_name"
        ],
        "switch_ifname" => vec![
            "switch_ifname", "Switch Interface", "Switch Port",
            "Port", "port", "Interface", "switch_port"
        ],
        _ => vec![target_field],
    };
    
    for header in headers {
        let normalized_header = header.trim().to_lowercase();
        for variation in &variations {
            if normalized_header == variation.to_lowercase() {
                return Some(header.clone());
            }
        }
    }
    
    None
}
```

---

## API Integration Errors

### Error: Apstra authentication failures

**Symptoms:**
```
API Error: 401 Unauthorized
Login failed: Invalid credentials
Session expired
```

**Root Cause:** Authentication issues or session management problems

**Debugging Steps:**
```bash
# Enable detailed API logging
export RUST_LOG=debug,apstra_api=trace
npm run tauri:dev

# Check network connectivity
curl -k https://your-apstra-host:443/api/versions

# Verify credentials manually
curl -k -X POST https://your-apstra-host:443/api/user/login \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "admin"}'
```

**Common Solutions:**

**Invalid SSL Certificates:**
```rust
// Configure HTTP client to accept self-signed certificates
use reqwest::Client;

fn create_http_client() -> Result<Client, reqwest::Error> {
    Client::builder()
        .danger_accept_invalid_certs(true)  // Only for development
        .danger_accept_invalid_hostnames(true)
        .timeout(Duration::from_secs(30))
        .build()
}
```

**Session Timeout Handling:**
```rust
// Implement automatic session refresh
impl ApiClient {
    async fn ensure_valid_session(&mut self) -> Result<(), ApiError> {
        if let Some(expires_at) = self.session_expires_at {
            if Utc::now() > expires_at - Duration::minutes(5) {
                // Refresh session before it expires
                self.refresh_session().await?;
            }
        }
        Ok(())
    }
    
    async fn api_request_with_retry<T>(&mut self, request: Request) -> Result<T, ApiError> {
        // Try request
        match self.execute_request(request.clone()).await {
            Ok(response) => Ok(response),
            Err(ApiError::Unauthorized) => {
                // Retry once with fresh login
                self.login().await?;
                self.execute_request(request).await
            }
            Err(e) => Err(e),
        }
    }
}
```

---

### Error: API connection timeouts

**Symptoms:**
```
Connection timeout after 30s
DNS resolution failed
Connection refused
```

**Root Cause:** Network connectivity or DNS resolution issues

**Debugging Steps:**
```bash
# Test basic connectivity
ping your-apstra-host

# Test HTTPS connectivity  
openssl s_client -connect your-apstra-host:443

# Check DNS resolution
nslookup your-apstra-host
dig your-apstra-host

# Test through proxy (if applicable)
curl -k --proxy your-proxy:8080 https://your-apstra-host:443/api/versions
```

**Solutions:**
```rust
// Implement progressive timeout strategy
use tokio::time::{timeout, Duration};

async fn api_request_with_timeout<T>(
    client: &Client,
    request: Request
) -> Result<T, ApiError> {
    let timeouts = [
        Duration::from_secs(10),   // First attempt: 10s
        Duration::from_secs(30),   // Second attempt: 30s
        Duration::from_secs(60),   // Third attempt: 60s
    ];
    
    for (attempt, timeout_duration) in timeouts.iter().enumerate() {
        match timeout(*timeout_duration, client.execute(request.try_clone().unwrap())).await {
            Ok(Ok(response)) => return Ok(response.json().await?),
            Ok(Err(e)) => {
                log::warn!("Attempt {}: Request failed: {}", attempt + 1, e);
            }
            Err(_) => {
                log::warn!("Attempt {}: Request timed out after {:?}", attempt + 1, timeout_duration);
            }
        }
        
        if attempt < timeouts.len() - 1 {
            tokio::time::sleep(Duration::from_millis(1000 * (attempt + 1) as u64)).await;
        }
    }
    
    Err(ApiError::Timeout)
}
```

---

### Error: JSON parsing failures from API

**Symptoms:**
```
JSON parse error at line 1 column 1
Expected object, found string
API returned HTML instead of JSON
```

**Root Cause:** API returning unexpected content (error pages, HTML responses)

**Debugging Steps:**
```rust
// Log raw API responses for debugging
async fn debug_api_response(response: Response) -> Result<serde_json::Value, ApiError> {
    let status = response.status();
    let headers = response.headers().clone();
    let body_text = response.text().await?;
    
    log::debug!("API Response Status: {}", status);
    log::debug!("API Response Headers: {:?}", headers);
    log::debug!("API Response Body: {}", body_text);
    
    // Check content type
    if let Some(content_type) = headers.get("content-type") {
        if !content_type.to_str().unwrap_or("").contains("application/json") {
            return Err(ApiError::InvalidContentType {
                expected: "application/json".to_string(),
                received: content_type.to_str().unwrap_or("unknown").to_string(),
                body: body_text,
            });
        }
    }
    
    // Try to parse JSON
    match serde_json::from_str(&body_text) {
        Ok(json) => Ok(json),
        Err(e) => Err(ApiError::JsonParseError {
            error: e.to_string(),
            body: body_text,
        }),
    }
}
```

**Solutions:**
```rust
// Implement robust response handling
pub enum ApiError {
    JsonParseError { error: String, body: String },
    InvalidContentType { expected: String, received: String, body: String },
    HttpError { status: u16, body: String },
    // ... other variants
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            ApiError::JsonParseError { error, body } => {
                write!(f, "Failed to parse JSON response: {}. Body: {}", error, 
                       if body.len() > 200 { &body[..200] } else { body })
            }
            ApiError::InvalidContentType { expected, received, body } => {
                write!(f, "Expected {} content type, got {}. Body: {}", 
                       expected, received,
                       if body.len() > 200 { &body[..200] } else { body })
            }
            // ... other implementations
        }
    }
}
```

---

## File Processing Errors

### Error: Excel file format not supported

**Symptoms:**
```
Error: Unsupported file format
calamine error: Zip error: invalid zip file
File extension not recognized
```

**Root Cause:** Unsupported file format or corrupted file

**Debugging Steps:**
```bash
# Check file format
file uploaded_file.xlsx
# Should show: Microsoft Excel 2007+

# Check file integrity
unzip -t uploaded_file.xlsx
# Should show: No errors detected

# Check file size
ls -lh uploaded_file.xlsx
du -h uploaded_file.xlsx
```

**Solutions:**
```rust
// Comprehensive file format validation
use std::fs::File;
use std::io::{Read, Seek, SeekFrom};

pub fn validate_excel_file(path: &Path) -> Result<(), FileValidationError> {
    let mut file = File::open(path)
        .map_err(|e| FileValidationError::IoError(e))?;
    
    // Check file size
    let file_size = file.metadata()?.len();
    if file_size == 0 {
        return Err(FileValidationError::EmptyFile);
    }
    if file_size > 100 * 1024 * 1024 { // 100MB limit
        return Err(FileValidationError::FileTooLarge(file_size));
    }
    
    // Check for ZIP signature (Excel files are ZIP archives)
    let mut buffer = [0; 4];
    file.read_exact(&mut buffer)?;
    
    // ZIP file signatures: PK\x03\x04 or PK\x05\x06 or PK\x07\x08
    if &buffer[0..2] != b"PK" {
        return Err(FileValidationError::InvalidFormat {
            expected: "Excel (ZIP-based)".to_string(),
            found: format!("Unknown (starts with {:?})", &buffer[0..2]),
        });
    }
    
    // Try to open as Excel workbook
    file.seek(SeekFrom::Start(0))?;
    match calamine::open_workbook(path) {
        Ok(_) => Ok(()),
        Err(e) => Err(FileValidationError::CalamineError(e.to_string())),
    }
}

#[derive(Debug)]
pub enum FileValidationError {
    IoError(std::io::Error),
    EmptyFile,
    FileTooLarge(u64),
    InvalidFormat { expected: String, found: String },
    CalamineError(String),
}
```

---

### Error: Header mapping confusion

**Symptoms:**
```
Warning: Could not map header 'Switch Name (Legacy)'
Error: No mappable headers found in sheet
Duplicate header mappings detected
```

**Root Cause:** Excel headers don't match conversion map expectations

**Debugging Steps:**
```rust
// Debug header matching process
pub fn debug_header_mapping(
    excel_headers: &[String],
    conversion_map: &HashMap<String, String>
) {
    log::info!("Excel headers found: {:?}", excel_headers);
    log::info!("Conversion map keys: {:?}", conversion_map.keys().collect::<Vec<_>>());
    
    for header in excel_headers {
        let normalized = normalize_header(header);
        log::debug!("Header '{}' normalized to '{}'", header, normalized);
        
        if let Some(mapped_field) = conversion_map.get(&normalized) {
            log::info!("✓ Mapped '{}' → '{}'", header, mapped_field);
        } else {
            log::warn!("✗ No mapping for '{}'", header);
            
            // Find closest matches
            let closest_matches = find_closest_matches(&normalized, conversion_map.keys());
            log::debug!("  Closest matches: {:?}", closest_matches);
        }
    }
}

fn find_closest_matches(target: &str, candidates: impl Iterator<Item = &String>) -> Vec<String> {
    use strsim::levenshtein;
    
    let mut matches: Vec<(String, usize)> = candidates
        .map(|candidate| (candidate.clone(), levenshtein(target, candidate)))
        .filter(|(_, distance)| *distance <= 3)  // Only close matches
        .collect();
    
    matches.sort_by_key(|(_, distance)| *distance);
    matches.into_iter().map(|(candidate, _)| candidate).take(3).collect()
}
```

**Solutions:**
```rust
// Implement smart header matching with suggestions
pub struct HeaderMappingResult {
    pub successful_mappings: HashMap<String, String>,
    pub failed_headers: Vec<String>,
    pub suggestions: HashMap<String, Vec<String>>,
}

pub fn smart_header_mapping(
    excel_headers: &[String],
    conversion_map: &HashMap<String, String>
) -> HeaderMappingResult {
    let mut result = HeaderMappingResult {
        successful_mappings: HashMap::new(),
        failed_headers: Vec::new(),
        suggestions: HashMap::new(),
    };
    
    for header in excel_headers {
        if let Some(mapped_field) = try_map_header(header, conversion_map) {
            result.successful_mappings.insert(header.clone(), mapped_field);
        } else {
            result.failed_headers.push(header.clone());
            
            // Generate suggestions
            let suggestions = generate_mapping_suggestions(header, conversion_map);
            if !suggestions.is_empty() {
                result.suggestions.insert(header.clone(), suggestions);
            }
        }
    }
    
    result
}

fn try_map_header(
    header: &str, 
    conversion_map: &HashMap<String, String>
) -> Option<String> {
    // Try exact match first
    if let Some(field) = conversion_map.get(header) {
        return Some(field.clone());
    }
    
    // Try normalized match
    let normalized = normalize_header(header);
    if let Some(field) = conversion_map.get(&normalized) {
        return Some(field.clone());
    }
    
    // Try case-insensitive match
    let lower_header = header.to_lowercase();
    for (map_key, field) in conversion_map {
        if map_key.to_lowercase() == lower_header {
            return Some(field.clone());
        }
    }
    
    // Try partial match (contains)
    for (map_key, field) in conversion_map {
        if header.to_lowercase().contains(&map_key.to_lowercase()) ||
           map_key.to_lowercase().contains(&header.to_lowercase()) {
            return Some(field.clone());
        }
    }
    
    None
}
```

---

## Common Error Patterns and Solutions

### Pattern: "It works in development but fails in production"

**Common Causes:**
1. **File paths**: Relative paths that work in dev but not in packaged app
2. **Environment variables**: Dev-only environment variables
3. **Resource bundling**: Files not included in the final bundle

**Solutions:**
```rust
// Use Tauri's resource resolution
use tauri::api::path::{resolve_path, BaseDirectory};

// Wrong: hardcoded path
let config_path = "./data/default_conversion_map.json";

// Correct: use Tauri path resolution  
let config_path = resolve_path(
    app.config(),
    app.package_info(),
    "data/default_conversion_map.json",
    Some(BaseDirectory::Resource)
)?;
```

---

### Pattern: "Intermittent failures under load"

**Common Causes:**
1. **Race conditions**: Concurrent access to shared resources
2. **Resource exhaustion**: Memory or file handle limits
3. **Timing dependencies**: Code that relies on timing assumptions

**Solutions:**
```rust
// Use proper synchronization
use tokio::sync::Mutex;
use std::sync::Arc;

#[derive(Default)]
pub struct ThreadSafeState {
    temp_files: Arc<Mutex<HashMap<String, TempFileInfo>>>,
    api_sessions: Arc<Mutex<HashMap<String, ApiSession>>>,
}

// Implement resource limits
use semaphore::Semaphore;

pub struct ResourceManager {
    // Limit concurrent file operations
    file_semaphore: Semaphore,
    // Limit concurrent API requests  
    api_semaphore: Semaphore,
}

impl ResourceManager {
    pub fn new() -> Self {
        Self {
            file_semaphore: Semaphore::new(5),  // Max 5 concurrent file ops
            api_semaphore: Semaphore::new(10),  // Max 10 concurrent API calls
        }
    }
}
```

---

## Debugging Tools and Techniques

### Enable Comprehensive Logging

**Development Environment:**
```bash
# Maximum logging for troubleshooting
export RUST_LOG=trace,calamine=debug,reqwest=debug
npm run tauri:dev
```

**Production Debugging:**
```bash
# Selective logging to avoid performance impact
export RUST_LOG=warn,ck_apstra_tauri=debug
npm run tauri:build
```

### Performance Profiling

**Memory Usage Monitoring:**
```rust
// Add memory usage logging
use std::alloc::{GlobalAlloc, Layout};
use std::sync::atomic::{AtomicUsize, Ordering};

pub struct MemoryTracker<A: GlobalAlloc> {
    inner: A,
    allocated: AtomicUsize,
}

impl<A: GlobalAlloc> MemoryTracker<A> {
    pub const fn new(inner: A) -> Self {
        MemoryTracker {
            inner,
            allocated: AtomicUsize::new(0),
        }
    }
    
    pub fn allocated(&self) -> usize {
        self.allocated.load(Ordering::Relaxed)
    }
}

unsafe impl<A: GlobalAlloc> GlobalAlloc for MemoryTracker<A> {
    unsafe fn alloc(&self, layout: Layout) -> *mut u8 {
        let size = layout.size();
        self.allocated.fetch_add(size, Ordering::Relaxed);
        self.inner.alloc(layout)
    }
    
    unsafe fn dealloc(&self, ptr: *mut u8, layout: Layout) {
        let size = layout.size();
        self.allocated.fetch_sub(size, Ordering::Relaxed);
        self.inner.dealloc(ptr, layout);
    }
}
```

### Network Request Debugging

**HTTP Traffic Inspection:**
```rust
// Implement request/response logging middleware
use reqwest::middleware::{Middleware, Next};
use reqwest::{Request, Response};

pub struct LoggingMiddleware;

#[async_trait::async_trait]
impl Middleware for LoggingMiddleware {
    async fn handle(
        &self,
        req: Request,
        extensions: &mut http::Extensions,
        next: Next<'_>,
    ) -> reqwest_middleware::Result<Response> {
        let method = req.method().clone();
        let url = req.url().clone();
        let start = std::time::Instant::now();
        
        log::debug!("→ {} {}", method, url);
        
        let response = next.run(req, extensions).await?;
        
        let duration = start.elapsed();
        let status = response.status();
        
        log::debug!("← {} {} ({}ms)", method, url, duration.as_millis());
        
        if !status.is_success() {
            log::warn!("Request failed: {} {} → {}", method, url, status);
        }
        
        Ok(response)
    }
}
```

## Getting Additional Help

### When to Escalate Issues

**Escalate immediately for:**
- Security vulnerabilities
- Data corruption issues  
- Critical system failures
- API integration breaking changes

**Document before escalating:**
- Complete error messages and stack traces
- Steps to reproduce the issue
- System environment information
- Log files with relevant context

### Community Resources

**Documentation:**
- [Development Setup Guide](./setup.md)
- [Architecture Overview](../architecture/overview.md)
- [Main Project Documentation](../../CLAUDE.md)

**Support Channels:**
- GitHub Issues for bug reports
- GitHub Discussions for questions
- Pull requests for documentation improvements

---

*This troubleshooting guide is maintained alongside the codebase. When encountering new categories of issues, update this document to help future developers.*