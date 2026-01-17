import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { MainLayout } from '@/components/layout';
import { DashboardView } from '@/components/dashboard';
import { ProfilesPage } from '@/pages/ProfilesPage';
import { InstancesPage } from '@/pages/InstancesPage';
import { JavaPage } from '@/pages/JavaPage';
import { NodePage } from '@/pages/NodePage';
import { MavenPage } from '@/pages/MavenPage';
import { LicensesPage } from '@/pages/LicensesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { WizardPage } from '@/pages/WizardPage';
import { ErrorBoundary } from '@/components/common';

const router = createBrowserRouter([
  {
    path: '/wizard',
    element: <WizardPage />,
  },
  {
    path: '/',
    element: <MainLayout />,
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
        path: 'java',
        element: <JavaPage />,
      },
      {
        path: 'node',
        element: <NodePage />,
      },
      {
        path: 'maven',
        element: <MavenPage />,
      },
      {
        path: 'licenses',
        element: <LicensesPage />,
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
