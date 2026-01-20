/**
 * UpdateBadge Component
 *
 * Displays an update indicator in the Header area.
 * Shows a bell icon with a red dot badge when updates are available.
 */

import { Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface UpdateBadgeProps {
  /** Whether an update is available */
  hasUpdate: boolean;
  /** Click handler to open update dialog */
  onClick: () => void;
}

export function UpdateBadge({ hasUpdate, onClick }: UpdateBadgeProps) {
  const { t } = useTranslation();

  // Don't render if no update available
  if (!hasUpdate) {
    return null;
  }

  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      title={t('update.badge.tooltip')}
      aria-label={t('update.badge.tooltip')}
    >
      <Bell size={20} className="text-slate-600 dark:text-slate-400" />

      {/* Red dot badge */}
      <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
    </button>
  );
}
