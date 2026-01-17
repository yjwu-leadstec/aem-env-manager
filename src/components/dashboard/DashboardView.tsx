import { useNavigate } from 'react-router-dom';
import { ProfileSwitcher } from './ProfileSwitcher';
import { StatusCards } from './StatusCards';
import { QuickActionsPanel } from './QuickActionsPanel';
import { AemInstanceCards } from './AemInstanceCards';

export function DashboardView() {
  const navigate = useNavigate();

  const handleCardClick = (type: 'java' | 'node' | 'maven' | 'project') => {
    if (type === 'java' || type === 'node' || type === 'maven') {
      navigate('/versions');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header with Profile Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Dashboard</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Overview of your AEM development environment
          </p>
        </div>
        <ProfileSwitcher />
      </div>

      {/* Status Cards */}
      <StatusCards onCardClick={handleCardClick} />

      {/* Quick Actions & Instances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <QuickActionsPanel />
        </div>

        {/* AEM Instances */}
        <AemInstanceCards />
      </div>
    </div>
  );
}
