# Apstra Domain

The Apstra domain handles all functionality related to Apstra network controller integration, including authentication, API communication, system search, and blueprint management.

## Overview

This domain provides a complete integration layer with Apstra network controllers, enabling the application to:

- Authenticate with Apstra controllers
- Execute GraphQL queries against blueprints
- Search for systems and IP addresses across network topologies
- Dump blueprint configurations
- Manage session state and authentication lifecycle

## Architecture

### Frontend Structure

```
src/domains/apstra/
├── components/           # Apstra-specific UI components
│   ├── ApstraConfigManager/  # Configuration management UI
│   └── ToolsPage/           # System search and blueprint tools
├── services/            # Apstra API client services
│   └── ApstraApiService.ts  # Main API service class
├── types/               # TypeScript type definitions
│   ├── ApstraConfig.ts     # Configuration types
│   └── Auth.ts             # Authentication types
├── contexts/            # React context providers
│   └── AuthContext.tsx     # Authentication state management
└── utils/               # Utility functions
    ├── apstraUrls.ts       # URL generation helpers
    └── fileDownload.ts     # File download utilities
```

### Backend Structure

```
src-tauri/src/domains/apstra/
├── commands/            # Tauri command handlers
│   ├── apstra_api_handler.rs    # API command handlers
│   └── apstra_config_handler.rs # Configuration commands
├── services/            # Core business logic
│   └── apstra_api_service.rs    # HTTP client and API logic
└── models/              # Data structures
    └── apstra_config.rs         # Configuration models
```

## Key Components

### ApstraApiService

The main service class that handles all communication with Apstra controllers:

```typescript
import { apstraApiService } from 'src/domains/apstra/services';

// Authenticate with controller
await apstraApiService.login(baseUrl, username, password);

// Search for systems
const results = await apstraApiService.searchSystemsWithTopology(blueprintId, serverName);

// Execute custom queries
const queryResults = await apstraApiService.executeQuery(blueprintId, graphqlQuery);
```

### ApstraConfigManager

React component for managing Apstra controller connection settings:

```typescript
import { ApstraConfigManager } from 'src/domains/apstra/components';

<ApstraConfigManager
  isVisible={showConfig}
  onConfigChange={handleConfigChange}
  currentConfig={config}
  onNavigate={handleNavigation}
/>
```

### AuthContext

Provides centralized authentication state management:

```typescript
import { useAuth } from 'src/domains/apstra/contexts';

const { authenticate, logout, authState } = useAuth();
const { isAuthenticated, isChecking, error } = authState;
```

## API Integration Patterns

### Authentication Flow

1. **Configuration**: User provides controller host, credentials, and blueprint name
2. **Login**: Service authenticates and receives session token
3. **Session Management**: Token stored and used for subsequent requests
4. **Automatic Refresh**: Periodic authentication checks maintain session state

### Query Execution

The domain supports both templated and custom GraphQL queries:

```typescript
// Using predefined templates
const systemResults = await apstraApiService.searchSystemsWithTopology(
  blueprintId, 
  'server-hostname'
);

// Custom queries
const customResults = await apstraApiService.executeQuery(
  blueprintId,
  `match(node('system', name='system').out().node('interface', name='intf'))`
);
```

### Error Handling

Comprehensive error handling covers:

- **Network Errors**: Connection timeouts, DNS resolution failures
- **Authentication Errors**: Invalid credentials, expired sessions
- **API Errors**: Invalid queries, blueprint not found, permission issues

## Session Management

The domain maintains session state across the application:

- **Session Storage**: Active sessions stored in backend state
- **Authentication Checks**: Periodic validation of session status
- **Automatic Cleanup**: Sessions cleared on logout or expiration
- **Multi-Session Support**: Multiple concurrent sessions supported

## Blueprint Operations

### System Search

Search for network systems across blueprints with topology context:

```typescript
const results = await apstraApiService.searchSystemsWithTopology(blueprintId, serverName);
// Returns: system info, pod, rack, and topology relationships
```

