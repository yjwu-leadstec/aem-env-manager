import { ProfileSwitcher } from './ProfileSwitcher';
import { StatusCards } from './StatusCards';
import { QuickActionsPanel } from './QuickActionsPanel';
import { AemInstanceCards } from './AemInstanceCards';

export function DashboardView() {
  return (
    <div className="space-y-6">
      {/* Page Header with Profile Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">仪表盘</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">管理你的开发环境</p>
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
