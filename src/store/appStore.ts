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
}

interface AppStore {
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

  // Reset
  reset: () => void;
}

// ============================================
// Default Values
// ============================================

const defaultConfig: AppConfig = {
  theme: 'light',
  autoSwitchProfile: true,
  healthCheckInterval: TIMING.HEALTH_CHECK_INTERVAL,
  startMinimized: false,
  showNotifications: true,
  logLevel: 'info',
};

const defaultPreferences: UserPreferences = {
  recentProfiles: [],
  favoriteInstances: [],
  defaultView: 'dashboard',
  sidebarCollapsed: false,
  wizardCompleted: false,
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
        set((state) => ({
          config: { ...state.config, ...updates },
        })),

      updatePreferences: (updates) =>
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        })),

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
