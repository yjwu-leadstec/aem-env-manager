import { Bell, Search, User, RefreshCw } from 'lucide-react';
import { useActiveProfile, useNotifications, useIsLoading } from '../../store';
import { ThemeToggle } from '../common/ThemeToggle';

export function Header() {
  const activeProfile = useActiveProfile();
  const notifications = useNotifications();
  const isLoading = useIsLoading();

  const unreadCount = notifications.length;

  return (
    <header className="h-16 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-b border-white/50 dark:border-slate-700/50 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
          />
          <input
            type="text"
            placeholder="搜索配置、实例..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/50 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-azure-500/20 focus:border-azure-500"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Active Profile Badge */}
        {activeProfile && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-azure-50/80 dark:bg-azure-900/30 backdrop-blur rounded-full">
            <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="text-sm font-medium text-azure-700 dark:text-azure-300">
              {activeProfile.name}
            </span>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && <RefreshCw size={20} className="text-azure animate-spin" />}

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-error-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Menu */}
        <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/60 dark:hover:bg-slate-700/60 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-azure to-teal flex items-center justify-center shadow-lg">
            <User size={16} className="text-white" />
          </div>
        </button>
      </div>
    </header>
  );
}
