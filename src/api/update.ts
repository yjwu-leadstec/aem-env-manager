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
 * Cached Update object from the last check.
 * This is reused for download to avoid multiple check() calls which can cause issues.
 */
let cachedUpdate: Update | null = null;

/**
 * Check for available updates
 *
 * @returns Promise with update availability and info
 */
export async function checkForUpdate(): Promise<CheckUpdateResult> {
  try {
    const update = await check();

    // Cache the update object for later use
    cachedUpdate = update;

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
    // Clear cache on error
    cachedUpdate = null;
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
 * IMPORTANT: This function uses the cached Update object from checkForUpdate().
 * Always call checkForUpdate() before calling this function.
 *
 * @param onProgress - Optional callback for download progress
 */
export async function downloadAndInstallUpdate(
  onProgress?: DownloadProgressCallback
): Promise<void> {
  // Use cached update object, or fetch a new one if not available
  let update = cachedUpdate;

  if (!update) {
    console.warn('[Update] No cached update object, fetching new one...');
    update = await check();
  }

  if (!update) {
    throw new Error('No update available');
  }

  let downloaded = 0;
  let contentLength = 0;

  try {
    await update.downloadAndInstall((event) => {
      switch (event.event) {
        case 'Started':
          contentLength = event.data.contentLength || 0;
          console.log(`[Update] Download started, size: ${contentLength} bytes`);
          break;
        case 'Progress':
          downloaded += event.data.chunkLength || 0;
          if (onProgress && contentLength > 0) {
            onProgress(downloaded, contentLength);
          }
          break;
        case 'Finished':
          console.log('[Update] Download finished');
          if (onProgress && contentLength > 0) {
            onProgress(contentLength, contentLength);
          }
          break;
      }
    });

    console.log('[Update] Installation prepared successfully');
    // Clear cache after successful install preparation
    cachedUpdate = null;
  } catch (error) {
    console.error('[Update] Download/Install failed:', error);
    // Clear cache on error
    cachedUpdate = null;
    throw error;
  }
}

/**
 * Clear the cached update object.
 * Call this when the user dismisses the update or when needed to force a fresh check.
 */
export function clearUpdateCache(): void {
  cachedUpdate = null;
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
    // Return unknown if Tauri API fails (e.g., in web dev mode)
    return 'dev';
  }
}
