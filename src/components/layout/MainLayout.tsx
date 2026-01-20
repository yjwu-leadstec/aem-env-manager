import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { StatusBar } from './StatusBar';
import { NotificationToast } from '../common/NotificationToast';
import { initializeTheme } from '../common/ThemeToggle';
import { useConfig } from '../../store';

export function MainLayout() {
  const config = useConfig();

  // Initialize theme on mount and when config changes
  useEffect(() => {
    const cleanup = initializeTheme(config.theme);
    return cleanup;
  }, [config.theme]);

  return (
    <div className="flex h-screen sky-bg">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto p-6 scrollbar-thin">
          <Outlet />
        </main>

        <StatusBar />
      </div>

      <NotificationToast />
    </div>
  );
}
