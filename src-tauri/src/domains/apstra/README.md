# Apstra Domain - Backend

The Apstra domain backend provides the core API integration layer for communicating with Apstra network controllers, handling authentication, session management, and GraphQL query execution.

## Overview

This backend domain implements:

- **HTTP Client**: Secure communication with Apstra controllers
- **Authentication**: Session-based authentication with token management
- **Query Engine**: GraphQL query execution and result processing
- **Configuration Management**: Apstra controller configuration handling
- **Error Handling**: Comprehensive error types and recovery strategies

## Architecture

### Module Structure

```
src-tauri/src/domains/apstra/
├── commands/                    # Tauri command handlers
│   ├── apstra_api_handler.rs   # API command implementations
│   └── apstra_config_handler.rs # Configuration command handlers
├── services/                    # Core business logic
│   └── apstra_api_service.rs   # HTTP client and API service
├── models/                      # Data structures and types
│   └── apstra_config.rs        # Configuration models
└── mod.rs                      # Module declarations
```

### Dependencies

- **reqwest**: HTTP client with SSL/TLS support
- **serde**: JSON serialization/deserialization
- **tokio**: Async runtime for HTTP operations
- **thiserror**: Structured error handling

## Core Components

### ApstraApiClient

The main service class handling HTTP communication:

```rust
use crate::domains::apstra::services::ApstraApiClient;

let mut client = ApstraApiClient::new("https://apstra.example.com".to_string());

// Authenticate
let login_result = client.login("admin".to_string(), "password".to_string()).await?;

// Execute queries
let results = client.execute_query("blueprint-id", "match(node('system'))").await?;
```

### Key Features

- **SSL/TLS Support**: Configurable certificate validation
- **Session Management**: Automatic token handling
- **Query Templates**: Parameterized GraphQL query support
- **Error Recovery**: Robust error handling and retry logic

## Command Handlers

### Authentication Commands

```rust
#[tauri::command]
pub async fn apstra_login(
    login_info: LoginInfo,
    state: State<'_, ApiClientState>,
) -> Result<ApiResult<LoginResult>, String>
```

Handles user authentication and session creation.

### Query Commands

```rust
#[tauri::command]
pub async fn apstra_execute_query(
    session_id: String,
    blueprint_id: String,
    query: String,
    state: State<'_, ApiClientState>,
) -> Result<ApiResult<QueryResponse>, String>
```

Executes GraphQL queries against Apstra blueprints.

### System Search Commands

```rust
#[tauri::command]
pub async fn apstra_search_systems(
    search_request: SystemSearchRequest,
    state: State<'_, ApiClientState>,
) -> Result<ApiResult<QueryResponse>, String>
```

Searches for network systems using predefined query templates.

## Configuration Management

