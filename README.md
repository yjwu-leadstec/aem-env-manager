# AEM Environment Manager

> One-click development environment switching for AEM developers

A cross-platform desktop application built with Tauri 2.0, enabling AEM developers to seamlessly switch between different Java, Node, Maven, and AEM instance configurations through Profiles.

[中文文档](./README_zh-CN.md)

## Features

- **Profile Management** - Create and switch between different environment configurations with one click
- **Java Version Management** - Detect and switch Java versions via SDKMAN, jEnv, or manual installation
- **Node Version Management** - Support for nvm, fnm, Volta version managers
- **AEM Instance Control** - Start, stop, and monitor AEM instances with status indicators
- **Maven Configuration** - Manage multiple Maven settings.xml files
- **Cross-Platform** - Native support for macOS, Windows, and Linux
- **Auto Update** - Built-in automatic update functionality
- **Multi-language** - English, Simplified Chinese, Traditional Chinese support

## Screenshots

![Dashboard](docs/screenshots/dashboard.png)

## Tech Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS + Zustand
- **Desktop**: Tauri 2.0
- **Backend**: Rust
- **Routing**: React Router v6
- **i18n**: react-i18next

## Installation

### Download Pre-built Binaries

Download the latest release from [GitHub Releases](https://github.com/yjwu-leadstec/aem-env-manager/releases):

- **macOS**: `.dmg` file
- **Windows**: `.msi` or `.exe` installer
- **Linux**: `.deb` or `.AppImage`

### Build from Source

#### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) 1.70+
- [Tauri CLI](https://tauri.app/v1/guides/getting-started/prerequisites)

#### Steps

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

## Development

```bash
# Frontend development only (no Rust backend)
npm run dev

# Full desktop app development
npm run tauri dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
```

## Project Structure

```
aem-env-manager/
├── src/                    # Frontend source code
│   ├── api/                # Tauri IPC bindings
│   ├── components/         # React components
│   │   ├── common/         # Reusable components
│   │   ├── layout/         # Layout components
│   │   └── dashboard/      # Dashboard components
│   ├── hooks/              # Custom React hooks
│   ├── pages/              # Route pages
│   ├── store/              # Zustand state management
│   ├── types/              # TypeScript types
│   └── i18n/               # Internationalization
├── src-tauri/              # Rust backend
│   └── src/
│       ├── commands/       # Tauri command handlers
│       └── platform/       # Platform-specific implementations
├── docs/                   # Documentation
└── public/                 # Static assets
```

## Configuration

The application stores configuration files in platform-specific locations:

- **macOS**: `~/Library/Application Support/com.aem-env-manager.app/`
- **Windows**: `%APPDATA%\com.aem-env-manager.app\`
- **Linux**: `~/.config/aem-env-manager/`

## Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a pull request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Tauri](https://tauri.app/) - Build smaller, faster, and more secure desktop applications
- [React](https://reactjs.org/) - A JavaScript library for building user interfaces
- [Tailwind CSS](https://tailwindcss.com/) - A utility-first CSS framework
