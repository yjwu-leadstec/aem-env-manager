import { MainLayout } from './components/layout';
import { DashboardView } from './components/dashboard';
import { useCurrentView } from './store';

function App() {
  const currentView = useCurrentView();

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardView />;
      case 'profiles':
        return <PlaceholderView title="Environment Profiles" description="Manage your environment configurations" />;
      case 'versions':
        return <PlaceholderView title="Version Management" description="Switch Java and Node.js versions" />;
      case 'instances':
        return <PlaceholderView title="AEM Instances" description="Manage your AEM author and publish instances" />;
      case 'settings':
        return <PlaceholderView title="Settings" description="Configure application preferences" />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <MainLayout>
      {renderView()}
    </MainLayout>
  );
}

// Temporary placeholder for views not yet implemented
function PlaceholderView({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        <p className="text-slate-500 mt-1">{description}</p>
      </div>
      <div className="card p-12 flex flex-col items-center justify-center text-center">
        <div className="w-16 h-16 rounded-full bg-azure-50 flex items-center justify-center mb-4">
          <span className="text-2xl">🚧</span>
        </div>
        <h3 className="text-lg font-semibold text-slate-700">Coming Soon</h3>
        <p className="text-slate-500 mt-2 max-w-md">
          This view is under development. Check back soon for updates.
        </p>
      </div>
    </div>
  );
}

export default App;
