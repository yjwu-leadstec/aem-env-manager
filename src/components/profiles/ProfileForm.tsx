import { useState, useEffect } from 'react';
import { X, Save, Coffee, Hexagon, FileCode } from 'lucide-react';
import { Button } from '../common/Button';
import * as versionApi from '../../api/version';

export interface ProfileFormData {
  name: string;
  description: string;
  javaVersion: string | null;
  javaManagerId: string | null;
  nodeVersion: string | null;
  nodeManagerId: string | null;
  mavenConfigId: string | null;
  envVars: Record<string, string>;
}

interface ProfileFormProps {
  initialData?: Partial<ProfileFormData>;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProfileFormData) => Promise<void>;
  title?: string;
}

export function ProfileForm({
  initialData,
  isOpen,
  onClose,
  onSubmit,
  title = '新建配置',
}: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    description: '',
    javaVersion: null,
    javaManagerId: null,
    nodeVersion: null,
    nodeManagerId: null,
    mavenConfigId: null,
    envVars: {},
    ...initialData,
  });

  const [javaVersions, setJavaVersions] = useState<versionApi.JavaVersion[]>([]);
  const [nodeVersions, setNodeVersions] = useState<versionApi.NodeVersion[]>([]);
  const [mavenConfigs, setMavenConfigs] = useState<versionApi.MavenConfig[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      loadVersionOptions();
      setFormData({
        name: '',
        description: '',
        javaVersion: null,
        javaManagerId: null,
        nodeVersion: null,
        nodeManagerId: null,
        mavenConfigId: null,
        envVars: {},
        ...initialData,
      });
      setErrors({});
    }
  }, [isOpen, initialData]);

  const loadVersionOptions = async () => {
    setIsLoading(true);
    try {
      const [java, node, maven] = await Promise.all([
        versionApi.scanJavaVersions(),
        versionApi.scanNodeVersions(),
        versionApi.listMavenConfigs(),
      ]);
      setJavaVersions(java);
      setNodeVersions(node);
      setMavenConfigs(maven);
    } catch {
      // Failed to load version options
    } finally {
      setIsLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = '名称为必填项';
    } else if (formData.name.length < 2) {
      newErrors.name = '名称至少需要 2 个字符';
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
      onClose();
    } catch (error) {
      setErrors({
        submit: error instanceof Error ? error.message : '保存配置失败',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl m-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
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
              配置名称 *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`input ${errors.name ? 'input-error' : ''}`}
              placeholder="例如: AEM 6.5 开发环境"
            />
            {errors.name && <p className="text-sm text-error-500 mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              描述
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input min-h-[80px] resize-none"
              placeholder="可选的配置描述"
            />
          </div>

          {/* Java Version */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              <Coffee size={14} className="inline mr-1" />
              Java 版本
            </label>
            <select
              value={formData.javaVersion || ''}
              onChange={(e) => setFormData({ ...formData, javaVersion: e.target.value || null })}
              className="select"
              disabled={isLoading}
            >
              <option value="">选择 Java 版本...</option>
              {javaVersions.map((v) => (
                <option key={v.version} value={v.version}>
                  {v.version} ({v.vendor}){v.is_current && ' - 当前'}
                </option>
              ))}
            </select>
          </div>

          {/* Node Version */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              <Hexagon size={14} className="inline mr-1" />
              Node 版本
            </label>
            <select
              value={formData.nodeVersion || ''}
              onChange={(e) => setFormData({ ...formData, nodeVersion: e.target.value || null })}
              className="select"
              disabled={isLoading}
            >
              <option value="">选择 Node 版本...</option>
              {nodeVersions.map((v) => (
                <option key={v.version} value={v.version}>
                  {v.version}
                  {v.is_current && ' - 当前'}
                </option>
              ))}
            </select>
          </div>

          {/* Maven Config */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              <FileCode size={14} className="inline mr-1" />
              Maven 配置
            </label>
            <select
              value={formData.mavenConfigId || ''}
              onChange={(e) => setFormData({ ...formData, mavenConfigId: e.target.value || null })}
              className="select"
              disabled={isLoading}
            >
              <option value="">使用默认 settings.xml</option>
              {mavenConfigs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.is_active && ' - 当前'}
                </option>
              ))}
            </select>
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
            <Button
              type="submit"
              variant="primary"
              icon={<Save size={16} />}
              disabled={isSaving || isLoading}
            >
              {isSaving ? '保存中...' : '保存配置'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
