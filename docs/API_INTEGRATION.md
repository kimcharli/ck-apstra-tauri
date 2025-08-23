# Apstra API Integration Documentation

## Overview

The application implements comprehensive integration with Apstra controllers through a robust API service layer that provides session management, real-time search capabilities, and seamless web interface integration.

## Architecture Components

### Backend Services (Rust)

**Core API Handler** (`src-tauri/src/commands/apstra_api_handler.rs`):
- Tauri command handlers for API operations
- Session state management with global `ApiClientState`
- Error handling and response transformation

**API Service Layer** (`src-tauri/src/services/apstra_api_service.rs`):
- Core API service implementation
- Session management and authentication
- HTTP client configuration and request handling

### Frontend Services (TypeScript)

**API Service** (`src/services/ApstraApiService.ts`):
- TypeScript service layer for API communication
- Type-safe interfaces and error handling
- Frontend session state management

**URL Generation** (`src/utils/apstraUrls.ts`):
- Dynamic Apstra web interface URL generation
- Blueprint and system navigation utilities
- Safe parameter validation

## Session Management

### Authentication Flow

**Login Process**:
```typescript
interface LoginInfo {
    base_url: string;
    username: string;
    password: string;
    session_id?: string;
}

const loginResult = await ApstraApiService.login({
    base_url: 'https://apstra.company.com:443',
    username: 'user',
    password: 'pass'
});
```

**Session State**:
- Secure credential storage with session token management
- Automatic session refresh on expiry
- Global state persistence across application lifecycle
- Thread-safe session state management in Rust backend

**Session Validation**:
```rust
// Backend session management
pub struct ApiClientState {
    pub client: Option<ApstraApiClient>,
    pub session_id: Option<String>,
    pub base_url: Option<String>,
}

// Automatic session validation and refresh
async fn ensure_valid_session(state: &ApiClientState) -> Result<(), String> {
    // Validate current session or re-authenticate
}
```

## API Operations

### System Search

**Real-time Search Capabilities**:
```typescript
interface SystemSearchRequest {
    session_id: string;
    blueprint_id: string;
    server_name: string;
}

interface QueryResponse {
    items: Array<object>;
    count: number;
}

const searchResults = await ApstraApiService.searchSystems({
    session_id: currentSession.id,
    blueprint_id: 'blueprint-123',
    server_name: 'server-*'
});
```

### Blueprint Operations

**Core Operations**:
- **Leafs Operation**: Extract leaf node information from blueprints
- **Dump Operation**: Complete blueprint data export
- **Live Search**: Real-time system and IP address search across blueprints
- **System Queries**: Equipment and interface information retrieval

**Blueprint Management**:
```rust
// Backend blueprint operations
pub async fn get_blueprint_leafs(blueprint_id: String) -> Result<Vec<LeafNode>, String> {
    // Implementation for extracting leaf node data
}

pub async fn dump_blueprint_data(blueprint_id: String) -> Result<BlueprintData, String> {
    // Implementation for complete blueprint export
}
```

### IP Address Management

**Search and Validation**:
- Real-time IP address search across blueprint contexts
- Network validation and conflict detection
- Integration with network provisioning workflows

## URL Generation

### Dynamic Web Interface URLs

**System Navigation**:
```typescript
// Generate system detail page URL
const systemUrl = generateApstraUrls.system({
    host: 'apstra.company.com:443',
    blueprintId: 'blueprint-123',
    nodeId: 'node-456'
});
// Result: https://apstra.company.com:443/blueprints/blueprint-123/staged/systems/node-456
```

**Blueprint Navigation**:
```typescript
// Generate blueprint staged page URL
const blueprintUrl = generateApstraUrls.blueprint({
    host: 'apstra.company.com:443',
    blueprintId: 'blueprint-123'
});
// Result: https://apstra.company.com:443/blueprints/blueprint-123/staged
```

**Interface Navigation**:
```typescript
// Generate interface detail page URL
const interfaceUrl = generateApstraUrls.interface({
    host: 'apstra.company.com:443',
    blueprintId: 'blueprint-123',
    nodeId: 'node-456'
});
// Result: https://apstra.company.com:443/blueprints/blueprint-123/staged/systems/node-456/interfaces
```

### URL Safety and Validation

**Parameter Validation**:
- Safe construction of Apstra web interface URLs
- Parameter sanitization and encoding
- Protocol and host validation
- Path injection prevention

## Error Handling

### Comprehensive Error Management

**Backend Error Types**:
```rust
#[derive(Debug, thiserror::Error)]
pub enum ApstraApiError {
    #[error("Authentication failed: {0}")]
    AuthenticationError(String),
    
    #[error("Session expired: {0}")]
    SessionExpiredError(String),
    
    #[error("Network error: {0}")]
    NetworkError(String),
    
    #[error("API response error: {0}")]
    ApiResponseError(String),
}
```

**Frontend Error Handling**:
```typescript
interface ApiError {
    code: string;
    message: string;
    context?: string;
}

class ApstraApiService {
    static async handleApiError(error: unknown): Promise<ApiError> {
        // Comprehensive error parsing and user-friendly messages
        if (error.status === 401) {
            return { code: 'AUTH_FAILED', message: 'Session expired. Please log in again.' };
        }
        // Additional error handling...
    }
}
```

### Error Recovery Patterns

**Automatic Recovery**:
- Session timeout handling with automatic re-authentication
- Network failure retry with exponential backoff
- Graceful degradation when API is unavailable

