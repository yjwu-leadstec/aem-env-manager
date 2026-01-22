// Data Settings Component

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, Upload, RotateCcw, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';
import * as settingsApi from '@/api/settings';

export function DataSettings() {
  const { t } = useTranslation();
  const addNotification = useAppStore((s) => s.addNotification);
  const reset = useAppStore((s) => s.reset);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await settingsApi.exportConfiguration();
      if (result.success) {
        addNotification({
          type: 'success',
          title: t('settings.data.exportSuccess'),
          message: t('settings.data.exportedCount', {
            profiles: result.profiles_count,
            instances: result.instances_count,
          }),
        });
      } else if (result.error !== '操作已取消') {
        addNotification({
          type: 'error',
          title: t('settings.data.exportFailed'),
          message: result.error || t('common.unknown'),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('settings.data.exportFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const result = await settingsApi.importConfiguration();
      if (result.success) {
        addNotification({
          type: 'success',
          title: t('settings.data.importSuccess'),
          message: t('settings.data.importedCount', {
            profiles: result.profiles_imported,
            instances: result.instances_imported,
          }),
        });
        // Reload the page to reflect imported data
        window.location.reload();
      } else if (result.errors[0] !== '操作已取消') {
        addNotification({
          type: 'error',
          title: t('settings.data.importFailed'),
          message: result.errors.join('; '),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('settings.data.importFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await settingsApi.resetAllConfiguration();
      if (result.success) {
        // Reset local store
        reset();
        addNotification({
          type: 'success',
          title: t('settings.data.resetSuccess'),
          message: t('settings.data.resetCount', {
            profiles: result.profiles_deleted,
            instances: result.instances_deleted,
          }),
        });
        setShowResetConfirm(false);
        // Reload the page to reflect reset state
        window.location.reload();
      } else {
        addNotification({
          type: 'error',
          title: t('settings.data.resetFailed'),
          message: result.error || t('common.unknown'),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('settings.data.resetFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t('settings.data.exportImport')}
          subtitle={t('settings.data.exportImportDesc')}
        />
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant="outline"
              icon={<Download size={16} />}
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? t('settings.data.exporting') : t('settings.data.export')}
            </Button>
            <Button
              variant="outline"
              icon={<Upload size={16} />}
              onClick={handleImport}
              disabled={isImporting}
            >
              {isImporting ? t('settings.data.importing') : t('settings.data.import')}
            </Button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('settings.data.exportImportNote')}
          </p>
        </CardContent>
      </Card>

      <Card className="border-error-200 dark:border-error-800">
        <CardHeader
          title={t('settings.data.dangerZone')}
          subtitle={t('settings.data.dangerZoneDesc')}
        />
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-error/10 rounded-lg">
            <div>
              <p className="font-medium text-error-700 dark:text-error-400">
                {t('settings.data.resetAll')}
              </p>
              <p className="text-sm text-error-600 dark:text-error-500">
                {t('settings.data.resetAllDesc')}
              </p>
            </div>
            <Button
              variant="danger"
              icon={<RotateCcw size={16} />}
              onClick={() => setShowResetConfirm(true)}
            >
              {t('settings.data.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="panel max-w-md w-full mx-4 overflow-hidden p-0">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full bg-error/20">
                  <AlertTriangle size={24} className="text-error-600 dark:text-error-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{t('settings.data.confirmReset')}</h3>
                  <p className="text-sm opacity-70">{t('settings.data.cannotUndo')}</p>
                </div>
              </div>
              <p className="opacity-80 mb-6">{t('settings.data.confirmResetMessage')}</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="danger" onClick={handleReset} disabled={isResetting}>
                  {isResetting ? t('settings.data.resetting') : t('settings.data.confirmReset')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
