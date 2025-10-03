# Technology Stack & Build System

## Core Technologies

### Frontend

- **React 18.2** with TypeScript
- **Vite 4.4** for build system and development server
- **CSS Modules** for component styling
- **Tauri API** for desktop integration

### Backend

- **Rust 1.70+** with Tauri 1.5 framework
- **Calamine 0.30** for Excel file processing
- **Reqwest** for HTTP client (Apstra API integration)
- **Tokio** for async runtime

### Key Dependencies

- **Excel Processing**: `calamine` crate for .xlsx parsing
- **HTTP Client**: `reqwest` with JSON features
- **Serialization**: `serde` with derive features
- **Testing**: `vitest` for frontend, `cargo test` for backend

## Build System

### Development Commands

```bash
# Start development with hot reload
npm run tauri:dev

# Start with debug logging
RUST_LOG=debug npm run tauri:dev

# Frontend only (for UI development)
npm run dev
```

### Testing Commands

```bash
# Frontend tests
npm test                    # Run all tests
npm run test:ui            # Interactive test UI
npm run test:watch         # Watch mode

# Backend tests
npm run test:rust          # All Rust tests
npm run test:integration   # Integration tests
cargo test                 # Direct cargo testing
```

### Build & Distribution

```bash
# Production build
npm run tauri:build

# Code quality
npm run lint               # TypeScript checking
npm run lint:rust         # Rust linting with Clippy
```

### Build Outputs

- **macOS**: `.app` bundle and `.dmg` installer
- **Windows**: `.exe` and `.msi` installers
- **Linux**: `.deb`, `.rpm`, and `.AppImage` packages
- **Location**: `src-tauri/target/release/bundle/`

## Development Server Configuration

- **Port**: 1420 (fixed for Tauri)
- **Hot Reload**: Enabled for React components
- **Backend**: Automatic Rust recompilation
- **File Watching**: Excludes `src-tauri` directory

## Critical Dependencies

### Required System Libraries

- **macOS**: Xcode Command Line Tools
- **Linux**: webkit2gtk, build-essential, libssl-dev
- **Windows**: Visual Studio Build Tools, WebView2

### Version Requirements

- **Node.js**: 18.x or 20.x LTS
- **Rust**: 1.70+ (latest stable recommended)
- **Tauri CLI**: Latest version (`npm install -g @tauri-apps/cli`)

## Performance Considerations

- **File Size Limits**: Handles Excel files up to 100MB
- **Memory Usage**: Target under 1GB for typical workloads
- **Processing**: 10,000+ rows efficiently with streaming
- **Bundle Size**: Optimized with Tauri's small footprint

## Architecture Direction: Domain-Driven Development

### Current Migration Status

**IMPORTANT**: This project is actively migrating from a technical-layer organization to a domain-driven architecture. See `.kiro/specs/file-structure-improvements/` for the complete migration plan.

### Domain-Driven Benefits

- **Improved Maintainability**: Related functionality co-located by business domain
- **Better Developer Velocity**: Reduce time to locate functionality by 50%
- **Enhanced Type Safety**: Centralized API contracts between frontend and backend
- **Clearer Testing**: Domain-specific test organization and utilities

### Migration Approach

- **Incremental**: Domains migrated one at a time without breaking functionality
- **Parallel Structure**: New domain structure created alongside existing structure
- **Validation**: Comprehensive testing ensures no regressions during migration
- **Documentation**: Clear migration guides and updated development practices

### Target Domain Organization

1. **Excel Domain**: File processing, parsing, sheet selection
2. **Apstra Domain**: API integration, authentication, system management
3. **Conversion Domain**: Header mapping, data transformation, validation
4. **Provisioning Domain**: Network configuration, workflow management
5. **Shared Domain**: Common utilities, types, and cross-domain functionality

### Development Guidelines During Migration

- New features should follow domain-driven patterns when possible
- Existing code modifications should consider domain migration opportunities
- Import paths may change during migration - follow updated documentation
- Test organization will align with domain boundaries for better maintainability
