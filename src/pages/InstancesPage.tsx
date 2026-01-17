import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Play,
  Square,
  RefreshCw,
  ExternalLink,
  Settings,
  MoreVertical,
  Trash2,
  Edit2,
  Heart,
  Copy,
  AlertCircle,
  CheckCircle2,
  Server,
  X,
  Save,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAppStore } from '@/store';
import * as instanceApi from '@/api/instance';

// ============================================
// Main Page Component
// ============================================

export function InstancesPage() {
  const [instances, setInstances] = useState<instanceApi.AemInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [healthResults, setHealthResults] = useState<Map<string, instanceApi.HealthCheckResult>>(
    new Map()
  );
  const addNotification = useAppStore((s) => s.addNotification);

  // Form/Dialog states
  const [showInstanceForm, setShowInstanceForm] = useState(false);
  const [editingInstance, setEditingInstance] = useState<instanceApi.AemInstance | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const loadInstances = useCallback(async () => {
    try {
      const data = await instanceApi.listInstances();
      setInstances(data);
    } catch {
      addNotification({
        type: 'error',
        title: '加载失败',
        message: '无法加载 AEM 实例',
      });
    } finally {
      setIsLoading(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadInstances();
  }, [loadInstances]);

  const handleRefreshAll = async () => {
    setIsRefreshing(true);
    await loadInstances();
    setIsRefreshing(false);
  };

  const handleStart = async (instance: instanceApi.AemInstance) => {
    // Optimistic update
    setInstances((prev) =>
      prev.map((i) => (i.id === instance.id ? { ...i, status: 'starting' as const } : i))
    );

    try {
      const success = await instanceApi.startInstance(instance.id);
      if (success) {
        addNotification({
          type: 'success',
          title: '实例启动中',
          message: `${instance.name} 正在启动...`,
        });
        // Refresh to get actual status
        setTimeout(loadInstances, 2000);
      }
    } catch {
      addNotification({
        type: 'error',
        title: '启动失败',
        message: `无法启动 ${instance.name}`,
      });
      loadInstances();
    }
  };

  const handleStop = async (instance: instanceApi.AemInstance) => {
    setInstances((prev) =>
      prev.map((i) => (i.id === instance.id ? { ...i, status: 'stopping' as const } : i))
    );

    try {
      const success = await instanceApi.stopInstance(instance.id);
      if (success) {
        addNotification({
          type: 'success',
          title: '实例停止中',
          message: `${instance.name} 正在停止...`,
        });
        setTimeout(loadInstances, 2000);
      }
    } catch {
      addNotification({
        type: 'error',
        title: '停止失败',
        message: `无法停止 ${instance.name}`,
      });
      loadInstances();
    }
  };

  const handleHealthCheck = async (instance: instanceApi.AemInstance) => {
    try {
      const result = await instanceApi.checkInstanceHealth(instance.id);
      setHealthResults((prev) => new Map(prev).set(instance.id, result));

      addNotification({
        type: result.is_healthy ? 'success' : 'warning',
        title: '健康检查完成',
        message: result.is_healthy
          ? `${instance.name} 运行正常`
          : `${instance.name} 存在问题: ${result.error || '未知'}`,
      });
    } catch {
      addNotification({
        type: 'error',
        title: '健康检查失败',
        message: `无法检查 ${instance.name} 的健康状态`,
      });
    }
  };

  const handleDelete = async (id: string) => {
    const instance = instances.find((i) => i.id === id);
    try {
      await instanceApi.deleteInstance(id);
      setInstances((prev) => prev.filter((i) => i.id !== id));
      setShowDeleteConfirm(null);
      addNotification({
        type: 'success',
        title: '实例已删除',
        message: `${instance?.name || '实例'} 已被移除`,
      });
    } catch {
      addNotification({
        type: 'error',
        title: '删除失败',
        message: '无法删除实例',
      });
    }
  };

  const handleOpenInBrowser = async (instance: instanceApi.AemInstance, path?: string) => {
    try {
      await instanceApi.openInBrowser(instance.id, path);
    } catch {
      // Fallback to window.open
      window.open(`http://${instance.host}:${instance.port}${path || ''}`, '_blank');
    }
  };

  const handleFormSubmit = async (data: InstanceFormData) => {
    if (editingInstance) {
      await instanceApi.updateInstance(editingInstance.id, {
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
        title: '实例已更新',
        message: `${data.name} 已更新`,
      });
    } else {
      await instanceApi.addInstance({
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
        title: '实例已添加',
        message: `${data.name} 已添加`,
      });
    }
    setShowInstanceForm(false);
    setEditingInstance(null);
    loadInstances();
  };

  const runningCount = instances.filter((i) => i.status === 'running').length;
  const stoppedCount = instances.filter((i) => i.status === 'stopped').length;

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
            <span className="mr-2">🖥️</span>AEM 实例
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">管理 AEM 作者和发布实例</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            icon={<RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />}
            onClick={handleRefreshAll}
            disabled={isRefreshing}
          >
            刷新
          </Button>
          <Button
            icon={<Plus size={16} />}
            onClick={() => {
              setEditingInstance(null);
              setShowInstanceForm(true);
            }}
          >
            添加实例
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-success-50 dark:bg-success-900/30">
          <CheckCircle2 size={16} className="text-success-500" />
          <span className="text-sm font-medium text-success-700 dark:text-success-400">
            {runningCount} 运行中
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700">
          <Square size={16} className="text-slate-500" />
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {stoppedCount} 已停止
          </span>
        </div>
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
              healthResult={healthResults.get(instance.id)}
              onStart={() => handleStart(instance)}
              onStop={() => handleStop(instance)}
              onEdit={() => {
                setEditingInstance(instance);
                setShowInstanceForm(true);
              }}
              onDelete={() => setShowDeleteConfirm(instance.id)}
              onHealthCheck={() => handleHealthCheck(instance)}
              onOpenBrowser={(path) => handleOpenInBrowser(instance, path)}
            />
          ))}
        </div>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader title="快捷链接" subtitle="运行中实例的常用 AEM 路径" />
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickLink label="CRXDE Lite" path="/crx/de/index.jsp" />
            <QuickLink label="Package Manager" path="/crx/packmgr/index.jsp" />
            <QuickLink label="Web Console" path="/system/console/bundles" />
            <QuickLink label="Sites Console" path="/sites.html/content" />
          </div>
        </CardContent>
      </Card>

      {/* Instance Form Dialog */}
      <InstanceFormDialog
        isOpen={showInstanceForm}
        onClose={() => {
          setShowInstanceForm(false);
          setEditingInstance(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={editingInstance}
        title={editingInstance ? '编辑实例' : '添加实例'}
      />

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setShowDeleteConfirm(null)}
          onConfirm={() => handleDelete(showDeleteConfirm)}
          title="删除实例"
          message="确定要删除这个实例吗？此操作无法撤销。"
          confirmText="删除"
          variant="danger"
        />
      )}
    </div>
  );
}