### IP Address Search

Locate IP addresses within network topology:

```typescript
const results = await apstraApiService.searchIPsWithTopology(blueprintId, ipAddress);
// Returns: interface info, system, pod, rack relationships
```

### Blueprint Dump

Export complete blueprint configuration:

```typescript
const blueprintData = await apstraApiService.dumpBlueprint(blueprintId);
// Returns: Complete JSON configuration of the blueprint
```

## URL Generation

Utility functions generate Apstra UI URLs for deep linking:

```typescript
import { generateApstraUrls } from 'src/domains/apstra/utils';

const systemUrl = generateApstraUrls.system({
  host: 'apstra.example.com',
  blueprintId: 'blueprint-uuid',
  nodeId: 'system-node-uuid'
});
```

## Configuration Management

### Default Configuration

```typescript
const defaultConfig: ApstraConfig = {
  host: '10.85.192.59',
  port: 443,
  username: 'admin',
  password: '',
  blueprint_name: 'terra',
  use_ssl: true,
  verify_ssl: false,
  timeout: 30
};
```

### User Configuration

- **Persistent Storage**: User configurations saved to application data directory
- **File Import/Export**: Support for loading/saving configuration files
- **Validation**: Comprehensive validation of configuration parameters

## Testing Strategy

### Unit Tests

- **Service Layer**: API client functionality, error handling
- **Utilities**: URL generation, configuration validation
- **Components**: UI component behavior, state management

### Integration Tests

- **API Communication**: Mock Apstra controller responses
- **Authentication Flow**: Login, session management, logout
- **Query Execution**: Template substitution, result processing

### End-to-End Tests

- **Complete Workflows**: Configuration → Authentication → Search → Results
- **Error Scenarios**: Network failures, authentication errors, invalid queries

## Development Guidelines

### Adding New API Endpoints

1. **Backend Service**: Add method to `ApstraApiClient`
2. **Command Handler**: Create Tauri command in `apstra_api_handler.rs`
3. **Frontend Service**: Add method to `ApstraApiService`
4. **Type Definitions**: Update TypeScript interfaces
5. **Documentation**: Update this README with usage examples

### Query Templates

GraphQL query templates are stored in `data/queries/` and loaded at runtime:

- **Template Format**: Use `{parameter}` placeholders for substitution
- **Parameter Validation**: Ensure safe parameter substitution
- **Error Handling**: Provide meaningful error messages for query failures

### Authentication Patterns

- **Centralized State**: Use `AuthContext` for all authentication state
- **Error Boundaries**: Implement proper error handling for auth failures
- **Session Persistence**: Consider session persistence across app restarts

## Security Considerations

- **Credential Storage**: Passwords not persisted in plain text
- **SSL/TLS**: Support for both secure and insecure connections
- **Certificate Validation**: Configurable certificate verification
- **Session Timeout**: Automatic session cleanup and timeout handling

## Performance Optimization

- **Connection Pooling**: Reuse HTTP connections where possible
- **Query Caching**: Cache frequently used query results
- **Lazy Loading**: Load query templates on demand
- **Batch Operations**: Group related API calls when possible

## Troubleshooting

### Common Issues

1. **Connection Failures**: Check network connectivity, SSL settings
2. **Authentication Errors**: Verify credentials, check session expiration
3. **Query Failures**: Validate GraphQL syntax, check blueprint permissions
4. **Timeout Issues**: Adjust timeout settings, check network latency

### Debug Logging

Enable debug logging for detailed API communication:

```bash
RUST_LOG=debug npm run tauri:dev
```

### Network Diagnostics

The domain provides built-in network diagnostics:

- **Connection Testing**: Validate controller reachability
- **Authentication Testing**: Verify credential validity
- **Query Validation**: Test GraphQL query syntax

This domain serves as the foundation for all Apstra-related functionality in the application, providing a robust and scalable integration layer with comprehensive error handling and state management.