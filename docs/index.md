# Documentation Index

Comprehensive technical documentation for the Apstra Network Configuration Tool.

## 📚 Quick Navigation

### **New Users Start Here:**
- **[User Guide: Getting Started](./user/getting-started.md)** - Complete user manual with step-by-step workflows
- **[Excel Format Guide](./user/excel-format-guide.md)** - Detailed guide for preparing Excel files
- **[User Troubleshooting](./user/troubleshooting.md)** - Solutions for common user issues

### **Developers Start Here:**
- **[Development Setup Guide](./development/setup.md)** - Complete environment setup with troubleshooting
- **[Architecture Overview](./architecture/overview.md)** - Visual system architecture and component relationships
- **[Development Troubleshooting](./development/troubleshooting.md)** - Common development issues and debugging

## Core Technical Documentation

### Architecture & Design

#### [Architecture Overview](./architecture/overview.md)
Visual system architecture with detailed diagrams:
- System architecture with component relationships
- Data flow patterns and processing pipelines  
- Component hierarchy and service architecture
- Security architecture and performance optimization
- Integration points and deployment strategy

#### [Data Flow Documentation](./architecture/data-flow.md)
Detailed processing sequences and state management:
- Excel processing pipeline with transformation flow
- API integration flow with authentication sequences
- State management and error propagation patterns
- Real-time updates and network communication flows

### Core Features & Implementation

#### [Core Features Specification](./core-features.md)
Complete specification of implemented features including:
- Excel file processing and sheet selection
- Conversion mapping system for flexible header translation
- Data validation and processing workflows
- **Apstra API integration and live search capabilities**
- Interactive table visualization
- Comprehensive logging and audit systems

#### [API Integration](./api-integration.md)
Apstra REST API integration details:
- Session-based authentication with secure token management
- Real-time system search using graph query engine
- Blueprint management operations (Leafs, Dump)
- URL generation for seamless Apstra web navigation
- Comprehensive error handling and user feedback

#### [Authentication Architecture](./authentication-architecture.md)
Centralized authentication system design:
- React Context and custom hooks pattern
- Enhanced authentication service with retry logic
- Comprehensive error classification and handling
- Session lifecycle management and cleanup
- Type-safe authentication state management

### Development & Quality

#### [Development Setup Guide](./development/setup.md)
Complete development environment setup:
- Platform-specific prerequisites and dependencies
- Step-by-step installation with verification
- Common setup issues and troubleshooting
- IDE recommendations and performance optimization

#### [Development Troubleshooting](./development/troubleshooting.md)
Comprehensive debugging guide:
- Build and setup error solutions
- Runtime and processing error patterns
- API integration debugging techniques
- File processing troubleshooting methods

## UI/UX Design Documentation

### [UI Design Patterns](./ui-design-patterns.md)
Standardized design patterns including:
- Button-style web opening pattern for external Apstra links
- Graph query pattern for topology information
- Consistent CSS classes and styling approaches
- Tauri-specific UI considerations

### [UX Design Standards](./ux-design-standards.md)
User experience guidelines and standards:
- Authentication flow requirements
- User feedback and error messaging
- Accessibility considerations
- Navigation patterns and workflows

## User Documentation

### [Getting Started Guide](./user/getting-started.md)
Complete user manual covering:
- Installation instructions for all platforms
- Step-by-step workflow from connection to provisioning
- Feature explanations with screenshots and examples
- Advanced features and session management

### [Excel Format Guide](./user/excel-format-guide.md)
Detailed Excel file preparation guide:
- File format requirements and supported features
- Column header requirements and mapping system
- Data format specifications with examples
- Validation rules and troubleshooting

### [User Troubleshooting Guide](./user/troubleshooting.md)
Solutions for common user issues:
- Application startup and performance problems
- File upload and processing issues
- Connection and authentication troubleshooting
- Data validation and format problems

## Quick Reference

### Key Technologies
- **Frontend**: React with TypeScript
- **Backend**: Rust with Tauri framework
- **API Integration**: Direct Apstra REST API communication
- **State Management**: React Context with custom hooks
- **Testing**: Vitest for frontend, Cargo for Rust backend

### Essential Files
- `README.md`: Project overview and quick start guide
- `CLAUDE.md`: Development guidelines for Claude Code
- `SPECIFICATION.md`: Complete technical specification
- `/docs/`: This organized documentation directory

### Development Commands
```bash
npm run tauri:dev          # Start development server
npm run tauri:build        # Build for production
npm test                   # Run frontend tests
npm run test:rust          # Run backend tests
RUST_LOG=debug npm run tauri:dev  # Debug mode
```

## Navigation

- [← Back to Project Root](../README.md)
- [Technical Specification](../SPECIFICATION.md)
- [Development Guidelines](../CLAUDE.md)