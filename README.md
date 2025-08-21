# Apstra Network Configuration Tool

A Tauri-based desktop application for processing Excel spreadsheets containing network configuration data and performing automated actions on Apstra network infrastructure.

## Project Status

✅ **Production-Ready Application** - Complete application with all core features, Tools page, and comprehensive logging system implemented.

## Overview

This application provides a streamlined workflow for:
- Excel file upload with drag-and-drop or file picker support
- Flexible conversion mapping system for diverse Excel header formats
- Sheet selection and intelligent data parsing with validation
- Interactive data visualization in sortable tables
- User-customizable field mappings with persistent configuration
- Real-time data processing with comprehensive error handling
- **Apstra connection management with session-based authentication**
- **Direct Apstra API integration for system and IP search capabilities**
- **Blueprint management tools (Leafs and Dump operations)**
- **URL generation for direct Apstra web interface navigation**
- Comprehensive logging with post-mortem analysis capabilities

## Technology Stack

- **Frontend**: React with TypeScript
- **Backend**: Rust with Tauri framework
- **File Processing**: Excel parsing with validation
- **UI**: CSS Modules with responsive design

## Project Structure

The project follows a well-organized structure with clear separation between frontend and backend components. See `SPECIFICATION.md` for detailed architecture information.

## Getting Started

### Quick Setup

**For the complete development setup guide with troubleshooting, see [docs/development/setup.md](docs/development/setup.md)**

### Prerequisites

