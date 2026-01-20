import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, Terminal } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { InstanceCard, InstanceFormDialog, EmptyState } from '@/components/instances';
import type { InstanceFormData } from '@/components/instances';
import { useAppStore, useActiveProfile, useConfig } from '@/store';
import { useInstanceManager } from '@/hooks';
import * as instanceApi from '@/api/instance';
import type { InstanceStatusResult } from '@/api/instance';
import type { AEMInstance, AEMInstanceStatus } from '@/types';

export function InstancesPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeProfile = useActiveProfile();
  const config = useConfig();

  // Use centralized instance manager hook - single source of truth
  const {
    instances,
    isLoading,
    loadInstances,
    startInstance,
    deleteInstance: removeInstance,
    openInBrowser,
  } = useInstanceManager();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startingInstanceId, setStartingInstanceId] = useState<string | null>(null);
  const [isRefreshingStatus, setIsRefreshingStatus] = useState(false);
  const [statusResults, setStatusResults] = useState<Map<string, InstanceStatusResult>>(new Map());
  const [lastStatusCheck, setLastStatusCheck] = useState<string | null>(null);
  const addNotification = useAppStore((s) => s.addNotification);
  const updateInstance = useAppStore((s) => s.updateAemInstance);

  // Form/Dialog states
  const [showInstanceForm, setShowInstanceForm] = useState(false);
  const [editingInstance, setEditingInstance] = useState<AEMInstance | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // Handle URL action parameter (e.g., ?action=new from quick actions)
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setShowInstanceForm(true);
      setEditingInstance(null);
      // Clear the action parameter from URL
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Refresh status of active profile instances only (no auth required)
  const refreshAllStatuses = useCallback(async () => {
    if (!activeProfile) return;

    // Only detect status for instances associated with active profile
    const instanceIds = [activeProfile.authorInstanceId, activeProfile.publishInstanceId].filter(
      (id): id is string => id !== null && id !== undefined
    );

    if (instanceIds.length === 0) return;

    setIsRefreshingStatus(true);
    try {
      const newMap = new Map<string, InstanceStatusResult>();
      // Detect status for each active profile instance
      await Promise.all(
        instanceIds.map(async (id) => {
          try {
            const result = await instanceApi.detectInstanceStatus(id);
            newMap.set(result.instance_id, result);
            // Update instance status in store
            updateInstance(result.instance_id, { status: result.status as AEMInstanceStatus });
          } catch {
            // Individual instance detection failed, continue with others
          }
        })
      );
      setStatusResults(newMap);
      setLastStatusCheck(new Date().toISOString());
    } catch (error) {
      // Silent fail for auto-refresh
      console.error('Failed to refresh statuses:', error);
    } finally {
      setIsRefreshingStatus(false);
    }
  }, [activeProfile, updateInstance]);

  // Auto-refresh status based on config
  useEffect(() => {
    // Initial status check on mount (always perform once)
    refreshAllStatuses();

    // Only set up interval if auto status check is enabled
    if (!config.autoStatusCheck) {
      return;
    }

    // Set up interval for periodic refresh (interval in seconds, convert to ms)
    const intervalMs = config.statusCheckInterval * 1000;
    const intervalId = setInterval(() => {
      refreshAllStatuses();
    }, intervalMs);

    // Cleanup on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, [refreshAllStatuses, config.autoStatusCheck, config.statusCheckInterval]);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await loadInstances();
    setIsRefreshing(false);
  };

  const handleStart = async (instance: AEMInstance) => {
    // 5-second debounce to prevent multiple terminal windows
    if (startingInstanceId === instance.id) {
      return;
    }

    setStartingInstanceId(instance.id);

    try {
      await startInstance(instance.id);
    } finally {
      // Reset after 5 seconds
      setTimeout(() => {
        setStartingInstanceId(null);
      }, 5000);
    }
  };

  const handleDelete = async (id: string) => {
    const instance = instances.find((i) => i.id === id);
    await removeInstance(id);
    setShowDeleteConfirm(null);
    if (instance) {
      addNotification({
        type: 'success',
        title: t('instance.notifications.deleted'),
        message: t('instance.notifications.removed', { name: instance.name }),
      });
    }
  };

  const handleOpenInBrowser = async (instance: AEMInstance, path?: string) => {
    await openInBrowser(instance.id, path);
  };

  const handleFormSubmit = async (data: InstanceFormData) => {
    try {
      if (editingInstance) {
        // Update existing instance - call backend API to persist changes
        const { updateInstance: updateInstanceApi } = await import('@/api/instance');
        const updatedInstance = await updateInstanceApi(editingInstance.id, {
          name: data.name,
          instance_type: data.instanceType,
          host: data.host,
          port: data.port,
          path: data.path,
          java_opts: data.javaOpts || null,
          run_modes: data.runModes,
        });
        // Update local store with the response from backend
        updateInstance(editingInstance.id, {
          name: updatedInstance.name,
          instanceType: updatedInstance.instance_type,
          host: updatedInstance.host,
          port: updatedInstance.port,
          path: updatedInstance.path,
          javaOpts: updatedInstance.java_opts,
          runModes: updatedInstance.run_modes,
        });
        addNotification({
          type: 'success',
          title: t('instance.notifications.updated'),
          message: t('instance.notifications.updatedMessage', { name: data.name }),
        });
      } else {
        // Create new instance - use API directly then refresh
        const { addInstance } = await import('@/api/instance');
        const newInstance = await addInstance({
          name: data.name,
          instance_type: data.instanceType,
          host: data.host,
          port: data.port,
          path: data.path,
          java_opts: data.javaOpts || null,
          run_modes: data.runModes,
        });

        // Auto-import license if found during scanning
        if (data.licenseFilePath) {
          try {
            const { importLicenseFromFile } = await import('@/api/license');
            await importLicenseFromFile(data.licenseFilePath, newInstance.id, data.name);
            addNotification({
              type: 'success',
              title: t('instance.notifications.licenseImported'),
              message: t('instance.notifications.licenseImportedMessage'),
            });
          } catch (error) {
            // License import failed, but instance was created successfully
            console.warn('Failed to import license:', error);
            addNotification({
              type: 'warning',
              title: t('instance.notifications.licenseImportFailed'),
              message: t('instance.notifications.licenseImportFailedMessage'),
            });
          }
        }

        addNotification({
          type: 'success',
          title: t('instance.notifications.added'),
          message: t('instance.notifications.addedMessage', { name: data.name }),
        });
        // Reload to sync with backend
        await loadInstances();
      }
      setShowInstanceForm(false);
      setEditingInstance(null);
    } catch (error) {
      addNotification({
        type: 'error',
        title: editingInstance
          ? t('instance.notifications.updateFailed')
          : t('instance.notifications.addFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw size={24} className="animate-spin text-azure-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            <span className="mr-2">🖥️</span>
            {t('instance.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('instance.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            icon={<RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />}
            onClick={handleRefreshAll}
            disabled={isRefreshing}
          >
            {t('common.refresh')}
          </Button>
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              setEditingInstance(null);
              setShowInstanceForm(true);
            }}
          >
            {t('instance.add')}
          </Button>
        </div>
      </div>

      {/* Terminal Control Info */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-slate-100 dark:bg-slate-800/50">
        <Terminal size={20} className="text-slate-500" />
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {t(
            'instance.terminalInfo',
            'AEM instances run in Terminal windows. Click "Start in Terminal" to launch an instance, then use the terminal to monitor and control it.'
          )}
        </p>
      </div>

      {/* Instance List */}
      {instances.length === 0 ? (
        <EmptyState onAdd={() => setShowInstanceForm(true)} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {instances.map((instance) => {
            const statusResult = statusResults.get(instance.id);
            // Check if instance is in active profile
            const isActiveProfileInstance =
              activeProfile &&
              (instance.id === activeProfile.authorInstanceId ||
                instance.id === activeProfile.publishInstanceId);
            // For non-active profile instances, show as stopped
            const displayInstance = isActiveProfileInstance
              ? instance
              : { ...instance, status: 'stopped' as const };

            // Only show refresh-related UI when auto status check is enabled
            const showStatusCheckUI = config.autoStatusCheck && isActiveProfileInstance;

            return (
              <InstanceCard
                key={instance.id}
                instance={displayInstance}
                onStart={() => handleStart(instance)}
                onEdit={() => {
                  setEditingInstance(instance);
                  setShowInstanceForm(true);
                }}
                onDelete={() => setShowDeleteConfirm(instance.id)}
                onOpenBrowser={(path) => handleOpenInBrowser(instance, path)}
                onRefreshStatus={showStatusCheckUI ? refreshAllStatuses : undefined}
                isStarting={startingInstanceId === instance.id}
                isRefreshing={showStatusCheckUI ? isRefreshingStatus : false}
                conflictProcessName={showStatusCheckUI ? statusResult?.process_name : undefined}
                lastChecked={
                  showStatusCheckUI ? statusResult?.checked_at || lastStatusCheck : undefined
                }
              />
            );
          })}
        </div>
      )}

      {/* Instance Form Dialog */}
      <InstanceFormDialog
        isOpen={showInstanceForm}
        onClose={() => {
          setShowInstanceForm(false);
          setEditingInstance(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingInstance}
        title={editingInstance ? t('instance.dialog.editTitle') : t('instance.dialog.addTitle')}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setShowDeleteConfirm(null)}
          onConfirm={() => handleDelete(showDeleteConfirm)}
          title={t('instance.dialog.deleteTitle')}
          message={t('instance.dialog.deleteConfirm')}
          confirmText={t('common.delete')}
          variant="danger"
        />
      )}
    </div>
  );
}
