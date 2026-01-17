import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NotificationToast } from '../common/NotificationToast';

export function MainLayout() {
  return (
    <div className="flex h-screen bg-sky-gradient">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>

      <NotificationToast />
    </div>
  );
}
