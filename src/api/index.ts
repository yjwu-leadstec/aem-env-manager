// API exports
// Centralized exports for all Tauri IPC bindings

export * from './version';
export * from './instance';
export * from './profile';
export * from './mappers';

// Re-export API types (snake_case - direct from Rust backend)
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

// Re-export Frontend types (camelCase - for React components)
export type {
  FrontendInstance,
  FrontendProfile,
  FrontendHealthCheck,
  FrontendAppConfig,
} from './mappers';
