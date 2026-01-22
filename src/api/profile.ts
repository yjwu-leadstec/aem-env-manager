// Profile Management API
// Tauri IPC bindings for environment profile management

import { invoke } from '@tauri-apps/api/core';

// ============================================
// Types
// ============================================

export interface EnvironmentProfile {
  id: string;
  name: string;
  description: string | null;
  java_version: string | null;
  java_manager_id: string | null;
  java_path: string | null; // Full path to Java installation (JAVA_HOME)
  node_version: string | null;
  node_manager_id: string | null;
  node_path: string | null; // Full path to Node installation directory
  maven_config_id: string | null;
  author_instance_id: string | null; // Associated AEM Author instance
  publish_instance_id: string | null; // Associated AEM Publish instance
  env_vars: Record<string, string>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileSwitchResult {
  success: boolean;
  profile_id: string;
  java_switched: boolean;
  node_switched: boolean;
  maven_switched: boolean;
  errors: string[];
}

export interface ProfileValidationResult {
  is_valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface AppConfig {
  theme: string;
  auto_switch_profile: boolean;
  health_check_interval: number;
  active_profile_id: string | null;
  start_minimized: boolean;
  show_notifications: boolean;
  log_level: string;
}

// ============================================
// Profile CRUD Operations
// ============================================

/**
 * List all environment profiles
 */
export async function listProfiles(): Promise<EnvironmentProfile[]> {
  return invoke<EnvironmentProfile[]>('list_profiles');
}

/**
 * Get a specific profile by ID
 * @param id - Profile ID
 */
export async function getProfile(id: string): Promise<EnvironmentProfile | null> {
  return invoke<EnvironmentProfile | null>('get_profile', { id });
}

/**
 * Create a new environment profile
 * @param profile - Profile configuration
 */
export async function createProfile(
  profile: Partial<EnvironmentProfile>
): Promise<EnvironmentProfile> {
  return invoke<EnvironmentProfile>('create_profile', { profile });
}

/**
 * Update an existing profile
 * @param id - Profile ID
 * @param profile - Updated profile configuration
 */
export async function updateProfile(
  id: string,
  profile: Partial<EnvironmentProfile>
): Promise<EnvironmentProfile> {
  return invoke<EnvironmentProfile>('update_profile', { id, profile });
}

/**
 * Delete an environment profile
 * @param id - Profile ID
 */
export async function deleteProfile(id: string): Promise<boolean> {
  return invoke<boolean>('delete_profile', { id });
}

// ============================================
// Profile Switching
// ============================================

/**
 * Switch to a specific profile, updating Java, Node, and Maven versions
 * @param profileId - Profile ID to switch to
 */
export async function switchProfile(profileId: string): Promise<ProfileSwitchResult> {
  return invoke<ProfileSwitchResult>('switch_profile', { profileId });
}

/**
 * Get the currently active profile
 */
export async function getActiveProfile(): Promise<EnvironmentProfile | null> {
  return invoke<EnvironmentProfile | null>('get_active_profile');
}

// ============================================
// Profile Validation
// ============================================

/**
 * Validate a profile configuration
 * @param profileId - Profile ID to validate
 */
export async function validateProfile(profileId: string): Promise<ProfileValidationResult> {
  return invoke<ProfileValidationResult>('validate_profile', { profileId });
}

// ============================================
// App Configuration
// ============================================

/**
 * Load application configuration
 */
export async function loadAppConfig(): Promise<AppConfig> {
  return invoke<AppConfig>('load_app_config');
}

/**
 * Save application configuration
 * @param config - Application configuration
 */
export async function saveAppConfig(config: AppConfig): Promise<void> {
  return invoke<void>('save_app_config', { config });
}

// ============================================
// Profile Import/Export
// ============================================

/**
 * Export a profile to JSON string
 * @param profileId - Profile ID to export
 */
export async function exportProfile(profileId: string): Promise<string> {
  return invoke<string>('export_profile', { profileId });
}

/**
 * Import a profile from JSON string
 * @param jsonContent - JSON string containing profile data
 */
export async function importProfile(jsonContent: string): Promise<EnvironmentProfile> {
  return invoke<EnvironmentProfile>('import_profile', { jsonContent });
}

/**
 * Duplicate an existing profile
 * @param profileId - Profile ID to duplicate
 */
export async function duplicateProfile(profileId: string): Promise<EnvironmentProfile> {
  return invoke<EnvironmentProfile>('duplicate_profile', { profileId });
}

// ============================================
// Convenience Functions
// ============================================

/**
 * Get all profiles with validation status
 */
export interface ProfileWithValidation extends EnvironmentProfile {
  validation: ProfileValidationResult;
}

export async function getProfilesWithValidation(): Promise<ProfileWithValidation[]> {
  const profiles = await listProfiles();
  const results = await Promise.all(
    profiles.map(async (profile) => {
      const validation = await validateProfile(profile.id);
      return { ...profile, validation };
    })
  );
  return results;
}

/**
 * Create a profile from another profile (clone with modifications)
 * @param sourceProfileId - Profile ID to clone from
 * @param modifications - Modifications to apply
 */
export async function cloneProfile(
  sourceProfileId: string,
  modifications: Partial<EnvironmentProfile>
): Promise<EnvironmentProfile> {
  const duplicated = await duplicateProfile(sourceProfileId);
  return updateProfile(duplicated.id, modifications);
}

/**
 * Quick switch to a profile by name
 * @param name - Profile name to switch to
 */
export async function switchToProfileByName(name: string): Promise<ProfileSwitchResult | null> {
  const profiles = await listProfiles();
  const profile = profiles.find((p) => p.name.toLowerCase() === name.toLowerCase());
  if (!profile) {
    return null;
  }
  return switchProfile(profile.id);
}

/**
 * Get summary of all profiles
 */
export interface ProfileSummary {
  total: number;
  activeProfile: EnvironmentProfile | null;
  profiles: Array<{
    id: string;
    name: string;
    isActive: boolean;
    hasJava: boolean;
    hasNode: boolean;
    hasMaven: boolean;
  }>;
}

export async function getProfileSummary(): Promise<ProfileSummary> {
  const [profiles, activeProfile] = await Promise.all([listProfiles(), getActiveProfile()]);

  return {
    total: profiles.length,
    activeProfile,
    profiles: profiles.map((p) => ({
      id: p.id,
      name: p.name,
      isActive: p.is_active,
      hasJava: !!p.java_version,
      hasNode: !!p.node_version,
      hasMaven: !!p.maven_config_id,
    })),
  };
}

/**
 * Export profile to file (downloads in browser)
 * @param profileId - Profile ID to export
 * @param filename - Filename for the export
 */
export async function exportProfileToFile(profileId: string, filename?: string): Promise<void> {
  const jsonContent = await exportProfile(profileId);
  const profile = JSON.parse(jsonContent) as EnvironmentProfile;
  // eslint-disable-next-line no-undef
  const blob = new Blob([jsonContent], { type: 'application/json' });

  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `profile-${profile.name}.json`;

  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);

  URL.revokeObjectURL(url);
}

/**
 * Import profile from file
 * @param file - File object to import from
 */
// eslint-disable-next-line no-undef
export async function importProfileFromFile(file: File): Promise<EnvironmentProfile> {
  const content = await file.text();
  return importProfile(content);
}
