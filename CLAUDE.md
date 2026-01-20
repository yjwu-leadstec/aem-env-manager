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
│   ├── version.ts    # Version manager API
│   ├── license.ts    # AEM license management API
│   └── maven.ts      # Maven configuration API
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
│   ├── profile.rs    # Profile CRUD, switching, import/export
│   ├── version.rs    # Java/Node/Maven version management
│   ├── instance.rs   # AEM instance lifecycle (start/stop/health)
│   ├── settings.rs   # Scan paths, config export/import/reset
│   ├── license.rs    # AEM license file management
│   └── maven.rs      # Maven settings.xml management
├── platform/         # Cross-platform adapters
│   ├── macos.rs      # macOS-specific (#[cfg(target_os = "macos")])
│   ├── windows.rs    # Windows-specific
│   └── common.rs     # Shared platform utilities
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

### Cross-Component State Updates

For state that needs to sync between page-level and panel components, use callback props:
```typescript
// Page level
const [count, setCount] = useState(0);
const loadCount = useCallback(async () => {
  const stats = await api.getStatistics();
  setCount(stats.total);
}, []);

// Pass callback to panel
<Panel onDataChange={loadCount} />

// Panel calls callback after mutations
const handleImport = async () => {
  await api.importData(data);
  onDataChange?.();  // Notify parent to refresh
};
```

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
- **AEM License**: License file associated with an AEM instance, stored in same directory as JAR

### AEM Instance Path Handling

**IMPORTANT**: `AemInstance.path` stores the **JAR file path**, not the directory path:
```typescript
// instance.path = "/path/to/author/aem-author-p4502.jar"

// To get the directory (e.g., for scanning license files):
const parentDir = instance.path.replace(/[/\\][^/\\]+$/, '');
// parentDir = "/path/to/author"
```

This is relevant when:
- Scanning for license files in the instance directory
- Looking for configuration files alongside the JAR
- Any file operations relative to the AEM instance location

## Constants & Configuration

Centralized constants in `src/constants/index.ts`:
- `INSTANCE_DEFAULTS`: Default ports (4502/4503), host, run modes
- `TIMING`: Delays and intervals (status refresh, notifications, health check)
- `UI`: Layout constants (sidebar width, max recent profiles)
- `AEM_QUICK_LINKS`: Standard AEM admin URLs
- `VALIDATION`: Port ranges, name length limits

## First-Time User Flow

The app uses a setup wizard for first-time users:
- `RequireSetup` component in `src/components/common/` guards main routes
- Checks `preferences.wizardCompleted` flag in Zustand store
- Redirects to `/wizard` if not completed
- WizardPage (`src/pages/WizardPage.tsx`) has 7 steps: init → scan → java → node → maven → aem → complete
- On completion, sets `wizardCompleted: true` and navigates to dashboard

To test first-time experience: `localStorage.removeItem('aem-env-manager-storage')`

## Internationalization (i18n)

The app supports multiple languages via react-i18next:
- **Locales**: `src/i18n/locales/` (zh-CN, zh-TW, en)
- **Fallback**: zh-CN
- **Storage**: localStorage key `aem-env-manager-language`

Usage in components:
```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
// t('key.nested.path')
```

### i18n Interpolation Syntax

**IMPORTANT**: react-i18next uses **double curly braces** for variable interpolation:
```json
// ✅ Correct
"message": "Found {{count}} items"

// ❌ Wrong - will show literal {count}
"message": "Found {count} items"
```

With count for pluralization:
```typescript
t('items.found', { count: 5 })  // "Found 5 items"
```

## Theming

Dark mode is supported via Tailwind's `darkMode: 'class'`:
- Theme state stored in Zustand: `config.theme` ('light' | 'dark' | 'system')
- CSS variables defined in `src/index.css` for theme-aware colors
- Use `dark:` prefix for dark mode styles: `bg-white dark:bg-slate-800`

## Design Documentation

### Design Reference Files

All design documentation is located in the `docs/` folder:

```
docs/
├── AEM-Environment-Manager-PRD.md          # Product Requirements Document
├── AEM-Environment-Manager-Design.md       # Technical Design Document
├── IMPLEMENTATION_PLAN.md                  # Implementation phases
├── QUICK_START_BRIEF.md                    # Quick start guide
├── PRD/                                    # PRD versions
├── design/                                 # Design documents
└── ui-design-themes/                       # UI Design Prototypes
    └── aem-env-manager-ui-themes/          # All theme variations
```

### 🎯 Target UI Design: Cloud Theme

**Reference design:** `docs/ui-design-themes/aem-env-manager-ui-themes/aem-env-manager-ui-cloud.html`

Key design principles:
- **Colors**: Azure (#0EA5E9) primary, Teal (#14B8A6) secondary, Slate for text
- **Background**: Sky gradient (E0F2FE → DBEAFE → EFF6FF)
- **Panels**: White with soft shadows, rounded corners (16px main, 12px soft)
- **Navigation**: 264px sidebar with frosted glass effect
- **Buttons**: Gradient backgrounds with glow shadows on hover

All color values and shadow definitions are in `tailwind.config.js`.
