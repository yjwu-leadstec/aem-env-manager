import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Server,
  Play,
  Square,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { useAppStore, useAemInstances } from '../../store';
import * as instanceApi from '../../api/instance';
import { mapApiInstanceToFrontend } from '../../api/mappers';
import type { AEMInstance, AEMInstanceStatus } from '../../types';

export function AemInstanceCards() {
  const navigate = useNavigate();
  const instances = useAemInstances();
  const setAemInstances = useAppStore((s) => s.setAemInstances);
  const updateAemInstance = useAppStore((s) => s.updateAemInstance);
  const addNotification = useAppStore((s) => s.addNotification);

  const [isLoading, setIsLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  const loadInstances = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiInstances = await instanceApi.listInstances();
      const mappedInstances = apiInstances.map(mapApiInstanceToFrontend);
      setAemInstances(mappedInstances);
    } catch {
      // Failed to load instances
    } finally {
      setIsLoading(false);
    }
  }, [setAemInstances]);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const handleStart = async (instanceId: string) => {
    setActionInProgress(instanceId);
    updateAemInstance(instanceId, { status: 'starting' as AEMInstanceStatus });

    try {
      const success = await instanceApi.startInstance(instanceId);
      if (success) {
        updateAemInstance(instanceId, { status: 'running' as AEMInstanceStatus });
        addNotification({
          type: 'success',
          title: 'Instance started',
          message: `Instance is now running`,
        });
      } else {
        updateAemInstance(instanceId, { status: 'error' as AEMInstanceStatus });
        addNotification({
          type: 'error',
          title: 'Start failed',
          message: 'Failed to start instance',
        });
      }
    } catch (error) {
      updateAemInstance(instanceId, { status: 'error' as AEMInstanceStatus });
      addNotification({
        type: 'error',
        title: 'Start failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleStop = async (instanceId: string) => {
    setActionInProgress(instanceId);
    updateAemInstance(instanceId, { status: 'stopping' as AEMInstanceStatus });

    try {
      const success = await instanceApi.stopInstance(instanceId);
      if (success) {
        updateAemInstance(instanceId, { status: 'stopped' as AEMInstanceStatus });
        addNotification({
          type: 'success',
          title: 'Instance stopped',
          message: `Instance has been stopped`,
        });
      } else {
        updateAemInstance(instanceId, { status: 'error' as AEMInstanceStatus });
        addNotification({
          type: 'error',
          title: 'Stop failed',
          message: 'Failed to stop instance',
        });
      }
    } catch (error) {
      updateAemInstance(instanceId, { status: 'error' as AEMInstanceStatus });
      addNotification({
        type: 'error',
        title: 'Stop failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setActionInProgress(null);
    }
  };

  const handleOpenInBrowser = async (instanceId: string, path: string = '') => {
    try {
      await instanceApi.openInBrowser(instanceId, path);
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Failed to open browser',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <Card className="lg:col-span-2">
      <CardHeader
        title="AEM Instances"
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={<RefreshCw size={14} />}
              onClick={loadInstances}
              disabled={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<ArrowRight size={16} />}
              iconPosition="right"
              onClick={() => navigate('/instances')}
            >
              View All
            </Button>
          </div>
        }
      />
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw size={24} className="animate-spin text-azure" />
          </div>
        ) : instances.length === 0 ? (
          <EmptyState onAdd={() => navigate('/instances?action=new')} />
        ) : (
          <div className="space-y-3">
            {instances.slice(0, 4).map((instance) => (
              <InstanceRow
                key={instance.id}
                instance={instance}
                isActionInProgress={actionInProgress === instance.id}
                onStart={() => handleStart(instance.id)}
                onStop={() => handleStop(instance.id)}
                onOpenInBrowser={(path) => handleOpenInBrowser(instance.id, path)}
              />
            ))}
            {instances.length > 4 && (
              <p className="text-sm text-center text-slate-500 dark:text-slate-400 pt-2">
                And {instances.length - 4} more instances...
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface InstanceRowProps {
  instance: AEMInstance;
  isActionInProgress: boolean;
  onStart: () => void;
  onStop: () => void;
  onOpenInBrowser: (path?: string) => void;
}

function InstanceRow({
  instance,
  isActionInProgress,
  onStart,
  onStop,
  onOpenInBrowser,
}: InstanceRowProps) {
  const [showQuickLinks, setShowQuickLinks] = useState(false);

  return (
    <div
      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
      onMouseEnter={() => setShowQuickLinks(true)}
      onMouseLeave={() => setShowQuickLinks(false)}
    >
      <div className="flex items-center gap-3">
        <StatusBadge status={instance.status} />
        <div>
          <p className="font-medium text-slate-900 dark:text-slate-100">{instance.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {instance.host}:{instance.port} · {instance.instanceType}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {showQuickLinks && instance.status === 'running' && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              title="Open in browser"
              onClick={() => onOpenInBrowser()}
            >
              <ExternalLink size={14} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="CRXDE"
              onClick={() => onOpenInBrowser('/crx/de')}
            >
              CRXDE
            </Button>
          </div>
        )}

        {instance.status === 'stopped' && (
          <Button
            variant="ghost"
            size="sm"
            icon={
              isActionInProgress ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Play size={14} />
              )
            }
            onClick={onStart}
            disabled={isActionInProgress}
          >
            Start
          </Button>
        )}

        {instance.status === 'running' && (
          <Button
            variant="ghost"
            size="sm"
            icon={
              isActionInProgress ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                <Square size={14} />
              )
            }
            onClick={onStop}
            disabled={isActionInProgress}
          >
            Stop
          </Button>
        )}

        {(instance.status === 'starting' || instance.status === 'stopping') && (
          <Button variant="ghost" size="sm" disabled>
            <RefreshCw size={14} className="animate-spin" />
          </Button>
        )}

        {instance.status === 'error' && (
          <Button variant="ghost" size="sm" className="text-error-500">
            <AlertCircle size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  onAdd: () => void;
}

function EmptyState({ onAdd }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <Server size={40} className="text-slate-300 dark:text-slate-600 mb-3" />
      <p className="text-slate-500 dark:text-slate-400 mb-4">No AEM instances configured</p>
      <Button variant="outline" size="sm" onClick={onAdd}>
        Add Instance
      </Button>
    </div>
  );
}
