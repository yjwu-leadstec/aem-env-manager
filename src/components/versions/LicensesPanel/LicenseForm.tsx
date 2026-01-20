import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Upload, RefreshCw, FolderOpen, AlertCircle, Server } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';
import * as licenseApi from '@/api/license';
import * as instanceApi from '@/api/instance';
import { open } from '@tauri-apps/plugin-dialog';
import type { AemLicense } from '@/api/license';
import type { AemInstance } from '@/types';

interface LicenseFormProps {
  license?: AemLicense | null;
  onSave: (data: licenseApi.CreateLicenseInput) => void;
  onCancel: () => void;
}

export function LicenseForm({ license, onSave, onCancel }: LicenseFormProps) {
  const { t } = useTranslation();
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [instances, setInstances] = useState<AemInstance[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(!!license);
  const addNotification = useAppStore((s) => s.addNotification);

  const [formData, setFormData] = useState<licenseApi.CreateLicenseInput>({
    name: license?.name || '',
    license_key: license?.license_key || '',
    license_file_path: license?.license_file_path || '',
    product_name: license?.product_name || 'Adobe Experience Manager',
    product_version: license?.product_version || '',
    customer_name: license?.customer_name || '',
    expiry_date: license?.expiry_date?.split('T')[0] || '',
    associated_instance_id: license?.associated_instance_id || '',
    notes: license?.notes || '',
  });

  // Load AEM instances for association
  useEffect(() => {
    instanceApi.listInstances().then(setInstances).catch(console.error);
  }, []);

  // Handle file selection and auto-parse
  const handleSelectFile = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'License Files', extensions: ['properties'] }],
      });

      if (!selected) return;

      const filePath = typeof selected === 'string' ? selected : selected;
      setIsParsing(true);
      setParseError(null);

      try {
        const parsed = await licenseApi.parseLicenseFile(filePath);

        // Auto-fill form with parsed data
        const fileName = filePath.split('/').pop()?.replace('.properties', '') || 'License';

        setFormData((prev) => ({
          ...prev,
          license_file_path: filePath,
          name: prev.name || parsed.customer_name || fileName,
          license_key: parsed.license_key || prev.license_key || '',
          product_name: parsed.product_name || prev.product_name || 'Adobe Experience Manager',
          product_version: parsed.product_version || prev.product_version || '',
          customer_name: parsed.customer_name || prev.customer_name || '',
          expiry_date: parsed.expiry_date || prev.expiry_date || '',
        }));

        addNotification({
          type: 'success',
          title: t('licenses.notifications.parseSuccess'),
          message: t('licenses.notifications.parsed'),
        });

        // Show advanced fields after parsing
        setShowAdvanced(true);
      } catch (parseErr) {
        setParseError(
          parseErr instanceof Error ? parseErr.message : 'Failed to parse license file'
        );
      }
    } catch (error) {
      console.error('File selection error:', error);
    } finally {
      setIsParsing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 sticky top-0 bg-white dark:bg-slate-800">
          <h3 className="text-lg font-semibold">
            {license ? t('licenses.form.editTitle') : t('licenses.form.addTitle')}
          </h3>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
          >
            <X size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* File Upload Section - Primary method */}
          {!license && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Upload size={20} className="text-primary" />
                </div>
                <div>
                  <div className="font-medium text-slate-900 dark:text-slate-100">
                    {t('licenses.form.uploadTitle')}
                  </div>
                  <div className="text-sm text-slate-500 dark:text-slate-400">
                    {t('licenses.form.uploadDesc')}
                  </div>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleSelectFile}
                disabled={isParsing}
                className="w-full"
              >
                {isParsing ? (
                  <>
                    <RefreshCw size={16} className="animate-spin mr-2" />
                    {t('licenses.form.parsing')}
                  </>
                ) : (
                  <>
                    <FolderOpen size={16} className="mr-2" />
                    {t('licenses.form.selectFile')}
                  </>
                )}
              </Button>
              {parseError && (
                <div className="mt-2 text-sm text-error-500 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {parseError}
                </div>
              )}
              {formData.license_file_path && (
                <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 font-mono truncate">
                  {formData.license_file_path}
                </div>
              )}
            </div>
          )}

          {/* Basic Info */}
          <div>
            <label className="block text-sm font-medium mb-1">{t('licenses.form.name')} *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              required
              placeholder={t('licenses.form.namePlaceholder')}
            />
          </div>

          {/* Instance Association */}
          <div>
            <label className="block text-sm font-medium mb-1">
              <Server size={14} className="inline mr-1" />
              {t('licenses.form.associateInstance')}
            </label>
            <select
              value={formData.associated_instance_id || ''}
              onChange={(e) =>
                setFormData({ ...formData, associated_instance_id: e.target.value || undefined })
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
            >
              <option value="">{t('licenses.form.noInstance')}</option>
              {instances.map((instance) => (
                <option key={instance.id} value={instance.id}>
                  {instance.name} ({instance.instance_type} - {instance.port})
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {t('licenses.form.associateInstanceDesc')}
            </p>
          </div>

          {/* Toggle Advanced Fields */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            {showAdvanced ? t('licenses.form.hideAdvanced') : t('licenses.form.showAdvanced')}
            <span className={`transition-transform ${showAdvanced ? 'rotate-180' : ''}`}>▼</span>
          </button>

          {/* Advanced Fields */}
          {showAdvanced && (
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('licenses.form.productName')}
                </label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('licenses.form.productVersion')}
                  </label>
                  <input
                    type="text"
                    value={formData.product_version}
                    onChange={(e) => setFormData({ ...formData, product_version: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                    placeholder="6.5"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {t('licenses.form.expiryDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('licenses.form.customerName')}
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('licenses.form.licenseKey')}
                </label>
                <input
                  type="text"
                  value={formData.license_key}
                  onChange={(e) => setFormData({ ...formData, license_key: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 font-mono text-sm"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('licenses.form.licenseFilePath')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.license_file_path}
                    onChange={(e) =>
                      setFormData({ ...formData, license_file_path: e.target.value })
                    }
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 font-mono text-sm"
                    placeholder="/path/to/license.properties"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSelectFile}
                    disabled={isParsing}
                  >
                    <FolderOpen size={16} />
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{t('licenses.form.notes')}</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  rows={2}
                />
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onCancel}>
              {t('common.cancel')}
            </Button>
            <Button type="submit">{license ? t('common.save') : t('common.add')}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
