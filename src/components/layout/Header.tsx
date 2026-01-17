import { Bell, Search, User, RefreshCw } from 'lucide-react';
import { useActiveProfile, useNotifications, useIsLoading } from '../../store';

export function Header() {
  const activeProfile = useActiveProfile();
  const notifications = useNotifications();
  const isLoading = useIsLoading();

  const unreadCount = notifications.length;

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center gap-4 flex-1">
        <div className="relative max-w-md w-full">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search profiles, instances..."
            className="input pl-10 w-full"
          />
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Active Profile Badge */}
        {activeProfile && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-azure-50 rounded-full">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span className="text-sm font-medium text-azure-700">
              {activeProfile.name}
            </span>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <RefreshCw size={20} className="text-azure animate-spin" />
        )}

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors">
          <Bell size={20} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-error text-white text-xs font-medium rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Menu */}
        <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-azure to-teal flex items-center justify-center">
            <User size={16} className="text-white" />
          </div>
        </button>
      </div>
    </header>
  );
}
