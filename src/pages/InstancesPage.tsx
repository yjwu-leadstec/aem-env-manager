import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, Terminal } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { InstanceCard, InstanceFormDialog, EmptyState } from '@/components/instances';
import type { InstanceFormData } from '@/components/instances';
import { useAppStore } from '@/store';
import { useInstanceManager } from '@/hooks';
import type { AEMInstance } from '@/types';

export function InstancesPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

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
        await addInstance({
          name: data.name,
          instance_type: data.instanceType,
          host: data.host,
          port: data.port,
          path: data.path,
          java_opts: data.javaOpts || null,
          run_modes: data.runModes,
        });
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
          {instances.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onStart={() => handleStart(instance)}
              onEdit={() => {
                setEditingInstance(instance);
                setShowInstanceForm(true);
              }}
              onDelete={() => setShowDeleteConfirm(instance.id)}
              onOpenBrowser={(path) => handleOpenInBrowser(instance, path)}
              isStarting={startingInstanceId === instance.id}
            />
          ))}
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
