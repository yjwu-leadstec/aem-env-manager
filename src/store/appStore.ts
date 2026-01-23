import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { TIMING, UI } from '../constants';
import type {
  EnvironmentProfile,
  VersionManager,
  AEMInstance,
  ViewType,
  Notification,
  UserPreferences,
} from '../types';
import { saveAppConfig } from '../api/profile';
import { mapFrontendConfigToApi } from '../api/mappers';
import type { AppConfig as ApiAppConfig } from '../api/profile';
import type { UpdateInfo } from '../api/update';

// ============================================
// Update State Interface
// ============================================

interface UpdateState {
  /** Currently checking for updates */
  updateChecking: boolean;
  /** Currently downloading update */
  updateDownloading: boolean;
  /** Currently installing update */
  updateInstalling: boolean;
  /** Download progress (0-100) */
  updateDownloadProgress: number;
  /** Update available */
  updateAvailable: boolean;
  /** Update information if available */
  updateInfo: UpdateInfo | null;
  /** Error message if any */
  updateError: string | null;
}

// ============================================
// App Store Interface
// ============================================

// App Config type for store
interface AppConfig {
  theme: 'light' | 'dark' | 'system';
  autoSwitchProfile: boolean;
  healthCheckInterval: number;
  startMinimized: boolean;
  showNotifications: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** Enable auto status check for AEM instances */
  autoStatusCheck: boolean;
  /** Status check interval in seconds (5-60) */
  statusCheckInterval: number;
  /** Enable auto update check on startup */
  autoCheckUpdate: boolean;
  /** Update check frequency */
  checkUpdateFrequency: 'startup' | 'daily' | 'weekly';
  /** Last update check timestamp (ISO string) */
  lastUpdateCheck: string | null;
}

interface AppStore extends UpdateState {
  // State
  activeProfile: EnvironmentProfile | null;
  profiles: EnvironmentProfile[];
  versionManagers: VersionManager[];
  aemInstances: AEMInstance[];
  currentView: ViewType;
  notifications: Notification[];
  isLoading: boolean;
  error: string | null;
  config: AppConfig;
  preferences: UserPreferences;

  // Profile Actions
  setActiveProfile: (profile: EnvironmentProfile | null) => void;
  addProfile: (profile: EnvironmentProfile) => void;
  updateProfile: (id: string, updates: Partial<EnvironmentProfile>) => void;
  deleteProfile: (id: string) => void;
  setProfiles: (profiles: EnvironmentProfile[]) => void;

  // Version Manager Actions
  setVersionManagers: (managers: VersionManager[]) => void;
  updateVersionManager: (id: string, updates: Partial<VersionManager>) => void;

  // AEM Instance Actions
  setAemInstances: (instances: AEMInstance[]) => void;
  updateAemInstance: (id: string, updates: Partial<AEMInstance>) => void;
  addAemInstance: (instance: AEMInstance) => void;
  deleteAemInstance: (id: string) => void;

  // UI Actions
  setCurrentView: (view: ViewType) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Loading & Error Actions
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;

  // Config Actions
  updateConfig: (updates: Partial<AppConfig>) => void;
  updatePreferences: (updates: Partial<UserPreferences>) => void;

  // Update Actions
  setUpdateState: (updates: Partial<UpdateState>) => void;
  clearUpdateError: () => void;
  dismissUpdate: () => void;

  // Reset
  reset: () => void;
}

// ============================================
// Default Values
// ============================================

const defaultConfig: AppConfig = {
  theme: 'system',
  autoSwitchProfile: true,
  healthCheckInterval: TIMING.HEALTH_CHECK_INTERVAL,
  startMinimized: false,
  showNotifications: true,
  logLevel: 'info',
  autoStatusCheck: true,
  statusCheckInterval: TIMING.STATUS_CHECK_INTERVAL / 1000, // Convert ms to seconds
  autoCheckUpdate: true,
  checkUpdateFrequency: 'startup',
  lastUpdateCheck: null,
};

const defaultPreferences: UserPreferences = {
  recentProfiles: [],
  favoriteInstances: [],
  defaultView: 'dashboard',
  sidebarCollapsed: false,
  wizardCompleted: false,
};

const defaultUpdateState: UpdateState = {
  updateChecking: false,
  updateDownloading: false,
  updateInstalling: false,
  updateDownloadProgress: 0,
  updateAvailable: false,
  updateInfo: null,
  updateError: null,
};

const initialState = {
  activeProfile: null,
  profiles: [],
  versionManagers: [],
  aemInstances: [],
  currentView: 'dashboard' as ViewType,
  notifications: [],
  isLoading: false,
  error: null,
  config: defaultConfig,
  preferences: defaultPreferences,
  ...defaultUpdateState,
};

