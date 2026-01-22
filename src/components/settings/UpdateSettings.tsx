/**
 * UpdateSettings Component
 *
 * Settings panel for configuring application update behavior.
 * Includes auto-check toggle, frequency selector, manual check button, and version info.
 */

import { useTranslation } from 'react-i18next';
import { Download, RefreshCw, ExternalLink, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useConfig, useAppStore } from '@/store';
import { useUpdate } from '@/hooks';
import { getCurrentVersion } from '@/api/update';
import { ToggleSetting } from './shared';
import { useState, useEffect } from 'react';

type CheckFrequency = 'startup' | 'daily' | 'weekly';

export function UpdateSettings() {
  const { t } = useTranslation();
  const config = useConfig();
  const updateConfig = useAppStore((s) => s.updateConfig);
  const { checking, available, updateInfo, error, checkUpdate } = useUpdate();
  const [currentVersion, setCurrentVersion] = useState('...');

  // Get current version on mount
  useEffect(() => {
    getCurrentVersion().then(setCurrentVersion);
  }, []);

  const handleFrequencyChange = (frequency: CheckFrequency) => {
    updateConfig({ checkUpdateFrequency: frequency });
  };

  const handleCheckUpdate = () => {
    checkUpdate(false); // Non-silent - will show notifications
  };

  const handleViewChangelog = async () => {
    // Open GitHub releases page
    const { openUrl } = await import('@tauri-apps/plugin-opener');
    await openUrl('https://github.com/anthropics/aem-env-manager/releases');
  };

  // Format last checked time
  const formatLastChecked = () => {
    if (!config.lastUpdateCheck) {
      return t('settings.updates.never');
    }
    const date = new Date(config.lastUpdateCheck);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Version Info */}
      <Card>
        <CardHeader title={t('settings.updates.title')} subtitle={t('settings.updates.subtitle')} />
        <CardContent className="space-y-4">
          {/* Current version display */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50">
            <div>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('settings.updates.currentVersion')}
              </p>
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                v{currentVersion}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {available ? (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-azure-50 dark:bg-azure-900/30 text-azure-600 dark:text-azure-400 text-sm font-medium">
                  <Download size={14} />
                  {t('settings.updates.updateAvailable')}
                </span>
              ) : (
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-50 dark:bg-success-900/30 text-success-600 dark:text-success-400 text-sm font-medium">
                  <CheckCircle size={14} />
                  {t('settings.updates.upToDate')}
                </span>
              )}
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-error-50 dark:bg-error-900/30 text-error-600 dark:text-error-400">
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Update available info */}
          {available && updateInfo && (
            <div className="p-4 rounded-lg border border-azure-200 dark:border-azure-800 bg-azure-50/50 dark:bg-azure-900/20">
              <div className="flex items-center gap-2 mb-2">
                <Download size={18} className="text-azure-500" />
                <span className="font-medium text-azure-700 dark:text-azure-300">
                  {t('update.dialog.version', { version: updateInfo.version })}
                </span>
              </div>
              <p className="text-sm text-azure-600 dark:text-azure-400">
                {t('settings.updates.clickBadgeToUpdate')}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Settings */}
      <Card>
        <CardHeader
          title={t('settings.updates.autoUpdateTitle')}
          subtitle={t('settings.updates.autoUpdateDesc')}
        />
        <CardContent className="space-y-4">
          {/* Auto check toggle */}
          <ToggleSetting
            icon={<RefreshCw size={18} />}
            title={t('settings.updates.autoCheck')}
            description={t('settings.updates.autoCheckDesc')}
            enabled={config.autoCheckUpdate}
            onChange={(enabled) => updateConfig({ autoCheckUpdate: enabled })}
          />

          {/* Check frequency selector */}
          {config.autoCheckUpdate && (
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {t('settings.updates.frequency')}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('settings.updates.frequencyDesc')}
                  </p>
                </div>
              </div>
              <select
                value={config.checkUpdateFrequency}
                onChange={(e) => handleFrequencyChange(e.target.value as CheckFrequency)}
                className="input w-36"
              >
                <option value="startup">{t('settings.updates.frequency.startup')}</option>
                <option value="daily">{t('settings.updates.frequency.daily')}</option>
                <option value="weekly">{t('settings.updates.frequency.weekly')}</option>
              </select>
            </div>
          )}

          {/* Last checked info */}
          <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>{t('settings.updates.lastChecked')}</span>
            <span>{formatLastChecked()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Manual Actions */}
      <Card>
        <CardHeader
          title={t('settings.updates.manualActions')}
          subtitle={t('settings.updates.manualActionsDesc')}
        />
        <CardContent>
          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handleCheckUpdate}
              loading={checking}
              icon={<RefreshCw size={16} />}
            >
              {checking ? t('settings.updates.checking') : t('settings.updates.checkNow')}
            </Button>
            <Button
              variant="outline"
              onClick={handleViewChangelog}
              icon={<ExternalLink size={16} />}
            >
              {t('settings.updates.viewChangelog')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
