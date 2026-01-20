import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { DashboardView } from '@/components/dashboard';
import { ProfilesPage } from '@/pages/ProfilesPage';
import { InstancesPage } from '@/pages/InstancesPage';
import { VersionsPage } from '@/pages/VersionsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { WizardPage } from '@/pages/WizardPage';
import { ErrorBoundary, RequireSetup } from '@/components/common';

const router = createBrowserRouter([
  {
    path: '/wizard',
    element: <WizardPage />,
  },
  {
    path: '/',
    element: (
      <RequireSetup>
        <MainLayout />
      </RequireSetup>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardView />,
      },
      {
        path: 'profiles',
        element: <ProfilesPage />,
      },
      {
        path: 'instances',
        element: <InstancesPage />,
      },
      {
        path: 'versions',
        element: <VersionsPage />,
      },
      // Legacy routes - redirect to unified versions page
      {
        path: 'java',
        element: <Navigate to="/versions?tab=java" replace />,
      },
      {
        path: 'node',
        element: <Navigate to="/versions?tab=node" replace />,
      },
      {
        path: 'maven',
        element: <Navigate to="/versions?tab=maven" replace />,
      },
      // Legacy route - redirect to versions licenses tab
      {
        path: 'licenses',
        element: <Navigate to="/versions?tab=licenses" replace />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
    ],
  },
]);

export function AppRouter() {
  return (
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  );
}
