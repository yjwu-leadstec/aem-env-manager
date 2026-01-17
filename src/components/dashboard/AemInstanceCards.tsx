import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Server, Plus, RefreshCw, ArrowRight } from 'lucide-react';
import { useAppStore, useAemInstances } from '../../store';
import * as instanceApi from '../../api/instance';
import { mapApiInstanceToFrontend } from '../../api/mappers';
import type { AEMInstance, AEMInstanceStatus } from '../../types';

export function AemInstanceCards() {
  const { t } = useTranslation();
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
          title: t('instance.notifications.started'),
          message: t('instance.notifications.runningMessage'),
        });
      } else {
        updateAemInstance(instanceId, { status: 'error' as AEMInstanceStatus });
        addNotification({
          type: 'error',
          title: t('instance.notifications.startFailed'),
          message: t('instance.notifications.cannotStart'),
        });
      }
    } catch (error) {
      updateAemInstance(instanceId, { status: 'error' as AEMInstanceStatus });
      addNotification({
        type: 'error',
        title: t('instance.notifications.startFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
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
          title: t('instance.notifications.stopped'),
          message: t('instance.notifications.stoppedMessage'),
        });
      } else {
        updateAemInstance(instanceId, { status: 'error' as AEMInstanceStatus });
        addNotification({
          type: 'error',
          title: t('instance.notifications.stopFailed'),
          message: t('instance.notifications.cannotStop'),
        });
      }
    } catch (error) {
      updateAemInstance(instanceId, { status: 'error' as AEMInstanceStatus });
      addNotification({
        type: 'error',
        title: t('instance.notifications.stopFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
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
        title: t('instance.notifications.openBrowserFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    }
  };

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
          {t('dashboard.aemInstances')}
        </h2>
        <div className="flex items-center gap-2">
          <button
            className="btn-soft px-4 py-2 text-sm flex items-center gap-2"
            onClick={() => navigate('/instances?action=new')}
          >
            <Plus size={16} />
            {t('instance.add')}
          </button>
          <button
            className="btn-ghost px-3 py-2 text-sm flex items-center gap-2"
            onClick={loadInstances}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            {t('common.refresh')}
          </button>
          <button
            className="btn-ghost px-3 py-2 text-sm flex items-center gap-1"
            onClick={() => navigate('/instances')}
          >
            {t('dashboard.viewAll')} <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={24} className="animate-spin text-azure" />
        </div>
      ) : instances.length === 0 ? (
        <EmptyState onAdd={() => navigate('/instances?action=new')} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {instances.slice(0, 4).map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              isActionInProgress={actionInProgress === instance.id}
              onStart={() => handleStart(instance.id)}
              onStop={() => handleStop(instance.id)}
              onOpenInBrowser={(path) => handleOpenInBrowser(instance.id, path)}
            />
          ))}
        </div>
      )}

      {instances.length > 4 && (
        <p className="text-sm text-center text-slate-500 dark:text-slate-400 mt-4">
          {t('dashboard.moreInstances', { count: instances.length - 4 })}{' '}
          <button
            className="text-azure hover:text-azure-600 font-medium"
            onClick={() => navigate('/instances')}
          >
            {t('dashboard.viewAll')}
          </button>
        </p>
      )}
    </div>
  );
}

interface InstanceCardProps {
  instance: AEMInstance;
  isActionInProgress: boolean;
  onStart: () => void;
  onStop: () => void;
  onOpenInBrowser: (path?: string) => void;
}

