// Version Management API
// Tauri IPC bindings for Java, Node, and Maven version management

import { invoke } from '@tauri-apps/api/core';

// ============================================
// Types
// ============================================

export type VersionManagerType =
  | 'sdkman'
  | 'jenv'
  | 'jabba'
  | 'nvm'
  | 'fnm'
  | 'volta'
  | 'nvmwindows'
  | 'manual';

export interface VersionManager {
  id: string;
  name: string;
  manager_type: VersionManagerType;
  is_installed: boolean;
  is_active: boolean;
  path: string | null;
}

export interface JavaVersion {
  version: string;
  vendor: string;
  path: string;
  is_default: boolean;
  is_current: boolean;
  full_version: string | null;
}

export interface NodeVersion {
  version: string;
  path: string;
  is_default: boolean;
  is_current: boolean;
}

export interface InstalledVersion {
  version: string;
  path: string;
  is_default: boolean;
  vendor: string | null;
}

export interface VersionSwitchResult {
  success: boolean;
  previous_version: string | null;
  current_version: string;
  message: string | null;
  error: string | null;
}

export interface MavenConfig {
  id: string;
  name: string;
  path: string;
  is_active: boolean;
  description: string | null;
}

// ============================================
// Java Version API
// ============================================

/**
 * Scan system for installed Java versions
 */
export async function scanJavaVersions(): Promise<JavaVersion[]> {
  return invoke<JavaVersion[]>('scan_java_versions');
}

/**
 * Get current active Java version
 */
export async function getCurrentJavaVersion(): Promise<string | null> {
  return invoke<string | null>('get_current_java_version');
}

/**
 * Switch to a specific Java version
 * @param version - Version string (e.g., "17", "11.0.16")
 * @param managerId - Optional version manager to use
 */
export async function switchJavaVersion(
  version: string,
  managerId?: string
): Promise<VersionSwitchResult> {
  return invoke<VersionSwitchResult>('switch_java_version', {
    version,
    managerId: managerId ?? null,
  });
}

/**
 * Install a new Java version (triggers version manager)
 * @param version - Version to install
 * @param vendor - Java vendor (e.g., "temurin", "corretto")
 * @param managerId - Version manager to use
 */
export async function installJavaVersion(
  version: string,
  vendor: string,
  managerId: string
): Promise<boolean> {
  return invoke<boolean>('install_java_version', { version, vendor, managerId });
}

// ============================================
// Node Version API
// ============================================

/**
 * Scan system for installed Node versions
 */
export async function scanNodeVersions(): Promise<NodeVersion[]> {
  return invoke<NodeVersion[]>('scan_node_versions');
}

/**
 * Get current active Node version
 */
export async function getCurrentNodeVersion(): Promise<string | null> {
  return invoke<string | null>('get_current_node_version');
}

/**
 * Switch to a specific Node version
 * @param version - Version string (e.g., "v18.17.0", "18")
 * @param managerId - Optional version manager to use
 */
export async function switchNodeVersion(
  version: string,
  managerId?: string
): Promise<VersionSwitchResult> {
  return invoke<VersionSwitchResult>('switch_node_version', {
    version,
    managerId: managerId ?? null,
  });
}

/**
 * Install a new Node version (triggers version manager)
 * @param version - Version to install
 * @param managerId - Version manager to use
 */
export async function installNodeVersion(version: string, managerId: string): Promise<boolean> {
  return invoke<boolean>('install_node_version', { version, managerId });
}

// ============================================
// Version Manager API
// ============================================

/**
 * Detect installed version managers (SDKMAN, jEnv, nvm, fnm, etc.)
 */
export async function detectVersionManagers(): Promise<VersionManager[]> {
  return invoke<VersionManager[]>('detect_version_managers');
}

/**
 * Get versions managed by a specific version manager
 * @param managerId - Version manager ID (e.g., "sdkman", "nvm")
 * @param toolType - Tool type ("java" or "node")
 */
export async function getManagedVersions(
  managerId: string,
  toolType: 'java' | 'node'
): Promise<InstalledVersion[]> {
  return invoke<InstalledVersion[]>('get_managed_versions', { managerId, toolType });
}

// ============================================
// Maven Configuration API
// ============================================

/**
 * List saved Maven configurations
 */
export async function listMavenConfigs(): Promise<MavenConfig[]> {
  return invoke<MavenConfig[]>('list_maven_configs');
}

/**
 * Get current Maven settings.xml configuration
 */
export async function getCurrentMavenConfig(): Promise<MavenConfig | null> {
  return invoke<MavenConfig | null>('get_current_maven_config');
}

/**
 * Switch to a different Maven configuration
 * @param configId - Configuration ID to switch to
 */
export async function switchMavenConfig(configId: string): Promise<void> {
  return invoke<void>('switch_maven_config', { configId });
}

/**
 * Import a new Maven settings.xml configuration
 * @param name - Name for the configuration
 * @param sourcePath - Path to the settings.xml file to import
 */
export async function importMavenConfig(name: string, sourcePath: string): Promise<MavenConfig> {
  return invoke<MavenConfig>('import_maven_config', { name, sourcePath });
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Get Java version managers only
 */
export async function getJavaVersionManagers(): Promise<VersionManager[]> {
  const managers = await detectVersionManagers();
  return managers.filter((m) => ['sdkman', 'jenv', 'jabba'].includes(m.manager_type.toLowerCase()));
}

/**
 * Get Node version managers only
 */
export async function getNodeVersionManagers(): Promise<VersionManager[]> {
  const managers = await detectVersionManagers();
  return managers.filter((m) =>
    ['nvm', 'fnm', 'volta', 'nvmwindows'].includes(m.manager_type.toLowerCase())
  );
}

/**
 * Get all version information for dashboard display
 */
export interface VersionInfo {
  java: {
    current: string | null;
    versions: JavaVersion[];
    managers: VersionManager[];
  };
  node: {
    current: string | null;
    versions: NodeVersion[];
    managers: VersionManager[];
  };
  maven: {
    current: MavenConfig | null;
    configs: MavenConfig[];
  };
}

export async function getAllVersionInfo(): Promise<VersionInfo> {
  const [
    javaVersions,
    nodeVersions,
    managers,
    currentJava,
    currentNode,
    mavenConfigs,
    currentMaven,
  ] = await Promise.all([
    scanJavaVersions(),
    scanNodeVersions(),
    detectVersionManagers(),
    getCurrentJavaVersion(),
    getCurrentNodeVersion(),
    listMavenConfigs(),
    getCurrentMavenConfig(),
  ]);

  const javaManagers = managers.filter((m) =>
    ['sdkman', 'jenv', 'jabba'].includes(m.manager_type.toLowerCase())
  );

  const nodeManagers = managers.filter((m) =>
    ['nvm', 'fnm', 'volta', 'nvmwindows'].includes(m.manager_type.toLowerCase())
  );

  return {
    java: {
      current: currentJava,
      versions: javaVersions,
      managers: javaManagers,
    },
    node: {
      current: currentNode,
      versions: nodeVersions,
      managers: nodeManagers,
    },
    maven: {
      current: currentMaven,
      configs: mavenConfigs,
    },
  };
}
