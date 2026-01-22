import { useState, useEffect } from 'react';
import { getCurrentVersion } from '@/api/update';

/**
 * Hook to get the current application version from Tauri
 * Caches the result to avoid repeated API calls
 */
let cachedVersion: string | null = null;

export function useAppVersion(): string {
  const [version, setVersion] = useState(cachedVersion || '...');

  useEffect(() => {
    if (cachedVersion) {
      setVersion(cachedVersion);
      return;
    }

    getCurrentVersion().then((v) => {
      cachedVersion = v;
      setVersion(v);
    });
  }, []);

  return version;
}
