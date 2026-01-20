// API exports
// Centralized exports for all Tauri IPC bindings

export * from './version';
export * from './instance';
export * from './profile';
export * from './mappers';
export * from './settings';
export * from './environment';
export * from './update';

// Re-export API types (snake_case - direct from Rust backend)
export type {
  VersionManager,
  VersionManagerType,
  JavaVersion,
  NodeVersion,
  InstalledVersion,
  VersionSwitchResult,
  MavenConfig,
  MavenSettingsFile,
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
  ScannedAemInstance,
} from './instance';

export type {
  EnvironmentProfile,
  ProfileSwitchResult,
  ProfileValidationResult,
  AppConfig,
  ProfileWithValidation,
  ProfileSummary,
} from './profile';

export type { ScanPaths, ExportResult, ImportResult, ResetResult } from './settings';

export type { EnvironmentStatus, InitResult, SymlinkResult } from './environment';

export type { UpdateInfo, CheckUpdateResult, DownloadProgressCallback } from './update';

// Re-export Frontend types (camelCase - for React components)
export type {
  FrontendInstance,
  FrontendProfile,
  FrontendHealthCheck,
  FrontendAppConfig,
} from './mappers';
