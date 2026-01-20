import { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import * as licenseApi from '@/api/license';
import * as instanceApi from '@/api/instance';
import type { AemLicense, LicenseStatus, LicenseStatistics } from '@/api/license';
import type { AemInstance } from '@/types';

// Extended type to track which instance each license came from
export type ScannedLicenseWithInstance = licenseApi.ScannedLicenseFile & {
  instance_id?: string;
  instance_name?: string;
};

interface ImportProgress {
  current: number;
  total: number;
}

export function useLicenses(onLicensesChange?: () => void) {
  const { t } = useTranslation();
  const addNotification = useAppStore((s) => s.addNotification);

  // License list state
  const [licenses, setLicenses] = useState<AemLicense[]>([]);
  const [statistics, setStatistics] = useState<LicenseStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | LicenseStatus>('all');

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState<AemLicense | null>(null);

  // Delete state
  const [deleteConfirmLicense, setDeleteConfirmLicense] = useState<AemLicense | null>(null);
  const [isDeletingLicense, setIsDeletingLicense] = useState(false);

  // Scan state
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScannedLicenseWithInstance[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0 });
  const [instances, setInstances] = useState<AemInstance[]>([]);

  // Load licenses
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

  // Load instances for scanning
  const loadInstances = useCallback(async () => {
    try {
      const instanceList = await instanceApi.listInstances();
      setInstances(instanceList);
    } catch (error) {
      console.error('Failed to load instances:', error);
    }
  }, []);

  // Scan instance directories for license files
  const handleScanInstanceDirs = useCallback(async () => {
    if (instances.length === 0) {
      addNotification({
        type: 'warning',
        title: t('licenses.scan.noInstances'),
        message: t('licenses.scan.noInstancesMessage'),
      });
      return;
    }

    setIsScanning(true);
    setScanResults([]);
    setSelectedFiles(new Set());

    try {
      const allResults: ScannedLicenseWithInstance[] = [];
      const existingPaths = new Set(
        licenses.filter((l) => l.license_file_path).map((l) => l.license_file_path)
      );

      for (const instance of instances) {
        if (instance.path) {
          try {
            const parentDir = instance.path.replace(/[/\\][^/\\]+$/, '');
            const results = await licenseApi.scanLicenseFiles(parentDir);
            const newResults = results
              .filter((r) => !existingPaths.has(r.path))
              .map((r) => ({
                ...r,
                instance_id: instance.id,
                instance_name: instance.name,
              }));
            allResults.push(...newResults);
          } catch (error) {
            console.error(`Failed to scan ${instance.path}:`, error);
          }
        }
      }

      // Deduplicate by path
      const uniqueResults = allResults.filter(
        (result, index, self) => self.findIndex((r) => r.path === result.path) === index
      );

      setScanResults(uniqueResults);

      if (uniqueResults.length === 0) {
        addNotification({
          type: 'info',
          title: t('licenses.scan.noNewLicenses'),
          message: t('licenses.scan.noNewLicensesMessage'),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('licenses.scan.scanFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsScanning(false);
    }
  }, [addNotification, instances, licenses, t]);

  // Open scan dialog
  const openScanDialog = useCallback(async () => {
    setShowScanDialog(true);
    setScanResults([]);
    setSelectedFiles(new Set());
    await loadInstances();
  }, [loadInstances]);

  // Toggle file selection
  const toggleFileSelection = useCallback((path: string) => {
    setSelectedFiles((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(path)) {
        newSelected.delete(path);
      } else {
        newSelected.add(path);
      }
      return newSelected;
    });
  }, []);

  // Select all files
  const selectAllFiles = useCallback(() => {
    setSelectedFiles((prev) => {
      if (prev.size === scanResults.length) {
        return new Set();
      }
      return new Set(scanResults.map((r) => r.path));
    });
  }, [scanResults]);

  // Batch import selected files
  const handleBatchImport = useCallback(async () => {
    if (selectedFiles.size === 0) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: selectedFiles.size });

    const selectedResults = scanResults.filter((r) => selectedFiles.has(r.path));
    let successCount = 0;

    for (let i = 0; i < selectedResults.length; i++) {
      const file = selectedResults[i];
      setImportProgress({ current: i + 1, total: selectedFiles.size });

      try {
        const parsed = await licenseApi.parseLicenseFile(file.path);

        await licenseApi.addAemLicense({
          name: file.instance_name
            ? `${file.instance_name} License`
            : file.name || `License from ${file.parent_directory}`,
          license_file_path: file.path,
          product_name: parsed.product_name || 'Adobe Experience Manager',
          product_version: parsed.product_version || undefined,
          customer_name: parsed.customer_name || file.customer_name || undefined,
          license_key: parsed.license_key || undefined,
          expiry_date: parsed.expiry_date || undefined,
          associated_instance_id: file.instance_id,
        });

        successCount++;
      } catch (error) {
        console.error(`Failed to import ${file.path}:`, error);
      }
    }

    setIsImporting(false);
    setShowScanDialog(false);

    addNotification({
      type: successCount > 0 ? 'success' : 'error',
      title: successCount > 0 ? t('licenses.scan.importSuccess') : t('licenses.scan.importFailed'),
      message: t('licenses.scan.importedCount', { count: successCount, total: selectedFiles.size }),
    });

    loadLicenses();
    onLicensesChange?.();
  }, [addNotification, loadLicenses, onLicensesChange, scanResults, selectedFiles, t]);

  // Save license (create or update)
  const handleSave = useCallback(
    async (data: licenseApi.CreateLicenseInput) => {
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
        onLicensesChange?.();
      } catch (error) {
        addNotification({
          type: 'error',
          title: t('licenses.notifications.saveFailed'),
          message: error instanceof Error ? error.message : t('common.unknown'),
        });
      }
    },
    [addNotification, editingLicense, loadLicenses, onLicensesChange, t]
  );

  // Delete license
  const handleDelete = useCallback((license: AemLicense) => {
    setDeleteConfirmLicense(license);
  }, []);

  const confirmDeleteLicense = useCallback(async () => {
    if (!deleteConfirmLicense) return;

    setIsDeletingLicense(true);
    try {
      await licenseApi.deleteAemLicense(deleteConfirmLicense.id);
      addNotification({
        type: 'success',
        title: t('licenses.notifications.deleteSuccess'),
        message: t('licenses.notifications.deleted', { name: deleteConfirmLicense.name }),
      });
      setDeleteConfirmLicense(null);
      loadLicenses();
      onLicensesChange?.();
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('licenses.notifications.deleteFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsDeletingLicense(false);
    }
  }, [addNotification, deleteConfirmLicense, loadLicenses, onLicensesChange, t]);

  // Edit license
  const handleEdit = useCallback((license: AemLicense) => {
    setEditingLicense(license);
    setShowForm(true);
  }, []);

  // Close form
  const handleCloseForm = useCallback(() => {
    setShowForm(false);
    setEditingLicense(null);
  }, []);

  // Filtered licenses
  const filteredLicenses =
    filter === 'all' ? licenses : licenses.filter((l) => l.status === filter);

  return {
    // License list
    licenses,
    filteredLicenses,
    statistics,
    isLoading,
    filter,
    setFilter,
    loadLicenses,

    // Form state
    showForm,
    setShowForm,
    editingLicense,
    handleSave,
    handleEdit,
    handleCloseForm,

    // Delete state
    deleteConfirmLicense,
    setDeleteConfirmLicense,
    isDeletingLicense,
    handleDelete,
    confirmDeleteLicense,

    // Scan state
    showScanDialog,
    setShowScanDialog,
    isScanning,
    scanResults,
    selectedFiles,
    isImporting,
    importProgress,
    instances,
    openScanDialog,
    handleScanInstanceDirs,
    toggleFileSelection,
    selectAllFiles,
    handleBatchImport,
  };
}
