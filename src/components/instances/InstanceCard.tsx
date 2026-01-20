import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, ExternalLink, MoreVertical, Server, RefreshCw, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { InstanceMenu } from './InstanceMenu';
import type { AEMInstance } from '@/types';

interface InstanceCardProps {
  instance: AEMInstance;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenBrowser: (path?: string) => void;
  onRefreshStatus?: () => void;
  isStarting?: boolean;
  isRefreshing?: boolean;
  /** Process name if port is conflicted */
  conflictProcessName?: string | null;
  /** Last status check timestamp */
  lastChecked?: string | null;
}

export function InstanceCard({
  instance,
  onStart,
  onEdit,
  onDelete,
  onOpenBrowser,
  onRefreshStatus,
  isStarting = false,
  isRefreshing = false,
  conflictProcessName,
  lastChecked,
}: InstanceCardProps) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);

  const typeColors = {
    author: 'bg-primary/10 text-primary',
    publish: 'badge-success',
    dispatcher: 'badge-warning',
  };

  // Format last checked time
  const formatLastChecked = (isoDate: string | null | undefined) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    return date.toLocaleTimeString();
  };

  return (
    <Card className="relative">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Server icon */}
          <div className="w-10 h-10 rounded-full bg-azure-50 dark:bg-azure-900/30 flex items-center justify-center">
            <Server size={20} className="text-azure-600 dark:text-azure-400" />
          </div>
          <div>
            <h3 className="font-semibold">{instance.name}</h3>
            <p className="text-sm opacity-70">
              {instance.host}:{instance.port}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[instance.instanceType]}`}
          >
            {instance.instanceType}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            >
              <MoreVertical size={16} className="opacity-50" />
            </button>
            {showMenu && (
              <InstanceMenu
                onClose={() => setShowMenu(false)}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )}
          </div>
        </div>
      </div>

      {/* Status display */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StatusBadge status={instance.status} showLabel />
          {onRefreshStatus && (
            <button
              onClick={onRefreshStatus}
              disabled={isRefreshing}
              className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
              title={t('instance.actions.refreshStatus')}
            >
              <RefreshCw size={14} className={`opacity-50 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        {lastChecked && (
          <span className="text-xs opacity-50" title={t('instance.card.lastChecked')}>
            {formatLastChecked(lastChecked)}
          </span>
        )}
      </div>

      {/* Port conflict warning */}
      {instance.status === 'port_conflict' && conflictProcessName && (
        <div className="mb-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle size={14} className="text-orange-500 flex-shrink-0" />
          <span className="text-orange-700 dark:text-orange-300">
            {t('instance.card.portConflict', { process: conflictProcessName })}
          </span>
        </div>
      )}

      {/* Path display */}
      <div className="mb-3 text-sm">
        <span className="opacity-70">{t('instance.card.path')}</span>
        <span className="ml-2 font-medium truncate" title={instance.path}>
          {instance.path.split('/').pop()}
        </span>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {/* Primary: Start button */}
        <Button
          variant="primary"
          size="sm"
          icon={<Play size={14} />}
          onClick={onStart}
          disabled={isStarting}
        >
          {isStarting ? t('common.loading') : t('instance.actions.start')}
        </Button>

        {/* Secondary: Open in browser */}
        <Button
          variant="outline"
          size="sm"
          icon={<ExternalLink size={14} />}
          onClick={() => onOpenBrowser()}
        >
          {t('instance.actions.open')}
        </Button>
      </div>
    </Card>
  );
}
