import { useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { invoke } from '@tauri-apps/api/core';

/**
 * Hook to handle window close event - hide window to tray instead of closing
 * On macOS, this also removes the app from the Dock
 * Note: This is currently handled in main.tsx, but exposed here for potential reuse
 */
export function useWindowClose() {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    const setupCloseHandler = async () => {
      const appWindow = getCurrentWindow();

      unlisten = await appWindow.onCloseRequested(async (event) => {
        // Prevent the window from closing
        event.preventDefault();
        // Hide the window to tray (also removes from Dock on macOS)
        await invoke('hide_to_tray');
      });
    };

    setupCloseHandler();

    return () => {
      if (unlisten) {
        unlisten();
      }
    };
  }, []);
}
