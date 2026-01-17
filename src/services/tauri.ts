// Tauri IPC service layer
// Provides typed wrappers around Tauri invoke calls

import { invoke } from '@tauri-apps/api/core';
import type {
  EnvironmentProfile,
  VersionManager,
  AEMInstance,
  VersionSwitchResult,
  AEMHealthCheck,
} from '../types';

// ============================================
// Profile Services
// ============================================

export const profileService = {
  async list(): Promise<EnvironmentProfile[]> {
    return invoke('list_profiles');
  },

  async get(id: string): Promise<EnvironmentProfile | null> {
    return invoke('get_profile', { id });
  },

  async create(profile: EnvironmentProfile): Promise<EnvironmentProfile> {
    return invoke('create_profile', { profile });
  },

  async update(id: string, profile: Partial<EnvironmentProfile>): Promise<EnvironmentProfile> {
    return invoke('update_profile', { id, profile });
  },

  async delete(id: string): Promise<boolean> {
    return invoke('delete_profile', { id });
  },

  async switch(profileId: string): Promise<{ success: boolean; message?: string; error?: string }> {
    return invoke('switch_profile', { profileId });
  },

  async getActive(): Promise<EnvironmentProfile | null> {
    return invoke('get_active_profile');
  },
};

// ============================================
// Version Services
// ============================================

export const versionService = {
  async detectManagers(): Promise<VersionManager[]> {
    return invoke('detect_version_managers');
  },

  async getManagedVersions(managerId: string, toolType: string): Promise<string[]> {
    return invoke('get_managed_versions', { managerId, toolType });
  },

  async getCurrentJavaVersion(): Promise<string | null> {
    return invoke('get_current_java_version');
  },

  async getCurrentNodeVersion(): Promise<string | null> {
    return invoke('get_current_node_version');
  },

  async switchJava(version: string, managerId?: string): Promise<VersionSwitchResult> {
    return invoke('switch_java_version', { version, managerId });
  },

  async switchNode(version: string, managerId?: string): Promise<VersionSwitchResult> {
    return invoke('switch_node_version', { version, managerId });
  },

  async installJava(version: string, vendor: string, managerId: string): Promise<boolean> {
    return invoke('install_java_version', { version, vendor, managerId });
  },

  async installNode(version: string, managerId: string): Promise<boolean> {
    return invoke('install_node_version', { version, managerId });
  },
};

// ============================================
// Instance Services
// ============================================

export const instanceService = {
  async list(): Promise<AEMInstance[]> {
    return invoke('list_instances');
  },

  async get(id: string): Promise<AEMInstance | null> {
    return invoke('get_instance', { id });
  },

  async add(instance: AEMInstance): Promise<AEMInstance> {
    return invoke('add_instance', { instance });
  },

  async update(id: string, instance: Partial<AEMInstance>): Promise<AEMInstance> {
    return invoke('update_instance', { id, instance });
  },

  async delete(id: string): Promise<boolean> {
    return invoke('delete_instance', { id });
  },

  async start(id: string): Promise<boolean> {
    return invoke('start_instance', { id });
  },

  async stop(id: string): Promise<boolean> {
    return invoke('stop_instance', { id });
  },

  async checkHealth(id: string): Promise<AEMHealthCheck> {
    return invoke('check_instance_health', { id });
  },

  async storeCredentials(instanceId: string, username: string, password: string): Promise<boolean> {
    return invoke('store_credentials', { instanceId, username, password });
  },

  async getCredentials(instanceId: string): Promise<[string, string] | null> {
    return invoke('get_credentials', { instanceId });
  },

  async openInBrowser(id: string, path?: string): Promise<boolean> {
    return invoke('open_in_browser', { id, path });
  },
};
