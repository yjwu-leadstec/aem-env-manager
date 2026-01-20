import { Navigate, useLocation } from 'react-router-dom';
import { usePreferences } from '@/store';

interface RequireSetupProps {
  children: React.ReactNode;
}

/**
 * Route guard that redirects to the setup wizard if not completed.
 * Wrap your main layout with this component to ensure users complete setup first.
 */
export function RequireSetup({ children }: RequireSetupProps) {
  const preferences = usePreferences();
  const location = useLocation();

  // If wizard not completed, redirect to wizard
  if (!preferences.wizardCompleted) {
    return <Navigate to="/wizard" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
