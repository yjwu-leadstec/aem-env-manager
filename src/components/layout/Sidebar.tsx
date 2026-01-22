import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAppStore, usePreferences } from '../../store';
import { useAppVersion } from '../../hooks';

interface NavItem {
  path: string;
  labelKey: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: '🏠' },
  { path: '/instances', labelKey: 'nav.instances', icon: '🖥️' },
  { path: '/profiles', labelKey: 'nav.profiles', icon: '📋' },
  { path: '/versions', labelKey: 'nav.versions', icon: '🔧' },
  { path: '/settings', labelKey: 'nav.settings', icon: '⚙️' },
];

export function Sidebar() {
  const { t } = useTranslation();
  const location = useLocation();
  const preferences = usePreferences();
  const updatePreferences = useAppStore((s) => s.updatePreferences);
  const appVersion = useAppVersion();

  const collapsed = preferences.sidebarCollapsed;

  const toggleCollapsed = () => {
    updatePreferences({ sidebarCollapsed: !collapsed });
  };

  return (
    <aside
      className={`
        sidebar-container flex flex-col transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-azure to-teal dark:from-tech-orange dark:to-tech-orange-600 flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">AEM</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800 dark:text-gray-200 whitespace-nowrap">
                {t('app.title').replace('AEM ', '')}
              </span>
              <span className="text-xs text-slate-400 dark:text-gray-500">v{appVersion}</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const label = t(item.labelKey);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                nav-item
                ${isActive ? 'active' : 'hover:bg-white/50 dark:hover:bg-white/5'}
                ${collapsed ? 'justify-center px-2' : ''}
              `}
              title={collapsed ? label : undefined}
            >
              <span className="text-xl relative z-10">{item.icon}</span>
              {!collapsed && <span className="font-medium relative z-10">{label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-center p-2.5 rounded-xl text-slate-400 dark:text-gray-500 hover:bg-white/60 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
          title={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
}
