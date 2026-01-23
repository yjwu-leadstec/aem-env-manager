/**
 * useUpdate Hook - Application update state management
 *
 * Provides a React hook for managing application updates including:
 * - Checking for updates (manual and automatic)
 * - Downloading and installing updates
 * - Progress tracking
 * - Error handling
 *
 * Uses global Zustand store for state to enable sharing between components
 * (e.g., Header badge and Settings page both show update status)
 */

import { useCallback, useEffect, useRef } from 'react';
import { useAppStore, useConfig, useUpdateState, useUpdateActions } from '@/store';
import * as updateApi from '@/api/update';
import type { UpdateInfo } from '@/api/update';
import i18n from '@/i18n';

/**
 * Update state interface
 */
export interface UpdateState {
  /** Currently checking for updates */
  checking: boolean;
  /** Currently downloading update */
  downloading: boolean;
  /** Currently installing update */
  installing: boolean;
  /** Download progress (0-100) */
  downloadProgress: number;
  /** Update available */
  available: boolean;
  /** Update information if available */
  updateInfo: UpdateInfo | null;
  /** Error message if any */
  error: string | null;
}

/**
 * Hook for managing application updates
 *
 * @returns Update state and control functions
 */
export function useUpdate() {
  // Use global store state instead of local useState
  const state = useUpdateState();
  const {
    setUpdateState,
    clearUpdateError,
    dismissUpdate: storeDismissUpdate,
  } = useUpdateActions();

  const config = useConfig();
  const updateConfig = useAppStore((s) => s.updateConfig);
  const addNotification = useAppStore((s) => s.addNotification);
  const hasCheckedOnStartup = useRef(false);

  /**
   * Check for updates
   *
   * @param silent - If true, don't show notifications for no updates or errors
   */
  const checkUpdate = useCallback(
    async (silent = false) => {
      setUpdateState({ updateChecking: true, updateError: null });

      try {
        const result = await updateApi.checkForUpdate();

        // Update last check timestamp
        updateConfig({ lastUpdateCheck: new Date().toISOString() });

        setUpdateState({
          updateChecking: false,
          updateAvailable: result.available,
          updateInfo: result.update,
          updateError: null, // Clear any previous error on successful check
        });

        // Show notification for available update (even in silent mode)
        if (result.available && result.update) {
          addNotification({
            type: 'info',
            title: i18n.t('update.notification.available'),
            message: `v${result.update.version}`,
          });
        } else if (!silent) {
          // Only show "up to date" notification in manual check
          addNotification({
            type: 'success',
            title: i18n.t('settings.updates.upToDate'),
          });
        }

        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        setUpdateState({ updateChecking: false, updateError: message });

        if (!silent) {
          addNotification({
            type: 'error',
            title: i18n.t('update.notification.error'),
            message,
          });
        }

        return null;
      }
    },
    [addNotification, updateConfig, setUpdateState]
  );

  /**
   * Download and install the available update
   *
   * After installation completes, the app will automatically relaunch.
   */
  const installUpdate = useCallback(async () => {
    if (!state.available) {
      return;
    }

    setUpdateState({
      updateDownloading: true,
      updateDownloadProgress: 0,
      updateError: null,
    });

    try {
      await updateApi.downloadAndInstallUpdate((downloaded, total) => {
        const progress = Math.round((downloaded / total) * 100);
        setUpdateState({ updateDownloadProgress: progress });
      });

      setUpdateState({ updateDownloading: false, updateInstalling: true });

      addNotification({
        type: 'success',
        title: i18n.t('update.notification.downloaded'),
        duration: 2000,
      });

      // Short delay before relaunch to let user see the notification
      setTimeout(async () => {
        await updateApi.relaunchApp();
      }, 1500);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Download failed';
      setUpdateState({
        updateDownloading: false,
        updateInstalling: false,
        updateError: message,
      });

      addNotification({
        type: 'error',
        title: i18n.t('update.notification.error'),
        message,
      });
    }
  }, [state.available, addNotification, setUpdateState]);

  /**
   * Dismiss the update notification
   *
   * Hides the update badge but the update remains available.
   * User can check again from Settings.
   */
  const dismissUpdate = useCallback(() => {
    storeDismissUpdate();
  }, [storeDismissUpdate]);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    clearUpdateError();
  }, [clearUpdateError]);

  /**
   * Auto-check on startup based on configuration
   */
  useEffect(() => {
    // Only check once per app session
    if (hasCheckedOnStartup.current) return;

    // Skip if auto-check is disabled
    if (!config.autoCheckUpdate) return;

    const now = new Date();
    const lastChecked = config.lastUpdateCheck ? new Date(config.lastUpdateCheck) : null;

    let shouldCheck = false;

    switch (config.checkUpdateFrequency) {
      case 'startup':
        // Always check on startup
        shouldCheck = true;
        break;

      case 'daily':
        // Check if last check was more than 24 hours ago
        if (!lastChecked) {
          shouldCheck = true;
        } else {
          const diffHours = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60);
          shouldCheck = diffHours >= 24;
        }
        break;

      case 'weekly':
        // Check if last check was more than 7 days ago
        if (!lastChecked) {
          shouldCheck = true;
        } else {
          const diffDays = (now.getTime() - lastChecked.getTime()) / (1000 * 60 * 60 * 24);
          shouldCheck = diffDays >= 7;
        }
        break;
    }

    if (shouldCheck) {
      hasCheckedOnStartup.current = true;
      // Silent check - don't show "up to date" notification
      checkUpdate(true);
    }
  }, [config.autoCheckUpdate, config.checkUpdateFrequency, config.lastUpdateCheck, checkUpdate]);

  return {
    // State (mapped from global store)
    checking: state.checking,
    downloading: state.downloading,
    installing: state.installing,
    downloadProgress: state.downloadProgress,
    available: state.available,
    updateInfo: state.info,
    error: state.error,

    // Actions
    checkUpdate,
    installUpdate,
    dismissUpdate,
    clearError,
  };
}
