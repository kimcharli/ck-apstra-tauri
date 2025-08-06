# Apstra Network Configuration Tool

A Tauri-based desktop application for processing Excel spreadsheets containing network configuration data and performing automated actions on Apstra network infrastructure.

## Project Status

✅ **Functional Application** - Core features implemented with Excel conversion mapping system.

## Overview

This application provides a streamlined workflow for:
- Excel file upload with drag-and-drop or file picker support
- Flexible conversion mapping system for diverse Excel header formats
- Sheet selection and intelligent data parsing with validation
- Interactive data visualization in sortable tables
- User-customizable field mappings with persistent configuration
- Real-time data processing with comprehensive error handling

## Technology Stack

- **Frontend**: React with TypeScript
- **Backend**: Rust with Tauri framework
- **File Processing**: Excel parsing with validation
- **UI**: CSS Modules with responsive design

## Project Structure

The project follows a well-organized structure with clear separation between frontend and backend components. See `SPECIFICATION.md` for detailed architecture information.

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- Rust (latest stable version)
- Tauri CLI

### Installation

```bash
# Install Tauri CLI (if not already installed)
cargo install tauri-cli

# Install frontend dependencies
npm install

# Install Rust dependencies
cd src-tauri && cargo build
```

### Development

```bash
# Start development server
npm run tauri:dev

# Start with debug logging
RUST_LOG=debug npm run tauri:dev
```

### Build

```bash
# Build for production
npm run tauri:build
```

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

### 🚀 Planned Enhancements
- [ ] Action processing engine for network configuration deployment
- [ ] Real-time progress tracking for bulk operations
- [ ] Advanced data export capabilities (CSV, JSON)
- [ ] Batch file processing queues
- [ ] Integration with Apstra API for direct network configuration

## Quick Start Guide

### Using the Application

1. **Start the Application**:
   ```bash
   npm run tauri:dev
   ```

2. **Upload Excel File**:
   - Click "Choose File" or drag and drop an .xlsx file
   - Application will automatically detect available sheets

3. **Select Sheet**:
   - Choose the sheet containing your network configuration data
   - Data will be automatically parsed and displayed

4. **Customize Conversion Mappings** (Optional):
   - Click "Manage Conversion Map" button
   - Add, edit, or remove header-to-field mappings
   - Save custom configurations or load existing ones
   - Changes apply immediately to current data

5. **Review Data**:
   - Inspect parsed data in the interactive table
   - Sort and filter as needed
   - Verify field mappings are correct

### Supported Excel Formats

The application works with Excel files containing network configuration data. Default mappings support headers like:
- "Switch Name" → switch_label
- "Port" → switch_ifname  
- "Host Name" → server_label
- "Speed (GB)" → link_speed
- And many more...

## Documentation

- **SPECIFICATION.md**: Complete technical specification
- **CLAUDE.md**: Development guidelines for Claude Code

## Contributing

Please refer to the implementation phases in `SPECIFICATION.md` for development priorities and guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.