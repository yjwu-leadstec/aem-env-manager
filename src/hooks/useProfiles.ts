import { useCallback, useEffect } from 'react';
import { useAppStore, useProfiles, useActiveProfile, useIsLoading } from '../store';
import * as profileApi from '../api/profile';
import { mapApiProfileToFrontend } from '../api/mappers';
import type { EnvironmentProfile } from '../types';

/**
 * Hook for managing environment profiles
 */
export function useProfileManager() {
  const profiles = useProfiles();
  const activeProfile = useActiveProfile();
  const isLoading = useIsLoading();

  const setProfiles = useAppStore((s) => s.setProfiles);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const addProfile = useAppStore((s) => s.addProfile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const deleteProfile = useAppStore((s) => s.deleteProfile);
  const setLoading = useAppStore((s) => s.setLoading);
  const setError = useAppStore((s) => s.setError);
  const addNotification = useAppStore((s) => s.addNotification);

  // Load profiles on mount
  const loadProfiles = useCallback(async () => {
    setLoading(true);
    try {
      const [apiProfiles, apiActive] = await Promise.all([
        profileApi.listProfiles(),
        profileApi.getActiveProfile(),
      ]);
      const frontendProfiles = apiProfiles.map(mapApiProfileToFrontend);
      const frontendActive = apiActive ? mapApiProfileToFrontend(apiActive) : null;
      setProfiles(frontendProfiles);
      setActiveProfile(frontendActive);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profiles');
      addNotification({
        type: 'error',
        title: 'Failed to load profiles',
        message: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [setProfiles, setActiveProfile, setLoading, setError, addNotification]);

  // Switch to a profile
  const switchProfile = useCallback(
    async (profileId: string) => {
      setLoading(true);
      try {
        const result = await profileApi.switchProfile(profileId);
        if (result.success) {
          const profile = profiles.find((p) => p.id === profileId);
          if (profile) {
            setActiveProfile(profile);
            updateProfile(profileId, { isActive: true });
          }
          addNotification({
            type: 'success',
            title: 'Profile switched',
            message: `Now using ${profile?.name || profileId}`,
          });
        } else {
          throw new Error(result.errors?.join(', ') || 'Failed to switch profile');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to switch profile');
        addNotification({
          type: 'error',
          title: 'Profile switch failed',
          message: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setLoading(false);
      }
    },
    [profiles, setActiveProfile, updateProfile, setLoading, setError, addNotification]
  );

  // Create a new profile
  const createProfile = useCallback(
    async (profile: Omit<EnvironmentProfile, 'id' | 'createdAt' | 'updatedAt'>) => {
      setLoading(true);
      try {
        const apiProfile = await profileApi.createProfile({
          name: profile.name,
          description: profile.description,
          java_version: profile.javaVersion,
          java_manager_id: profile.javaManagerId,
          node_version: profile.nodeVersion,
          node_manager_id: profile.nodeManagerId,
          maven_config_id: profile.mavenConfigId,
          env_vars: profile.envVars,
          is_active: profile.isActive,
        });
        const frontendProfile = mapApiProfileToFrontend(apiProfile);
        addProfile(frontendProfile);
        addNotification({
          type: 'success',
          title: 'Profile created',
          message: `${frontendProfile.name} has been created`,
        });
        return frontendProfile;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create profile');
        addNotification({
          type: 'error',
          title: 'Failed to create profile',
          message: err instanceof Error ? err.message : undefined,
        });
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [addProfile, setLoading, setError, addNotification]
  );

  // Remove a profile
  const removeProfile = useCallback(
    async (profileId: string) => {
      setLoading(true);
      try {
        await profileApi.deleteProfile(profileId);
        deleteProfile(profileId);
        addNotification({
          type: 'success',
          title: 'Profile deleted',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete profile');
        addNotification({
          type: 'error',
          title: 'Failed to delete profile',
          message: err instanceof Error ? err.message : undefined,
        });
      } finally {
        setLoading(false);
      }
    },
    [deleteProfile, setLoading, setError, addNotification]
  );

  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  return {
    profiles,
    activeProfile,
    isLoading,
    loadProfiles,
    switchProfile,
    createProfile,
    removeProfile,
  };
}
