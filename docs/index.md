# Documentation Index

Comprehensive technical documentation for the Apstra Network Configuration Tool.

## Core Documentation

### [Core Features Specification](./core-features.md)
Complete specification of implemented features including:
- Excel file processing and sheet selection
- Conversion mapping system for flexible header translation
- Data validation and processing workflows
- **Apstra API integration and live search capabilities**
- Interactive table visualization
- Comprehensive logging and audit systems

### [API Integration](./api-integration.md)
Apstra REST API integration details:
- Session-based authentication with secure token management
- Real-time system search using graph query engine
- Blueprint management operations (Leafs, Dump)
- URL generation for seamless Apstra web navigation
- Comprehensive error handling and user feedback

### [Authentication Architecture](./authentication-architecture.md)
Centralized authentication system design:
- React Context and custom hooks pattern
- Enhanced authentication service with retry logic
- Comprehensive error classification and handling
- Session lifecycle management and cleanup
- Type-safe authentication state management

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