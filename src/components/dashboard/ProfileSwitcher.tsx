import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, Check, RefreshCw } from 'lucide-react';
import { useProfiles, useActiveProfile, useAppStore } from '../../store';
import * as profileApi from '../../api/profile';
import { mapApiProfileToFrontend } from '../../api/mappers';

interface ProfileSwitcherProps {
  onSwitchStart?: () => void;
  onSwitchComplete?: (success: boolean) => void;
}

export function ProfileSwitcher({ onSwitchStart, onSwitchComplete }: ProfileSwitcherProps) {
  const profiles = useProfiles();
  const activeProfile = useActiveProfile();
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const setProfiles = useAppStore((s) => s.setProfiles);
  const addNotification = useAppStore((s) => s.addNotification);

  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiProfiles = await profileApi.listProfiles();
      const mappedProfiles = apiProfiles.map(mapApiProfileToFrontend);
      setProfiles(mappedProfiles);

      // Set active profile
      const active = apiProfiles.find((p) => p.is_active);
      if (active) {
        setActiveProfile(mapApiProfileToFrontend(active));
      }
    } catch {
      // Failed to load profiles
    } finally {
      setIsLoading(false);
    }
  }, [setProfiles, setActiveProfile]);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  const handleSwitch = async (profileId: string) => {
    if (profileId === activeProfile?.id || isSwitching) return;

    setIsSwitching(true);
    setIsOpen(false);
    onSwitchStart?.();

    try {
      const result = await profileApi.switchProfile(profileId);

      if (result.success) {
        // Reload profiles to get updated state
        await loadProfiles();
        addNotification({
          type: 'success',
          title: 'Profile switched',
          message: `Successfully switched to ${profiles.find((p) => p.id === profileId)?.name}`,
        });
        onSwitchComplete?.(true);
      } else {
        const errorMsg = result.errors.join(', ') || 'Unknown error';
        addNotification({
          type: 'error',
          title: 'Switch failed',
          message: errorMsg,
        });
        onSwitchComplete?.(false);
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Switch failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      onSwitchComplete?.(false);
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isSwitching || isLoading}
        className={`
          flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600
          bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100
          hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors
          ${isSwitching || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          min-w-[200px]
        `}
      >
        {isSwitching || isLoading ? (
          <RefreshCw size={16} className="animate-spin text-azure" />
        ) : (
          <div className="w-2 h-2 rounded-full bg-success-500" />
        )}
        <span className="flex-1 text-left font-medium truncate">
          {activeProfile?.name || 'Select Profile'}
        </span>
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-600 overflow-hidden">
            <div className="py-1 max-h-60 overflow-auto">
              {profiles.length === 0 ? (
                <div className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400 text-center">
                  No profiles available
                </div>
              ) : (
                profiles.map((profile) => (
                  <button
                    key={profile.id}
                    onClick={() => handleSwitch(profile.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-2.5 text-left
                      hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors
                      ${profile.id === activeProfile?.id ? 'bg-azure-50 dark:bg-azure-900/30' : ''}
                    `}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {profile.name}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Java {profile.javaVersion || '-'} · Node {profile.nodeVersion || '-'}
                      </div>
                    </div>
                    {profile.id === activeProfile?.id && <Check size={16} className="text-azure" />}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
