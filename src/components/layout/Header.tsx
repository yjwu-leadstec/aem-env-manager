import { Bell, User, RefreshCw } from 'lucide-react';
import { useActiveProfile, useNotifications, useIsLoading } from '../../store';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

export function Header() {
  const activeProfile = useActiveProfile();
  const notifications = useNotifications();
  const isLoading = useIsLoading();

  const unreadCount = notifications.length;

  return (
    <header className="h-16 bg-white/70 dark:bg-viewport/70 backdrop-blur-xl border-b border-white/50 dark:border-steel/50 flex items-center justify-between px-6">
      {/* Left spacer */}
      <div className="flex-1" />

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Active Profile Badge */}
        {activeProfile && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-azure-50/80 dark:bg-tech-orange-500/20 backdrop-blur rounded-full">
            <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="text-sm font-medium text-azure-700 dark:text-tech-orange-400">
              {activeProfile.name}
            </span>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <RefreshCw size={20} className="text-azure dark:text-tech-orange animate-spin" />
        )}

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <button className="relative p-2 rounded-xl text-slate-500 dark:text-gray-400 hover:bg-white/60 dark:hover:bg-viewport-light/60 hover:text-slate-700 dark:hover:text-gray-200 transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-error-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Menu */}
        <button className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-white/60 dark:hover:bg-viewport-light/60 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-azure to-teal dark:from-tech-orange dark:to-tech-orange-600 flex items-center justify-center shadow-lg">
            <User size={16} className="text-white" />
          </div>
        </button>
      </div>
    </header>
  );
}
