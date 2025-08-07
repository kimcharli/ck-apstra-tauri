# Apstra REST API Integration

## Overview
The application now includes direct integration with Apstra AOS REST API, enabling real-time system search and network infrastructure management capabilities.

## Implementation Architecture

### Backend Services (Rust)
- **ApstraApiClient**: Core HTTP client with session-based authentication
- **Authentication Management**: Secure token handling with AuthToken header pattern
- **Query Engine Integration**: Direct access to Apstra's graph query engine at `/api/blueprints/{blueprint_id}/qe`
- **Error Handling**: Comprehensive error handling for network, authentication, and API failures

### Frontend Services (TypeScript)
- **ApstraApiService**: TypeScript wrapper providing clean API interface
- **Authentication Flow**: Automatic authentication using stored Apstra configuration
- **Real-time Results**: Live display of search results with JSON formatting
- **Status Management**: Visual authentication and connection status indicators

## Features Implemented

### System Search Functionality
- **Query Format**: Implements `match(node('system', label='{server_name}', name='system'))` pattern
- **Blueprint Selection**: Dropdown selector and text input for flexible blueprint targeting
- **Result Display**: Structured JSON output with result count and detailed system information
- **Error Feedback**: User-friendly error messages for authentication and network issues

### Authentication & Session Management
- **Automatic Login**: Seamless authentication using user's stored Apstra configuration
- **Session Persistence**: Maintains authentication state throughout application session
- **Token Management**: Secure handling of AuthToken headers for API requests
- **Connection Status**: Real-time authentication status indicators in UI

### Integration with Existing Systems
- **Logging Integration**: All API interactions logged through comprehensive logging service
- **Configuration Reuse**: Leverages existing Apstra configuration management
- **Navigation Integration**: Seamless access through Tools page navigation
- **Error Reporting**: Integrated error handling with existing notification systems

## API Endpoints Utilized
- `POST /api/aaa/login`: Authentication with username/password
- `POST /api/blueprints/{blueprint_id}/qe`: Query execution against blueprint graphs
- Authentication via AuthToken header as specified in API documentation

## Technical Implementation Details

### Rust Backend Commands
- `apstra_login`: Session-based authentication with credential validation
- `apstra_search_systems`: System search using graph query language
- `apstra_execute_query`: Generic query execution for custom searches
- `apstra_is_authenticated`: Authentication status verification
- `apstra_logout`: Session cleanup and token invalidation

### Security Considerations
- **Credential Protection**: Passwords masked in logs and error messages
- **SSL/TLS Support**: Configurable SSL certificate validation
- **Session Management**: Secure token storage and automatic cleanup
- **Error Sanitization**: Sensitive information filtered from user-facing errors

## Usage Workflow
1. **Authentication**: Application automatically authenticates using stored Apstra config
2. **Blueprint Selection**: User selects target blueprint from dropdown or enters label
3. **System Search**: User enters system hostname and executes search
4. **Results Display**: API response displayed with result count and detailed system data
5. **Error Handling**: Clear feedback for authentication, network, or API failures

## Future API Extensions
- **IP Address Search**: Enhanced search capabilities for IP/CIDR ranges
- **Blueprint Management**: CRUD operations for blueprint manipulation
- **Device Configuration**: Direct device configuration API integration
- **Batch Operations**: Multi-system search and management capabilities