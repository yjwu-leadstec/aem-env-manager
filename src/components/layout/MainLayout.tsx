import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NotificationToast } from '../common/NotificationToast';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex h-screen bg-sky-gradient">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />

        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>

      <NotificationToast />
    </div>
  );
}
