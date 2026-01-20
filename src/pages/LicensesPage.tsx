import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Key,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Calendar,
  Building2,
  FileKey,
  AlertTriangle,
  Check,
  Clock,
  Link2,
  X,
  Search,
  FolderSearch,
  Upload,
  CheckSquare,
  Square,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';
import * as licenseApi from '@/api/license';
import type {
  AemLicense,
  LicenseStatus,
  LicenseStatistics,
  ScannedLicenseFile,
} from '@/api/license';

// License Form Modal
interface LicenseFormProps {
  license?: AemLicense | null;
  onSave: (data: licenseApi.CreateLicenseInput) => void;
  onCancel: () => void;
}

function LicenseForm({ license, onSave, onCancel }: LicenseFormProps) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState<licenseApi.CreateLicenseInput>({
    name: license?.name || '',
    license_key: license?.license_key || '',
    license_file_path: license?.license_file_path || '',
    product_name: license?.product_name || 'Adobe Experience Manager',
    product_version: license?.product_version || '',
    customer_name: license?.customer_name || '',
    expiry_date: license?.expiry_date?.split('T')[0] || '',
    notes: license?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg mx-4">
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
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
          <div>
            <label className="block text-sm font-medium mb-1">{t('licenses.form.name')}</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('licenses.form.productName')}
            </label>
            <input
              type="text"
              value={formData.product_name}
              onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
              required
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
            <input
              type="text"
              value={formData.license_file_path}
              onChange={(e) => setFormData({ ...formData, license_file_path: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 font-mono text-sm"
              placeholder="/path/to/license.properties"
            />
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

// Status Badge Component
function StatusBadge({ status }: { status: LicenseStatus }) {
  const { t } = useTranslation();

  const getStatusConfig = () => {
    switch (status) {
      case 'valid':
        return { icon: Check, class: 'badge-success', label: t('licenses.status.valid') };
      case 'expiring':
        return { icon: Clock, class: 'badge-warning', label: t('licenses.status.expiring') };
      case 'expired':
        return { icon: AlertTriangle, class: 'badge-error', label: t('licenses.status.expired') };
      case 'invalid':
        return { icon: X, class: 'badge-error', label: t('licenses.status.invalid') };
      default:
        return { icon: AlertTriangle, class: 'badge-slate', label: t('licenses.status.unknown') };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${config.class}`}
    >
      <Icon size={14} />
      {config.label}
    </span>
  );
}

export function LicensesPage() {
  const { t } = useTranslation();
  const [licenses, setLicenses] = useState<AemLicense[]>([]);
  const [statistics, setStatistics] = useState<LicenseStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState<AemLicense | null>(null);
  const [filter, setFilter] = useState<'all' | LicenseStatus>('all');
  const addNotification = useAppStore((s) => s.addNotification);

  // Scan dialog state
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [searchDir, setSearchDir] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ScannedLicenseFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [batchImportProgress, setBatchImportProgress] = useState({ current: 0, total: 0 });

  const loadLicenses = useCallback(async () => {
    setIsLoading(true);
    try {
      const [licenseList, stats] = await Promise.all([
        licenseApi.listAemLicenses(),
        licenseApi.getLicenseStatistics(),
      ]);
      setLicenses(licenseList);
      setStatistics(stats);
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('licenses.notifications.loadFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [addNotification, t]);

  useEffect(() => {
    loadLicenses();
  }, [loadLicenses]);

  const handleSave = async (data: licenseApi.CreateLicenseInput) => {
    try {
      if (editingLicense) {
        await licenseApi.updateAemLicense(editingLicense.id, {
          ...editingLicense,
          ...data,
        });
        addNotification({
          type: 'success',
          title: t('licenses.notifications.updateSuccess'),
          message: t('licenses.notifications.updated', { name: data.name }),
        });
      } else {
        await licenseApi.addAemLicense(data);
        addNotification({
          type: 'success',
          title: t('licenses.notifications.addSuccess'),
          message: t('licenses.notifications.added', { name: data.name }),
        });
      }
      setShowForm(false);
      setEditingLicense(null);
      loadLicenses();
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('licenses.notifications.saveFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    }
  };

  const handleDelete = async (license: AemLicense) => {
    if (!window.confirm(t('licenses.confirmDelete', { name: license.name }))) {
      return;
    }

    try {
      await licenseApi.deleteAemLicense(license.id);
      addNotification({
        type: 'success',
        title: t('licenses.notifications.deleteSuccess'),
        message: t('licenses.notifications.deleted', { name: license.name }),
      });
      loadLicenses();
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('licenses.notifications.deleteFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    }
  };

  const filteredLicenses =
    filter === 'all' ? licenses : licenses.filter((l) => l.status === filter);

  // Handle search in custom directory
  const handleSearch = async () => {
    if (!searchDir.trim()) {
      addNotification({
        type: 'warning',
        title: t('licenses.scan.warning'),
        message: t('licenses.scan.enterPath'),
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setSelectedFiles(new Set());

    try {
      const results = await licenseApi.scanLicenseFiles(searchDir.trim());

      // Filter out already imported licenses (by path)
      const existingPaths = new Set(licenses.map((l) => l.license_file_path).filter(Boolean));
      const filteredResults = results.filter((r) => !existingPaths.has(r.path));

      setSearchResults(filteredResults);

      if (filteredResults.length === 0) {
        if (results.length > 0) {
          addNotification({
            type: 'info',
            title: t('licenses.scan.noResults'),
            message: t('licenses.scan.allAlreadyImported'),
          });
        } else {
          addNotification({
            type: 'info',
            title: t('licenses.scan.noResults'),
            message: t('licenses.scan.noResultsMessage'),
          });
        }
      } else {
        addNotification({
          type: 'success',
          title: t('licenses.scan.found'),
          message: t('licenses.scan.foundMessage', { count: filteredResults.length }),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('licenses.scan.failed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle scan default locations
  const handleScanDefaults = async () => {
    setIsSearching(true);
    setSearchResults([]);
    setSelectedFiles(new Set());

    try {
      const results = await licenseApi.scanDefaultLicenseLocations();

      // Filter out already imported licenses
      const existingPaths = new Set(licenses.map((l) => l.license_file_path).filter(Boolean));
      const filteredResults = results.filter((r) => !existingPaths.has(r.path));

      setSearchResults(filteredResults);

      if (filteredResults.length === 0) {
        addNotification({
          type: 'info',
          title: t('licenses.scan.noResults'),
          message:
            results.length > 0
              ? t('licenses.scan.allAlreadyImported')
              : t('licenses.scan.noDefaultsFound'),
        });
      } else {
        addNotification({
          type: 'success',
          title: t('licenses.scan.found'),
          message: t('licenses.scan.foundMessage', { count: filteredResults.length }),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('licenses.scan.failed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Toggle file selection
  const toggleFileSelection = (path: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(path)) {
        newSet.delete(path);
      } else {
        newSet.add(path);
      }
      return newSet;
    });
  };

  // Select/deselect all
  const toggleSelectAll = () => {
    if (selectedFiles.size === searchResults.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(searchResults.map((r) => r.path)));
    }
  };

  // Batch import selected files
  const handleBatchImport = async () => {
    if (selectedFiles.size === 0) return;

    setIsBatchImporting(true);
    setBatchImportProgress({ current: 0, total: selectedFiles.size });

    const filesToImport = searchResults.filter((r) => selectedFiles.has(r.path));
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < filesToImport.length; i++) {
      const file = filesToImport[i];
      setBatchImportProgress({ current: i + 1, total: filesToImport.length });

      try {
        // Generate a name from the parent directory or product name
        const name =
          file.product_name ||
          file.parent_directory ||
          file.name.replace('.properties', '').replace('license', 'License');

        // Parse the license file to get full details
        const parsed = await licenseApi.parseLicenseFile(file.path);

        await licenseApi.addAemLicense({
          name: `${name} License`,
          license_key: parsed.license_key || undefined,
          license_file_path: file.path,
          product_name: parsed.product_name || 'Adobe Experience Manager',
          product_version: parsed.product_version || undefined,
          customer_name: parsed.customer_name || undefined,
          notes: parsed.download_id ? `Download ID: ${parsed.download_id}` : undefined,
        });

        successCount++;
      } catch (error) {
        failCount++;
        console.error(`Failed to import ${file.path}:`, error);
      }
    }

    setIsBatchImporting(false);

    if (successCount > 0) {
      addNotification({
        type: 'success',
        title: t('licenses.scan.importSuccess'),
        message: t('licenses.scan.importedCount', { count: successCount }),
      });
    }

    if (failCount > 0) {
      addNotification({
        type: 'warning',
        title: t('licenses.scan.importPartial'),
        message: t('licenses.scan.failedCount', { count: failCount }),
      });
    }

    // Refresh licenses and close dialog
    loadLicenses();
    setShowScanDialog(false);
    setSearchResults([]);
    setSelectedFiles(new Set());
  };

  // Close scan dialog
  const handleCloseScanDialog = () => {
    setShowScanDialog(false);
    setSearchDir('');
    setSearchResults([]);
    setSelectedFiles(new Set());
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Key className="text-primary" />
            {t('licenses.title')}
          </h1>
          <p className="text-slate-500 dark:text-gray-400 mt-1">{t('licenses.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={loadLicenses} disabled={isLoading}>
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
            {t('common.refresh')}
          </Button>
          <Button variant="outline" onClick={() => setShowScanDialog(true)}>
            <FolderSearch size={16} />
            {t('licenses.scanLicenses')}
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus size={16} />
            {t('licenses.addLicense')}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer hover:border-primary/50 transition-colors"
            onClick={() => setFilter('all')}
          >
            <CardContent className="text-center py-4">
              <div className="text-3xl font-bold text-primary">{statistics.total}</div>
              <div className="text-sm opacity-70">{t('licenses.stats.total')}</div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-success/50 transition-colors"
            onClick={() => setFilter('valid')}
          >
            <CardContent className="text-center py-4">
              <div className="text-3xl font-bold text-success-500">{statistics.valid}</div>
              <div className="text-sm opacity-70">{t('licenses.stats.valid')}</div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-warning/50 transition-colors"
            onClick={() => setFilter('expiring')}
          >
            <CardContent className="text-center py-4">
              <div className="text-3xl font-bold text-warning-500">{statistics.expiring}</div>
              <div className="text-sm opacity-70">{t('licenses.stats.expiring')}</div>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer hover:border-error/50 transition-colors"
            onClick={() => setFilter('expired')}
          >
            <CardContent className="text-center py-4">
              <div className="text-3xl font-bold text-error-500">{statistics.expired}</div>
              <div className="text-sm opacity-70">{t('licenses.stats.expired')}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {(['all', 'valid', 'expiring', 'expired', 'unknown'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilter(type)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === type
                ? 'bg-primary/10 text-primary border border-primary/20'
                : 'text-slate-500 dark:text-gray-400 hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
            }`}
          >
            {t(`licenses.filters.${type}`)}
          </button>
        ))}
      </div>

      {/* License List */}
      <Card>
        <CardHeader
          title={t('licenses.list.title')}
          subtitle={t('licenses.list.subtitle', { count: filteredLicenses.length })}
        />
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 opacity-60">{t('common.loading')}</div>
          ) : filteredLicenses.length === 0 ? (
            <div className="text-center py-8 opacity-60">
              {licenses.length === 0 ? t('licenses.noLicenses') : t('licenses.noMatchingLicenses')}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLicenses.map((license) => (
                <div
                  key={license.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <FileKey size={24} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{license.name}</span>
                        <StatusBadge status={license.status} />
                      </div>
                      <div className="text-sm opacity-60 mt-1">
                        {license.product_name}
                        {license.product_version && ` v${license.product_version}`}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs opacity-50">
                        {license.customer_name && (
                          <span className="flex items-center gap-1">
                            <Building2 size={12} />
                            {license.customer_name}
                          </span>
                        )}
                        {license.expiry_date && (
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {licenseApi.formatExpiryDate(license.expiry_date)}
                          </span>
                        )}
                        {license.associated_instance_id && (
                          <span className="flex items-center gap-1">
                            <Link2 size={12} />
                            {t('licenses.linkedToInstance')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingLicense(license);
                        setShowForm(true);
                      }}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(license)}>
                      <Trash2 size={16} className="text-error-500" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* License Form Modal */}
      {showForm && (
        <LicenseForm
          license={editingLicense}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingLicense(null);
          }}
        />
      )}

      {/* Scan Dialog */}
      {showScanDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <FolderSearch size={20} className="text-primary" />
                {t('licenses.scan.title')}
              </h3>
              <button
                onClick={handleCloseScanDialog}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <X size={20} />
              </button>
            </div>

            {/* Dialog Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Search Input */}
              <div className="space-y-2">
                <label className="block text-sm font-medium">{t('licenses.scan.searchPath')}</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchDir}
                    onChange={(e) => setSearchDir(e.target.value)}
                    placeholder={t('licenses.scan.searchPlaceholder')}
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 font-mono text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <Button onClick={handleSearch} disabled={isSearching}>
                    {isSearching ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Search size={16} />
                    )}
                    {t('common.search')}
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 dark:text-gray-400">
                    {t('licenses.scan.orScan')}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleScanDefaults}
                    disabled={isSearching}
                  >
                    <FolderSearch size={14} />
                    {t('licenses.scan.defaultLocations')}
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {t('licenses.scan.results', { count: searchResults.length })}
                    </span>
                    <Button variant="ghost" size="sm" onClick={toggleSelectAll}>
                      {selectedFiles.size === searchResults.length ? (
                        <>
                          <CheckSquare size={14} />
                          {t('common.deselectAll')}
                        </>
                      ) : (
                        <>
                          <Square size={14} />
                          {t('common.selectAll')}
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg divide-y divide-slate-200 dark:divide-slate-700">
                    {searchResults.map((file) => (
                      <div
                        key={file.path}
                        className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                          selectedFiles.has(file.path) ? 'bg-primary/5' : ''
                        }`}
                        onClick={() => toggleFileSelection(file.path)}
                      >
                        <div className="flex-shrink-0">
                          {selectedFiles.has(file.path) ? (
                            <CheckSquare size={18} className="text-primary" />
                          ) : (
                            <Square size={18} className="text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm truncate">
                            {file.parent_directory || file.name}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-gray-400 truncate font-mono">
                            {file.path}
                          </div>
                          {(file.product_name || file.customer_name) && (
                            <div className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                              {file.product_name}
                              {file.customer_name && ` • ${file.customer_name}`}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!isSearching && searchResults.length === 0 && (
                <div className="text-center py-8 opacity-60">
                  <FolderSearch size={48} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{t('licenses.scan.instructions')}</p>
                </div>
              )}

              {/* Loading State */}
              {isSearching && (
                <div className="text-center py-8">
                  <RefreshCw size={32} className="mx-auto mb-2 animate-spin text-primary" />
                  <p className="text-sm opacity-60">{t('licenses.scan.searching')}</p>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={handleCloseScanDialog}>
                {t('common.cancel')}
              </Button>
              {selectedFiles.size > 0 && (
                <Button onClick={handleBatchImport} disabled={isBatchImporting}>
                  {isBatchImporting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      {t('licenses.scan.importing', {
                        current: batchImportProgress.current,
                        total: batchImportProgress.total,
                      })}
                    </>
                  ) : (
                    <>
                      <Upload size={16} />
                      {t('licenses.scan.importSelected', { count: selectedFiles.size })}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
