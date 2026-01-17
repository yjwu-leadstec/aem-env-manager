import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../store';
import * as versionApi from '../../api/version';

export function QuickActionsPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const addNotification = useAppStore((s) => s.addNotification);

  const handleRefresh = async () => {
    try {
      addNotification({
        type: 'info',
        title: t('dashboard.scanning'),
        message: t('dashboard.scanningVersions'),
        duration: 2000,
      });

      await versionApi.getAllVersionInfo();

      addNotification({
        type: 'success',
        title: t('dashboard.scanComplete'),
        message: t('dashboard.allDataUpdated'),
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('dashboard.scanFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    }
  };

  return (
    <div className="panel p-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100 mb-4">
        {t('dashboard.quickActions')}
      </h2>
      <div className="flex flex-wrap gap-3">
        <button
          className="btn-outline px-5 py-3 text-sm flex items-center gap-2"
          onClick={handleRefresh}
        >
          <span>🔄</span> {t('dashboard.scanEnv')}
        </button>

        <button
          className="btn-outline px-5 py-3 text-sm flex items-center gap-2"
          onClick={() => navigate('/profiles?action=new')}
        >
          <span>📋</span> {t('dashboard.newProfile')}
        </button>

        <button
          className="btn-outline px-5 py-3 text-sm flex items-center gap-2"
          onClick={() => navigate('/instances?action=new')}
        >
          <span>🖥️</span> {t('dashboard.addInstance')}
        </button>

        <button
          className="btn-outline px-5 py-3 text-sm flex items-center gap-2"
          onClick={() => {
            addNotification({
              type: 'info',
              title: t('dashboard.openTerminal'),
              message: t('dashboard.featureInProgress'),
            });
          }}
        >
          <span>💻</span> {t('dashboard.openTerminal')}
        </button>
      </div>
    </div>
  );
}