### ApstraConfig Model

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApstraConfig {
    pub host: String,
    pub port: u16,
    pub username: String,
    pub password: String,
    pub blueprint_name: String,
    pub use_ssl: Option<bool>,
    pub verify_ssl: Option<bool>,
    pub timeout: Option<u32>,
}
```

### Configuration Features

- **Default Values**: Sensible defaults for common deployments
- **Validation**: Comprehensive input validation
- **Serialization**: JSON import/export support
- **Security**: Password masking for logging

## Session Management

### Session State

The domain maintains session state using Tauri's managed state:

```rust
pub type ApiClientState = Mutex<HashMap<String, ApstraApiClient>>;
```

### Session Lifecycle

1. **Creation**: New session created on successful authentication
2. **Storage**: Session stored in managed state with unique ID
3. **Validation**: Periodic checks ensure session validity
4. **Cleanup**: Sessions removed on logout or expiration

## Query System

### Template Engine

GraphQL queries support parameter substitution:

```rust
let template = include_str!("../../../../../data/queries/system_search_query.gql");
let query = template.replace("{server_name}", server_name);
```

### Supported Query Types

- **System Search**: Find systems by hostname/label
- **IP Search**: Locate IP addresses in topology
- **Connectivity**: Query interface connections
- **Blueprint Dump**: Export complete configurations

### Query Templates

Templates are embedded at compile time from `data/queries/`:

- `system_search_query.gql`: Basic system search
- `system_with_topology_query.gql`: System search with topology context
- `ip_with_topology_query.gql`: IP search with topology context
- `connectivity_templates_query.gql`: Connectivity and template data

## Error Handling

### Error Types

```rust
#[derive(Error, Debug)]
pub enum ApstraApiError {
    #[error("HTTP request failed: {0}")]
    Http(#[from] reqwest::Error),
    #[error("Authentication failed: {message}")]
    Authentication { message: String },
    #[error("Blueprint not found: {blueprint_id}")]
    BlueprintNotFound { blueprint_id: String },
    #[error("Invalid request data: {message}")]
    InvalidRequest { message: String },
    #[error("JSON serialization/deserialization error: {0}")]
    Json(#[from] serde_json::Error),
}
```

### Error Recovery

- **Automatic Retry**: Transient network errors
- **Session Refresh**: Authentication token renewal
- **Graceful Degradation**: Fallback behaviors for non-critical failures

## Security Features

### SSL/TLS Configuration

```rust
let client = Client::builder()
    .danger_accept_invalid_certs(true) // Configurable for self-signed certs
    .build()
    .unwrap_or_default();
```

### Authentication Security

- **Token-Based**: Session tokens instead of persistent credentials
- **Secure Storage**: Credentials not logged or persisted
- **Session Timeout**: Automatic session expiration

## Performance Optimization

### HTTP Client Optimization

- **Connection Reuse**: HTTP/1.1 keep-alive connections
- **Async Operations**: Non-blocking I/O for all network operations
- **Request Batching**: Group related operations when possible

### Memory Management

- **Efficient Serialization**: Streaming JSON processing for large responses
- **Session Cleanup**: Automatic cleanup of expired sessions
- **Query Caching**: Template caching to avoid repeated file reads

## Testing

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_new_client() {
        let client = ApstraApiClient::new("https://example.com".to_string());
        assert_eq!(client.base_url, "https://example.com");
        assert!(!client.is_authenticated());
    }
}
```

### Integration Testing

- **Mock Servers**: Test against mock Apstra API responses
- **Error Scenarios**: Validate error handling paths
- **Session Management**: Test session lifecycle operations

## Logging and Diagnostics

### Structured Logging

```rust
log::info!("Attempting Apstra login for user: {}", username);
log::debug!("Executing custom query on blueprint '{}'", blueprint_id);
log::error!("Authentication failed: {}", error_message);
```

### Debug Information

- **Request/Response Logging**: Detailed HTTP communication logs
- **Session Tracking**: Session creation, validation, and cleanup
- **Performance Metrics**: Query execution times and success rates

## Development Guidelines

### Adding New Commands

1. **Define Command Function**: Create new command handler
2. **Update State Management**: Ensure proper session handling
3. **Add Error Handling**: Implement comprehensive error recovery
4. **Register Command**: Add to main.rs invoke_handler
5. **Document Usage**: Update this README with examples

### Query Template Guidelines

- **Parameter Safety**: Always validate and sanitize parameters
- **Error Messages**: Provide clear error messages for query failures
- **Performance**: Optimize queries for large datasets
- **Documentation**: Document query purpose and expected results

### Security Best Practices

- **Input Validation**: Validate all user inputs
- **Credential Handling**: Never log or persist sensitive data
- **SSL Verification**: Default to secure connections
- **Session Security**: Implement proper session timeout and cleanup

## Deployment Considerations

### Configuration

- **Environment Variables**: Support for deployment-specific configuration
- **Default Values**: Sensible defaults for production deployments
- **Validation**: Runtime validation of configuration parameters

### Monitoring

- **Health Checks**: Endpoint availability monitoring
- **Performance Metrics**: Query execution time tracking
- **Error Rates**: Authentication and query failure monitoring

### Scaling

- **Connection Pooling**: Efficient connection management
- **Rate Limiting**: Respect Apstra API rate limits
- **Caching**: Cache frequently accessed data

This backend domain provides a robust, secure, and performant foundation for all Apstra controller integration needs, with comprehensive error handling, session management, and query execution capabilities.