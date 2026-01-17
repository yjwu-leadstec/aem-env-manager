import { NavLink, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useAppStore, usePreferences } from '../../store';

interface NavItem {
  path: string;
  label: string;
  icon: string;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: '首页', icon: '🏠' },
  { path: '/profiles', label: '环境配置', icon: '📋' },
  { path: '/instances', label: 'AEM 实例', icon: '🖥️' },
  { path: '/java', label: 'Java', icon: '☕' },
  { path: '/node', label: 'Node', icon: '📦' },
  { path: '/maven', label: 'Maven', icon: '🔧' },
  { path: '/licenses', label: '许可证', icon: '📜' },
  { path: '/settings', label: '设置', icon: '⚙️' },
];

export function Sidebar() {
  const location = useLocation();
  const preferences = usePreferences();
  const updatePreferences = useAppStore((s) => s.updatePreferences);

  const collapsed = preferences.sidebarCollapsed;

  const toggleCollapsed = () => {
    updatePreferences({ sidebarCollapsed: !collapsed });
  };

  return (
    <aside
      className={`
        flex flex-col bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl
        border-r border-white/50 dark:border-slate-700/50 transition-all duration-300
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-white/50 dark:border-slate-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-azure to-teal flex items-center justify-center shadow-lg">
            <span className="text-white font-bold text-sm">AEM</span>
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">
                环境管理器
              </span>
              <span className="text-xs text-slate-400 dark:text-slate-500">v0.1.0</span>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                nav-item relative flex items-center gap-3 px-4 py-3 rounded-xl
                transition-all duration-200
                ${
                  isActive
                    ? 'bg-white dark:bg-slate-700 text-azure-500 dark:text-azure-400 shadow-soft'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-white/60 dark:hover:bg-slate-700/60'
                }
                ${collapsed ? 'justify-center px-2' : ''}
              `}
              title={collapsed ? item.label : undefined}
            >
              {isActive && !collapsed && (
                <span
                  className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r-sm"
                  style={{ background: 'linear-gradient(180deg, #0ea5e9, #14b8a6)' }}
                />
              )}
              <span className="text-xl">{item.icon}</span>
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-white/50 dark:border-slate-700/50">
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-center p-2.5 rounded-xl text-slate-400 dark:text-slate-500 hover:bg-white/60 dark:hover:bg-slate-700/60 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
}
