# AEM Environment Manager

> One-click development environment switching for AEM developers

A cross-platform desktop application built with Tauri 2.0, enabling AEM developers to seamlessly switch between different Java, Node, Maven, and AEM instance configurations through Profiles.

[中文文档](./README_zh-CN.md)

## Features

- **Profile Management** - Create and switch between different environment configurations with one click
- **Java Version Management** - Detect and switch Java versions via SDKMAN, jEnv, or manual installation
- **Node Version Management** - Support for nvm, fnm, Volta version managers
- **AEM Instance Control** - Start, stop, and monitor AEM instances with real-time status indicators
- **Maven Configuration** - Manage multiple Maven settings.xml files
- **Cross-Platform** - Native support for macOS, Windows, and Linux
- **Auto Update** - Built-in automatic update functionality
- **Multi-language** - English, Simplified Chinese, Traditional Chinese

## Installation

### Download

Download the latest release from [GitHub Releases](https://github.com/yjwu-leadstec/aem-env-manager/releases):

| Platform | File |
|----------|------|
| macOS | `.dmg` |
| Windows | `.msi` or `.exe` |
| Linux | `.deb` or `.AppImage` |

### First Launch

1. **Install the application** - Double-click the downloaded file and follow the installation prompts
2. **Run the Setup Wizard** - On first launch, a wizard guides you through:
   - Scanning for installed Java versions
   - Scanning for installed Node versions
   - Configuring AEM instances
   - Creating your first Profile
3. **Start using** - Switch profiles from the dashboard to instantly change your development environment

## Usage

### Creating a Profile

1. Go to **Profiles** page
2. Click **Add Profile**
3. Select Java version, Node version, and Maven settings
4. Add AEM instances (Author/Publish)
5. Save the profile

### Switching Environments

- Click on a profile card to activate it
- Or use the profile switcher in the header
- Environment variables (JAVA_HOME, PATH) are automatically updated

### Managing AEM Instances

- **Start/Stop** - Click the power button on any instance card
- **Open in Browser** - Quick access to CRXDE, Package Manager, System Console
- **Monitor Status** - Real-time status indicators show running/stopped/starting states

## Screenshots

![Dashboard](docs/screenshots/dashboard.png)

---

## Development

### Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS + Zustand
- **Desktop**: Tauri 2.0
- **Backend**: Rust
- **Routing**: React Router v6
- **i18n**: react-i18next

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) 1.70+
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

### Setup

```bash
# Clone the repository
git clone https://github.com/yjwu-leadstec/aem-env-manager.git
cd aem-env-manager

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

### Commands

```bash
npm run dev          # Frontend only (no Rust)
npm run tauri dev    # Full desktop app
npm run typecheck    # Type checking
npm run lint         # Linting
npm run format       # Code formatting
```

### Project Structure

```
aem-env-manager/
├── src/                    # Frontend source
│   ├── api/                # Tauri IPC bindings
│   ├── components/         # React components
│   ├── hooks/              # Custom hooks
│   ├── pages/              # Route pages
│   ├── store/              # Zustand state
│   └── i18n/               # Translations
├── src-tauri/              # Rust backend
│   └── src/
│       ├── commands/       # Tauri commands
│       └── platform/       # Platform-specific code
└── docs/                   # Documentation
```

## Configuration Files

The app stores data in platform-specific locations:

| Platform | Location |
|----------|----------|
| macOS | `~/Library/Application Support/com.aem-env-manager.app/` |
| Windows | `%APPDATA%\com.aem-env-manager.app\` |
| Linux | `~/.config/aem-env-manager/` |

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.