function InstanceCard({
  instance,
  isActionInProgress,
  onStart,
  onStop,
  onOpenInBrowser,
}: InstanceCardProps) {
  const { t } = useTranslation();
  const isRunning = instance.status === 'running';
  const isStopped = instance.status === 'stopped';
  const isTransitioning = instance.status === 'starting' || instance.status === 'stopping';

  return (
    <div className="panel-flat p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-3 h-3 rounded-full ${
              isRunning
                ? 'bg-success-500 shadow-[0_0_8px_rgba(34,197,94,0.5)] animate-pulse'
                : isStopped
                  ? 'bg-slate-400 dark:bg-slate-500'
                  : 'bg-warning-500 animate-pulse'
            }`}
          />
          <span className="font-semibold text-slate-900 dark:text-slate-100">{instance.name}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-700 px-2.5 py-1 rounded-lg shadow-soft">
            {instance.host}:{instance.port}
          </span>
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
            isRunning
              ? 'badge-success'
              : isStopped
                ? 'badge-slate'
                : isTransitioning
                  ? 'badge-warning'
                  : 'badge-error'
          }`}
        >
          {isRunning
            ? t('instance.status.running')
            : isStopped
              ? t('instance.status.stopped')
              : isTransitioning
                ? instance.status === 'starting'
                  ? t('instance.status.starting')
                  : t('instance.status.stopping')
                : t('instance.status.error')}
        </span>
      </div>

      {/* Info Grid - Only show when running */}
      {isRunning && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white dark:bg-slate-700 rounded-xl p-3 shadow-soft">
            <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">
              {t('instance.fields.version')}
            </div>
            <div className="text-slate-900 dark:text-slate-100 text-sm font-semibold">2024.11</div>
          </div>
          <div className="bg-white dark:bg-slate-700 rounded-xl p-3 shadow-soft">
            <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">
              {t('instance.fields.type')}
            </div>
            <div className="text-slate-900 dark:text-slate-100 text-sm font-semibold">
              {instance.instanceType === 'author' ? 'Author' : 'Publish'}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-700 rounded-xl p-3 shadow-soft">
            <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">
              {t('instance.fields.runningTime')}
            </div>
            <div className="text-slate-900 dark:text-slate-100 text-sm font-semibold">--</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        {isRunning && (
          <>
            <button
              className="flex-1 btn-ghost px-3 py-2 text-xs"
              onClick={() => onOpenInBrowser('/crx/de')}
            >
              CRXDE
            </button>
            <button
              className="flex-1 btn-ghost px-3 py-2 text-xs"
              onClick={() => onOpenInBrowser('/crx/packmgr')}
            >
              {t('instance.actions.packageManager')}
            </button>
            <button
              className="flex-1 btn-ghost px-3 py-2 text-xs"
              onClick={() => onOpenInBrowser('/system/console')}
            >
              {t('instance.actions.console')}
            </button>
            <button
              className="bg-error-50 dark:bg-error-500/20 text-error-500 dark:text-error-400 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-error-100 dark:hover:bg-error-500/30 transition-colors disabled:opacity-50"
              onClick={onStop}
              disabled={isActionInProgress}
            >
              {isActionInProgress ? (
                <RefreshCw size={14} className="animate-spin" />
              ) : (
                t('instance.actions.stop')
              )}
            </button>
          </>
        )}

        {isStopped && (
          <button
            className="flex-1 bg-gradient-to-r from-success-500 to-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:shadow-lg transition-all disabled:opacity-50"
            onClick={onStart}
            disabled={isActionInProgress}
          >
            {isActionInProgress ? (
              <RefreshCw size={14} className="animate-spin mx-auto" />
            ) : (
              `▶️ ${t('instance.actions.start')}`
            )}
          </button>
        )}

        {isTransitioning && (
          <div className="flex-1 flex items-center justify-center py-2 text-slate-500 dark:text-slate-400">
            <RefreshCw size={16} className="animate-spin mr-2" />
            {instance.status === 'starting'
              ? t('instance.notifications.startingProgress')
              : t('instance.notifications.stoppingProgress')}
          </div>
        )}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  onAdd: () => void;
}

function EmptyState({ onAdd }: EmptyStateProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Server size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
      <p className="text-slate-500 dark:text-slate-400 mb-4">{t('dashboard.noInstances')}</p>
      <button className="btn-teal px-5 py-2.5 text-sm" onClick={onAdd}>
        {t('instance.add')}
      </button>
    </div>
  );
}
