import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Check, RefreshCw } from 'lucide-react';
import { useProfiles, useActiveProfile, useAppStore } from '../../store';
import * as profileApi from '../../api/profile';
import { mapApiProfileToFrontend } from '../../api/mappers';

interface ProfileSwitcherProps {
  onSwitchStart?: () => void;
  onSwitchComplete?: (success: boolean) => void;
}

export function ProfileSwitcher({ onSwitchStart, onSwitchComplete }: ProfileSwitcherProps) {
  const { t } = useTranslation();
  const profiles = useProfiles();
  const activeProfile = useActiveProfile();
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const setProfiles = useAppStore((s) => s.setProfiles);
  const addNotification = useAppStore((s) => s.addNotification);

  const [isOpen, setIsOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

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
        setSelectedProfileId(active.id);
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

  // Update selected when active changes
  useEffect(() => {
    if (activeProfile) {
      setSelectedProfileId(activeProfile.id);
    }
  }, [activeProfile]);

  const handleSwitch = async () => {
    if (!selectedProfileId || selectedProfileId === activeProfile?.id || isSwitching) return;

    setIsSwitching(true);
    setIsOpen(false);
    onSwitchStart?.();

    try {
      const result = await profileApi.switchProfile(selectedProfileId);

      if (result.success) {
        // Reload profiles to get updated state
        await loadProfiles();
        addNotification({
          type: 'success',
          title: t('profile.notifications.switched'),
          message: t('profile.notifications.switchedTo', {
            name: profiles.find((p) => p.id === selectedProfileId)?.name,
          }),
        });
        onSwitchComplete?.(true);
      } else {
        const errorMsg = result.errors.join(', ') || t('common.unknown');
        addNotification({
          type: 'error',
          title: t('profile.notifications.switchFailed'),
          message: errorMsg,
        });
        onSwitchComplete?.(false);
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('profile.notifications.switchFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
      onSwitchComplete?.(false);
    } finally {
      setIsSwitching(false);
    }
  };

  const handleSelect = (profileId: string) => {
    setSelectedProfileId(profileId);
    setIsOpen(false);
  };

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const isCurrentProfile = selectedProfileId === activeProfile?.id;

  return (
    <div className="flex items-center gap-3">
      {/* Profile Selector Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isSwitching || isLoading}
          className={`
            flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-steel
            bg-white dark:bg-charcoal text-slate-900 dark:text-gray-100
            hover:bg-slate-50 dark:hover:bg-viewport-light transition-colors shadow-soft dark:shadow-none
            ${isSwitching || isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            min-w-[200px]
          `}
        >
          {isSwitching || isLoading ? (
            <RefreshCw size={16} className="animate-spin text-azure dark:text-tech-orange" />
          ) : null}
          <span className="flex-1 text-left font-medium truncate">
            {selectedProfile?.name ||
              activeProfile?.name ||
              t('dashboard.profileSwitcher.selectProfile')}
          </span>
          <ChevronDown
            size={16}
            className={`text-slate-400 dark:text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <div className="absolute top-full left-0 right-0 mt-2 z-20 bg-white dark:bg-charcoal rounded-xl shadow-panel dark:shadow-none border border-slate-200 dark:border-steel overflow-hidden">
              <div className="py-1 max-h-60 overflow-auto">
                {profiles.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-slate-500 dark:text-gray-400 text-center">
                    {t('dashboard.profileSwitcher.noProfiles')}
                  </div>
                ) : (
                  profiles.map((profile) => (
                    <button
                      key={profile.id}
                      onClick={() => handleSelect(profile.id)}
                      className={`
                        w-full flex items-center gap-3 px-4 py-2.5 text-left
                        hover:bg-slate-50 dark:hover:bg-viewport-light transition-colors
                        ${profile.id === selectedProfileId ? 'bg-azure-50 dark:bg-tech-orange-500/20' : ''}
                      `}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-slate-900 dark:text-gray-100 flex items-center gap-2">
                          {profile.name}
                          {profile.id === activeProfile?.id && (
                            <span className="badge-azure text-xs px-2 py-0.5 rounded-full">
                              {t('dashboard.profileSwitcher.current')}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-gray-400">
                          Java {profile.javaVersion || '-'} · Node {profile.nodeVersion || '-'}
                        </div>
                      </div>
                      {profile.id === selectedProfileId && (
                        <Check size={16} className="text-azure dark:text-tech-orange" />
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Switch Button */}
      <button
        onClick={handleSwitch}
        disabled={isCurrentProfile || isSwitching || isLoading}
        className={`
          btn-teal px-5 py-2.5 text-sm
          ${isCurrentProfile || isSwitching || isLoading ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        {isSwitching ? (
          <RefreshCw size={16} className="animate-spin" />
        ) : (
          t('dashboard.profileSwitcher.switchEnv')
        )}
      </button>
    </div>
  );
}
