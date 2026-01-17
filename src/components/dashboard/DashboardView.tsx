import { useTranslation } from 'react-i18next';
import { ProfileSwitcher } from './ProfileSwitcher';
import { StatusCards } from './StatusCards';
import { QuickActionsPanel } from './QuickActionsPanel';
import { AemInstanceCards } from './AemInstanceCards';

export function DashboardView() {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      {/* Page Header with Profile Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">
            {t('dashboard.title')}
          </h1>
          <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">{t('dashboard.welcome')}</p>
        </div>
        <ProfileSwitcher />
      </div>

      {/* Status Cards - 4 columns */}
      <StatusCards />

      {/* AEM Instances Section */}
      <AemInstanceCards />

      {/* Quick Actions - Horizontal */}
      <QuickActionsPanel />
    </div>
  );
}
