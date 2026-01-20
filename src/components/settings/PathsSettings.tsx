// Paths Settings Component

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderOpen, X, Check } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';
import * as settingsApi from '@/api/settings';
import { PathInputSingle } from './shared';

export function PathsSettings() {
  const { t } = useTranslation();
  const addNotification = useAppStore((s) => s.addNotification);
  const [scanPaths, setScanPaths] = useState<settingsApi.ScanPaths | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load scan paths on mount
  useEffect(() => {
    const loadPaths = async () => {
      try {
        const paths = await settingsApi.loadScanPaths();
        setScanPaths(paths);
      } catch (error) {
        addNotification({
          type: 'error',
          title: t('settings.paths.loadFailed'),
          message: error instanceof Error ? error.message : t('common.unknown'),
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadPaths();
  }, [addNotification, t]);

  const handleSave = useCallback(async () => {
    if (!scanPaths) return;

    setIsSaving(true);
    try {
      await settingsApi.saveScanPaths(scanPaths);
      addNotification({
        type: 'success',
        title: t('settings.paths.saveSuccess'),
        message: t('settings.paths.pathsSaved'),
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('settings.paths.saveFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsSaving(false);
    }
  }, [scanPaths, addNotification, t]);

  const handleBrowseFolder = async (
    field: 'maven_home' | 'maven_repository' | 'aem_base_dir' | 'logs_dir',
    title: string
  ) => {
    const path = await settingsApi.selectFolder(title);
    if (path && scanPaths) {
      setScanPaths({ ...scanPaths, [field]: path });
    }
  };

  const handleUpdateArrayPath = (
    field: 'java_paths' | 'node_paths',
    index: number,
    value: string
  ) => {
    if (!scanPaths) return;
    const newPaths = [...scanPaths[field]];
    newPaths[index] = value;
    setScanPaths({ ...scanPaths, [field]: newPaths });
  };

  const handleAddPath = (field: 'java_paths' | 'node_paths') => {
    if (!scanPaths) return;
    setScanPaths({
      ...scanPaths,
      [field]: [...scanPaths[field], ''],
    });
  };

  const handleRemovePath = (field: 'java_paths' | 'node_paths', index: number) => {
    if (!scanPaths) return;
    const newPaths = scanPaths[field].filter((_, i) => i !== index);
    setScanPaths({ ...scanPaths, [field]: newPaths });
  };

  const handleBrowseArrayPath = async (
    field: 'java_paths' | 'node_paths',
    index: number,
    title: string
  ) => {
    const path = await settingsApi.selectFolder(title);
    if (path && scanPaths) {
      handleUpdateArrayPath(field, index, path);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azure"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t('settings.paths.scanDirs')}
          subtitle={t('settings.paths.scanDirsDesc')}
        />
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('settings.paths.javaPaths')}
            </label>
            <div className="space-y-2">
              {scanPaths?.java_paths.map((path, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => handleUpdateArrayPath('java_paths', index, e.target.value)}
                    className="input flex-1"
                    placeholder="/usr/lib/jvm"
                  />
                  <Button
                    variant="outline"
                    icon={<FolderOpen size={16} />}
                    onClick={() => handleBrowseArrayPath('java_paths', index, t('java.title'))}
                  />
                  <Button
                    variant="ghost"
                    icon={<X size={16} />}
                    onClick={() => handleRemovePath('java_paths', index)}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddPath('java_paths')}
                className="mt-2"
              >
                {t('settings.paths.addPath')}
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('settings.paths.nodePaths')}
            </label>
            <div className="space-y-2">
              {scanPaths?.node_paths.map((path, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => handleUpdateArrayPath('node_paths', index, e.target.value)}
                    className="input flex-1"
                    placeholder="~/.nvm/versions/node"
                  />
                  <Button
                    variant="outline"
                    icon={<FolderOpen size={16} />}
                    onClick={() => handleBrowseArrayPath('node_paths', index, t('node.title'))}
                  />
                  <Button
                    variant="ghost"
                    icon={<X size={16} />}
                    onClick={() => handleRemovePath('node_paths', index)}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddPath('node_paths')}
                className="mt-2"
              >
                {t('settings.paths.addPath')}
              </Button>
            </div>
          </div>

          <PathInputSingle
            label={t('settings.paths.mavenHome')}
            value={scanPaths?.maven_home || ''}
            placeholder="~/.m2"
            onChange={(value) => scanPaths && setScanPaths({ ...scanPaths, maven_home: value })}
            onBrowse={() => handleBrowseFolder('maven_home', t('maven.title'))}
            browseLabel={t('common.browse')}
          />
          <PathInputSingle
            label={t('settings.paths.mavenRepository')}
            value={scanPaths?.maven_repository || ''}
            placeholder="~/.m2/repository"
            onChange={(value) =>
              scanPaths && setScanPaths({ ...scanPaths, maven_repository: value })
            }
            onBrowse={() =>
              handleBrowseFolder('maven_repository', t('settings.paths.mavenRepository'))
            }
            browseLabel={t('common.browse')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={t('settings.paths.aemDirs')}
          subtitle={t('settings.paths.aemDirsDesc')}
        />
        <CardContent className="space-y-4">
          <PathInputSingle
            label={t('settings.paths.aemBaseDir')}
            value={scanPaths?.aem_base_dir || ''}
            placeholder="/opt/aem"
            onChange={(value) => scanPaths && setScanPaths({ ...scanPaths, aem_base_dir: value })}
            onBrowse={() => handleBrowseFolder('aem_base_dir', t('settings.paths.aemBaseDir'))}
            browseLabel={t('common.browse')}
          />
          <PathInputSingle
            label={t('settings.paths.logsDir')}
            value={scanPaths?.logs_dir || ''}
            placeholder="/var/log/aem"
            onChange={(value) => scanPaths && setScanPaths({ ...scanPaths, logs_dir: value })}
            onBrowse={() => handleBrowseFolder('logs_dir', t('settings.paths.logsDir'))}
            browseLabel={t('common.browse')}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          icon={isSaving ? undefined : <Check size={16} />}
        >
          {isSaving ? t('settings.paths.saving') : t('settings.paths.saveSettings')}
        </Button>
      </div>
    </div>
  );
}