**User Feedback**:
- Clear error messages with actionable guidance
- Progress indicators for long-running operations
- Status updates and operation history tracking

## State Management

### Client-Side State

**Session Persistence**:
```typescript
interface SessionState {
    isAuthenticated: boolean;
    sessionId: string | null;
    baseUrl: string | null;
    username: string | null;
    lastActivity: Date;
}

class SessionManager {
    static saveSession(session: SessionState): void {
        // Secure local storage of session information
    }
    
    static restoreSession(): SessionState | null {
        // Restore previous session on application restart
    }
}
```

### Backend State Management

**Global State**:
```rust
// Tauri state management for API client persistence
use tauri::State;

#[tauri::command]
async fn api_operation(
    state: State<'_, ApiClientState>,
    request: ApiRequest
) -> Result<ApiResponse, String> {
    let client = state.client.as_ref()
        .ok_or("No active API client")?;
    
    // Perform operation with persistent client state
}
```

## Integration Patterns

### MCP Server Integration

**Apstra MCP Server**:
The application integrates with MCP (Model Context Protocol) servers for enhanced Apstra operations:

```rust
// MCP integration for advanced Apstra operations
use mcp_apstra::*;

async fn mcp_apstra_operation() -> Result<(), String> {
    // Integration with MCP Apstra server for advanced operations
    // - Blueprint auditing and compliance checking
    // - Automated configuration management
    - Network topology analysis
}
```

### Service Integration Patterns

**Centralized API Communication**:
```typescript
// Unified service pattern for all API operations
class TauriApiService {
    static async invokeCommand<T>(
        command: string, 
        args?: Record<string, any>,
        errorContext = 'Command failed'
    ): Promise<T> {
        try {
            return await invoke(command, args);
        } catch (error) {
            console.error(`${errorContext}:`, error);
            throw new Error(`${errorContext}: ${error}`);
        }
    }
}
```

## Security Considerations

### Authentication Security

**Credential Handling**:
- Secure credential storage and transmission
- Session token encryption and secure storage
- Automatic credential cleanup on logout
- Protection against credential exposure in logs

**API Security**:
- Proper authentication headers and error handling
- Request validation and sanitization
- Response data validation and type checking
- Protection against injection attacks

### Network Security

**Communication Security**:
- HTTPS enforcement for all API communications
- Certificate validation and trust verification
- Secure cookie handling for session management
- Protection against man-in-the-middle attacks

## Performance Optimization

### Caching Strategies

**Response Caching**:
- Blueprint data caching with invalidation strategies
- System information caching for improved performance
- Search result caching with expiration policies

**Connection Pooling**:
- HTTP client connection reuse
- Session persistence across operations
- Efficient resource management

### Asynchronous Operations

**Non-Blocking Operations**:
```rust
// Async operation patterns
async fn parallel_blueprint_operations(blueprint_ids: Vec<String>) -> Result<Vec<BlueprintData>, String> {
    let futures: Vec<_> = blueprint_ids.into_iter()
        .map(|id| get_blueprint_data(id))
        .collect();
    
    let results = futures::future::try_join_all(futures).await?;
    Ok(results)
}
```

## Development Best Practices

### API Client Design

**Service Layer Patterns**:
- Centralized error handling across all API operations
- Type-safe request/response interfaces
- Consistent logging and debugging support
- Standardized retry and recovery mechanisms

### Testing Strategies

**Integration Testing**:
```rust
#[tokio::test]
async fn test_apstra_api_integration() {
    // Integration tests with mock Apstra server
    let mock_server = create_mock_apstra_server().await;
    let client = ApstraApiClient::new(mock_server.url());
    
    let result = client.login("test_user", "test_pass").await;
    assert!(result.is_ok());
    
    // Additional API operation tests
}
```

### Configuration Management

**Environment-Based Configuration**:
```rust
// Configuration management for different environments
#[derive(Debug, serde::Deserialize)]
pub struct ApstraConfig {
    pub default_timeout: u64,
    pub max_retries: u32,
    pub connection_pool_size: usize,
    pub enable_debug_logging: bool,
}

impl ApstraConfig {
    pub fn from_env() -> Result<Self, String> {
        // Load configuration from environment variables
    }
}
```

## Troubleshooting

### Common Issues

**Authentication Problems**:
- Verify Apstra controller URL format and accessibility
- Check username/password credentials
- Validate SSL certificate trust
- Review session timeout configuration

**API Integration Issues**:
- Verify Apstra session authentication: Check for `401 Unauthorized` responses
- Test API connectivity: Use debug logs to trace API call failures
- Session timeout handling: Implement automatic re-authentication on session expiry
- MCP server integration: Ensure proper MCP server configuration for Apstra API calls

**Performance Issues**:
- Monitor API response times and implement caching
- Review connection pooling configuration
- Optimize large data transfers with pagination
- Implement request batching for bulk operations

### Debug Logging

**Comprehensive Logging**:
```rust
// Detailed API operation logging
log::debug!("Apstra API request: {} {}", method, url);
log::debug!("Request headers: {:?}", headers);
log::debug!("Request body: {}", request_body);
log::debug!("Response status: {}", response.status());
log::debug!("Response body: {}", response_body);
```

**Frontend Debugging**:
```typescript
// Client-side API debugging
console.group(`Apstra API: ${operation}`);
console.log('Request:', request);
console.log('Response:', response);
console.groupEnd();
```