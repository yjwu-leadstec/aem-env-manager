import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import {
  Coffee,
  Hexagon,
  FileCode,
  RefreshCw,
  Check,
  ExternalLink,
  Plus,
  AlertCircle,
  Key,
  Trash2,
  Edit,
  Calendar,
  Building2,
  FileKey,
  Clock,
  Link2,
  X,
  AlertTriangle,
  Upload,
  Eye,
  FolderOpen,
  Server,
  Search,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useAppStore } from '@/store';
import * as versionApi from '@/api/version';
import * as licenseApi from '@/api/license';
import * as instanceApi from '@/api/instance';
import { updateProfile, getActiveProfile } from '@/api/profile';
import { setJavaSymlink, setNodeSymlink } from '@/api/environment';
import { open } from '@tauri-apps/plugin-dialog';
import type { AemLicense, LicenseStatus, LicenseStatistics } from '@/api/license';
import type { AemInstance } from '@/types';

type TabType = 'java' | 'node' | 'maven' | 'licenses';

const validTabs: TabType[] = ['java', 'node', 'maven', 'licenses'];

export function VersionsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get tab from URL parameter, default to 'java'
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'java';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [isScanning, setIsScanning] = useState(false);
  const [versionInfo, setVersionInfo] = useState<versionApi.VersionInfo | null>(null);
  const addNotification = useAppStore((s) => s.addNotification);

  const loadVersionInfo = useCallback(async () => {
    setIsScanning(true);
    try {
      const info = await versionApi.getAllVersionInfo();
      setVersionInfo(info);
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('versions.notifications.loadFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsScanning(false);
    }
  }, [addNotification, t]);

  useEffect(() => {
    loadVersionInfo();
  }, [loadVersionInfo]);

  // Sync URL with active tab
  useEffect(() => {
    const currentTabInUrl = searchParams.get('tab');
    if (currentTabInUrl !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Handle tab change - update both state and URL
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            <span className="mr-2">🔧</span>
            {t('versions.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('versions.subtitle')}</p>
        </div>
        <Button
          variant="outline"
          icon={
            isScanning ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />
          }
          onClick={loadVersionInfo}
          disabled={isScanning}
        >
          {t('versions.scan')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <TabButton
          active={activeTab === 'java'}
          onClick={() => handleTabChange('java')}
          icon={<Coffee size={18} />}
          label={t('nav.java')}
          badge={versionInfo?.java.versions.length}
        />
        <TabButton
          active={activeTab === 'node'}
          onClick={() => handleTabChange('node')}
          icon={<Hexagon size={18} />}
          label={t('nav.node')}
          badge={versionInfo?.node.versions.length}
        />
        <TabButton
          active={activeTab === 'maven'}
          onClick={() => handleTabChange('maven')}
          icon={<FileCode size={18} />}
          label={t('nav.maven')}
          badge={versionInfo?.maven.configs.length}
        />
        <TabButton
          active={activeTab === 'licenses'}
          onClick={() => handleTabChange('licenses')}
          icon={<Key size={18} />}
          label={t('nav.licenses')}
        />
      </div>

      {/* Content */}
      {isScanning && !versionInfo && activeTab !== 'licenses' ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={32} className="animate-spin text-azure" />
        </div>
      ) : activeTab === 'java' ? (
        <JavaVersionsPanel javaInfo={versionInfo?.java} onRefresh={loadVersionInfo} />
      ) : activeTab === 'node' ? (
        <NodeVersionsPanel nodeInfo={versionInfo?.node} onRefresh={loadVersionInfo} />
      ) : activeTab === 'maven' ? (
        <MavenConfigPanel mavenInfo={versionInfo?.maven} onRefresh={loadVersionInfo} />
      ) : (
        <LicensesPanel />
      )}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
        active
          ? 'text-azure dark:text-azure-400 border-azure dark:border-azure-400'
          : 'text-slate-500 dark:text-slate-400 border-transparent hover:text-slate-700 dark:hover:text-slate-300'
      }`}
    >
      {icon}
      {label}
      {badge !== undefined && badge > 0 && (
        <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
          {badge}
        </span>
      )}
    </button>
  );
}

interface JavaPanelProps {
  javaInfo?: versionApi.VersionInfo['java'];
  onRefresh: () => void;
}

function JavaVersionsPanel({ javaInfo, onRefresh }: JavaPanelProps) {
  const { t } = useTranslation();
  const addNotification = useAppStore((s) => s.addNotification);
  const [switchingVersion, setSwitchingVersion] = useState<string | null>(null);

  // Search functionality state
  const [searchPath, setSearchPath] = useState('');
  const [searchResults, setSearchResults] = useState<versionApi.JavaVersion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Browse for search directory using Tauri dialog
  const handleBrowseSearchPath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t('java.search.selectDirectory'),
      });
      if (selected && typeof selected === 'string') {
        setSearchPath(selected);
        // Auto-search when directory is selected
        handleSearch(selected);
      }
    } catch {
      // User cancelled the dialog
    }
  };

  // Search for Java installations in specified path
  const handleSearch = async (path?: string) => {
    const searchDir = path || searchPath;
    if (!searchDir.trim()) {
      addNotification({
        type: 'warning',
        title: t('java.search.noPath'),
        message: t('java.search.noPathMessage'),
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    try {
      const results = await versionApi.scanJavaInPath(searchDir.trim());
      setSearchResults(results);
      if (results.length === 0) {
        addNotification({
          type: 'info',
          title: t('java.search.noResults'),
          message: t('java.search.noResultsMessage'),
        });
      } else {
        addNotification({
          type: 'success',
          title: t('java.search.found'),
          message: t('java.search.foundMessage', { count: results.length }),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('java.search.failed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle "Use" button click - sets symlink and optionally updates profile
  const handleSwitch = async (version: string, javaPath: string) => {
    setSwitchingVersion(version);
    try {
      // Set symlink to immediately apply the change
      const symlinkResult = await setJavaSymlink(javaPath);

      if (!symlinkResult.success) {
        addNotification({
          type: 'error',
          title: t('java.notifications.switchFailed'),
          message: symlinkResult.message || t('common.unknown'),
        });
        return;
      }

      // Try to update the active profile if one exists
      try {
        const activeProfile = await getActiveProfile();
        if (activeProfile) {
          await updateProfile(activeProfile.id, {
            java_version: version,
            java_path: javaPath,
          });
        }
      } catch {
        // Profile update failed, but symlink was set successfully
        // This is okay - user can still use the version
      }

      addNotification({
        type: 'success',
        title: t('java.notifications.switched'),
        message: t('java.notifications.switchedMessage', { version }),
      });
      onRefresh();
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('java.notifications.switchFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setSwitchingVersion(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Version Managers */}
      <Card>
        <CardHeader title={t('java.managers.title')} subtitle={t('java.managers.subtitle')} />
        <CardContent>
          {!javaInfo?.managers || javaInfo.managers.length === 0 ? (
            <div className="text-center py-6">
              <AlertCircle size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">{t('java.managers.empty')}</p>
              <div className="flex justify-center gap-2">
                <ManagerLink name="SDKMAN" url="https://sdkman.io" />
                <ManagerLink name="jEnv" url="https://www.jenv.be" />
                <ManagerLink name="jabba" url="https://github.com/shyiko/jabba" />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {javaInfo.managers.map((m) => (
                <div
                  key={m.id}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                    m.is_active
                      ? 'bg-azure-50 dark:bg-azure-900/30 text-azure-700 dark:text-azure-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {m.name}
                  {m.is_active && <Check size={14} />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Installed Versions */}
      <Card>
        <CardHeader
          title={t('java.versions.title')}
          subtitle={t('java.versions.subtitle', { count: javaInfo?.versions.length || 0 })}
        />
        <CardContent>
          {!javaInfo?.versions || javaInfo.versions.length === 0 ? (
            <EmptyVersionState
              title={t('java.versions.empty')}
              description={t('java.versions.emptyHint')}
            />
          ) : (
            <div className="space-y-2">
              {javaInfo.versions.map((v) => (
                <JavaVersionRow
                  key={`${v.version}-${v.path}`}
                  version={v}
                  isCurrent={v.is_current}
                  isSwitching={switchingVersion === v.version}
                  onSwitch={() => handleSwitch(v.version, v.path)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Search */}
      <Card>
        <CardHeader title={t('java.search.title')} subtitle={t('java.search.subtitle')} />
        <CardContent>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchPath}
                  onChange={(e) => setSearchPath(e.target.value)}
                  placeholder={t('java.search.placeholder')}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-azure focus:border-transparent"
                />
                <button
                  onClick={handleBrowseSearchPath}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  title={t('java.search.browse')}
                >
                  <FolderOpen size={18} />
                </button>
              </div>
              <Button
                onClick={() => handleSearch()}
                disabled={isSearching || !searchPath.trim()}
                variant="primary"
              >
                {isSearching ? (
                  <RefreshCw size={16} className="animate-spin mr-1" />
                ) : (
                  <Search size={16} className="mr-1" />
                )}
                {t('java.search.search')}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('java.search.results', { count: searchResults.length })}
                </div>
                <div className="space-y-2">
                  {searchResults.map((v) => (
                    <div
                      key={v.path}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            Java {v.version}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-600 dark:text-slate-300">
                            {v.vendor}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                          {v.path}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleSwitch(v.version, v.path)}
                        disabled={switchingVersion === v.version}
                      >
                        {switchingVersion === v.version ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          t('java.versions.use')
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface NodePanelProps {
  nodeInfo?: versionApi.VersionInfo['node'];
  onRefresh: () => void;
}

function NodeVersionsPanel({ nodeInfo, onRefresh }: NodePanelProps) {
  const { t } = useTranslation();
  const addNotification = useAppStore((s) => s.addNotification);
  const [switchingVersion, setSwitchingVersion] = useState<string | null>(null);

  // Search functionality state
  const [searchPath, setSearchPath] = useState('');
  const [searchResults, setSearchResults] = useState<versionApi.NodeVersion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Browse for search directory using Tauri dialog
  const handleBrowseSearchPath = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: t('node.search.selectDirectory'),
      });
      if (selected && typeof selected === 'string') {
        setSearchPath(selected);
        // Auto-search when directory is selected
        handleSearch(selected);
      }
    } catch {
      // User cancelled the dialog
    }
  };

  // Search for Node installations in specified path
  const handleSearch = async (path?: string) => {
    const searchDir = path || searchPath;
    if (!searchDir.trim()) {
      addNotification({
        type: 'warning',
        title: t('node.search.noPath'),
        message: t('node.search.noPathMessage'),
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    try {
      const results = await versionApi.scanNodeInPath(searchDir.trim());
      setSearchResults(results);
      if (results.length === 0) {
        addNotification({
          type: 'info',
          title: t('node.search.noResults'),
          message: t('node.search.noResultsMessage'),
        });
      } else {
        addNotification({
          type: 'success',
          title: t('node.search.found'),
          message: t('node.search.foundMessage', { count: results.length }),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('node.search.failed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsSearching(false);
    }
  };

  // Handle "Use" button click - sets symlink and optionally updates profile
  const handleSwitch = async (version: string, nodePath: string) => {
    setSwitchingVersion(version);
    try {
      // Set symlink to immediately apply the change
      const symlinkResult = await setNodeSymlink(nodePath);

      if (!symlinkResult.success) {
        addNotification({
          type: 'error',
          title: t('node.notifications.switchFailed'),
          message: symlinkResult.message || t('common.unknown'),
        });
        return;
      }

      // Try to update the active profile if one exists
      try {
        const activeProfile = await getActiveProfile();
        if (activeProfile) {
          await updateProfile(activeProfile.id, {
            node_version: version,
            node_path: nodePath,
          });
        }
      } catch {
        // Profile update failed, but symlink was set successfully
        // This is okay - user can still use the version
      }

      addNotification({
        type: 'success',
        title: t('node.notifications.switched'),
        message: t('node.notifications.switchedMessage', { version }),
      });
      onRefresh();
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('node.notifications.switchFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setSwitchingVersion(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Version Managers */}
      <Card>
        <CardHeader title={t('node.managers.title')} subtitle={t('node.managers.subtitle')} />
        <CardContent>
          {!nodeInfo?.managers || nodeInfo.managers.length === 0 ? (
            <div className="text-center py-6">
              <AlertCircle size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">{t('node.managers.empty')}</p>
              <div className="flex justify-center gap-2">
                <ManagerLink name="nvm" url="https://github.com/nvm-sh/nvm" />
                <ManagerLink name="fnm" url="https://fnm.vercel.app" />
                <ManagerLink name="Volta" url="https://volta.sh" />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {nodeInfo.managers.map((m) => (
                <div
                  key={m.id}
                  className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
                    m.is_active
                      ? 'bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300'
                      : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {m.name}
                  {m.is_active && <Check size={14} />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Installed Versions */}
      <Card>
        <CardHeader
          title={t('node.versions.title')}
          subtitle={t('node.versions.subtitle', { count: nodeInfo?.versions.length || 0 })}
        />
        <CardContent>
          {!nodeInfo?.versions || nodeInfo.versions.length === 0 ? (
            <EmptyVersionState
              title={t('node.versions.empty')}
              description={t('node.versions.emptyHint')}
            />
          ) : (
            <div className="space-y-2">
              {nodeInfo.versions.map((v) => (
                <NodeVersionRow
                  key={`${v.version}-${v.path}`}
                  version={v}
                  isCurrent={v.is_current}
                  isSwitching={switchingVersion === v.version}
                  onSwitch={() => handleSwitch(v.version, v.path)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Search */}
      <Card>
        <CardHeader title={t('node.search.title')} subtitle={t('node.search.subtitle')} />
        <CardContent>
          <div className="space-y-4">
            {/* Search Input */}
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={searchPath}
                  onChange={(e) => setSearchPath(e.target.value)}
                  placeholder={t('node.search.placeholder')}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-azure focus:border-transparent"
                />
                <button
                  onClick={handleBrowseSearchPath}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  title={t('node.search.browse')}
                >
                  <FolderOpen size={18} />
                </button>
              </div>
              <Button
                onClick={() => handleSearch()}
                disabled={isSearching || !searchPath.trim()}
                variant="primary"
              >
                {isSearching ? (
                  <RefreshCw size={16} className="animate-spin mr-1" />
                ) : (
                  <Search size={16} className="mr-1" />
                )}
                {t('node.search.search')}
              </Button>
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="space-y-2">
                <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t('node.search.results', { count: searchResults.length })}
                </div>
                <div className="space-y-2">
                  {searchResults.map((v) => (
                    <div
                      key={v.path}
                      className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            Node {v.version}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                          {v.path}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleSwitch(v.version, v.path)}
                        disabled={switchingVersion === v.version}
                      >
                        {switchingVersion === v.version ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          t('node.versions.use')
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface MavenPanelProps {
  mavenInfo?: versionApi.VersionInfo['maven'];
  onRefresh: () => void;
}

function MavenConfigPanel({ mavenInfo, onRefresh }: MavenPanelProps) {
  const { t } = useTranslation();
  const addNotification = useAppStore((s) => s.addNotification);
  const [switchingConfig, setSwitchingConfig] = useState<string | null>(null);
  const [deletingConfig, setDeletingConfig] = useState<string | null>(null);
  const [deleteConfirmConfig, setDeleteConfirmConfig] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importName, setImportName] = useState('');
  const [importPath, setImportPath] = useState('');
  const [showDetailDialog, setShowDetailDialog] = useState<string | null>(null);
  const [configContent, setConfigContent] = useState<string>('');
  const [loadingContent, setLoadingContent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Search functionality state
  const [searchPath, setSearchPath] = useState('');
  const [searchResults, setSearchResults] = useState<versionApi.MavenSettingsFile[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Batch import state
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isBatchImporting, setIsBatchImporting] = useState(false);
  const [batchImportProgress, setBatchImportProgress] = useState({ current: 0, total: 0 });

  const handleSwitch = async (configId: string) => {
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
  };

  const handleDelete = (configId: string, configName: string) => {
    setDeleteConfirmConfig({ id: configId, name: configName });
  };

  const confirmDelete = async () => {
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
  };

  const handleImport = async () => {
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
  };

  const handleViewDetail = async (configId: string) => {
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
  };

  const handleBrowseFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // For web file input, we get the file name but not the full path
      // In a Tauri app, we would use the dialog API instead
      setImportPath(file.name);
    }
  };

  // Browse for search directory using Tauri dialog
  const handleBrowseSearchPath = async () => {
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
  };

  // Search for Maven settings in specified path
  const handleSearch = async (path?: string) => {
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

      // Filter out already imported configurations and the current active config
      const existingConfigs = mavenInfo?.configs || [];
      const currentConfig = mavenInfo?.current;

      // Create a set of paths that should be excluded
      const excludedPaths = new Set<string>();

      // Add current active config path (this is the actual ~/.m2/settings.xml path)
      if (currentConfig?.path) {
        excludedPaths.add(currentConfig.path);
      }

      // Create a set of normalized identifiers from existing saved configs
      const existingIdentifiers = new Set<string>();
      existingConfigs.forEach((c) => {
        existingIdentifiers.add(c.name.toLowerCase());
        existingIdentifiers.add(c.id.toLowerCase());
      });

      // Filter results
      const filteredResults = results.filter((r) => {
        // First check: exclude if this is the current active config path
        if (excludedPaths.has(r.path)) {
          return false;
        }

        // Second check: exclude if name/id would duplicate existing saved configs
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
          // All found files were already imported
          addNotification({
            type: 'info',
            title: t('maven.search.noResults'),
            message: t('maven.batch.allAlreadyImported'),
          });
        } else {
          // No files found at all
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
  };

  // Select a found file for import
  const handleSelectFoundFile = (file: versionApi.MavenSettingsFile) => {
    setImportPath(file.path);

    // Auto-generate a name from the file name or path - ensure non-empty name
    let suggestedName = file.name
      .replace('.xml', '')
      .replace(/settings/gi, '')
      .replace(/^[-_.]+|[-_.]+$/g, '')
      .trim();

    // If name is empty after cleanup, try to use parent directory name
    if (!suggestedName) {
      const pathParts = file.path.split('/').filter(Boolean);
      suggestedName = pathParts[pathParts.length - 2] || '';
    }

    // If still empty, use a default name
    if (!suggestedName) {
      suggestedName = 'Maven Config';
    }

    setImportName(suggestedName);
    setSearchResults([]); // Clear search results after selection
  };

  // Toggle file selection for batch import
  const toggleFileSelection = (filePath: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(filePath)) {
      newSelection.delete(filePath);
    } else {
      newSelection.add(filePath);
    }
    setSelectedFiles(newSelection);
  };

  // Select/deselect all files
  const toggleSelectAll = () => {
    if (selectedFiles.size === searchResults.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(searchResults.map((f) => f.path)));
    }
  };

  // Batch import selected files
  const handleBatchImport = async () => {
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
        // Auto-generate name from file - ensure non-empty name
        let suggestedName = file.name
          .replace('.xml', '')
          .replace(/settings/gi, '')
          .replace(/^[-_.]+|[-_.]+$/g, '')
          .trim();

        // If name is empty after cleanup, try to use parent directory name
        if (!suggestedName) {
          const pathParts = file.path.split('/').filter(Boolean);
          suggestedName = pathParts[pathParts.length - 2] || '';
        }

        // If still empty, use a numbered fallback
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
  };

  // Reset dialog state when closing
  const handleCloseImportDialog = () => {
    setShowImportDialog(false);
    setImportName('');
    setImportPath('');
    setSearchPath('');
    setSearchResults([]);
    setSelectedFiles(new Set());
    setBatchImportProgress({ current: 0, total: 0 });
  };

  return (
    <div className="space-y-6">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".xml"
        onChange={handleFileSelect}
      />

      {/* Current Configuration */}
      <Card>
        <CardHeader title={t('maven.current.title')} subtitle={t('maven.current.subtitle')} />
        <CardContent>
          {mavenInfo?.current ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-azure-50 dark:bg-azure-900/30">
              <div className="flex items-center gap-3">
                <FileCode size={20} className="text-azure-500" />
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">
                    {mavenInfo.current.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {mavenInfo.current.path}
                  </p>
                  {mavenInfo.current.local_repository && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                      📁 {t('maven.localRepo')}: {mavenInfo.current.local_repository}
                    </p>
                  )}
                </div>
              </div>
              <Check size={20} className="text-azure" />
            </div>
          ) : (
            <p className="text-slate-500 dark:text-slate-400 text-center py-4">
              {t('maven.current.default')}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Saved Configurations */}
      <Card>
        <CardHeader
          title={t('maven.configs.title')}
          subtitle={t('maven.configs.subtitle', { count: mavenInfo?.configs.length || 0 })}
          action={
            <Button
              variant="outline"
              size="sm"
              icon={<Plus size={14} />}
              onClick={() => setShowImportDialog(true)}
            >
              {t('common.import')}
            </Button>
          }
        />
        <CardContent>
          {!mavenInfo?.configs || mavenInfo.configs.length === 0 ? (
            <div className="text-center py-6">
              <FileCode size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">{t('maven.configs.empty')}</p>
              <Button
                variant="outline"
                size="sm"
                icon={<Plus size={14} />}
                onClick={() => setShowImportDialog(true)}
              >
                {t('maven.configs.importHint')}
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {mavenInfo.configs.map((config) => (
                <div
                  key={config.id}
                  className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                    config.is_active
                      ? 'bg-azure-50 dark:bg-azure-900/30'
                      : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileCode size={20} className="text-azure-500" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-900 dark:text-slate-100">
                          {config.name}
                        </p>
                        {config.is_active && (
                          <span className="px-1.5 py-0.5 bg-azure-100 dark:bg-azure-800 text-azure-700 dark:text-azure-300 text-xs rounded">
                            {t('common.current')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{config.path}</p>
                      {config.local_repository && (
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                          📁 {config.local_repository}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewDetail(config.id)}
                      title={t('maven.viewDetail')}
                    >
                      <Eye size={16} />
                    </Button>
                    {!config.is_active && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSwitch(config.id)}
                          disabled={switchingConfig === config.id}
                        >
                          {switchingConfig === config.id ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            t('common.use')
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(config.id, config.name)}
                          disabled={deletingConfig === config.id}
                          title={t('common.delete')}
                        >
                          <Trash2 size={16} className="text-error-500" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Dialog */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold">{t('maven.importDialog.title')}</h3>
              <button
                onClick={handleCloseImportDialog}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Search Section */}
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <label className="block text-sm font-medium mb-2">{t('maven.search.title')}</label>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  {t('maven.search.description')}
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchPath}
                    onChange={(e) => setSearchPath(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 font-mono text-sm"
                    placeholder={t('maven.search.pathPlaceholder')}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleBrowseSearchPath}
                    title={t('maven.search.browse')}
                  >
                    <FolderOpen size={16} />
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleSearch()}
                    disabled={isSearching || !searchPath.trim()}
                  >
                    {isSearching ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Search size={16} />
                    )}
                  </Button>
                </div>

                {/* Search Results */}
                {searchResults.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        {t('maven.search.resultsTitle', { count: searchResults.length })}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={toggleSelectAll}
                          className="text-xs text-azure-600 dark:text-azure-400 hover:underline"
                        >
                          {selectedFiles.size === searchResults.length
                            ? t('maven.batch.deselectAll')
                            : t('maven.batch.selectAll')}
                        </button>
                        {selectedFiles.size > 0 && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={handleBatchImport}
                            disabled={isBatchImporting}
                            icon={
                              isBatchImporting ? (
                                <RefreshCw size={14} className="animate-spin" />
                              ) : (
                                <Upload size={14} />
                              )
                            }
                          >
                            {isBatchImporting
                              ? t('maven.batch.importing', {
                                  current: batchImportProgress.current,
                                  total: batchImportProgress.total,
                                })
                              : t('maven.batch.import', { count: selectedFiles.size })}
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {searchResults.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 p-2 rounded-lg bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFiles.has(file.path)}
                            onChange={() => toggleFileSelection(file.path)}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-azure-600 focus:ring-azure-500"
                          />
                          <button
                            onClick={() => handleSelectFoundFile(file)}
                            className="flex-1 text-left hover:bg-azure-50 dark:hover:bg-azure-900/30 rounded transition-colors p-1"
                          >
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                              {file.path}
                            </p>
                            {file.local_repository && (
                              <p className="text-xs text-azure-600 dark:text-azure-400 truncate mt-0.5">
                                📁 {file.local_repository}
                              </p>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="flex items-center gap-2">
                <div className="flex-1 border-t border-slate-200 dark:border-slate-600" />
                <span className="text-xs text-slate-400">{t('maven.importDialog.orManual')}</span>
                <div className="flex-1 border-t border-slate-200 dark:border-slate-600" />
              </div>

              {/* Manual Import Fields */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('maven.importDialog.name')}
                </label>
                <input
                  type="text"
                  value={importName}
                  onChange={(e) => setImportName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700"
                  placeholder={t('maven.importDialog.namePlaceholder')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  {t('maven.importDialog.path')}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={importPath}
                    onChange={(e) => setImportPath(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 font-mono text-sm"
                    placeholder={t('maven.importDialog.pathPlaceholder')}
                  />
                  <Button variant="outline" size="sm" onClick={handleBrowseFile}>
                    <FolderOpen size={16} />
                  </Button>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {t('maven.importDialog.pathHint')}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={handleCloseImportDialog}>
                {t('common.cancel')}
              </Button>
              {/* Show batch import button when files are selected, otherwise show manual import button */}
              {selectedFiles.size > 0 ? (
                <Button
                  onClick={handleBatchImport}
                  disabled={isBatchImporting}
                  icon={
                    isBatchImporting ? (
                      <RefreshCw size={16} className="animate-spin" />
                    ) : (
                      <Upload size={16} />
                    )
                  }
                >
                  {isBatchImporting
                    ? t('maven.batch.importing', {
                        current: batchImportProgress.current,
                        total: batchImportProgress.total,
                      })
                    : t('maven.batch.import', { count: selectedFiles.size })}
                </Button>
              ) : (
                <Button onClick={handleImport}>{t('common.import')}</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      {showDetailDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold">
                {t('maven.detail.title')}: {showDetailDialog}
              </h3>
              <button
                onClick={() => setShowDetailDialog(null)}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {loadingContent ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw size={24} className="animate-spin text-slate-400" />
                </div>
              ) : (
                <pre className="text-xs font-mono bg-slate-50 dark:bg-slate-900 p-4 rounded-lg overflow-auto whitespace-pre-wrap">
                  {configContent}
                </pre>
              )}
            </div>
            <div className="flex justify-end p-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={() => setShowDetailDialog(null)}>
                {t('common.close')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmConfig}
        onClose={() => setDeleteConfirmConfig(null)}
        onConfirm={confirmDelete}
        title={t('maven.dialog.deleteTitle')}
        message={t('maven.confirmDelete', { name: deleteConfirmConfig?.name })}
        confirmText={t('common.delete')}
        variant="danger"
        isLoading={!!deletingConfig}
      />
    </div>
  );
}

interface JavaVersionRowProps {
  version: versionApi.JavaVersion;
  isCurrent: boolean;
  isSwitching: boolean;
  onSwitch: () => void;
}

function JavaVersionRow({ version, isCurrent, isSwitching, onSwitch }: JavaVersionRowProps) {
  const { t } = useTranslation();
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
        isCurrent
          ? 'bg-azure-50 dark:bg-azure-900/30'
          : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <Coffee size={20} className="text-warning-500" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {version.version}
            </span>
            {isCurrent && (
              <span className="px-1.5 py-0.5 bg-azure-100 dark:bg-azure-800 text-azure-700 dark:text-azure-300 text-xs rounded">
                {t('common.current')}
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">{version.vendor}</span>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">{version.path}</span>
        </div>
      </div>
      {!isCurrent && (
        <Button variant="ghost" size="sm" onClick={onSwitch} disabled={isSwitching}>
          {isSwitching ? <RefreshCw size={14} className="animate-spin" /> : t('common.use')}
        </Button>
      )}
    </div>
  );
}

interface NodeVersionRowProps {
  version: versionApi.NodeVersion;
  isCurrent: boolean;
  isSwitching: boolean;
  onSwitch: () => void;
}

function NodeVersionRow({ version, isCurrent, isSwitching, onSwitch }: NodeVersionRowProps) {
  const { t } = useTranslation();
  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
        isCurrent
          ? 'bg-teal-50 dark:bg-teal-900/30'
          : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <Hexagon size={20} className="text-success-500" />
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {version.version}
            </span>
            {isCurrent && (
              <span className="px-1.5 py-0.5 bg-teal-100 dark:bg-teal-800 text-teal-700 dark:text-teal-300 text-xs rounded">
                {t('common.current')}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">{version.path}</span>
        </div>
      </div>
      {!isCurrent && (
        <Button variant="ghost" size="sm" onClick={onSwitch} disabled={isSwitching}>
          {isSwitching ? <RefreshCw size={14} className="animate-spin" /> : t('common.use')}
        </Button>
      )}
    </div>
  );
}

function ManagerLink({ name, url }: { name: string; url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-sm text-azure dark:text-azure-400 hover:underline"
    >
      {name} <ExternalLink size={12} />
    </a>
  );
}

function EmptyVersionState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-6">
      <AlertCircle size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
      <p className="text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{description}</p>
    </div>
  );
}

// ===========================================
// Licenses Panel
// ===========================================

interface LicenseFormProps {
  license?: AemLicense | null;
  onSave: (data: licenseApi.CreateLicenseInput) => void;
  onCancel: () => void;
}

function LicenseForm({ license, onSave, onCancel }: LicenseFormProps) {
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

function LicenseStatusBadge({ status }: { status: LicenseStatus }) {
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

function LicensesPanel() {
  const { t } = useTranslation();
  const [licenses, setLicenses] = useState<AemLicense[]>([]);
  const [statistics, setStatistics] = useState<LicenseStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingLicense, setEditingLicense] = useState<AemLicense | null>(null);
  const [deleteConfirmLicense, setDeleteConfirmLicense] = useState<AemLicense | null>(null);
  const [isDeletingLicense, setIsDeletingLicense] = useState(false);
  const [filter, setFilter] = useState<'all' | LicenseStatus>('all');
  const addNotification = useAppStore((s) => s.addNotification);

  // Scan state - extended type to track which instance each license came from
  type ScannedLicenseWithInstance = licenseApi.ScannedLicenseFile & {
    instance_id?: string;
    instance_name?: string;
  };
  const [showScanDialog, setShowScanDialog] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<ScannedLicenseWithInstance[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [instances, setInstances] = useState<AemInstance[]>([]);

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
  const handleScanInstanceDirs = async () => {
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
            // instance.path is the JAR file path, we need the parent directory
            // e.g., "/path/to/author/aem-author-p4502.jar" -> "/path/to/author"
            const parentDir = instance.path.replace(/[/\\][^/\\]+$/, '');
            const results = await licenseApi.scanLicenseFiles(parentDir);
            // Filter out already imported licenses and add instance info
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

      // Deduplicate by path (keep first occurrence which has instance info)
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
  };

  // Open scan dialog
  const openScanDialog = async () => {
    setShowScanDialog(true);
    setScanResults([]);
    setSelectedFiles(new Set());
    await loadInstances();
  };

  // Toggle file selection
  const toggleFileSelection = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  // Select all files
  const selectAllFiles = () => {
    if (selectedFiles.size === scanResults.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(scanResults.map((r) => r.path)));
    }
  };

  // Batch import selected files
  const handleBatchImport = async () => {
    if (selectedFiles.size === 0) return;

    setIsImporting(true);
    setImportProgress({ current: 0, total: selectedFiles.size });

    const selectedResults = scanResults.filter((r) => selectedFiles.has(r.path));
    let successCount = 0;

    for (let i = 0; i < selectedResults.length; i++) {
      const file = selectedResults[i];
      setImportProgress({ current: i + 1, total: selectedFiles.size });

      try {
        // Parse the license file to get details
        const parsed = await licenseApi.parseLicenseFile(file.path);

        // Create license entry with automatic instance association
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
          // Auto-associate with the instance from the same directory
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
  };

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

  const handleDelete = (license: AemLicense) => {
    setDeleteConfirmLicense(license);
  };

  const confirmDeleteLicense = async () => {
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
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('licenses.notifications.deleteFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsDeletingLicense(false);
    }
  };

  const filteredLicenses =
    filter === 'all' ? licenses : licenses.filter((l) => l.status === filter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            {t('licenses.title')}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('licenses.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadLicenses} disabled={isLoading}>
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </Button>
          <Button variant="outline" size="sm" onClick={openScanDialog}>
            <Search size={14} />
            {t('licenses.scanLicenses')}
          </Button>
          <Button size="sm" onClick={() => setShowForm(true)}>
            <Plus size={14} />
            {t('licenses.addLicense')}
          </Button>
        </div>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-4 gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`p-3 rounded-lg text-center transition-colors ${
              filter === 'all'
                ? 'bg-primary/10 border border-primary/30'
                : 'bg-slate-50 dark:bg-slate-700/50'
            }`}
          >
            <div className="text-2xl font-bold text-primary">{statistics.total}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('licenses.stats.total')}
            </div>
          </button>
          <button
            onClick={() => setFilter('valid')}
            className={`p-3 rounded-lg text-center transition-colors ${
              filter === 'valid'
                ? 'bg-success/10 border border-success/30'
                : 'bg-slate-50 dark:bg-slate-700/50'
            }`}
          >
            <div className="text-2xl font-bold text-success-500">{statistics.valid}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('licenses.stats.valid')}
            </div>
          </button>
          <button
            onClick={() => setFilter('expiring')}
            className={`p-3 rounded-lg text-center transition-colors ${
              filter === 'expiring'
                ? 'bg-warning/10 border border-warning/30'
                : 'bg-slate-50 dark:bg-slate-700/50'
            }`}
          >
            <div className="text-2xl font-bold text-warning-500">{statistics.expiring}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('licenses.stats.expiring')}
            </div>
          </button>
          <button
            onClick={() => setFilter('expired')}
            className={`p-3 rounded-lg text-center transition-colors ${
              filter === 'expired'
                ? 'bg-error/10 border border-error/30'
                : 'bg-slate-50 dark:bg-slate-700/50'
            }`}
          >
            <div className="text-2xl font-bold text-error-500">{statistics.expired}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">
              {t('licenses.stats.expired')}
            </div>
          </button>
        </div>
      )}

      {/* License List */}
      <Card>
        <CardHeader
          title={t('licenses.list.title')}
          subtitle={t('licenses.list.subtitle', { count: filteredLicenses.length })}
        />
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <RefreshCw size={24} className="animate-spin mx-auto text-slate-400" />
            </div>
          ) : filteredLicenses.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
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
                      <FileKey size={20} className="text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {license.name}
                        </span>
                        <LicenseStatusBadge status={license.status} />
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {license.product_name}
                        {license.product_version && ` v${license.product_version}`}
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 dark:text-slate-500">
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

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirmLicense}
        onClose={() => setDeleteConfirmLicense(null)}
        onConfirm={confirmDeleteLicense}
        title={t('licenses.dialog.deleteTitle')}
        message={t('licenses.confirmDelete', { name: deleteConfirmLicense?.name })}
        confirmText={t('common.delete')}
        variant="danger"
        isLoading={isDeletingLicense}
      />

      {/* Scan Dialog */}
      {showScanDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            {/* Dialog Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {t('licenses.scan.title')}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('licenses.scan.subtitle')}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setShowScanDialog(false)}>
                <X size={18} />
              </Button>
            </div>

            {/* Dialog Content */}
            <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Instance Info */}
              <div className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <Server size={16} />
                  <span>{t('licenses.scan.instanceCount', { count: instances.length })}</span>
                </div>
                {instances.length > 0 && (
                  <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                    {instances.map((inst) => inst.name).join(', ')}
                  </div>
                )}
              </div>

              {/* Scan Button */}
              <Button
                onClick={handleScanInstanceDirs}
                disabled={isScanning || instances.length === 0}
                className="w-full"
              >
                {isScanning ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    {t('licenses.scan.scanning')}
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    {t('licenses.scan.scanInstanceDirs')}
                  </>
                )}
              </Button>

              {/* Results */}
              {scanResults.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {t('licenses.scan.foundCount', { count: scanResults.length })}
                    </span>
                    <Button variant="ghost" size="sm" onClick={selectAllFiles}>
                      {selectedFiles.size === scanResults.length
                        ? t('licenses.scan.deselectAll')
                        : t('licenses.scan.selectAll')}
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {scanResults.map((file) => (
                      <label
                        key={file.path}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedFiles.has(file.path)
                            ? 'border-primary bg-primary/5'
                            : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(file.path)}
                          onChange={() => toggleFileSelection(file.path)}
                          className="mt-1"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                              {file.name}
                            </span>
                            {file.instance_name && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-primary/10 text-primary">
                                <Link2 size={10} />
                                {file.instance_name}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <div className="flex items-center gap-1">
                              <FolderOpen size={12} />
                              <span className="truncate">{file.parent_directory}</span>
                            </div>
                            {file.product_name && <div className="mt-0.5">{file.product_name}</div>}
                            {file.customer_name && (
                              <div className="flex items-center gap-1 mt-0.5">
                                <Building2 size={12} />
                                {file.customer_name}
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Import Progress */}
              {isImporting && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-primary">
                    <RefreshCw size={16} className="animate-spin" />
                    <span>
                      {t('licenses.scan.importing', {
                        current: importProgress.current,
                        total: importProgress.total,
                      })}
                    </span>
                  </div>
                  <div className="mt-2 bg-slate-200 dark:bg-slate-600 rounded-full h-2">
                    <div
                      className="bg-primary rounded-full h-2 transition-all"
                      style={{
                        width: `${(importProgress.current / importProgress.total) * 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Dialog Footer */}
            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" onClick={() => setShowScanDialog(false)}>
                {t('common.cancel')}
              </Button>
              <Button
                onClick={handleBatchImport}
                disabled={selectedFiles.size === 0 || isImporting}
              >
                <Upload size={16} />
                {t('licenses.scan.import', { count: selectedFiles.size })}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
