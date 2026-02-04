import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { ProfileSwitcher } from './ProfileSwitcher';
import { StatusCards } from './StatusCards';
import { QuickActionsPanel } from './QuickActionsPanel';
import { AemInstanceCards } from './AemInstanceCards';

export function DashboardView() {
  const { t } = useTranslation();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSwitchComplete = useCallback((success: boolean) => {
    if (success) {
      setRefreshTrigger((prev) => prev + 1);
    }
  }, []);

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
        <ProfileSwitcher onSwitchComplete={handleSwitchComplete} />
      </div>

      {/* Quick Actions - Horizontal */}
      <QuickActionsPanel />

      {/* Status Cards - 3 columns */}
      <StatusCards refreshTrigger={refreshTrigger} />

      {/* AEM Instances Section */}
      <AemInstanceCards />
    </div>
  );
}
