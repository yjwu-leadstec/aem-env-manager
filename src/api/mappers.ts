// Type mappers for converting between API (snake_case) and frontend (camelCase) types
// This provides a clean boundary between Rust backend and React frontend

import type { AemInstance, AemInstanceStatus, HealthCheckResult } from './instance';
import type { EnvironmentProfile, ProfileSwitchResult, AppConfig } from './profile';
import type { VersionManager, JavaVersion, NodeVersion, MavenConfig } from './version';

// ============================================
// Frontend Types (camelCase for React components)
// ============================================

export interface FrontendInstance {
  id: string;
  name: string;
  instanceType: 'author' | 'publish' | 'dispatcher';
  host: string;
  port: number;
  path: string;
  javaOpts: string | null;
  runModes: string[];
  status: AemInstanceStatus;
  profileId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FrontendProfile {
  id: string;
  name: string;
  description: string | null;
  javaVersion: string | null;
  javaManagerId: string | null;
  nodeVersion: string | null;
  nodeManagerId: string | null;
  mavenConfigId: string | null;
  envVars: Record<string, string>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FrontendHealthCheck {
  isHealthy: boolean;
  responseTimeMs: number | null;
  statusCode: number | null;
  bundleStatus: {
    total: number;
    active: number;
    resolved: number;
    installed: number;
  } | null;
  memoryStatus: {
    heapUsedMb: number;
    heapMaxMb: number;
    heapUsagePercent: number;
  } | null;
  error: string | null;
  checkedAt: string;
}

export interface FrontendAppConfig {
  theme: 'light' | 'dark' | 'system';
  autoStartInstances: boolean;
  healthCheckIntervalSecs: number;
  defaultProfileId: string | null;
  showNotifications: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

// ============================================
// Instance Mappers
// ============================================

export function mapApiInstanceToFrontend(api: AemInstance): FrontendInstance {
  return {
    id: api.id,
    name: api.name,
    instanceType: api.instance_type,
    host: api.host,
    port: api.port,
    path: api.path,
    javaOpts: api.java_opts,
    runModes: api.run_modes,
    status: api.status,
    profileId: api.profile_id,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapFrontendInstanceToApi(
  frontend: Partial<FrontendInstance>
): Partial<AemInstance> {
  const result: Partial<AemInstance> = {};

  if (frontend.id !== undefined) result.id = frontend.id;
  if (frontend.name !== undefined) result.name = frontend.name;
  if (frontend.instanceType !== undefined) result.instance_type = frontend.instanceType;
  if (frontend.host !== undefined) result.host = frontend.host;
  if (frontend.port !== undefined) result.port = frontend.port;
  if (frontend.path !== undefined) result.path = frontend.path;
  if (frontend.javaOpts !== undefined) result.java_opts = frontend.javaOpts;
  if (frontend.runModes !== undefined) result.run_modes = frontend.runModes;
  if (frontend.status !== undefined) result.status = frontend.status;
  if (frontend.profileId !== undefined) result.profile_id = frontend.profileId;

  return result;
}

export function mapApiHealthCheckToFrontend(api: HealthCheckResult): FrontendHealthCheck {
  return {
    isHealthy: api.is_healthy,
    responseTimeMs: api.response_time_ms,
    statusCode: api.status_code,
    bundleStatus: api.bundle_status
      ? {
          total: api.bundle_status.total,
          active: api.bundle_status.active,
          resolved: api.bundle_status.resolved,
          installed: api.bundle_status.installed,
        }
      : null,
    memoryStatus: api.memory_status
      ? {
          heapUsedMb: api.memory_status.heap_used_mb,
          heapMaxMb: api.memory_status.heap_max_mb,
          heapUsagePercent: api.memory_status.heap_usage_percent,
        }
      : null,
    error: api.error,
    checkedAt: api.checked_at,
  };
}

// ============================================
// Profile Mappers
// ============================================

export function mapApiProfileToFrontend(api: EnvironmentProfile): FrontendProfile {
  return {
    id: api.id,
    name: api.name,
    description: api.description,
    javaVersion: api.java_version,
    javaManagerId: api.java_manager_id,
    nodeVersion: api.node_version,
    nodeManagerId: api.node_manager_id,
    mavenConfigId: api.maven_config_id,
    envVars: api.env_vars,
    isActive: api.is_active,
    createdAt: api.created_at,
    updatedAt: api.updated_at,
  };
}

export function mapFrontendProfileToApi(
  frontend: Partial<FrontendProfile>
): Partial<EnvironmentProfile> {
  const result: Partial<EnvironmentProfile> = {};

  if (frontend.id !== undefined) result.id = frontend.id;
  if (frontend.name !== undefined) result.name = frontend.name;
  if (frontend.description !== undefined) result.description = frontend.description;
  if (frontend.javaVersion !== undefined) result.java_version = frontend.javaVersion;
  if (frontend.javaManagerId !== undefined) result.java_manager_id = frontend.javaManagerId;
  if (frontend.nodeVersion !== undefined) result.node_version = frontend.nodeVersion;
  if (frontend.nodeManagerId !== undefined) result.node_manager_id = frontend.nodeManagerId;
  if (frontend.mavenConfigId !== undefined) result.maven_config_id = frontend.mavenConfigId;
  if (frontend.envVars !== undefined) result.env_vars = frontend.envVars;
  if (frontend.isActive !== undefined) result.is_active = frontend.isActive;

  return result;
}

// ============================================
// Config Mappers
// ============================================

export function mapApiConfigToFrontend(api: AppConfig): FrontendAppConfig {
  return {
    theme: api.theme as FrontendAppConfig['theme'],
    autoStartInstances: api.auto_start_instances,
    healthCheckIntervalSecs: api.health_check_interval_secs,
    defaultProfileId: api.default_profile_id,
    showNotifications: api.show_notifications,
    logLevel: api.log_level as FrontendAppConfig['logLevel'],
  };
}

export function mapFrontendConfigToApi(frontend: Partial<FrontendAppConfig>): Partial<AppConfig> {
  const result: Partial<AppConfig> = {};

  if (frontend.theme !== undefined) result.theme = frontend.theme;
  if (frontend.autoStartInstances !== undefined)
    result.auto_start_instances = frontend.autoStartInstances;
  if (frontend.healthCheckIntervalSecs !== undefined)
    result.health_check_interval_secs = frontend.healthCheckIntervalSecs;
  if (frontend.defaultProfileId !== undefined)
    result.default_profile_id = frontend.defaultProfileId;
  if (frontend.showNotifications !== undefined)
    result.show_notifications = frontend.showNotifications;
  if (frontend.logLevel !== undefined) result.log_level = frontend.logLevel;

  return result;
}

// Re-export API types that don't need mapping
export type {
  AemInstanceStatus,
  VersionManager,
  JavaVersion,
  NodeVersion,
  MavenConfig,
  ProfileSwitchResult,
};
