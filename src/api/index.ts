// API exports
// Centralized exports for all Tauri IPC bindings

export * from './version';

// Re-export types for convenience
export type {
  VersionManager,
  VersionManagerType,
  JavaVersion,
  NodeVersion,
  InstalledVersion,
  VersionSwitchResult,
  MavenConfig,
  VersionInfo,
} from './version';
