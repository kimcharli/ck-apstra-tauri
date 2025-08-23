# Documentation Index

Comprehensive technical documentation for the Apstra Network Configuration Tool.

## 📚 Quick Navigation

### **New Users Start Here:**
- **[User Guide: Getting Started](./user/getting-started.md)** - Complete user manual with step-by-step workflows
- **[Excel Format Guide](./user/excel-format-guide.md)** - Detailed guide for preparing Excel files
- **[User Troubleshooting](./user/troubleshooting.md)** - Solutions for common user issues

### **Developers Start Here:**
- **[Development Guide](./development.md)** - Complete setup, commands, principles, and troubleshooting
- **[Architecture Overview](./architecture.md)** - System design patterns and deployment
- **[Data Flow Diagrams](./data-flow.md)** - Visual processing sequences and flows

## Core Technical Documentation

### Architecture & Design

#### [Architecture Overview](./architecture.md)
Complete system architecture and design:
- System design patterns and build processes  
- Component relationships and service architecture
- Security considerations and performance optimization
- Native application distribution and deployment strategy

#### [Data Flow Documentation](./data-flow.md)
Visual processing sequences with Mermaid diagrams:
- Excel processing pipeline with transformation flow
- API integration flow with authentication sequences
- State management and error propagation patterns
- Real-time updates and network communication flows

### Core Features & Implementation

#### [Core Features & Data Processing](./core-features.md)
Complete Excel processing and network features:
- Two-phase field mapping algorithm and speed normalization
- Excel merged cell handling and conversion mapping system  
- Data validation workflows and interface naming conventions
- Switch interface generation and processing pipelines

#### [API Integration](./api-integration.md)
Comprehensive Apstra API integration:
- Session management and authentication architecture
- Real-time system search and blueprint operations  
- URL generation utilities and error handling patterns
- MCP server integration and state management

#### [Authentication Architecture](./authentication-architecture.md)
Centralized authentication system design:
- React Context and custom hooks pattern
- Enhanced authentication service with retry logic
- Comprehensive error classification and handling
- Session lifecycle management and cleanup

### Development & Quality

#### [Complete Development Guide](./development.md)
All-in-one developer resource:
- Platform-specific setup and installation requirements
- Development commands, testing, and debugging tools
- Core principles, patterns, and regression prevention rules
- Comprehensive troubleshooting and issue resolution

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