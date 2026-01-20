// Environment Management API
// Handles symlink-based version switching and shell configuration

import { invoke } from '@tauri-apps/api/core';

// ============================================
// Types
// ============================================

export interface EnvironmentStatus {
  is_initialized: boolean;
  java_symlink_exists: boolean;
  node_symlink_exists: boolean;
  shell_configured: boolean;
  env_dir: string;
  current_java_path: string | null;
  current_node_path: string | null;
}

export interface InitResult {
  success: boolean;
  message: string;
  env_dir: string;
  shell_config_updated: boolean;
}

export interface SymlinkResult {
  success: boolean;
  previous_target: string | null;
  current_target: string;
  message: string | null;
}

// ============================================
// Environment Status API
// ============================================

/**
 * Check if environment is initialized
 * Returns status of symlinks and shell configuration
 */
export async function checkEnvironmentStatus(): Promise<EnvironmentStatus> {
  return invoke<EnvironmentStatus>('check_environment_status');
}

/**
 * Get current symlink targets
 * Returns [java_path, node_path]
 */
export async function getCurrentSymlinks(): Promise<[string | null, string | null]> {
  return invoke<[string | null, string | null]>('get_current_symlinks');
}

// ============================================
// Initialization API
// ============================================

/**
 * Initialize the environment management system
 * Creates directory structure and configures shell
 */
export async function initializeEnvironment(): Promise<InitResult> {
  return invoke<InitResult>('initialize_environment');
}

/**
 * Remove shell configuration
 * Cleans up the managed block from shell config file
 */
export async function removeShellConfig(): Promise<boolean> {
  return invoke<boolean>('remove_shell_config');
}

// ============================================
// Symlink Management API
// ============================================

/**
 * Set Java symlink to point to a specific installation
 * @param javaHome - Path to Java installation (JAVA_HOME)
 */
export async function setJavaSymlink(javaHome: string): Promise<SymlinkResult> {
  return invoke<SymlinkResult>('set_java_symlink', { javaHome });
}

/**
 * Set Node symlink to point to a specific installation
 * @param nodePath - Path to Node installation directory
 */
export async function setNodeSymlink(nodePath: string): Promise<SymlinkResult> {
  return invoke<SymlinkResult>('set_node_symlink', { nodePath });
}

/**
 * Remove Java symlink
 */
export async function removeJavaSymlink(): Promise<boolean> {
  return invoke<boolean>('remove_java_symlink');
}

/**
 * Remove Node symlink
 */
export async function removeNodeSymlink(): Promise<boolean> {
  return invoke<boolean>('remove_node_symlink');
}

// ============================================
// Process Environment API
// ============================================

/**
 * Get environment variables for launching a process with specific versions
 * Used when starting AEM instances with profile-specific versions
 * @param javaPath - Optional Java installation path
 * @param nodePath - Optional Node installation path
 */
export async function getProfileEnvironment(
  javaPath?: string,
  nodePath?: string
): Promise<Array<[string, string]>> {
  return invoke<Array<[string, string]>>('get_profile_environment', {
    javaPath: javaPath ?? null,
    nodePath: nodePath ?? null,
  });
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Check if environment needs initialization
 */
export async function needsInitialization(): Promise<boolean> {
  const status = await checkEnvironmentStatus();
  return !status.is_initialized;
}

/**
 * Update both Java and Node symlinks at once
 * Used when switching profiles
 */
export async function updateSymlinks(
  javaPath?: string,
  nodePath?: string
): Promise<{ java?: SymlinkResult; node?: SymlinkResult }> {
  const results: { java?: SymlinkResult; node?: SymlinkResult } = {};

  if (javaPath) {
    results.java = await setJavaSymlink(javaPath);
  }

  if (nodePath) {
    results.node = await setNodeSymlink(nodePath);
  }

  return results;
}
