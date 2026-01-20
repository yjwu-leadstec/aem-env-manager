import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, ExternalLink, MoreVertical, Server } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { InstanceMenu } from './InstanceMenu';
import type { AEMInstance } from '@/types';

interface InstanceCardProps {
  instance: AEMInstance;
  onStart: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onOpenBrowser: (path?: string) => void;
  isStarting?: boolean;
}

export function InstanceCard({
  instance,
  onStart,
  onEdit,
  onDelete,
  onOpenBrowser,
  isStarting = false,
}: InstanceCardProps) {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);

  const typeColors = {
    author: 'bg-primary/10 text-primary',
    publish: 'badge-success',
    dispatcher: 'badge-warning',
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
