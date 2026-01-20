import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Server, X, Save, FolderOpen, FileArchive, Check } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { INSTANCE_DEFAULTS } from '@/constants';
import { selectFolder } from '@/api/settings';
import { scanDirectoryForJars, type ScannedAemInstance } from '@/api/instance';
import type { AEMInstance, AEMInstanceType } from '@/types';

export interface InstanceFormData {
  name: string;
  instanceType: AEMInstanceType;
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
  initialData?: AEMInstance | null;
  title: string;
}

export function InstanceFormDialog({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  title,
}: InstanceFormDialogProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<InstanceFormData>({
    name: '',
    instanceType: 'author',
    host: INSTANCE_DEFAULTS.HOST,
    port: INSTANCE_DEFAULTS.AUTHOR_PORT,
    path: '',
    javaOpts: '',
    runModes: [...INSTANCE_DEFAULTS.RUN_MODES],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // JAR selection modal state
  const [showJarModal, setShowJarModal] = useState(false);
  const [foundJars, setFoundJars] = useState<ScannedAemInstance[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          name: initialData.name,
          instanceType: initialData.instanceType,
          host: initialData.host,
          port: initialData.port,
          path: initialData.path,
          javaOpts: initialData.javaOpts || '',
          runModes: initialData.runModes,
        });
      } else {
        setFormData({
          name: '',
          instanceType: 'author',
          host: INSTANCE_DEFAULTS.HOST,
          port: INSTANCE_DEFAULTS.AUTHOR_PORT,
          path: '',
          javaOpts: '',
          runModes: [...INSTANCE_DEFAULTS.RUN_MODES],
        });
      }
      setErrors({});
      setShowJarModal(false);
      setFoundJars([]);
    }
  }, [isOpen, initialData]);

  // Auto-fill form from scanned JAR info
  const applyJarInfo = useCallback((jar: ScannedAemInstance) => {
    setFormData((prev) => ({
      ...prev,
      // Only use JAR name if user hasn't entered a name yet
      name: prev.name.trim() ? prev.name : jar.name || prev.name,
      instanceType: jar.instance_type,
      port: jar.port,
      // Use jar_path if available, otherwise fall back to directory path
      path: jar.jar_path || jar.path,
    }));
    setShowJarModal(false);
    setFoundJars([]);
  }, []);

  // Handle browse - select folder and auto-scan for JARs
  const handleBrowse = async () => {
    const path = await selectFolder(t('instance.form.selectPath'));
    if (!path) return;

    setIsScanning(true);
    try {
      const jars = await scanDirectoryForJars(path);

      if (jars.length === 0) {
        // No JARs found, just set the path
        setFormData((prev) => ({ ...prev, path }));
      } else if (jars.length === 1) {
        // Single JAR found, auto-fill
        applyJarInfo(jars[0]);
      } else {
        // Multiple JARs found, show selection modal
        setFoundJars(jars);
        setShowJarModal(true);
      }
    } catch (error) {
      console.error('Failed to scan directory:', error);
      // Just set the path even on error
      setFormData((prev) => ({ ...prev, path }));
    } finally {
      setIsScanning(false);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = t('instance.form.nameRequired');
    }
    if (!formData.host.trim()) {
      newErrors.host = t('instance.form.hostRequired');
    }
    if (!formData.port || formData.port < 1 || formData.port > 65535) {
      newErrors.port = t('instance.form.portRange');
    }
    if (!formData.path.trim()) {
      newErrors.path = t('instance.form.pathRequired');
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
        submit: error instanceof Error ? error.message : t('instance.form.saveFailed'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-auto panel m-4 p-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Server size={20} className="text-primary" />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          >
            <X size={20} className="opacity-50" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">
              {t('instance.form.name')}
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`input ${errors.name ? 'border-error text-error' : ''}`}
              placeholder={t('instance.form.namePlaceholder')}
            />
            {errors.name && <p className="text-sm text-error mt-1">{errors.name}</p>}
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">
              {t('instance.form.type')}
            </label>
            <select
              value={formData.instanceType}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  instanceType: e.target.value as AEMInstanceType,
                })
              }
              className="select"
            >
              <option value="author">{t('instance.type.author')}</option>
              <option value="publish">{t('instance.type.publish')}</option>
              <option value="dispatcher">{t('instance.type.dispatcher')}</option>
            </select>
          </div>

          {/* Host & Port */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">
                {t('instance.form.host')}
              </label>
              <input
                type="text"
                value={formData.host}
                onChange={(e) => setFormData({ ...formData, host: e.target.value })}
                className={`input ${errors.host ? 'border-error text-error' : ''}`}
                placeholder="localhost"
              />
              {errors.host && <p className="text-sm text-error mt-1">{errors.host}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 opacity-70">
                {t('instance.form.port')}
              </label>
              <input
                type="number"
                value={formData.port}
                onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 0 })}
                className={`input ${errors.port ? 'border-error text-error' : ''}`}
                placeholder="4502"
              />
              {errors.port && <p className="text-sm text-error mt-1">{errors.port}</p>}
            </div>
          </div>

          {/* Path */}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">
              {t('instance.form.path')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.path}
                onChange={(e) => setFormData({ ...formData, path: e.target.value })}
                className={`input flex-1 ${errors.path ? 'border-error text-error' : ''}`}
                placeholder="/path/to/aem-author-p4502.jar"
              />
              <Button
                type="button"
                variant="outline"
                icon={<FolderOpen size={16} />}
                onClick={handleBrowse}
                disabled={isScanning}
              >
                {t('common.browse')}
              </Button>
            </div>
            <p className="text-xs opacity-50 mt-1">{t('instance.form.pathHint')}</p>
            {errors.path && <p className="text-sm text-error mt-1">{errors.path}</p>}
          </div>

          {/* Java Options */}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">
              {t('instance.form.javaOpts')}
            </label>
            <input
              type="text"
              value={formData.javaOpts}
              onChange={(e) => setFormData({ ...formData, javaOpts: e.target.value })}
              className="input"
              placeholder={t(
                'instance.form.javaOptsPlaceholder',
                '-Xmx4g -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005'
              )}
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('instance.form.javaOptsHint', 'Memory settings, remote debug, GC options, etc.')}
            </p>
          </div>

          {/* Run Modes */}
          <div>
            <label className="block text-sm font-medium mb-1 opacity-70">
              {t('instance.form.runModes')}
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
            <div className="p-3 rounded-lg bg-error/10 text-error-600 dark:text-error-400 text-sm">
              {errors.submit}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-white/10">
            <Button variant="ghost" onClick={onClose} disabled={isSaving}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" variant="primary" icon={<Save size={16} />} disabled={isSaving}>
              {isSaving ? t('instance.form.saving') : t('instance.form.save')}
            </Button>
          </div>
        </form>
      </div>

      {/* JAR Selection Modal */}
      {showJarModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowJarModal(false)} />
          <div className="relative w-full max-w-md panel m-4 p-0">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-white/10">
              <div className="flex items-center gap-2">
                <FileArchive size={20} className="text-primary" />
                <h3 className="text-lg font-semibold">{t('instance.form.selectJarTitle')}</h3>
              </div>
              <button
                onClick={() => setShowJarModal(false)}
                className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X size={20} className="opacity-50" />
              </button>
            </div>
            <div className="p-4 space-y-2 max-h-64 overflow-auto">
              <p className="text-sm opacity-70 mb-3">{t('instance.form.multipleJarsFound')}</p>
              {foundJars.map((jar, index) => (
                <button
                  key={index}
                  onClick={() => applyJarInfo(jar)}
                  className="w-full p-3 rounded-lg border border-gray-200 dark:border-white/10
                           hover:border-primary hover:bg-primary/5 transition-colors text-left
                           flex items-center gap-3"
                >
                  <FileArchive size={18} className="text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{jar.name}</div>
                    <div className="text-xs opacity-50 truncate">
                      {jar.instance_type} · Port {jar.port}
                    </div>
                  </div>
                  <Check size={16} className="text-primary opacity-0 group-hover:opacity-100" />
                </button>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-white/10">
              <Button variant="ghost" onClick={() => setShowJarModal(false)} className="w-full">
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
