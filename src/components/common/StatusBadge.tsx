import { useTranslation } from 'react-i18next';
import type { AEMInstanceStatus } from '../../types';

interface StatusBadgeProps {
  status: AEMInstanceStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig: Record<AEMInstanceStatus, { color: string; i18nKey: string; pulse?: boolean }> =
  {
    running: { color: 'bg-success', i18nKey: 'instance.status.running', pulse: true },
    stopped: { color: 'bg-slate-400', i18nKey: 'instance.status.stopped' },
    starting: { color: 'bg-warning', i18nKey: 'instance.status.starting', pulse: true },
    stopping: { color: 'bg-warning', i18nKey: 'instance.status.stopping', pulse: true },
    error: { color: 'bg-error', i18nKey: 'instance.status.error' },
    unknown: { color: 'bg-slate-300', i18nKey: 'instance.status.unknown' },
    port_conflict: { color: 'bg-orange-500', i18nKey: 'instance.status.portConflict' },
  };

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export function StatusBadge({ status, size = 'md', showLabel = false }: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status];

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <div className={`rounded-full ${config.color} ${sizeClasses[size]}`} />
        {config.pulse && (
          <div
            className={`absolute inset-0 rounded-full ${config.color} animate-ping opacity-75`}
          />
        )}
      </div>
      {showLabel && (
        <span className="text-sm text-slate-600 dark:text-gray-400">{t(config.i18nKey)}</span>
      )}
    </div>
  );
}
