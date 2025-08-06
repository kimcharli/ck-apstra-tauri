# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Tauri-based web application for processing Excel spreadsheets containing network configuration data. The application allows users to upload Excel files, select sheets, validate and visualize data, and perform automated actions on the network configuration data.

## Architecture

The project follows a Tauri architecture pattern with:
- **Frontend**: Modern web framework (React/Vue.js) for the user interface
- **Backend**: Rust-based Tauri backend for file processing and system interactions
- **Core Features**: Excel parsing, data validation, interactive table display, action processing with real-time progress tracking

## Key Requirements

### Data Processing Pipeline
- Excel (.xlsx) file upload with temporary storage
- Sheet selection interface after upload
- Header mapping for network configuration fields (blueprint, server_label, is_external, etc.)
- Row validation with duplicate detection (skip rows with same switch + switch_ifname)
- Sortable table display with filtering capabilities
- Automatic cleanup of temporary files after processing

### Expected Column Headers
The application processes these specific network configuration fields:
- blueprint, server_label, is_external, server_tags
- link_group_ifname, link_group_lag_mode, link_group_ct_names, link_group_tags
- link_speed, server_ifname, switch_label, switch_ifname, link_tags, comment

### Action Processing
- Support for multiple action types (e.g., import-generic-system)
- Real-time progress tracking and status updates
- Comprehensive error handling and user feedback
- Action history tracking

## Development Commands

*Note: Project structure not yet initialized. Common Tauri commands will be:*
- `npm run tauri dev` - Start development server
- `npm run tauri build` - Build application for production
- `cargo test` - Run Rust backend tests
- `npm test` - Run frontend tests

## Security Considerations

- Secure file upload handling with validation
- Temporary file cleanup after processing
- Input validation for all user data
- Error handling without exposing sensitive information

## Implementation Phases

1. **Phase 1**: Basic infrastructure, file upload, data parsing, table display
2. **Phase 2**: Sheet selection, temporary storage, validation, action processing
3. **Phase 3**: Advanced visualization, multiple actions, export capabilities
4. **Phase 4**: UI/UX polish, testing, deployment preparation

## File Processing Logic

- Only process rows with all required fields from header mapping
- Skip rows missing required fields without error
- Skip duplicate rows (same switch + switch_ifname combination)
- Delete temporary uploaded files after sheet processing (success or failure)
- Provide user-friendly feedback for missing or malformed data

## Documentation

- **SPECIFICATION.md**: Complete technical specification with architecture decisions, implementation phases, and detailed requirements
- **README.md**: Project setup and usage instructions (to be created)

## Important Notes

- Update SPECIFICATION.md whenever new decisions are added/updated
- Follow the phased development approach outlined in SPECIFICATION.md
- Maintain security best practices for file handling and temporary storage