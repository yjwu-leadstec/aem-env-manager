import type { AEMInstanceStatus } from '../../types';

interface StatusBadgeProps {
  status: AEMInstanceStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const statusConfig: Record<AEMInstanceStatus, { color: string; label: string; pulse?: boolean }> = {
  running: { color: 'bg-success', label: 'Running', pulse: true },
  stopped: { color: 'bg-slate-400', label: 'Stopped' },
  starting: { color: 'bg-warning', label: 'Starting', pulse: true },
  stopping: { color: 'bg-warning', label: 'Stopping', pulse: true },
  error: { color: 'bg-error', label: 'Error' },
  unknown: { color: 'bg-slate-300', label: 'Unknown' },
  port_conflict: { color: 'bg-orange-500', label: 'Port Conflict' },
};

const sizeClasses = {
  sm: 'w-2 h-2',
  md: 'w-2.5 h-2.5',
  lg: 'w-3 h-3',
};

export function StatusBadge({ status, size = 'md', showLabel = false }: StatusBadgeProps) {
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
        <span className="text-sm text-slate-600 dark:text-gray-400">{config.label}</span>
      )}
    </div>
  );
}
