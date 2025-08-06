# Apstra Network Configuration Tool

A Tauri-based desktop application for processing Excel spreadsheets containing network configuration data and performing automated actions on Apstra network infrastructure.

## Project Status

🚧 **Under Development** - This project is currently in the initial setup phase.

## Overview

This application provides a streamlined workflow for:
- Excel file upload and sheet selection
- Network configuration data parsing and validation
- Interactive data visualization with sorting and filtering
- Automated network configuration actions
- Real-time progress tracking and comprehensive error handling

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
npm run tauri dev
```

### Build

```bash
# Build for production
npm run tauri build
```

## Features

### Phase 1 (Current)
- [x] Project structure and basic setup
- [ ] File upload functionality
- [ ] Excel parsing foundation
- [ ] Basic UI components

### Phase 2 (Planned)
- [ ] Sheet selection interface
- [ ] Data validation engine
- [ ] Temporary file management
- [ ] Progress tracking foundation

### Phase 3 (Future)
- [ ] Interactive sortable table
- [ ] Action processing engine
- [ ] Real-time progress updates
- [ ] Export capabilities

## Documentation

- **SPECIFICATION.md**: Complete technical specification
- **CLAUDE.md**: Development guidelines for Claude Code

## Contributing

Please refer to the implementation phases in `SPECIFICATION.md` for development priorities and guidelines.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.