// ============================================
// Store Implementation
// ============================================

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Profile Actions
      setActiveProfile: (profile) => {
        set({ activeProfile: profile });
        if (profile) {
          const recentProfiles = [
            profile.id,
            ...get().preferences.recentProfiles.filter((id) => id !== profile.id),
          ].slice(0, UI.MAX_RECENT_PROFILES);
          set((state) => ({
            preferences: { ...state.preferences, recentProfiles },
          }));
        }
      },

      addProfile: (profile) =>
        set((state) => ({
          profiles: [...state.profiles, profile],
        })),

      updateProfile: (id, updates) =>
        set((state) => ({
          profiles: state.profiles.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
          activeProfile:
            state.activeProfile?.id === id
              ? { ...state.activeProfile, ...updates, updatedAt: new Date().toISOString() }
              : state.activeProfile,
        })),

      deleteProfile: (id) =>
        set((state) => ({
          profiles: state.profiles.filter((p) => p.id !== id),
          activeProfile: state.activeProfile?.id === id ? null : state.activeProfile,
        })),

      setProfiles: (profiles) => set({ profiles }),

      // Version Manager Actions
      setVersionManagers: (managers) => set({ versionManagers: managers }),

      updateVersionManager: (id, updates) =>
        set((state) => ({
          versionManagers: state.versionManagers.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),

      // AEM Instance Actions
      setAemInstances: (instances) => set({ aemInstances: instances }),

      updateAemInstance: (id, updates) =>
        set((state) => ({
          aemInstances: state.aemInstances.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),

      addAemInstance: (instance) =>
        set((state) => ({
          aemInstances: [...state.aemInstances, instance],
        })),

      deleteAemInstance: (id) =>
        set((state) => ({
          aemInstances: state.aemInstances.filter((i) => i.id !== id),
        })),

      // UI Actions
      setCurrentView: (view) => set({ currentView: view }),

      addNotification: (notification) => {
        const id = crypto.randomUUID();
        const timestamp = new Date().toISOString();
        set((state) => ({
          notifications: [...state.notifications, { ...notification, id, timestamp }],
        }));

        // Auto-remove notification after duration
        if (notification.duration !== 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, notification.duration || TIMING.NOTIFICATION_DURATION);
        }
      },

      removeNotification: (id) =>
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        })),

      clearNotifications: () => set({ notifications: [] }),

      // Loading & Error Actions
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),

      // Config Actions
      updateConfig: (updates) =>
        set((state) => {
          const newConfig = { ...state.config, ...updates };

          // Sync to backend
          const apiPayload = {
            theme: newConfig.theme,
            autoSwitchProfile: newConfig.autoSwitchProfile,
            healthCheckInterval: newConfig.healthCheckInterval,
            startMinimized: newConfig.startMinimized,
            showNotifications: newConfig.showNotifications,
            logLevel: newConfig.logLevel,
            activeProfileId: state.activeProfile?.id || null,
          };

          const apiConfig = mapFrontendConfigToApi(apiPayload);
          saveAppConfig(apiConfig as ApiAppConfig).catch((e) =>
            console.error('Failed to save config to backend:', e)
          );

          return { config: newConfig };
        }),

      updatePreferences: (updates) =>
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),

      // Update Actions
      setUpdateState: (updates) =>
        set((state) => ({
          ...state,
          ...updates,
        })),

      clearUpdateError: () => set({ updateError: null }),

      dismissUpdate: () =>
        set({
          updateAvailable: false,
          updateInfo: null,
        }),

      // Reset
      reset: () => set(initialState),
    }),
    {
      name: 'aem-env-manager-storage',
      partialize: (state) => ({
        profiles: state.profiles,
        config: state.config,
        preferences: state.preferences,
      }),
      // Merge persisted state with default values to handle new config fields
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppStore> | undefined;
        return {
          ...currentState,
          ...persisted,
          // Ensure new config fields get default values if not in persisted state
          config: {
            ...currentState.config,
            ...(persisted?.config || {}),
          },
          preferences: {
            ...currentState.preferences,
            ...(persisted?.preferences || {}),
          },
        };
      },
    }
  )
);

// ============================================
// Selector Hooks
// ============================================

export const useActiveProfile = () => useAppStore((state) => state.activeProfile);
export const useProfiles = () => useAppStore((state) => state.profiles);
export const useVersionManagers = () => useAppStore((state) => state.versionManagers);
export const useAemInstances = () => useAppStore((state) => state.aemInstances);
export const useCurrentView = () => useAppStore((state) => state.currentView);
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useError = () => useAppStore((state) => state.error);
export const useConfig = () => useAppStore((state) => state.config);
export const usePreferences = () => useAppStore((state) => state.preferences);

// Dashboard Stats Selector
export const useDashboardStats = () =>
  useAppStore((state) => ({
    totalProfiles: state.profiles.length,
    activeProfile: state.activeProfile?.name || null,
    runningInstances: state.aemInstances.filter((i) => i.status === 'running').length,
    totalInstances: state.aemInstances.length,
    javaVersion: state.activeProfile?.javaVersion || null,
    nodeVersion: state.activeProfile?.nodeVersion || null,
  }));

// Update State Selectors
export const useUpdateState = () =>
  useAppStore((state) => ({
    checking: state.updateChecking,
    downloading: state.updateDownloading,
    installing: state.updateInstalling,
    downloadProgress: state.updateDownloadProgress,
    available: state.updateAvailable,
    info: state.updateInfo,
    error: state.updateError,
  }));

export const useUpdateActions = () =>
  useAppStore((state) => ({
    setUpdateState: state.setUpdateState,
    clearUpdateError: state.clearUpdateError,
    dismissUpdate: state.dismissUpdate,
  }));
