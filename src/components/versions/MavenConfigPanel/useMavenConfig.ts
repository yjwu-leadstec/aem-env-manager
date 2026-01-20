import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/store';
import * as versionApi from '@/api/version';
import type { MavenPanelProps } from '../types';

interface DeleteConfirmConfig {
  id: string;
  name: string;
}

export function useMavenConfig(mavenInfo: MavenPanelProps['mavenInfo'], onRefresh: () => void) {
  const { t } = useTranslation();
  const addNotification = useAppStore((s) => s.addNotification);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Config management state
  const [switchingConfig, setSwitchingConfig] = useState<string | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<string | null>(null);
  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState<DeleteConfirmConfig | null>(null);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);

  // Create dialog state
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createName, setCreateName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createNameError, setCreateNameError] = useState<string | null>(null);

  // Detail dialog state
  const [showDetailDialog, setShowDetailDialog] = useState<string | null>(null);
  const [configContent, setConfigContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);

  // Switch config
  const handleSwitch = useCallback(
    async (configId: string) => {
      setSwitchingConfig(configId);
      try {
        await versionApi.switchMavenConfig(configId);
        addNotification({
          type: 'success',
          title: t('maven.notifications.switched'),
          message: t('maven.notifications.switchedMessage'),
        });
        onRefresh();
      } catch (error) {
        addNotification({
          type: 'error',
          title: t('maven.notifications.switchFailed'),
          message: error instanceof Error ? error.message : t('common.unknown'),
        });
      } finally {
        setSwitchingConfig(null);
      }
    },
    [addNotification, onRefresh, t]
  );

  // Delete config
  const handleDelete = useCallback((configId: string, configName: string) => {
    setDeleteConfirmConfig({ id: configId, name: configName });
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmConfig) return;

    setDeletingConfig(deleteConfirmConfig.id);
    try {
      await versionApi.deleteMavenConfig(deleteConfirmConfig.id);
      addNotification({
        type: 'success',
        title: t('maven.notifications.deleteSuccess'),
        message: t('maven.notifications.deleted', { name: deleteConfirmConfig.name }),
      });
      setDeleteConfirmConfig(null);
      onRefresh();
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('maven.notifications.deleteFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setDeletingConfig(null);
    }
  }, [addNotification, deleteConfirmConfig, onRefresh, t]);

  // View detail
  const handleViewDetail = useCallback(
    async (configId: string) => {
      setShowDetailDialog(configId);
      setLoadingContent(true);
      try {
        const content = await versionApi.readMavenConfig(configId);
        setConfigContent(content);
      } catch {
        setConfigContent(t('maven.detail.loadError'));
      } finally {
        setLoadingContent(false);
      }
    },
    [t]
  );

  // Validate create name
  const validateCreateName = useCallback(
    (name: string): string | null => {
      if (!name) return null;
      if (!/^[a-z][a-z0-9-]{0,49}$/.test(name)) {
        return t('maven.create.nameInvalid');
      }
      if (name === 'repository' || name === 'settings') {
        return t('maven.create.nameReserved');
      }
      // Check if name already exists
      if (mavenInfo?.configs.some((c) => c.id === name || c.name === name)) {
        return t('maven.create.nameExists');
      }
      return null;
    },
    [mavenInfo?.configs, t]
  );

  // Handle create name change with validation
  const handleCreateNameChange = useCallback(
    (value: string) => {
      const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      setCreateName(normalized);
      setCreateNameError(validateCreateName(normalized));
    },
    [validateCreateName]
  );

  // Create new Maven configuration
  const handleCreate = useCallback(async () => {
    const error = validateCreateName(createName);
    if (error) {
      setCreateNameError(error);
      return;
    }

    setIsCreating(true);
    try {
      await versionApi.createMavenConfig(createName);
      addNotification({
        type: 'success',
        title: t('maven.create.success'),
        message: t('maven.create.successMessage', { name: createName }),
      });
      setShowCreateDialog(false);
      setCreateName('');
      setCreateNameError(null);
      onRefresh();
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('maven.create.failed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsCreating(false);
    }
  }, [addNotification, createName, onRefresh, t, validateCreateName]);

  // Open config file in editor
  const handleEditConfig = useCallback(
    async (configId: string) => {
      setEditingConfig(configId);
      try {
        await versionApi.openMavenConfigFile(configId);
        addNotification({
          type: 'info',
          title: t('maven.edit.opened'),
          message: t('maven.edit.openedMessage'),
        });
      } catch (error) {
        addNotification({
          type: 'error',
          title: t('maven.edit.failed'),
          message: error instanceof Error ? error.message : t('common.unknown'),
        });
      } finally {
        setEditingConfig(null);
      }
    },
    [addNotification, t]
  );

  // Copy config path to clipboard
  const handleCopyPath = useCallback(
    async (configId: string) => {
      try {
        const path = await versionApi.getMavenConfigPath(configId);
        await window.navigator.clipboard.writeText(path);
        addNotification({
          type: 'success',
          title: t('maven.path.copied'),
          message: path,
        });
      } catch (error) {
        addNotification({
          type: 'error',
          title: t('maven.path.copyFailed'),
          message: error instanceof Error ? error.message : t('common.unknown'),
        });
      }
    },
    [addNotification, t]
  );

  // Close create dialog
  const closeCreateDialog = useCallback(() => {
    setShowCreateDialog(false);
    setCreateName('');
    setCreateNameError(null);
  }, []);

  return {
    // Refs
    fileInputRef,

    // Switch state
    switchingConfig,
    handleSwitch,

    // Delete state
    deletingConfig,
    deleteConfirmConfig,
    handleDelete,
    confirmDelete,
    setDeleteConfirmConfig,

    // Create dialog state
    showCreateDialog,
    setShowCreateDialog,
    createName,
    isCreating,
    createNameError,
    handleCreateNameChange,
    handleCreate,
    closeCreateDialog,

    // Detail dialog state
    showDetailDialog,
    setShowDetailDialog,
    configContent,
    loadingContent,
    handleViewDetail,

    // Edit state
    editingConfig,
    handleEditConfig,
    handleCopyPath,
  };
}
