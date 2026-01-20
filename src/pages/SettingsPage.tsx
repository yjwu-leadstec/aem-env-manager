import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  Settings,
  FolderOpen,
  Monitor,
  Bell,
  Database,
  Download,
  Upload,
  RotateCcw,
  Moon,
  Sun,
  X,
  AlertTriangle,
  Check,
  Activity,
  Clock,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useConfig, useAppStore } from '@/store';
import type { AppConfig } from '@/types';
import * as settingsApi from '@/api/settings';
import { TIMING } from '@/constants';

type SettingsTab = 'general' | 'paths' | 'data';

const validTabs: SettingsTab[] = ['general', 'paths', 'data'];

export function SettingsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get tab from URL parameter, default to 'general'
  const tabFromUrl = searchParams.get('tab') as SettingsTab | null;
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'general';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Sync URL with active tab
  useEffect(() => {
    const currentTabInUrl = searchParams.get('tab');
    if (currentTabInUrl !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Handle tab change
  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          <span className="mr-2">⚙️</span>
          {t('settings.title')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 space-y-1">
          <SettingsNavItem
            icon={<Settings size={18} />}
            label={t('settings.tabs.general')}
            active={activeTab === 'general'}
            onClick={() => handleTabChange('general')}
          />
          <SettingsNavItem
            icon={<FolderOpen size={18} />}
            label={t('settings.tabs.paths')}
            active={activeTab === 'paths'}
            onClick={() => handleTabChange('paths')}
          />
          <SettingsNavItem
            icon={<Database size={18} />}
            label={t('settings.tabs.data')}
            active={activeTab === 'data'}
            onClick={() => handleTabChange('data')}
          />
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'paths' && <PathsSettings />}
          {activeTab === 'data' && <DataSettings />}
        </div>
      </div>
    </div>
  );
}

interface SettingsNavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function SettingsNavItem({ icon, label, active, onClick }: SettingsNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function GeneralSettings() {
  const { t } = useTranslation();
  const config = useConfig();
  const updateConfig = useAppStore((s) => s.updateConfig);
  const addNotification = useAppStore((s) => s.addNotification);

  const handleThemeChange = (theme: AppConfig['theme']) => {
    updateConfig({ theme });
    addNotification({
      type: 'success',
      title: t('settings.general.themeUpdated'),
      message: t('settings.general.themeChangedTo', {
        theme:
          theme === 'light'
            ? t('settings.general.themeLight')
            : theme === 'dark'
              ? t('settings.general.themeDark')
              : t('settings.general.themeSystem'),
      }),
    });
  };

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader
          title={t('settings.general.appearance')}
          subtitle={t('settings.general.appearanceDesc')}
        />
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-300">
                {t('settings.general.theme')}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('settings.general.themeDesc')}
              </p>
            </div>
            <div className="flex gap-2">
              <ThemeButton
                icon={<Sun size={16} />}
                label={t('settings.general.themeLight')}
                active={config.theme === 'light'}
                onClick={() => handleThemeChange('light')}
              />
              <ThemeButton
                icon={<Moon size={16} />}
                label={t('settings.general.themeDark')}
                active={config.theme === 'dark'}
                onClick={() => handleThemeChange('dark')}
              />
              <ThemeButton
                icon={<Monitor size={16} />}
                label={t('settings.general.themeSystem')}
                active={config.theme === 'system'}
                onClick={() => handleThemeChange('system')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader
          title={t('settings.general.notifications')}
          subtitle={t('settings.general.notificationsDesc')}
        />
        <CardContent className="space-y-4">
          <ToggleSetting
            icon={<Bell size={18} />}
            title={t('settings.general.showNotifications')}
            description={t('settings.general.showNotificationsDesc')}
            enabled={config.showNotifications}
            onChange={(enabled) => updateConfig({ showNotifications: enabled })}
          />
        </CardContent>
      </Card>

      {/* Behavior */}
      <Card>
        <CardHeader
          title={t('settings.general.behavior')}
          subtitle={t('settings.general.behaviorDesc')}
        />
        <CardContent className="space-y-4">
          <ToggleSetting
            icon={<Settings size={18} />}
            title={t('settings.general.autoSwitch')}
            description={t('settings.general.autoSwitchDesc')}
            enabled={config.autoSwitchProfile}
            onChange={(enabled) => updateConfig({ autoSwitchProfile: enabled })}
          />
          <ToggleSetting
            icon={<Monitor size={18} />}
            title={t('settings.general.startMinimized')}
            description={t('settings.general.startMinimizedDesc')}
            enabled={config.startMinimized}
            onChange={(enabled) => updateConfig({ startMinimized: enabled })}
          />
        </CardContent>
      </Card>

      {/* Instance Status Check */}
      <Card>
        <CardHeader
          title={t('settings.general.statusCheck')}
          subtitle={t('settings.general.statusCheckDesc')}
        />
        <CardContent className="space-y-4">
          <ToggleSetting
            icon={<Activity size={18} />}
            title={t('settings.general.autoStatusCheck')}
            description={t('settings.general.autoStatusCheckDesc')}
            enabled={config.autoStatusCheck}
            onChange={(enabled) => updateConfig({ autoStatusCheck: enabled })}
          />
          {config.autoStatusCheck && (
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400">
                  <Clock size={18} />
                </div>
                <div>
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    {t('settings.general.statusCheckInterval')}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('settings.general.statusCheckIntervalDesc', {
                      min: TIMING.STATUS_CHECK_INTERVAL_MIN,
                      max: TIMING.STATUS_CHECK_INTERVAL_MAX,
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={TIMING.STATUS_CHECK_INTERVAL_MIN}
                  max={TIMING.STATUS_CHECK_INTERVAL_MAX}
                  value={config.statusCheckInterval}
                  onChange={(e) => {
                    const value = parseInt(e.target.value, 10);
                    if (
                      !isNaN(value) &&
                      value >= TIMING.STATUS_CHECK_INTERVAL_MIN &&
                      value <= TIMING.STATUS_CHECK_INTERVAL_MAX
                    ) {
                      updateConfig({ statusCheckInterval: value });
                    }
                  }}
                  className="input w-20 text-center"
                />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {t('settings.general.seconds')}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PathsSettings() {
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

function DataSettings() {
  const { t } = useTranslation();
  const addNotification = useAppStore((s) => s.addNotification);
  const reset = useAppStore((s) => s.reset);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await settingsApi.exportConfiguration();
      if (result.success) {
        addNotification({
          type: 'success',
          title: t('settings.data.exportSuccess'),
          message: t('settings.data.exportedCount', {
            profiles: result.profiles_count,
            instances: result.instances_count,
          }),
        });
      } else if (result.error !== '操作已取消') {
        addNotification({
          type: 'error',
          title: t('settings.data.exportFailed'),
          message: result.error || t('common.unknown'),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('settings.data.exportFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const result = await settingsApi.importConfiguration();
      if (result.success) {
        addNotification({
          type: 'success',
          title: t('settings.data.importSuccess'),
          message: t('settings.data.importedCount', {
            profiles: result.profiles_imported,
            instances: result.instances_imported,
          }),
        });
        // Reload the page to reflect imported data
        window.location.reload();
      } else if (result.errors[0] !== '操作已取消') {
        addNotification({
          type: 'error',
          title: t('settings.data.importFailed'),
          message: result.errors.join('; '),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('settings.data.importFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await settingsApi.resetAllConfiguration();
      if (result.success) {
        // Reset local store
        reset();
        addNotification({
          type: 'success',
          title: t('settings.data.resetSuccess'),
          message: t('settings.data.resetCount', {
            profiles: result.profiles_deleted,
            instances: result.instances_deleted,
          }),
        });
        setShowResetConfirm(false);
        // Reload the page to reflect reset state
        window.location.reload();
      } else {
        addNotification({
          type: 'error',
          title: t('settings.data.resetFailed'),
          message: result.error || t('common.unknown'),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('settings.data.resetFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title={t('settings.data.exportImport')}
          subtitle={t('settings.data.exportImportDesc')}
        />
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant="outline"
              icon={<Download size={16} />}
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? t('settings.data.exporting') : t('settings.data.export')}
            </Button>
            <Button
              variant="outline"
              icon={<Upload size={16} />}
              onClick={handleImport}
              disabled={isImporting}
            >
              {isImporting ? t('settings.data.importing') : t('settings.data.import')}
            </Button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('settings.data.exportImportNote')}
          </p>
        </CardContent>
      </Card>

      <Card className="border-error-200 dark:border-error-800">
        <CardHeader
          title={t('settings.data.dangerZone')}
          subtitle={t('settings.data.dangerZoneDesc')}
        />
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-error/10 rounded-lg">
            <div>
              <p className="font-medium text-error-700 dark:text-error-400">
                {t('settings.data.resetAll')}
              </p>
              <p className="text-sm text-error-600 dark:text-error-500">
                {t('settings.data.resetAllDesc')}
              </p>
            </div>
            <Button
              variant="danger"
              icon={<RotateCcw size={16} />}
              onClick={() => setShowResetConfirm(true)}
            >
              {t('settings.data.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="panel max-w-md w-full mx-4 overflow-hidden p-0">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full bg-error/20">
                  <AlertTriangle size={24} className="text-error-600 dark:text-error-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">{t('settings.data.confirmReset')}</h3>
                  <p className="text-sm opacity-70">{t('settings.data.cannotUndo')}</p>
                </div>
              </div>
              <p className="opacity-80 mb-6">{t('settings.data.confirmResetMessage')}</p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
                  {t('common.cancel')}
                </Button>
                <Button variant="danger" onClick={handleReset} disabled={isResetting}>
                  {isResetting ? t('settings.data.resetting') : t('settings.data.confirmReset')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface ThemeButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ThemeButton({ icon, label, active, onClick }: ThemeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-primary/20 text-primary'
          : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-black/10 dark:hover:bg-white/10'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface ToggleSettingProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

function ToggleSetting({ icon, title, description, enabled, onChange }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400">
          {icon}
        </div>
        <div>
          <p className="font-medium text-slate-700 dark:text-slate-300">{title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${
          enabled ? 'bg-azure-500 dark:bg-tech-orange-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

interface PathInputSingleProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onBrowse: () => void;
  browseLabel?: string;
}

function PathInputSingle({
  label,
  value,
  placeholder,
  onChange,
  onBrowse,
  browseLabel = 'Browse',
}: PathInputSingleProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input flex-1"
        />
        <Button variant="outline" icon={<FolderOpen size={16} />} onClick={onBrowse}>
          {browseLabel}
        </Button>
      </div>
    </div>
  );
}
