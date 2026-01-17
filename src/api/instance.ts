// AEM Instance Management API
// Tauri IPC bindings for AEM instance lifecycle and management

import { invoke } from '@tauri-apps/api/core';

// ============================================
// Types
// ============================================

export type AemInstanceType = 'author' | 'publish' | 'dispatcher';

export type AemInstanceStatus =
  | 'running'
  | 'stopped'
  | 'starting'
  | 'stopping'
  | 'unknown'
  | 'error';

export interface AemInstance {
  id: string;
  name: string;
  instance_type: AemInstanceType;
  host: string;
  port: number;
  path: string;
  java_opts: string | null;
  run_modes: string[];
  status: AemInstanceStatus;
  profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface HealthCheckResult {
  is_healthy: boolean;
  response_time_ms: number | null;
  status_code: number | null;
  bundle_status: BundleStatus | null;
  memory_status: MemoryStatus | null;
  error: string | null;
  checked_at: string;
}

export interface BundleStatus {
  total: number;
  active: number;
  resolved: number;
  installed: number;
}

export interface MemoryStatus {
  heap_used_mb: number;
  heap_max_mb: number;
  heap_usage_percent: number;
}

// ============================================
// Instance CRUD Operations
// ============================================

/**
 * List all AEM instances
 */
export async function listInstances(): Promise<AemInstance[]> {
  return invoke<AemInstance[]>('list_instances');
}

/**
 * Get a specific AEM instance by ID
 * @param id - Instance ID
 */
export async function getInstance(id: string): Promise<AemInstance | null> {
  return invoke<AemInstance | null>('get_instance', { id });
}

/**
 * Add a new AEM instance
 * @param instance - Instance configuration
 */
export async function addInstance(instance: Partial<AemInstance>): Promise<AemInstance> {
  return invoke<AemInstance>('add_instance', { instance });
}

/**
 * Update an existing AEM instance
 * @param id - Instance ID
 * @param instance - Updated instance configuration
 */
export async function updateInstance(
  id: string,
  instance: Partial<AemInstance>
): Promise<AemInstance> {
  return invoke<AemInstance>('update_instance', { id, instance });
}

/**
 * Delete an AEM instance
 * @param id - Instance ID
 */
export async function deleteInstance(id: string): Promise<boolean> {
  return invoke<boolean>('delete_instance', { id });
}

// ============================================
// Instance Lifecycle Management
// ============================================

/**
 * Start an AEM instance
 * @param id - Instance ID
 */
export async function startInstance(id: string): Promise<boolean> {
  return invoke<boolean>('start_instance', { id });
}

/**
 * Stop an AEM instance
 * @param id - Instance ID
 */
export async function stopInstance(id: string): Promise<boolean> {
  return invoke<boolean>('stop_instance', { id });
}

/**
 * Check the health status of an AEM instance
 * @param id - Instance ID
 */
export async function checkInstanceHealth(id: string): Promise<HealthCheckResult> {
  return invoke<HealthCheckResult>('check_instance_health', { id });
}

// ============================================
// Credential Management
// ============================================

/**
 * Store credentials for an AEM instance
 * @param instanceId - Instance ID
 * @param username - Username
 * @param password - Password
 */
export async function storeCredentials(
  instanceId: string,
  username: string,
  password: string
): Promise<void> {
  return invoke<void>('store_credentials', { instanceId, username, password });
}

/**
 * Get stored credentials for an AEM instance
 * @param instanceId - Instance ID
 * @returns Tuple of [username, password] or null if not found
 */
export async function getCredentials(instanceId: string): Promise<[string, string] | null> {
  return invoke<[string, string] | null>('get_credentials', { instanceId });
}

// ============================================
// Browser Integration
// ============================================

/**
 * Open an AEM instance in the default browser
 * @param id - Instance ID
 * @param path - Optional path to append to the base URL
 */
export async function openInBrowser(id: string, path?: string): Promise<boolean> {
  return invoke<boolean>('open_in_browser', { id, path: path ?? null });
}

/**
 * Get common AEM URLs for an instance
 * @param id - Instance ID
 * @returns Map of URL names to URLs
 */
export async function getInstanceUrls(id: string): Promise<Record<string, string>> {
  return invoke<Record<string, string>>('get_instance_urls', { id });
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Get instances filtered by type
 * @param type - Instance type to filter by
 */
export async function getInstancesByType(type: AemInstanceType): Promise<AemInstance[]> {
  const instances = await listInstances();
  return instances.filter((i) => i.instance_type === type);
}

/**
 * Get running instances only
 */
export async function getRunningInstances(): Promise<AemInstance[]> {
  const instances = await listInstances();
  return instances.filter((i) => i.status === 'running');
}

/**
 * Get instances for a specific profile
 * @param profileId - Profile ID
 */
export async function getInstancesByProfile(profileId: string): Promise<AemInstance[]> {
  const instances = await listInstances();
  return instances.filter((i) => i.profile_id === profileId);
}

/**
 * Check health of all instances and return summary
 */
export interface HealthSummary {
  total: number;
  healthy: number;
  unhealthy: number;
  unknown: number;
  results: Map<string, HealthCheckResult>;
}

export async function checkAllInstancesHealth(): Promise<HealthSummary> {
  const instances = await listInstances();
  const results = new Map<string, HealthCheckResult>();
  let healthy = 0;
  let unhealthy = 0;
  let unknown = 0;

  await Promise.all(
    instances.map(async (instance) => {
      try {
        const health = await checkInstanceHealth(instance.id);
        results.set(instance.id, health);
        if (health.is_healthy) {
          healthy++;
        } else {
          unhealthy++;
        }
      } catch {
        unknown++;
        results.set(instance.id, {
          is_healthy: false,
          response_time_ms: null,
          status_code: null,
          bundle_status: null,
          memory_status: null,
          error: 'Failed to check health',
          checked_at: new Date().toISOString(),
        });
      }
    })
  );

  return {
    total: instances.length,
    healthy,
    unhealthy,
    unknown,
    results,
  };
}