// ============================================
// Instance Card Component
// ============================================

interface InstanceCardProps {
  instance: instanceApi.AemInstance;
  healthResult?: instanceApi.HealthCheckResult;
  onStart: () => void;
  onStop: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onHealthCheck: () => void;
  onOpenBrowser: (path?: string) => void;
}

function InstanceCard({
  instance,
  healthResult,
  onStart,
  onStop,
  onEdit,
  onDelete,
  onHealthCheck,
  onOpenBrowser,
}: InstanceCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isRunning = instance.status === 'running';
  const isTransitioning = instance.status === 'starting' || instance.status === 'stopping';

  const typeColors = {
    author: 'bg-azure-100 dark:bg-azure-900/30 text-azure-700 dark:text-azure-400',
    publish: 'bg-success-100 dark:bg-success-900/30 text-success-700 dark:text-success-400',
    dispatcher: 'bg-warning-100 dark:bg-warning-900/30 text-warning-700 dark:text-warning-400',
  };

  return (
    <Card className="relative">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={instance.status} size="lg" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{instance.name}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {instance.host}:{instance.port}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[instance.instance_type]}`}
          >
            {instance.instance_type}
          </span>
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <MoreVertical size={16} className="text-slate-400" />
            </button>
            {showMenu && (
              <InstanceMenu
                onClose={() => setShowMenu(false)}
                onEdit={onEdit}
                onDelete={onDelete}
                onHealthCheck={onHealthCheck}
              />
            )}
          </div>
        </div>
      </div>

      {/* Instance Info */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-slate-500 dark:text-slate-400">运行模式:</span>
          <span className="ml-2 font-medium text-slate-700 dark:text-slate-300">
            {instance.run_modes.length > 0 ? instance.run_modes.join(', ') : '无'}
          </span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">路径:</span>
          <span
            className="ml-2 font-medium text-slate-700 dark:text-slate-300 truncate"
            title={instance.path}
          >
            {instance.path.split('/').pop()}
          </span>
        </div>
      </div>

      {/* Health Status */}
      {healthResult && (
        <div
          className={`mb-4 p-3 rounded-lg ${
            healthResult.is_healthy
              ? 'bg-success-50 dark:bg-success-900/20'
              : 'bg-error-50 dark:bg-error-900/20'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {healthResult.is_healthy ? (
              <CheckCircle2 size={16} className="text-success-500" />
            ) : (
              <AlertCircle size={16} className="text-error-500" />
            )}
            <span
              className={`text-sm font-medium ${healthResult.is_healthy ? 'text-success-700 dark:text-success-400' : 'text-error-700 dark:text-error-400'}`}
            >
              {healthResult.is_healthy ? '正常' : '异常'}
            </span>
            {healthResult.response_time_ms && (
              <span className="text-xs text-slate-500 dark:text-slate-400">
                ({healthResult.response_time_ms}ms)
              </span>
            )}
          </div>
          {healthResult.bundle_status && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              Bundle 状态: {healthResult.bundle_status.active}/{healthResult.bundle_status.total}{' '}
              活跃
            </div>
          )}
          {healthResult.memory_status && (
            <div className="text-xs text-slate-600 dark:text-slate-400">
              内存: {healthResult.memory_status.heap_used_mb}MB /{' '}
              {healthResult.memory_status.heap_max_mb}MB (
              {healthResult.memory_status.heap_usage_percent.toFixed(1)}%)
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {isRunning ? (
          <Button
            variant="outline"
            size="sm"
            icon={<Square size={14} />}
            onClick={onStop}
            loading={instance.status === 'stopping'}
          >
            停止
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            icon={<Play size={14} />}
            onClick={onStart}
            loading={instance.status === 'starting'}
            disabled={isTransitioning}
          >
            启动
          </Button>
        )}

        {isRunning && (
          <>
            <Button
              variant="outline"
              size="sm"
              icon={<ExternalLink size={14} />}
              onClick={() => onOpenBrowser()}
            >
              打开
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Settings size={14} />}
              onClick={() => onOpenBrowser('/system/console')}
            >
              控制台
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

// ============================================
// Instance Menu
// ============================================

interface InstanceMenuProps {
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onHealthCheck: () => void;
}

function InstanceMenu({ onClose, onEdit, onDelete, onHealthCheck }: InstanceMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-8 z-20 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1">
        <button
          onClick={() => {
            onEdit();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Edit2 size={14} /> 编辑
        </button>
        <button
          onClick={() => {
            onHealthCheck();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Heart size={14} /> 健康检查
        </button>
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Copy size={14} /> 复制
        </button>
        <hr className="my-1 border-slate-200 dark:border-slate-700" />
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error-600 hover:bg-error-50 dark:hover:bg-error-900/30"
        >
          <Trash2 size={14} /> 删除
        </button>
      </div>
    </>
  );
}

// ============================================
// Instance Form Dialog
// ============================================

interface InstanceFormData {
  name: string;
  instanceType: instanceApi.AemInstanceType;
  host: string;
  port: number;
  path: string;
  javaOpts: string;
  runModes: string[];
}

interface InstanceFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InstanceFormData) => Promise<void>;
  initialData?: instanceApi.AemInstance | null;
  title: string;
}

function InstanceFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
}: InstanceFormDialogProps) {
  const [formData, setFormData] = useState<InstanceFormData>({
    name: '',
    instanceType: 'author',
    host: 'localhost',
    port: 4502,
    path: '',
    javaOpts: '',
    runModes: [],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          instanceType: initialData.instance_type,
          host: initialData.host,
          port: initialData.port,
          path: initialData.path,
          javaOpts: initialData.java_opts || '',
          runModes: initialData.run_modes,
        });
      } else {
        setFormData({
          name: '',
          instanceType: 'author',
          host: 'localhost',
          port: 4502,
          path: '',
          javaOpts: '',
          runModes: [],
        });
      }
      setErrors({});
    }
  }, [isOpen, initialData]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '名称为必填项';
    }
    if (!formData.host.trim()) {
      newErrors.host = '主机为必填项';
    }
    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      newErrors.port = '端口号必须在 1-65535 之间';
    }
    if (!formData.path.trim()) {
      newErrors.path = '路径为必填项';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSaving(true);
    try {
      await onSubmit(formData);
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : '保存实例失败',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Server size={20} className="text-azure-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              实例名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`input ${errors.name ? 'input-error' : ''}`}
              placeholder="例如: 本地作者实例"
            />
            {errors.name && <p className="text-sm text-error-500 mt-1">{errors.name}</p>}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              实例类型
            </label>
            <select
              value={formData.instanceType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  instanceType: e.target.value as instanceApi.AemInstanceType,
                })
              }
              className="select"
            >
              <option value="author">作者实例</option>
              <option value="publish">发布实例</option>
              <option value="dispatcher">调度器</option>
            </select>
          </div>

          {/* Host & Port */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                主机 *
              </label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className={`input ${errors.host ? 'input-error' : ''}`}
                placeholder="localhost"
              />
              {errors.host && <p className="text-sm text-error-500 mt-1">{errors.host}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                端口 *
              </label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
                className={`input ${errors.port ? 'input-error' : ''}`}
                placeholder="4502"
              />
              {errors.port && <p className="text-sm text-error-500 mt-1">{errors.port}</p>}
            </div>
          </div>

          {/* Path */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              实例路径 *
            </label>
            <input
              type="text"
              value={formData.path}
              onChange={(e) => setFormData({ ...formData, path: e.target.value })}
              className={`input ${errors.path ? 'input-error' : ''}`}
              placeholder="/path/to/aem/instance"
            />
            {errors.path && <p className="text-sm text-error-500 mt-1">{errors.path}</p>}
          </div>

          {/* Java Options */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Java 参数
            </label>
            <input
              type="text"
              value={formData.javaOpts}
              onChange={(e) => setFormData({ ...formData, javaOpts: e.target.value })}
              className="input"
              placeholder="-Xmx4g -XX:MaxPermSize=256m"
            />
          </div>

          {/* Run Modes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              运行模式 (逗号分隔)
            </label>
            <input
              type="text"
              value={formData.runModes.join(', ')}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  runModes: e.target.value
                    .split(',')
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
              className="input"
              placeholder="author, dev, local"
            />
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="p-3 rounded-lg bg-error-50 dark:bg-error-900/30 text-error-600 dark:text-error-400 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              取消
            </Button>
            <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={isSaving}>
              {isSaving ? '保存中...' : '保存实例'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================
// Confirm Dialog
// ============================================

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'danger' | 'warning';
}

function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  variant = 'danger',
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const buttonClass =
    variant === 'danger'
      ? 'bg-error-500 hover:bg-error-600 text-white'
      : 'bg-warning-500 hover:bg-warning-600 text-white';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl m-4 overflow-hidden">
        <div className="p-6 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-error-50 dark:bg-error-900/30 flex items-center justify-center mb-4">
            <Trash2 size={24} className="text-error-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">{title}</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <button
              onClick={onConfirm}
              className={`px-4 py-2 rounded-xl font-semibold ${buttonClass}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Quick Link Component
// ============================================

function QuickLink({ label, path }: { label: string; path: string }) {
  const handleClick = async () => {
    // Copy path to clipboard for user convenience
    try {
      await window.navigator.clipboard.writeText(path);
    } catch {
      // Fallback for older browsers
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-azure-50 dark:hover:bg-azure-900/30 hover:text-azure-600 dark:hover:text-azure-400 transition-colors text-sm"
      title={`Copy path: ${path}`}
    >
      {label}
      <ExternalLink size={12} />
    </button>
  );
}

// ============================================
// Empty State Component
// ============================================

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mb-4">
        <Server size={24} className="text-teal-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">暂无配置的实例</h3>
      <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6 max-w-md mx-auto">
        添加您的第一个 AEM 实例来开始管理开发环境。
      </p>
      <Button variant="secondary" icon={<Plus size={16} />} onClick={onAdd}>
        添加实例
      </Button>
    </Card>
  );
}
