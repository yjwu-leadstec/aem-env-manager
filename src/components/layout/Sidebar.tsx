import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderCog,
  Layers,
  Server,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAppStore, usePreferences } from '../../store';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { path: '/profiles', label: 'Profiles', icon: <FolderCog size={20} /> },
  { path: '/versions', label: 'Versions', icon: <Layers size={20} /> },
  { path: '/instances', label: 'Instances', icon: <Server size={20} /> },
  { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
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
        flex flex-col bg-white border-r border-slate-200 transition-all duration-300
        ${collapsed ? 'w-16' : 'w-56'}
      `}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-azure to-teal flex items-center justify-center">
            <span className="text-white font-bold text-sm">AEM</span>
          </div>
          {!collapsed && (
            <span className="font-semibold text-slate-800 whitespace-nowrap">Env Manager</span>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                nav-item w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                transition-all duration-200
                ${
                  isActive
                    ? 'bg-azure-50 text-azure-600 font-medium'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? item.label : undefined}
            >
              <span className={isActive ? 'text-azure' : ''}>{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <div className="p-2 border-t border-slate-200">
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center justify-center p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>
    </aside>
  );
}
