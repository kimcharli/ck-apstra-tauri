# Development Environment Setup

Complete guide for setting up the Apstra Network Configuration Tool development environment.

## Prerequisites

### System Requirements

**Operating System Support:**
- macOS 10.15+ (Catalina or later)
- Windows 10/11 (with WSL2 recommended for development)
- Ubuntu 18.04+ / Debian 10+ / RHEL 8+ / Fedora 35+

**Hardware Requirements:**
- 8GB RAM minimum (16GB recommended)
- 10GB free disk space
- Network connectivity for package downloads

### Required Software

#### 1. Node.js and npm
**Version Required:** Node.js 18.x or 20.x LTS

**Installation:**

**macOS:**
```bash
# Using Homebrew (recommended)
brew install node@20

# Or using Node Version Manager (nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 20
nvm use 20
```

**Windows:**
```powershell
# Using Chocolatey (recommended)
choco install nodejs-lts

# Or download from https://nodejs.org/
# Select "20.x.x LTS" version
```

**Linux:**
```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# RHEL/CentOS/Fedora
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install nodejs npm
```

**Verify Installation:**
```bash
node --version  # Should show v20.x.x
npm --version   # Should show 9.x.x or higher
```

#### 2. Rust Toolchain
**Version Required:** Rust 1.70+ (latest stable recommended)

**Installation:**
```bash
# Install Rust (all platforms)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Follow the prompts, then reload your shell
source ~/.cargo/env

# Update to latest stable
rustup update stable
rustup default stable
```

**Windows Additional Steps:**
```powershell
# Install Visual Studio Build Tools
# Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
# Select: "C++ build tools" workload
```

**Verify Installation:**
```bash
rustc --version  # Should show 1.70+ 
cargo --version  # Should show 1.70+
```

#### 3. Tauri CLI
**Installation:**
```bash
# Install Tauri CLI globally
npm install -g @tauri-apps/cli

# Or install locally in project
npm install --save-dev @tauri-apps/cli
```

**Verify Installation:**
```bash
tauri --version  # Should show 1.x.x or 2.x.x
```

#### 4. Platform-Specific Dependencies

**macOS:**
```bash
# Xcode Command Line Tools
xcode-select --install

# Additional dependencies
brew install webkit2gtk
```

**Windows:**
```powershell
# WebView2 (usually pre-installed on Windows 11)
# Download if needed: https://developer.microsoft.com/microsoft-edge/webview2/

# Windows SDK (if using Visual Studio installer)
# Select "Windows 10/11 SDK" component
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev

# RHEL/CentOS/Fedora
sudo dnf install webkit2gtk3-devel \
    openssl-devel \
    curl \
    wget \
    libappindicator-gtk3-devel \
    librsvg2-devel
sudo dnf groupinstall "C Development Tools and Libraries"
```

## Project Setup

### 1. Clone and Install
```bash
# Clone the repository
git clone <repository-url>
cd ck-apstra-tauri

# Install frontend dependencies
npm install

# Install Rust dependencies (automatically handled by first build)
cd src-tauri
cargo fetch
cd ..
```

### 2. Environment Configuration

**Create Development Environment File:**
```bash
# Copy example environment file (if exists)
cp .env.example .env

# Or create new .env file
touch .env
```

**Environment Variables:**
```bash
# .env file contents
RUST_LOG=debug
TAURI_DEV_WATCHER=true
VITE_DEV_PORT=1420
```

### 3. Verify Installation

**Test Frontend:**
```bash
npm run dev
# Should start Vite dev server on http://localhost:1420
```

**Test Backend:**
```bash
cd src-tauri
cargo test
# Should run all Rust tests successfully
```

**Test Full Application:**
```bash
npm run tauri:dev
# Should launch the desktop application
```

## Common Setup Issues and Solutions

### Issue: `command not found: tauri`
**Cause:** Tauri CLI not in PATH or not installed globally
**Solution:**
```bash
# Check if installed locally
npx tauri --version

# Or install globally
npm install -g @tauri-apps/cli
```

### Issue: Rust compilation errors on Windows
**Cause:** Missing Visual Studio Build Tools
**Solution:**
1. Install Visual Studio Build Tools from Microsoft
2. Select "C++ build tools" workload
3. Restart terminal and try again

