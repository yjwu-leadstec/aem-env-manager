// Settings Management API
// Tauri IPC bindings for application settings

import { invoke } from '@tauri-apps/api/core';
import { open, save } from '@tauri-apps/plugin-dialog';
import i18n from '../i18n';

// ============================================
// Types
// ============================================

export interface ScanPaths {
  java_paths: string[];
  node_paths: string[];
  maven_home: string;
  maven_repository: string;
  aem_base_dir: string;
  logs_dir: string;
}

export interface ExportResult {
  success: boolean;
  file_path: string | null;
  profiles_count: number;
  instances_count: number;
  error: string | null;
}

export interface ImportResult {
  success: boolean;
  profiles_imported: number;
  instances_imported: number;
  configs_imported: boolean;
  errors: string[];
}

export interface ResetResult {
  success: boolean;
  profiles_deleted: number;
  instances_deleted: number;
  configs_reset: boolean;
  error: string | null;
}

// ============================================
// Scan Paths Management
// ============================================

/**
 * Load scan paths configuration
 */
export async function loadScanPaths(): Promise<ScanPaths> {
  return invoke<ScanPaths>('load_scan_paths');
}

/**
 * Save scan paths configuration
 */
export async function saveScanPaths(paths: ScanPaths): Promise<void> {
  return invoke<void>('save_scan_paths', { paths });
}

// ============================================
// File/Folder Selection Dialogs
// ============================================

/**
 * Open a folder selection dialog
 */
export async function selectFolder(
  title: string = i18n.t('common.dialog.selectFolder')
): Promise<string | null> {
  const result = await open({
    directory: true,
    multiple: false,
    title,
  });
  return result as string | null;
}

/**
 * Open a file selection dialog
 */
export async function selectFile(
  title: string = i18n.t('common.dialog.selectFile'),
  filters?: Array<{ name: string; extensions: string[] }>
): Promise<string | null> {
  const result = await open({
    directory: false,
    multiple: false,
    title,
    filters,
  });
  return result as string | null;
}

/**
 * Open a save file dialog
 */
export async function selectSaveFile(
  title: string = i18n.t('common.dialog.saveFile'),
  defaultPath?: string,
  filters?: Array<{ name: string; extensions: string[] }>
): Promise<string | null> {
  const result = await save({
    title,
    defaultPath,
    filters,
  });
  return result;
}

// ============================================
// Export/Import Configuration
// ============================================

/**
 * Export all configuration with file dialog
 */
export async function exportConfiguration(): Promise<ExportResult> {
  const savePath = await selectSaveFile(
    i18n.t('common.dialog.exportConfig'),
    'aem-env-manager-backup.zip',
    [{ name: 'ZIP Archive', extensions: ['zip'] }]
  );

  if (!savePath) {
    return {
      success: false,
      file_path: null,
      profiles_count: 0,
      instances_count: 0,
      error: i18n.t('common.dialog.cancelled'),
    };
  }

  return invoke<ExportResult>('export_all_config', { exportPath: savePath });
}

/**
 * Import configuration with file dialog
 */
export async function importConfiguration(): Promise<ImportResult> {
  const filePath = await selectFile(i18n.t('common.dialog.importConfig'), [
    { name: 'ZIP Archive', extensions: ['zip'] },
  ]);

  if (!filePath) {
    return {
      success: false,
      profiles_imported: 0,
      instances_imported: 0,
      configs_imported: false,
      errors: [i18n.t('common.dialog.cancelled')],
    };
  }

  return invoke<ImportResult>('import_all_config', { importPath: filePath });
}

/**
 * Export configuration to specific path (without dialog)
 */
export async function exportToPath(exportPath: string): Promise<ExportResult> {
  return invoke<ExportResult>('export_all_config', { exportPath });
}

/**
 * Import configuration from specific path (without dialog)
 */
export async function importFromPath(importPath: string): Promise<ImportResult> {
  return invoke<ImportResult>('import_all_config', { importPath });
}

// ============================================
// Reset Configuration
// ============================================

/**
 * Reset all configuration to defaults
 */
export async function resetAllConfiguration(): Promise<ResetResult> {
  return invoke<ResetResult>('reset_all_config');
}
