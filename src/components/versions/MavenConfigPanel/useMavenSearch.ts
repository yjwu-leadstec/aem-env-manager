import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import * as versionApi from '@/api/version';
import { open } from '@tauri-apps/plugin-dialog';
import type { MavenPanelProps } from '../types';

interface BatchImportProgress {
  current: number;
  total: number;
}

export function useMavenSearch(mavenInfo: MavenPanelProps['mavenInfo'], onRefresh: () => void) {
  const { t } = useTranslation();
  const addNotification = useAppStore((s) => s.addNotification);

  // Import dialog state
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importName, setImportName] = useState('');
  const [importPath, setImportPath] = useState('');

  // Search state
  const [searchPath, setSearchPath] = useState('');
  const [searchResults, setSearchResults] = useState<versionApi.MavenSettingsFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Batch import state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [batchImportProgress, setBatchImportProgress] = useState<BatchImportProgress>({
    current: 0,
    total: 0,
  });

  // Search for Maven settings in specified path
  const handleSearch = useCallback(
    async (path?: string) => {
      const searchDir = path || searchPath;
      if (!searchDir.trim()) {
        addNotification({
          type: 'warning',
          title: t('maven.search.noPath'),
          message: t('maven.search.noPathMessage'),
        });
        return;
      }

      setIsSearching(true);
      setSearchResults([]);
      try {
        const results = await versionApi.scanMavenSettingsInPath(searchDir.trim());

        // Filter out already imported configurations
        const existingConfigs = mavenInfo?.configs || [];
        const currentConfig = mavenInfo?.current;

        const excludedPaths = new Set<string>();
        if (currentConfig?.path) {
          excludedPaths.add(currentConfig.path);
        }

        const existingIdentifiers = new Set<string>();
        existingConfigs.forEach((c) => {
          existingIdentifiers.add(c.name.toLowerCase());
          existingIdentifiers.add(c.id.toLowerCase());
        });

        const filteredResults = results.filter((r) => {
          if (excludedPaths.has(r.path)) {
            return false;
          }

          const pathParts = r.path.split('/').filter(Boolean);
          const parentDir = pathParts[pathParts.length - 2]?.toLowerCase() || '';
          const cleanedName = r.name
            .replace('.xml', '')
            .replace(/settings/gi, '')
            .replace(/^[-_.]+|[-_.]+$/g, '')
            .trim()
            .toLowerCase();

          const wouldDuplicate =
            existingIdentifiers.has(parentDir) ||
            (cleanedName && existingIdentifiers.has(cleanedName));

          return !wouldDuplicate;
        });

        setSearchResults(filteredResults);

        if (filteredResults.length === 0) {
          if (results.length > 0) {
            addNotification({
              type: 'info',
              title: t('maven.search.noResults'),
              message: t('maven.batch.allAlreadyImported'),
            });
          } else {
            addNotification({
              type: 'info',
              title: t('maven.search.noResults'),
              message: t('maven.search.noResultsMessage'),
            });
          }
        } else {
          addNotification({
            type: 'success',
            title: t('maven.search.found'),
            message: t('maven.search.foundMessage', { count: filteredResults.length }),
          });
        }
      } catch (error) {
        addNotification({
          type: 'error',
          title: t('maven.search.failed'),
          message: error instanceof Error ? error.message : t('common.unknown'),
        });
      } finally {
        setIsSearching(false);
      }
    },
    [addNotification, mavenInfo, searchPath, t]
  );

  // Browse for search directory
  const handleBrowseSearchPath = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t('maven.search.selectDirectory'),
      });
      if (selected && typeof selected === 'string') {
        setSearchPath(selected);
        // Auto-search when directory is selected
        handleSearch(selected);
      }
    } catch {
      // User cancelled the dialog
    }
  }, [t, handleSearch]);

  // Select a found file for import
  const handleSelectFoundFile = useCallback((file: versionApi.MavenSettingsFile) => {
    setImportPath(file.path);

    let suggestedName = file.name
      .replace('.xml', '')
      .replace(/settings/gi, '')
      .replace(/^[-_.]+|[-_.]+$/g, '')
      .trim();

    if (!suggestedName) {
      const pathParts = file.path.split('/').filter(Boolean);
      suggestedName = pathParts[pathParts.length - 2] || '';
    }

    if (!suggestedName) {
      suggestedName = 'Maven Config';
    }

    setImportName(suggestedName);
    setSearchResults([]);
  }, []);

  // Toggle file selection for batch import
  const toggleFileSelection = useCallback((filePath: string) => {
    setSelectedFiles((prev) => {
      const newSelection = new Set(prev);
      if (newSelection.has(filePath)) {
        newSelection.delete(filePath);
      } else {
        newSelection.add(filePath);
      }
      return newSelection;
    });
  }, []);

  // Select/deselect all files
  const toggleSelectAll = useCallback(() => {
    setSelectedFiles((prev) => {
      if (prev.size === searchResults.length) {
        return new Set();
      }
      return new Set(searchResults.map((f) => f.path));
    });
  }, [searchResults]);

  // Import single file
  const handleImport = useCallback(async () => {
    if (!importName.trim() || !importPath.trim()) {
      addNotification({
        type: 'warning',
        title: t('maven.notifications.importFailed'),
        message: t('maven.notifications.importEmptyFields'),
      });
      return;
    }

    try {
      await versionApi.importMavenConfig(importName.trim(), importPath.trim());
      addNotification({
        type: 'success',
        title: t('maven.notifications.importSuccess'),
        message: t('maven.notifications.imported', { name: importName }),
      });
      setShowImportDialog(false);
      setImportName('');
      setImportPath('');
      onRefresh();
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('maven.notifications.importFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    }
  }, [addNotification, importName, importPath, onRefresh, t]);

  // Batch import selected files
  const handleBatchImport = useCallback(async () => {
    if (selectedFiles.size === 0) {
      addNotification({
        type: 'warning',
        title: t('maven.batch.noSelection'),
        message: t('maven.batch.noSelectionMessage'),
      });
      return;
    }

    setIsBatchImporting(true);
    setBatchImportProgress({ current: 0, total: selectedFiles.size });

    const selectedFilesArray = searchResults.filter((f) => selectedFiles.has(f.path));
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedFilesArray.length; i++) {
      const file = selectedFilesArray[i];
      setBatchImportProgress({ current: i + 1, total: selectedFiles.size });

      try {
        let suggestedName = file.name
          .replace('.xml', '')
          .replace(/settings/gi, '')
          .replace(/^[-_.]+|[-_.]+$/g, '')
          .trim();

        if (!suggestedName) {
          const pathParts = file.path.split('/').filter(Boolean);
          suggestedName = pathParts[pathParts.length - 2] || '';
        }

        if (!suggestedName) {
          suggestedName = `Maven Config ${Date.now()}-${i + 1}`;
        }

        await versionApi.importMavenConfig(suggestedName, file.path);
        successCount++;
      } catch (error) {
        console.error(`Failed to import ${file.name}:`, error);
        failCount++;
      }
    }

    // Show result notification
    if (failCount === 0) {
      addNotification({
        type: 'success',
        title: t('maven.batch.importSuccess'),
        message: t('maven.batch.importSuccessMessage', { count: successCount }),
      });
    } else if (successCount === 0) {
      addNotification({
        type: 'error',
        title: t('maven.batch.importFailed'),
        message: t('maven.batch.importFailedMessage', { count: failCount }),
      });
    } else {
      addNotification({
        type: 'warning',
        title: t('maven.batch.importPartial'),
        message: t('maven.batch.importPartialMessage', {
          success: successCount,
          failed: failCount,
        }),
      });
    }

    // Reset state
    setIsBatchImporting(false);
    setBatchImportProgress({ current: 0, total: 0 });
    setSelectedFiles(new Set());
    setSearchResults([]);
    onRefresh();
  }, [addNotification, onRefresh, searchResults, selectedFiles, t]);

  // Reset dialog state when closing
  const handleCloseImportDialog = useCallback(() => {
    setShowImportDialog(false);
    setImportName('');
    setImportPath('');
    setSearchPath('');
    setSearchResults([]);
    setSelectedFiles(new Set());
    setBatchImportProgress({ current: 0, total: 0 });
  }, []);

  // Handle file input change (for hidden file input)
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportPath(file.name);
    }
  }, []);

  return {
    // Import dialog state
    showImportDialog,
    setShowImportDialog,
    importName,
    setImportName,
    importPath,
    setImportPath,
    handleImport,
    handleCloseImportDialog,
    handleFileSelect,

    // Search state
    searchPath,
    setSearchPath,
    searchResults,
    isSearching,
    handleSearch,
    handleBrowseSearchPath,
    handleSelectFoundFile,

    // Batch import state
    selectedFiles,
    isBatchImporting,
    batchImportProgress,
    toggleFileSelection,
    toggleSelectAll,
    handleBatchImport,
  };
}
