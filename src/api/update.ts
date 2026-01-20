/**
 * Update API - Tauri updater plugin wrapper
 *
 * Provides a clean API for checking, downloading, and installing application updates
 * using the official Tauri updater plugin with GitHub Releases.
 */

import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

// Re-export types for convenience
export type { Update };

/**
 * Update information returned from check
 */
export interface UpdateInfo {
  version: string;
  currentVersion: string;
  date: string;
  body: string;
}

/**
 * Result of checking for updates
 */
export interface CheckUpdateResult {
  available: boolean;
  update: UpdateInfo | null;
}

/**
 * Progress callback for download operations
 */
export type DownloadProgressCallback = (downloaded: number, total: number) => void;

/**
 * Check for available updates
 *
 * @returns Promise with update availability and info
 */
export async function checkForUpdate(): Promise<CheckUpdateResult> {
  try {
    const update = await check();

    if (!update) {
      return { available: false, update: null };
    }

    return {
      available: true,
      update: {
        version: update.version,
        currentVersion: update.currentVersion,
        date: update.date || new Date().toISOString(),
        body: update.body || '',
      },
    };
  } catch (error) {
    // Re-throw with more context
    const message = error instanceof Error ? error.message : 'Unknown error checking for updates';
    throw new Error(`Failed to check for updates: ${message}`);
  }
}

/**
 * Download and install update with progress tracking
 *
 * This will download the update, install it, and the app will need to be restarted.
 * Use `relaunchApp()` after this completes to restart.
 *
 * @param onProgress - Optional callback for download progress
 */
export async function downloadAndInstallUpdate(
  onProgress?: DownloadProgressCallback
): Promise<void> {
  const update = await check();

  if (!update) {
    throw new Error('No update available');
  }

  let downloaded = 0;
  let contentLength = 0;

  await update.downloadAndInstall((event) => {
    switch (event.event) {
      case 'Started':
        contentLength = event.data.contentLength || 0;
        break;
      case 'Progress':
        downloaded += event.data.chunkLength || 0;
        if (onProgress && contentLength > 0) {
          onProgress(downloaded, contentLength);
        }
        break;
      case 'Finished':
        if (onProgress && contentLength > 0) {
          onProgress(contentLength, contentLength);
        }
        break;
    }
  });
}

/**
 * Relaunch the application
 *
 * Call this after `downloadAndInstallUpdate()` completes to restart with the new version.
 */
export async function relaunchApp(): Promise<void> {
  await relaunch();
}

/**
 * Get the current application version from Tauri
 */
export async function getCurrentVersion(): Promise<string> {
  try {
    const { getVersion } = await import('@tauri-apps/api/app');
    return await getVersion();
  } catch {
    // Fallback to package.json version if Tauri API fails
    return '0.1.0';
  }
}
