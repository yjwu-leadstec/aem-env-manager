// General Settings Component

import { useTranslation } from 'react-i18next';
import { Settings, Monitor, Bell, Sun, Moon, Activity, Clock } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { useConfig, useAppStore } from '@/store';
import type { AppConfig } from '@/types';
import { TIMING } from '@/constants';
import { ThemeButton, ToggleSetting } from './shared';

export function GeneralSettings() {
  const { t } = useTranslation();
  const config = useConfig();
  const updateConfig = useAppStore((s) => s.updateConfig);
  const addNotification = useAppStore((s) => s.addNotification);

  const handleThemeChange = (theme: AppConfig['theme']) => {
    updateConfig({ theme });
    addNotification({
      type: 'success',
      title: t('settings.general.themeUpdated'),
      message: t('settings.general.themeChangedTo', {
        theme:
          theme === 'light'
            ? t('settings.general.themeLight')
            : theme === 'dark'
              ? t('settings.general.themeDark')
              : t('settings.general.themeSystem'),
      }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader
          title={t('settings.general.appearance')}
          subtitle={t('settings.general.appearanceDesc')}
        />
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-300">
                {t('settings.general.theme')}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('settings.general.themeDesc')}
              </p>
            </div>
            <div className="flex gap-2">
              <ThemeButton
                icon={<Sun size={16} />}
                label={t('settings.general.themeLight')}
                active={config.theme === 'light'}
                onClick={() => handleThemeChange('light')}
              />
              <ThemeButton
                icon={<Moon size={16} />}
                label={t('settings.general.themeDark')}
                active={config.theme === 'dark'}
                onClick={() => handleThemeChange('dark')}
              />
              <ThemeButton
                icon={<Monitor size={16} />}
                label={t('settings.general.themeSystem')}
                active={config.theme === 'system'}
                onClick={() => handleThemeChange('system')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader
          title={t('settings.general.notifications')}
          subtitle={t('settings.general.notificationsDesc')}
        />
        <CardContent className="space-y-4">
          <ToggleSetting
            icon={<Bell size={18} />}
            title={t('settings.general.showNotifications')}
            description={t('settings.general.showNotificationsDesc')}
            enabled={config.showNotifications}
            onChange={(enabled) => updateConfig({ showNotifications: enabled })}
          />
        </CardContent>
      </Card>

      {/* Behavior */}
      <Card>
        <CardHeader
          title={t('settings.general.behavior')}
          subtitle={t('settings.general.behaviorDesc')}
        />
        <CardContent className="space-y-4">
          <ToggleSetting
            icon={<Settings size={18} />}
            title={t('settings.general.autoSwitch')}
            description={t('settings.general.autoSwitchDesc')}
            enabled={config.autoSwitchProfile}
            onChange={(enabled) => updateConfig({ autoSwitchProfile: enabled })}
          />
          <ToggleSetting
            icon={<Monitor size={18} />}
            title={t('settings.general.startMinimized')}
            description={t('settings.general.startMinimizedDesc')}
            enabled={config.startMinimized}
            onChange={(enabled) => updateConfig({ startMinimized: enabled })}
          />
        </CardContent>
      </Card>

      {/* Instance Status Check */}
      <Card>
        <CardHeader
          title={t('settings.general.statusCheck')}
          subtitle={t('settings.general.statusCheckDesc')}
        />
        <CardContent className="space-y-4">
          <ToggleSetting
            icon={<Activity size={18} />}
            title={t('settings.general.autoStatusCheck')}
            description={t('settings.general.autoStatusCheckDesc')}
            enabled={config.autoStatusCheck}
            onChange={(enabled) => updateConfig({ autoStatusCheck: enabled })}
          />
          {config.autoStatusCheck && (
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {t('settings.general.statusCheckInterval')}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('settings.general.statusCheckIntervalDesc', {
                      min: TIMING.STATUS_CHECK_INTERVAL_MIN,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={TIMING.STATUS_CHECK_INTERVAL_MIN}
                  value={config.statusCheckInterval}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (!isNaN(value) && value >= TIMING.STATUS_CHECK_INTERVAL_MIN) {
                      updateConfig({ statusCheckInterval: value });
                    }
                  }}
                  className="input w-20 text-center"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {t('settings.general.seconds')}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
