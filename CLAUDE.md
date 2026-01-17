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

**The official UI design to implement is:**
`docs/ui-design-themes/aem-env-manager-ui-themes/aem-env-manager-ui-cloud.html`

This is a fully interactive HTML prototype with the following design specifications:

#### Color System
```css
/* Primary Azure */
'azure': '#0EA5E9'
'azure-light': '#38BDF8'
'azure-dark': '#0284C7'
'azure-50': '#F0F9FF'

/* Secondary Slate */
'slate': '#64748B'
'slate-light': '#94A3B8'
'slate-dark': '#475569'
'slate-900': '#0F172A'

/* Accents */
'teal': '#14B8A6'
'teal-light': '#2DD4BF'
'teal-50': '#F0FDFA'
'folder': '#FCD34D'
'folder-dark': '#F59E0B'

/* Sky gradients */
'sky-start': '#E0F2FE'
'sky-end': '#DBEAFE'

/* Semantic */
'success': '#22C55E'
'warning': '#F59E0B'
'error': '#EF4444'
```

#### Design Characteristics
- **Background**: Sky gradient (`linear-gradient(180deg, #E0F2FE 0%, #DBEAFE 50%, #EFF6FF 100%)`)
- **Panels**: White with soft shadows, rounded corners (16px for main, 12px for soft, 10px for flat)
- **Navigation**: Left sidebar with 264px width, frosted glass effect (`backdrop-blur-xl`)
- **Active nav**: White background with azure left border gradient
- **Buttons**:
  - Primary: Azure gradient with glow shadow on hover
  - Teal: Teal gradient for secondary actions
  - Soft: Light azure background
  - Outline: White with border
  - Ghost: Transparent with hover background
- **Badges**: Gradient backgrounds (success, warning, error, azure, teal, slate)
- **Status indicators**: Pulse animation for running status

#### Key UI Components from Design
1. **Dashboard**: 4-column status cards + AEM instances grid + Quick actions
2. **Profiles Page**: Profile cards with environment badges
3. **AEM Instances**: Detailed instance cards with status, version info, quick links
4. **Java/Node/Maven Pages**: Version list with current highlight
5. **Licenses Page**: License cards with expiry status
6. **Settings Page**: Grouped settings panels with toggles

#### Shadow System
```css
'soft': '0 2px 8px -2px rgba(0, 0, 0, 0.08), 0 4px 16px -4px rgba(0, 0, 0, 0.06)'
'panel': '0 4px 20px -4px rgba(0, 0, 0, 0.1), 0 8px 32px -8px rgba(0, 0, 0, 0.08)'
'elevated': '0 8px 30px -6px rgba(0, 0, 0, 0.12), 0 16px 48px -12px rgba(0, 0, 0, 0.1)'
'glow-azure': '0 4px 14px -2px rgba(14, 165, 233, 0.25)'
'glow-teal': '0 4px 14px -2px rgba(20, 184, 166, 0.25)'
```

### Other Available Themes (for reference)
- `aem-env-manager-ui-dark.html` - Dark mode version
- `aem-env-manager-ui-material.html` - Material Design
- `aem-env-manager-ui-fluent.html` - Microsoft Fluent
- And 15+ other creative themes
