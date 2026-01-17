// API exports
// Centralized exports for all Tauri IPC bindings

export * from './version';
export * from './instance';
export * from './profile';

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

export type {
  AemInstance,
  AemInstanceType,
  AemInstanceStatus,
  HealthCheckResult,
  BundleStatus,
  MemoryStatus,
  HealthSummary,
} from './instance';

export type {
  EnvironmentProfile,
  ProfileSwitchResult,
  ProfileValidationResult,
  AppConfig,
  ProfileWithValidation,
  ProfileSummary,
} from './profile';
