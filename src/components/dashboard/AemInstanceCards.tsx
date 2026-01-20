import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Server,
  Plus,
  RefreshCw,
  ArrowRight,
  Play,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { useAppStore, useAemInstances, useActiveProfile } from '../../store';
import * as instanceApi from '../../api/instance';
import { mapApiInstanceToFrontend } from '../../api/mappers';
import type { AEMInstance, AEMInstanceStatus } from '../../types';
import type { InstanceStatusResult } from '../../api/instance';

export function AemInstanceCards() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const allInstances = useAemInstances();
  const activeProfile = useActiveProfile();
  const setAemInstances = useAppStore((s) => s.setAemInstances);
  const updateAemInstance = useAppStore((s) => s.updateAemInstance);
  const addNotification = useAppStore((s) => s.addNotification);

  const [isLoading, setIsLoading] = useState(true);
  const [startingInstanceId, setStartingInstanceId] = useState<string | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [statusResults, setStatusResults] = useState<Map<string, InstanceStatusResult>>(new Map());
  const [lastStatusCheck, setLastStatusCheck] = useState<string | null>(null);

  // Get Author and Publish instances from active profile
  const instances = activeProfile
    ? allInstances.filter(
        (inst) =>
          inst.profileId === activeProfile.id ||
          inst.id === activeProfile.authorInstanceId ||
          inst.id === activeProfile.publishInstanceId
      )
    : [];

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

  // Refresh status of all instances using fast detection (no auth required)
  const refreshAllStatuses = useCallback(async () => {
    setIsRefreshingStatus(true);
    try {
      const results = await instanceApi.detectAllInstancesStatus();
      const newMap = new Map<string, InstanceStatusResult>();
      for (const result of results) {
        newMap.set(result.instance_id, result);
        // Update instance status in store
        updateAemInstance(result.instance_id, { status: result.status as AEMInstanceStatus });
      }
      setStatusResults(newMap);
      setLastStatusCheck(new Date().toISOString());
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('instance.notifications.refreshStatusFailed', 'Failed to refresh status'),
        message: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setIsRefreshingStatus(false);
    }
  }, [updateAemInstance, addNotification, t]);

  const handleStart = async (instanceId: string, instanceName: string) => {
    // 5-second debounce to prevent multiple terminal windows
    if (startingInstanceId === instanceId) {
      return;
    }

    setStartingInstanceId(instanceId);

    try {
      const success = await instanceApi.startInstance(instanceId);
      if (success) {
        updateAemInstance(instanceId, { status: 'unknown' as AEMInstanceStatus });
        addNotification({
          type: 'success',
          title: t('instance.notifications.terminalOpened', 'Terminal opened'),
          message: t('instance.notifications.runningInTerminal', { name: instanceName }),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('instance.notifications.startFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      // Reset after 5 seconds
      setTimeout(() => {
        setStartingInstanceId(null);
      }, 5000);
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
            onClick={refreshAllStatuses}
            disabled={isRefreshingStatus}
            title={t('instance.actions.refreshStatus', 'Refresh Status')}
          >
            <RefreshCw size={14} className={isRefreshingStatus ? 'animate-spin' : ''} />
            {t('instance.actions.refreshStatus', 'Status')}
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
        <EmptyState
          onAdd={() => navigate('/instances?action=new')}
          hasActiveProfile={!!activeProfile}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {instances.slice(0, 4).map((instance) => {
            const statusResult = statusResults.get(instance.id);
            return (
              <InstanceCard
                key={instance.id}
                instance={instance}
                onStart={() => handleStart(instance.id, instance.name)}
                onOpenInBrowser={(path) => handleOpenInBrowser(instance.id, path)}
                isStarting={startingInstanceId === instance.id}
                conflictProcessName={statusResult?.process_name}
                lastChecked={statusResult?.checked_at || lastStatusCheck}
              />
            );
          })}
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
  onStart: () => void;
  onOpenInBrowser: (path?: string) => void;
  isStarting?: boolean;
  /** Process name if port is conflicted */
  conflictProcessName?: string | null;
  /** Last status check timestamp */
  lastChecked?: string | null;
}

function InstanceCard({
  instance,
  onStart,
  onOpenInBrowser,
  isStarting = false,
  conflictProcessName,
  lastChecked,
}: InstanceCardProps) {
  const { t } = useTranslation();

  // Format last checked time
  const formatLastChecked = (isoDate: string | null | undefined) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    return date.toLocaleTimeString();
  };

  // Get status indicator color
  const getStatusColor = (status: AEMInstanceStatus) => {
    switch (status) {
      case 'running':
        return 'bg-green-500 dark:bg-green-400';
      case 'stopped':
        return 'bg-slate-400 dark:bg-slate-500';
      case 'starting':
      case 'stopping':
        return 'bg-yellow-500 dark:bg-yellow-400';
      case 'error':
        return 'bg-red-500 dark:bg-red-400';
      case 'port_conflict':
        return 'bg-orange-500 dark:bg-orange-400';
      default:
        return 'bg-azure dark:bg-tech-orange';
    }
  };

  // Get status badge
  const getStatusBadge = (status: AEMInstanceStatus) => {
    switch (status) {
      case 'running':
        return (
          <span className="badge-success text-xs px-2.5 py-1 rounded-full">
            {t('instance.status.running', '运行中')}
          </span>
        );
      case 'stopped':
        return (
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {t('instance.status.stopped', '已停止')}
          </span>
        );
      case 'starting':
        return (
          <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
            {t('instance.status.starting', '启动中')}
          </span>
        );
      case 'stopping':
        return (
          <span className="text-xs px-2.5 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
            {t('instance.status.stopping', '停止中')}
          </span>
        );
      case 'error':
        return (
          <span className="badge-error text-xs px-2.5 py-1 rounded-full">
            {t('instance.status.error', '错误')}
          </span>
        );
      case 'port_conflict':
        return (
          <span className="text-xs px-2.5 py-1 rounded-full bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400">
            {t('instance.status.portConflict', '端口冲突')}
          </span>
        );
      default:
        return (
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
            {t('instance.status.unknown', '未知')}
          </span>
        );
    }
  };

  return (
    <div className="panel-flat p-5 dark:bg-viewport dark:border dark:border-border">
      {/* Header with status indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Status dot indicator */}
          <div
            className={`w-3 h-3 rounded-full ${getStatusColor(instance.status)} ${instance.status === 'running' ? 'animate-pulse' : ''}`}
          ></div>
          <span className="font-semibold text-slate-900 dark:text-slate-100">{instance.name}</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg shadow-soft dark:shadow-none">
            {instance.host}:{instance.port}
          </span>
        </div>
        {getStatusBadge(instance.status)}
      </div>

      {/* Instance Type Badge and Last Checked */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs px-2.5 py-1 rounded-lg font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          {t(`instance.type.${instance.instanceType}`, instance.instanceType)}
        </span>
        {lastChecked && (
          <span
            className="text-xs text-slate-400 dark:text-slate-500"
            title={t('instance.card.lastChecked', 'Last checked')}
          >
            {formatLastChecked(lastChecked)}
          </span>
        )}
      </div>

      {/* Port conflict warning */}
      {instance.status === 'port_conflict' && conflictProcessName && (
        <div className="mb-4 p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-xs flex items-center gap-2">
          <AlertTriangle size={14} className="text-orange-500 flex-shrink-0" />
          <span className="text-orange-700 dark:text-orange-300">
            {t('instance.card.portConflict', { process: conflictProcessName })}
          </span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          className="flex-1 bg-gradient-to-r from-azure-500 to-azure-600 text-white px-3 py-2 rounded-xl text-xs font-semibold hover:shadow-lg transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={onStart}
          disabled={isStarting}
        >
          <Play size={14} />
          {isStarting ? t('common.loading') : t('instance.actions.start')}
        </button>
        <button
          className="btn-ghost px-3 py-2 text-xs flex items-center gap-1 rounded-xl"
          onClick={() => onOpenInBrowser()}
        >
          <ExternalLink size={14} />
          {t('instance.actions.open')}
        </button>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  onAdd: () => void;
  hasActiveProfile: boolean;
}

function EmptyState({ onAdd, hasActiveProfile }: EmptyStateProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (!hasActiveProfile) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Server size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
        <p className="text-slate-500 dark:text-slate-400 mb-2 font-semibold">
          {t('dashboard.noActiveProfile', '未激活配置')}
        </p>
        <p className="text-slate-400 dark:text-slate-500 text-sm mb-4">
          {t('dashboard.noActiveProfileHint', '请先创建或激活一个配置来管理 AEM 实例')}
        </p>
        <button className="btn-teal px-5 py-2.5 text-sm" onClick={() => navigate('/profiles')}>
          {t('dashboard.goToProfiles', '前往配置管理')}
        </button>
      </div>
    );
  }

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
