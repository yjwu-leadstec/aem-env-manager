// Core Type Definitions for AEM Environment Manager

// ============================================
// Environment Profile Types
// ============================================

export interface EnvironmentProfile {
  id: string;
  name: string;
  description?: string;
  javaVersion: string;
  javaVendor: JavaVendor;
  nodeVersion: string;
  mavenVersion?: string;
  aemInstance?: AEMInstanceRef;
  envVars?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  isActive: boolean;
}

export type JavaVendor =
  | 'oracle'
  | 'openjdk'
  | 'adoptium'
  | 'corretto'
  | 'zulu'
  | 'graalvm';

export interface AEMInstanceRef {
  instanceId: string;
  name: string;
}

// ============================================
// Version Manager Types
// ============================================

export interface VersionManager {
  id: string;
  name: string;
  type: VersionManagerType;
  isInstalled: boolean;
  isActive: boolean;
  path?: string;
  versions: InstalledVersion[];
}

export type VersionManagerType =
  | 'sdkman'
  | 'jenv'
  | 'jabba'
  | 'nvm'
  | 'fnm'
  | 'volta';

export interface InstalledVersion {
  version: string;
  path: string;
  isDefault: boolean;
  vendor?: string;
}

export interface VersionSwitchResult {
  success: boolean;
  previousVersion?: string;
  currentVersion: string;
  message?: string;
  error?: string;
}

// ============================================
// AEM Instance Types
// ============================================

export interface AEMInstance {
  id: string;
  name: string;
  type: AEMInstanceType;
  host: string;
  port: number;
  runMode: AEMRunMode;
  status: AEMInstanceStatus;
  javaVersion?: string;
  aemVersion?: string;
  path?: string;
  credentials?: AEMCredentials;
  lastHealthCheck?: string;
  startupTime?: number;
}

export type AEMInstanceType = 'author' | 'publish' | 'dispatcher';

export type AEMRunMode = 'local' | 'dev' | 'stage' | 'prod';

export type AEMInstanceStatus =
  | 'running'
  | 'stopped'
  | 'starting'
  | 'stopping'
  | 'error'
  | 'unknown';

export interface AEMCredentials {
  username: string;
  passwordKey: string; // Reference to keyring storage
}

export interface AEMHealthCheck {
  instanceId: string;
  timestamp: string;
  status: AEMInstanceStatus;
  responseTime?: number;
  bundles?: BundleStatus;
  memory?: MemoryStatus;
}

export interface BundleStatus {
  total: number;
  active: number;
  resolved: number;
  installed: number;
}

export interface MemoryStatus {
  heapUsed: number;
  heapMax: number;
  heapPercentage: number;
}

// ============================================
// Application State Types
// ============================================

export interface AppState {
  activeProfile: EnvironmentProfile | null;
  profiles: EnvironmentProfile[];
  versionManagers: VersionManager[];
  aemInstances: AEMInstance[];
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

export type ViewType =
  | 'dashboard'
  | 'profiles'
  | 'versions'
  | 'instances'
  | 'settings';

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
// API Response Types
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// ============================================
// Configuration Types
// ============================================

export interface AppConfig {
  theme: 'light' | 'dark' | 'system';
  autoSwitchProfile: boolean;
  healthCheckInterval: number;
  startMinimized: boolean;
  showNotifications: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface UserPreferences {
  recentProfiles: string[];
  favoriteInstances: string[];
  defaultView: ViewType;
  sidebarCollapsed: boolean;
}
