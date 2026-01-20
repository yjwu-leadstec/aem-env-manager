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
  | 'error'
  | 'port_conflict';

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
  instance_id: string;
  timestamp: string;
  status: AemInstanceStatus;
  response_time: number | null;
  bundle_status: BundleStatus | null;
  memory_status: MemoryStatus | null;
  aem_version: string | null;
  oak_version: string | null;
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

/**
 * Result from scanning filesystem for AEM instances
 */
export interface ScannedAemInstance {
  name: string;
  path: string;
  instance_type: AemInstanceType;
  port: number;
  jar_path: string | null;
  /** Path to license.properties file if found in the same directory */
  license_file_path: string | null;
}

// ============================================
// Instance Discovery/Scanning
// ============================================

/**
 * Scan filesystem for AEM instances based on common naming patterns
 * Supports patterns like:
 * - aem-author-p{port} (e.g., aem-author-p4502)
 * - aem-publish-p{port} (e.g., aem-publish-p4503)
 * - aem-sdk-quickstart-* (e.g., aem-sdk-quickstart-2024.8.xxx)
 * @param customPaths - Optional custom paths to scan in addition to defaults
 */
export async function scanAemInstances(customPaths?: string[]): Promise<ScannedAemInstance[]> {
  return invoke<ScannedAemInstance[]>('scan_aem_instances', { customPaths: customPaths ?? null });
}

/**
 * Scan a specific directory for AEM JAR files
 * Looks for JAR files matching AEM patterns:
 * - aem-author-p{port}.jar
 * - aem-publish-p{port}.jar
 * - aem-sdk-quickstart-*.jar
 * - cq-quickstart-*.jar
 * @param directory - Directory path to scan
 * @returns Array of found AEM instances with JAR info
 */
export async function scanDirectoryForJars(directory: string): Promise<ScannedAemInstance[]> {
  return invoke<ScannedAemInstance[]>('scan_directory_for_jars', { directory });
}

/**
 * Parse a specific JAR file to extract AEM instance information
 * @param jarPath - Full path to the JAR file
 * @returns Parsed AEM instance info or null if not a valid AEM JAR
 */
export async function parseJarFile(jarPath: string): Promise<ScannedAemInstance | null> {
  return invoke<ScannedAemInstance | null>('parse_jar_file', { jarPath });
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
// Fast Status Detection (No Auth Required)
// ============================================

/**
 * Result of fast instance status detection
 */
export interface InstanceStatusResult {
  /** Instance ID */
  instance_id: string;
  /** Detected status */
  status: AemInstanceStatus;
  /** Detection timestamp (ISO 8601) */
  checked_at: string;
  /** Detection duration in milliseconds */
  duration_ms: number;
  /** Process ID occupying the port (if any) */
  process_id: number | null;
  /** Process name (if not a Java process) */
  process_name: string | null;
  /** Error message (if detection failed) */
  error: string | null;
}

/**
 * Detect the status of a single AEM instance using hybrid detection.
 * Uses a 3-layer approach:
 * 1. TCP port check (fast, < 500ms)
 * 2. Process type verification (confirms Java process)
 * 3. HTTP response check (distinguishes starting vs running)
 *
 * This method does NOT require AEM credentials.
 * @param id - Instance ID
 */
export async function detectInstanceStatus(id: string): Promise<InstanceStatusResult> {
  return invoke<InstanceStatusResult>('detect_instance_status', { id });
}

/**
 * Detect status of all configured AEM instances.
 * Executes detection in parallel for efficiency.
 *
 * This method does NOT require AEM credentials.
 */
export async function detectAllInstancesStatus(): Promise<InstanceStatusResult[]> {
  return invoke<InstanceStatusResult[]>('detect_all_instances_status');
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
        if (health.status === 'running') {
          healthy++;
        } else {
          unhealthy++;
        }
      } catch {
        unknown++;
        results.set(instance.id, {
          instance_id: instance.id,
          timestamp: new Date().toISOString(),
          status: 'error' as AemInstanceStatus,
          response_time: null,
          bundle_status: null,
          memory_status: null,
          aem_version: null,
          oak_version: null,
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
