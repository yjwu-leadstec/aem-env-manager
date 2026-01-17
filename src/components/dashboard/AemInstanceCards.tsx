import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Server, Plus, RefreshCw, ArrowRight } from 'lucide-react';
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
          title: '实例已启动',
          message: `实例正在运行`,
        });
      } else {
        updateAemInstance(instanceId, { status: 'error' as AEMInstanceStatus });
        addNotification({
          type: 'error',
          title: '启动失败',
          message: '无法启动实例',
        });
      }
    } catch (error) {
      updateAemInstance(instanceId, { status: 'error' as AEMInstanceStatus });
      addNotification({
        type: 'error',
        title: '启动失败',
        message: error instanceof Error ? error.message : '未知错误',
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
          title: '实例已停止',
          message: `实例已停止运行`,
        });
      } else {
        updateAemInstance(instanceId, { status: 'error' as AEMInstanceStatus });
        addNotification({
          type: 'error',
          title: '停止失败',
          message: '无法停止实例',
        });
      }
    } catch (error) {
      updateAemInstance(instanceId, { status: 'error' as AEMInstanceStatus });
      addNotification({
        type: 'error',
        title: '停止失败',
        message: error instanceof Error ? error.message : '未知错误',
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
        title: '打开浏览器失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };

  return (
    <div className="panel p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">AEM 实例</h2>
        <div className="flex items-center gap-2">
          <button
            className="btn-soft px-4 py-2 text-sm flex items-center gap-2"
            onClick={() => navigate('/instances?action=new')}
          >
            <Plus size={16} />
            添加实例
          </button>
          <button
            className="btn-ghost px-3 py-2 text-sm flex items-center gap-2"
            onClick={loadInstances}
            disabled={isLoading}
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
            刷新
          </button>
          <button
            className="btn-ghost px-3 py-2 text-sm flex items-center gap-1"
            onClick={() => navigate('/instances')}
          >
            查看全部 <ArrowRight size={14} />
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
          还有 {instances.length - 4} 个实例...{' '}
          <button
            className="text-azure hover:text-azure-600 font-medium"
            onClick={() => navigate('/instances')}
          >
            查看全部
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
            ? '运行中'
            : isStopped
              ? '已停止'
              : isTransitioning
                ? instance.status === 'starting'
                  ? '启动中'
                  : '停止中'
                : '错误'}
        </span>
      </div>

      {/* Info Grid - Only show when running */}
      {isRunning && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-white dark:bg-slate-700 rounded-xl p-3 shadow-soft">
            <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">版本</div>
            <div className="text-slate-900 dark:text-slate-100 text-sm font-semibold">2024.11</div>
          </div>
          <div className="bg-white dark:bg-slate-700 rounded-xl p-3 shadow-soft">
            <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">类型</div>
            <div className="text-slate-900 dark:text-slate-100 text-sm font-semibold">
              {instance.instanceType === 'author' ? 'Author' : 'Publish'}
            </div>
          </div>
          <div className="bg-white dark:bg-slate-700 rounded-xl p-3 shadow-soft">
            <div className="text-slate-400 dark:text-slate-500 text-xs mb-0.5">运行</div>
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
              包管理
            </button>
            <button
              className="flex-1 btn-ghost px-3 py-2 text-xs"
              onClick={() => onOpenInBrowser('/system/console')}
            >
              控制台
            </button>
            <button
              className="bg-error-50 dark:bg-error-500/20 text-error-500 dark:text-error-400 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-error-100 dark:hover:bg-error-500/30 transition-colors disabled:opacity-50"
              onClick={onStop}
              disabled={isActionInProgress}
            >
              {isActionInProgress ? <RefreshCw size={14} className="animate-spin" /> : '停止'}
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
              '▶️ 启动'
            )}
          </button>
        )}

        {isTransitioning && (
          <div className="flex-1 flex items-center justify-center py-2 text-slate-500 dark:text-slate-400">
            <RefreshCw size={16} className="animate-spin mr-2" />
            {instance.status === 'starting' ? '正在启动...' : '正在停止...'}
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
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Server size={48} className="text-slate-300 dark:text-slate-600 mb-4" />
      <p className="text-slate-500 dark:text-slate-400 mb-4">暂无配置的 AEM 实例</p>
      <button className="btn-teal px-5 py-2.5 text-sm" onClick={onAdd}>
        添加实例
      </button>
    </div>
  );
}
