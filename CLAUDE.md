# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

<!-- OPENSPEC:START -->
## OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.
<!-- OPENSPEC:END -->

## Project Overview

AEM Environment Manager is a Tauri 2.0 desktop application for AEM developers to manage development environments. It enables one-click switching between different Java, Node, Maven, and AEM instance configurations via Profiles.

## Development Commands

```bash
# Frontend development (web UI only, no Rust backend)
npm run dev

# Full desktop app development (requires Rust)
npm run tauri dev

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:check

# Production build
npm run build              # Frontend only
npm run tauri build        # Full desktop app
```

## Architecture

### Stack
- **Frontend**: React 19 + TypeScript + Tailwind CSS + Zustand
- **Desktop**: Tauri 2.0
- **Backend**: Rust (Tauri commands)
- **Routing**: react-router-dom v6

### Frontend Architecture

```
src/
├── api/              # Tauri IPC bindings (invoke calls to Rust)
│   ├── mappers.ts    # Type mappers: API (snake_case) ↔ Frontend (camelCase)
│   ├── instance.ts   # AEM instance API
│   ├── profile.ts    # Profile management API
│   └── version.ts    # Version manager API
├── store/            # Zustand state management
│   └── appStore.ts   # Central app store with persistence
├── hooks/            # React hooks wrapping API + store
├── components/       # UI components
│   ├── common/       # Reusable (Button, Card, ErrorBoundary)
│   ├── layout/       # MainLayout, Sidebar, Header
│   └── dashboard/    # Dashboard-specific components
├── pages/            # Route page components
├── types/            # TypeScript types (re-exports from api/)
└── router/           # React Router configuration
```

### Type System

Two type conventions exist for API boundary:
- **API types** (snake_case): Match Rust backend, used in `src/api/*.ts`
- **Frontend types** (camelCase): Used in React components

Use mappers from `src/api/mappers.ts`:
```typescript
import { mapApiProfileToFrontend, mapFrontendProfileToApi } from '@/api/mappers';
```

### Rust Backend

```
src-tauri/src/
├── commands/         # Tauri command handlers
│   ├── config.rs     # Config file operations
│   ├── java.rs       # Java version management
│   ├── node.rs       # Node version management
│   ├── maven.rs      # Maven configuration
│   └── aem.rs        # AEM instance management
├── platform/         # Cross-platform adapters
│   ├── macos.rs      # macOS-specific (#[cfg(target_os = "macos")])
│   └── windows.rs    # Windows-specific
└── lib.rs            # Module exports and Tauri setup
```

### Data Flow

```
React Component
    ↓ (calls hook)
Custom Hook (useProfiles, useInstances)
    ↓ (calls API function)
API Layer (src/api/*.ts)
    ↓ (invoke())
Tauri IPC
    ↓
Rust Command Handler
    ↓
Platform-specific Implementation
```

## Key Patterns

### Adding a new Tauri command

1. Define Rust command in `src-tauri/src/commands/`
2. Register in `src-tauri/src/lib.rs`
3. Add TypeScript wrapper in `src/api/`
4. Add types to `src/api/mappers.ts` if needed
5. Create/update hook in `src/hooks/`

### State Management

- Global state in `src/store/appStore.ts` (Zustand with persistence)
- Use selectors: `useProfiles()`, `useActiveProfile()`, `useAemInstances()`
- Actions available via `useAppStore((s) => s.actionName)`

### Path Aliases

`@/` maps to `src/` (configured in vite.config.ts and tsconfig.json)

```typescript
import { Button } from '@/components/common';
import { useProfiles } from '@/store';
```

## Domain Concepts

- **Profile**: A saved configuration combining Java version, Node version, Maven settings, and AEM instances
- **AEM Instance**: Author or Publish instance with host, port, and status
- **Version Manager**: Tools like SDKMAN, nvm, fnm that manage runtime versions
