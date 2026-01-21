// Type Definitions for AEM Environment Manager
// This file re-exports types from the API layer and provides frontend-friendly aliases

import type { FrontendProfile, FrontendInstance } from '../api/mappers';
import type { VersionManager as ApiVersionManager } from '../api';

// Re-export frontend types from API mappers
export type {
  FrontendInstance as AEMInstance,
  FrontendProfile as EnvironmentProfile,
  FrontendHealthCheck as AEMHealthCheck,
  FrontendAppConfig as AppConfig,
} from '../api/mappers';

// Re-export API types directly where they match frontend needs
export type {
  AemInstanceStatus as AEMInstanceStatus,
  AemInstanceType as AEMInstanceType,
  VersionManager,
  VersionManagerType,
  InstalledVersion,
  VersionSwitchResult,
  BundleStatus,
  MemoryStatus,
} from '../api';

// Re-export mappers for use in components
export {
  mapApiInstanceToFrontend,
  mapFrontendInstanceToApi,
  mapApiProfileToFrontend,
  mapFrontendProfileToApi,
  mapApiHealthCheckToFrontend,
  mapApiConfigToFrontend,
  mapFrontendConfigToApi,
} from '../api/mappers';

// ============================================
// UI-Only Types (not from API)
// ============================================

export type AEMRunMode = 'local' | 'dev' | 'stage' | 'prod';

export type JavaVendor = 'oracle' | 'openjdk' | 'adoptium' | 'corretto' | 'zulu' | 'graalvm';

export interface AEMInstanceRef {
  instanceId: string;
  name: string;
}

// ============================================
// Application State Types
// ============================================

export interface AppState {
  activeProfile: FrontendProfile | null;
  profiles: FrontendProfile[];
  versionManagers: ApiVersionManager[];
  aemInstances: FrontendInstance[];
  isLoading: boolean;
  error: string | null;
}

export interface DashboardStats {
  totalProfiles: number;
  activeProfile: string | null;
  runningInstances: number;
  totalInstances: number;
  javaVersion: string | null;
  nodeVersion: string | null;
}

// ============================================
// UI State Types
// ============================================

export type ViewType = 'dashboard' | 'profiles' | 'versions' | 'instances' | 'settings';

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
  timestamp: string;
}

export interface ModalState {
  isOpen: boolean;
  type: 'profile' | 'instance' | 'confirm' | null;
  data?: unknown;
}

// ============================================
// User Preferences Types
// ============================================

export interface UserPreferences {
  recentProfiles: string[];
  favoriteInstances: string[];
  defaultView: ViewType;
  sidebarCollapsed: boolean;
  wizardCompleted: boolean;
}

// ============================================
// Convenience Type Aliases
// ============================================

// API types (snake_case) for direct backend communication
export type {
  AemInstance,
  EnvironmentProfile as ApiEnvironmentProfile,
  HealthCheckResult,
} from '../api';