### Issue: `webkit2gtk` errors on Linux
**Cause:** Missing system dependencies
**Solution:**
```bash
# Install all required system packages
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    libssl-dev \
    libgtk-3-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

### Issue: Node.js version conflicts
**Cause:** Multiple Node.js versions or outdated version
**Solution:**
```bash
# Using nvm (recommended)
nvm install 20
nvm use 20
nvm alias default 20

# Verify
node --version
```

### Issue: Permission errors during installation
**Cause:** npm trying to install globally without permissions
**Solution:**
```bash
# Configure npm to use different directory
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'

# Add to shell profile (.bashrc, .zshrc, etc.)
export PATH=~/.npm-global/bin:$PATH
```

### Issue: Tauri dev server not starting
**Cause:** Port conflicts or missing dependencies
**Solution:**
```bash
# Check if port is in use
lsof -i :1420  # macOS/Linux
netstat -ano | findstr :1420  # Windows

# Try different port
VITE_DEV_PORT=1421 npm run tauri:dev
```

## Development Workflow Verification

### 1. Full Development Stack Test
```bash
# Terminal 1: Start frontend dev server
npm run dev

# Terminal 2: Start Tauri in dev mode
npm run tauri:dev

# Verify:
# - Desktop application launches
# - Hot reload works when editing frontend files
# - Rust changes trigger rebuild
# - No console errors in browser or terminal
```

### 2. Test Suite Execution
```bash
# Run all tests
npm test                    # Frontend tests
npm run test:rust          # Backend tests
npm run test:integration   # Integration tests

# All tests should pass
```

### 3. Build Process Verification
```bash
# Test production build
npm run tauri:build

# Verify:
# - Build completes without errors
# - Output files created in src-tauri/target/release/bundle/
```

## IDE Setup Recommendations

### Visual Studio Code
**Recommended Extensions:**
- `rust-analyzer` - Rust language support
- `Tauri` - Tauri-specific features
- `ES7+ React/Redux/React-Native snippets` - React development
- `TypeScript Importer` - Auto import management
- `Prettier` - Code formatting

**VS Code Settings:**
```json
{
  "rust-analyzer.cargo.allFeatures": true,
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true
}
```

### Alternative IDEs
- **IntelliJ IDEA / WebStorm**: Rust plugin + JavaScript support
- **Vim/Neovim**: rust.vim, coc-rust-analyzer, coc-tsserver
- **Emacs**: rustic, tide-mode

## Performance Optimization

### Development Mode Optimizations
```bash
# Faster Rust compilation
export CARGO_TARGET_DIR="target"
export RUSTC_WRAPPER="sccache"  # Install sccache for caching

# Faster Node.js operations
npm config set fund false
npm config set audit-level moderate
```

### System Resource Management
- **RAM Usage**: Expect 2-4GB during development
- **CPU Usage**: High during initial build, moderate during development
- **Disk Space**: 2-3GB for dependencies and build artifacts

## Next Steps

After completing setup:

1. **Read the Architecture Guide**: [docs/architecture/overview.md](../architecture/overview.md)
2. **Review Development Patterns**: [CLAUDE.md](../../CLAUDE.md)
3. **Run the Test Suite**: [tests/README.md](../../tests/README.md)
4. **Check API Integration**: [docs/api-integration.md](../api-integration.md)

## Getting Help

### Documentation Resources
- **Main Documentation**: [docs/index.md](../index.md)
- **Development Guide**: [CLAUDE.md](../../CLAUDE.md)
- **Technical Specification**: [SPECIFICATION.md](../../SPECIFICATION.md)

### Community Support
- **Issues**: Report setup problems via GitHub Issues
- **Discussions**: Technical questions via GitHub Discussions
- **Documentation**: Suggest improvements via pull requests

### Troubleshooting Steps
1. Check this setup guide for common issues
2. Review error logs with `RUST_LOG=debug`
3. Verify all prerequisites are correctly installed
4. Test each component individually (Node.js, Rust, Tauri)
5. Create a minimal reproduction case if problems persist