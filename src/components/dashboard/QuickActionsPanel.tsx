import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Code, Package, Settings, FileText, FolderPlus, Monitor } from 'lucide-react';
import { useAemInstances, useActiveProfile, useAppStore } from '../../store';
import * as instanceApi from '../../api/instance';

export function QuickActionsPanel() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const allInstances = useAemInstances();
  const activeProfile = useActiveProfile();
  const addNotification = useAppStore((s) => s.addNotification);

  // Get Author instance from active profile for quick actions
  const activeInstance =
    activeProfile && activeProfile.authorInstanceId
      ? allInstances.find((inst) => inst.id === activeProfile.authorInstanceId)
      : null;

  // Quick action definitions with lucide-react icons
  const quickActions = [
    {
      label: 'CRXDE',
      path: '/crx/de/index.jsp',
      icon: Code,
      type: 'aem' as const,
    },
    {
      label: '包管理器',
      path: '/crx/packmgr/index.jsp',
      icon: Package,
      type: 'aem' as const,
    },
    {
      label: 'Bundles',
      path: '/system/console/bundles',
      icon: Settings,
      type: 'aem' as const,
    },
    {
      label: '日志',
      path: '/system/console/slinglog',
      icon: FileText,
      type: 'aem' as const,
    },
    {
      label: t('dashboard.newProfile'),
      icon: FolderPlus,
      type: 'action' as const,
      action: () => navigate('/profiles?action=new'),
    },
    {
      label: t('dashboard.addInstance'),
      icon: Monitor,
      type: 'action' as const,
      action: () => navigate('/instances?action=new'),
    },
  ];

  const handleQuickLink = async (path: string) => {
    if (!activeInstance) {
      addNotification({
        type: 'warning',
        title: t('dashboard.quickActions'),
        message: t('dashboard.noActiveInstance', '请先激活一个 AEM 实例'),
      });
      return;
    }

    try {
      await instanceApi.openInBrowser(activeInstance.id, path);
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('dashboard.quickActions'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    }
  };

  return (
    <div className="panel p-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-gray-100 mb-5">
        {t('dashboard.quickActions')}
      </h2>
      <div className="flex flex-wrap gap-3">
        {quickActions.map((item, index) => {
          const Icon = item.icon;
          const isAemAction = item.type === 'aem';
          const isDisabled = isAemAction && !activeInstance;

          return (
            <button
              key={index}
              className={`
                flex items-center gap-2
                px-4 py-2.5
                bg-white dark:bg-slate-800
                rounded-full
                border border-slate-300 dark:border-slate-600
                text-sm font-medium
                transition-all duration-200
                ${
                  isDisabled
                    ? 'opacity-40 cursor-not-allowed text-slate-400 dark:text-slate-500'
                    : 'text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-400 dark:hover:border-slate-500'
                }
              `}
              onClick={() => {
                if (item.type === 'aem') {
                  handleQuickLink(item.path!);
                } else {
                  item.action!();
                }
              }}
              disabled={isDisabled}
            >
              <Icon size={18} className={isDisabled ? '' : 'text-slate-600 dark:text-gray-300'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
