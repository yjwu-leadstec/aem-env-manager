import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Coffee, Hexagon, FileCode, Server } from 'lucide-react';
import { Button } from '../common/Button';
import * as versionApi from '../../api/version';
import * as instanceApi from '../../api/instance';

export interface ProfileFormData {
  name: string;
  description: string;
  javaVersion: string | null;
  javaManagerId: string | null;
  nodeVersion: string | null;
  nodeManagerId: string | null;
  mavenConfigId: string | null;
  authorInstanceId: string | null;
  publishInstanceId: string | null;
  envVars: Record<string, string>;
}

interface ProfileFormProps {
  initialData?: Partial<ProfileFormData>;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProfileFormData) => Promise<void>;
  title?: string;
}

export function ProfileForm({ initialData, isOpen, onClose, onSubmit, title }: ProfileFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<ProfileFormData>({
    name: '',
    description: '',
    javaVersion: null,
    javaManagerId: null,
    nodeVersion: null,
    nodeManagerId: null,
    mavenConfigId: null,
    authorInstanceId: null,
    publishInstanceId: null,
    envVars: {},
    ...initialData,
  });

  const [javaVersions, setJavaVersions] = useState<versionApi.JavaVersion[]>([]);
  const [nodeVersions, setNodeVersions] = useState<versionApi.NodeVersion[]>([]);
  const [mavenConfigs, setMavenConfigs] = useState<versionApi.MavenConfig[]>([]);
  const [aemInstances, setAemInstances] = useState<instanceApi.AemInstance[]>([]);
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
        authorInstanceId: null,
        publishInstanceId: null,
        envVars: {},
        ...initialData,
      });
      setErrors({});
    }
  }, [isOpen, initialData]);

  const loadVersionOptions = async () => {
    setIsLoading(true);
    try {
      const [java, node, maven, instances] = await Promise.all([
        versionApi.scanJavaVersions(),
        versionApi.scanNodeVersions(),
        versionApi.listMavenConfigs(),
        instanceApi.listInstances(),
      ]);
      setJavaVersions(java);
      setNodeVersions(node);
      setMavenConfigs(maven);
      setAemInstances(instances);
    } catch {
      // Failed to load version options
    } finally {
      setIsLoading(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('profile.form.nameRequired');
    } else if (formData.name.length < 2) {
      newErrors.name = t('profile.form.nameMinLength');
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
        submit: error instanceof Error ? error.message : t('profile.form.saveFailed'),
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
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-auto panel m-4 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10">
          <h2 className="text-lg font-semibold">{title || t('profile.form.createTitle')}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <X size={20} className="opacity-50" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">
              {t('profile.form.name')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`input ${errors.name ? 'border-error text-error' : ''}`}
              placeholder={t('profile.form.namePlaceholder')}
            />
            {errors.name && <p className="text-sm text-error mt-1">{errors.name}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">
              {t('profile.form.description')}
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="input min-h-[80px] resize-none"
              placeholder={t('profile.form.descriptionPlaceholder')}
            />
          </div>

          {/* Java Version */}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">
              <Coffee size={14} className="inline mr-1" />
              {t('profile.form.javaVersion')}
            </label>
            <select
              value={formData.javaVersion || ''}
              onChange={(e) => setFormData({ ...formData, javaVersion: e.target.value || null })}
              className="select"
              disabled={isLoading}
            >
              <option value="">{t('profile.form.selectJava')}</option>
              {javaVersions.map((v) => (
                <option key={v.version} value={v.version}>
                  {v.version} ({v.vendor}){v.is_current && ` - ${t('profile.form.current')}`}
                </option>
              ))}
            </select>
          </div>

          {/* Node Version */}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">
              <Hexagon size={14} className="inline mr-1" />
              {t('profile.form.nodeVersion')}
            </label>
            <select
              value={formData.nodeVersion || ''}
              onChange={(e) => setFormData({ ...formData, nodeVersion: e.target.value || null })}
              className="select"
              disabled={isLoading}
            >
              <option value="">{t('profile.form.selectNode')}</option>
              {nodeVersions.map((v) => (
                <option key={v.version} value={v.version}>
                  {v.version}
                  {v.is_current && ` - ${t('profile.form.current')}`}
                </option>
              ))}
            </select>
          </div>

          {/* Maven Config */}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">
              <FileCode size={14} className="inline mr-1" />
              {t('profile.form.mavenConfig')}
            </label>
            <select
              value={formData.mavenConfigId || ''}
              onChange={(e) => setFormData({ ...formData, mavenConfigId: e.target.value || null })}
              className="select"
              disabled={isLoading}
            >
              <option value="">{t('profile.form.defaultMaven')}</option>
              {mavenConfigs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.is_active && ` - ${t('profile.form.current')}`}
                </option>
              ))}
            </select>
          </div>

          {/* AEM Author Instance */}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">
              <Server size={14} className="inline mr-1" />
              {t('profile.form.authorInstance')}
            </label>
            <select
              value={formData.authorInstanceId || ''}
              onChange={(e) =>
                setFormData({ ...formData, authorInstanceId: e.target.value || null })
              }
              className="select"
              disabled={isLoading}
            >
              <option value="">{t('profile.form.noAuthorInstance')}</option>
              {aemInstances
                .filter((instance) => instance.instance_type === 'author')
                .map((instance) => (
                  <option key={instance.id} value={instance.id}>
                    {instance.name} - {instance.host}:{instance.port}
                  </option>
                ))}
            </select>
          </div>

          {/* AEM Publish Instance */}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">
              <Server size={14} className="inline mr-1" />
              {t('profile.form.publishInstance')}
            </label>
            <select
              value={formData.publishInstanceId || ''}
              onChange={(e) =>
                setFormData({ ...formData, publishInstanceId: e.target.value || null })
              }
              className="select"
              disabled={isLoading}
            >
              <option value="">{t('profile.form.noPublishInstance')}</option>
              {aemInstances
                .filter((instance) => instance.instance_type === 'publish')
                .map((instance) => (
                  <option key={instance.id} value={instance.id}>
                    {instance.name} - {instance.host}:{instance.port}
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
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              {t('profile.form.cancel')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              icon={<Save size={16} />}
              disabled={isSaving || isLoading}
            >
              {isSaving ? t('profile.form.saving') : t('profile.form.save')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