**Required Software:**
- **Node.js**: 18.x or 20.x LTS ([Download](https://nodejs.org/))
- **Rust**: 1.70+ ([Install via rustup](https://rustup.rs/))  
- **Tauri CLI**: Latest version
- **Platform Dependencies**: See [setup guide](docs/development/setup.md#platform-specific-dependencies)

**System Requirements:**
- 8GB RAM (16GB recommended)
- 10GB free disk space
- Network connectivity for dependencies

### One-Minute Setup

```bash
# 1. Clone and enter project
git clone <repository-url>
cd ck-apstra-tauri

# 2. Install dependencies
npm install
npm install -g @tauri-apps/cli

# 3. Start development
npm run tauri:dev
```

### Development Commands

```bash
# Development with hot reload
npm run tauri:dev

# Development with full debug logging
RUST_LOG=debug npm run tauri:dev

# Run tests
npm test                    # Frontend tests
npm run test:rust          # Backend tests  
npm run test:integration   # Integration tests

# Code quality
npm run lint               # TypeScript checking
npm run lint:rust         # Rust linting
```

### Production Build

```bash
# Build desktop application
npm run tauri:build

# Output locations:
# macOS: src-tauri/target/release/bundle/macos/
# Windows: src-tauri/target/release/bundle/msi/
# Linux: src-tauri/target/release/bundle/deb/
```

### Common Issues

If you encounter setup problems:

1. **Check the [troubleshooting guide](docs/development/troubleshooting.md)**
2. **Verify prerequisites**: `node --version`, `cargo --version`, `tauri --version`
3. **Platform dependencies**: Follow [platform-specific setup](docs/development/setup.md#platform-specific-dependencies)
4. **Clear cache**: `rm -rf node_modules target/ && npm install`

**Need help?** See [Documentation](#documentation) or create an issue.

## Features

### ✅ Core Implementation (Completed)
- [x] Complete Tauri application setup with React frontend and Rust backend
- [x] Excel file upload with Tauri file dialog integration
- [x] Advanced sheet selection interface with real-time data preview
- [x] Flexible conversion mapping system with default configurations
- [x] User-customizable header mappings with persistent storage
- [x] Intelligent Excel parsing with fallback logic
- [x] Interactive data table with sorting and filtering capabilities
- [x] Real-time conversion map updates that immediately reprocess data
- [x] Comprehensive error handling and user feedback
- [x] Apstra connection configuration with connection testing
- [x] Network provisioning workflow with data validation
- [x] Tools page with system/IP search and blueprint management
- [x] Shared navigation header across all application pages
- [x] Comprehensive logging system with post-mortem analysis
- [x] Cross-platform native applications (macOS, Windows, Linux)
- [x] Professional branding with custom icons and responsive design

### 🎯 Key Features
**Conversion Mapping System:**
- Default mappings embedded from related project configurations
- User interface for customizing Excel header to field mappings
- Load/save custom mapping configurations to files
- Import/export mapping files for sharing between users
- Real-time preview of header mappings and field conversions

**Excel Processing:**
- Support for .xlsx files with automatic sheet detection
- Configurable header row location (default: row 2)
- Intelligent field detection with multiple header name variations
- Data validation with duplicate detection and error reporting
- Graceful handling of missing or malformed data

**Apstra Integration:**
- **Session-based authentication** with secure credential management
- Connection testing with visual status indicators and MCP server support
- **Direct API access** for system and IP address searches across blueprints
- **Blueprint management** with Leafs and Dump operations
- **URL generation** for seamless navigation to Apstra web interface
- Network provisioning workflow with data verification

**Tools and Search:**
- System search by device name across blueprints
- IP address/CIDR search with blueprint filtering
- Blueprint management with Leafs and Dump operations
- Comprehensive search result handling

**Logging and Analysis:**
- Complete audit trail of all user interactions
- Button clicks, workflow progression, and data changes tracked
- Multiple export formats (TXT, JSON, CSV) with timestamps
- Session-based logging with privacy protection
- Post-mortem analysis capabilities for debugging and optimization

### 🚀 Future Enhancements
- [ ] **Automated network provisioning** via Apstra API (search functionality complete)
- [ ] Real-time progress tracking for bulk operations
- [ ] Advanced data export capabilities with custom templates
- [ ] Batch file processing queues for multiple Excel files
- [ ] Historical provisioning records and rollback capabilities
- [ ] **Enhanced MCP server integration** for extended Apstra capabilities

## Quick Start Guide

### Using the Application

1. **Start the Application**:
   ```bash
   npm run tauri:dev
   # Or for production build
   npm run tauri:build
   ```

2. **Configure Apstra Connection** (Step 1):
   - Click "1. Apstra Connection" in the header or dashboard
   - Enter Apstra controller host, port, and credentials
   - **Authenticate and establish session** with connection testing
   - Specify blueprint name for provisioning and search operations

3. **Customize Conversion Mappings** (Step 2):
   - Click "2. Conversion Map" to customize Excel header mappings
   - Load default mappings or import custom configuration
   - Add, edit, or remove header-to-field mappings
   - Save custom configurations for reuse

4. **Provision Network Configuration** (Step 3):
   - Click "3. Provisioning" to start the provisioning workflow
   - Upload Excel file with network configuration data
   - Select sheet containing the data to process
   - Review parsed data in the interactive table
   - Execute provisioning after validation

5. **Use Search Tools** (Step 4):
   - Click "4. Tools" for **live Apstra API search capabilities**
   - **Search systems by name** with real-time results across blueprints
   - **Find IP addresses or CIDR ranges** with blueprint filtering
   - **Manage blueprint operations** (Leafs, Dump) with direct API calls
   - **Generate Apstra web URLs** for seamless navigation to device details

6. **Download Session Logs**:
   - Click the 📥 button in the navigation header
   - Choose format (TXT, JSON, CSV) for log export
   - Use logs for troubleshooting and post-mortem analysis

### Supported Excel Formats

The application works with Excel files containing network configuration data. Default mappings support headers like:
- "Switch Name" → switch_label
- "Port" → switch_ifname  
- "Host Name" → server_label
- "Speed (GB)" → link_speed
- And many more...

## Documentation

### 📚 Complete Documentation Suite

**Quick Reference:**
- **[Architecture Overview](docs/architecture/overview.md)** - Visual system architecture and component relationships
- **[Development Setup Guide](docs/development/setup.md)** - Complete environment setup with troubleshooting
- **[Troubleshooting Guide](docs/development/troubleshooting.md)** - Common issues and debugging techniques

**Technical Documentation:**
- **[SPECIFICATION.md](SPECIFICATION.md)** - Complete technical specification with architecture decisions
- **[CLAUDE.md](CLAUDE.md)** - Development guidelines and patterns for Claude Code
- **[Data Flow Documentation](docs/architecture/data-flow.md)** - Detailed processing sequences and state management

**Organized by Topic:**
- **[docs/index.md](docs/index.md)** - Documentation navigation hub
- **[API Integration](docs/api-integration.md)** - Apstra REST API integration patterns and session management
- **[Authentication Architecture](docs/authentication-architecture.md)** - Session management and security implementation
- **[Core Features](docs/core-features.md)** - Detailed feature specifications and workflows
- **[UI Design Patterns](docs/ui-design-patterns.md)** - Component design and user interface standards
- **[UX Design Standards](docs/ux-design-standards.md)** - User experience guidelines and accessibility
- **[Testing Guide](tests/README.md)** - Test structure and coverage documentation

## Contributing

Please refer to the implementation phases in `SPECIFICATION.md` for development priorities and guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.