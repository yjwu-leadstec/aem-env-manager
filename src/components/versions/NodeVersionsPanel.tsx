import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, FolderOpen, Search } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';
import * as versionApi from '@/api/version';
import { getActiveProfile, updateProfile } from '@/api/profile';
import { setNodeSymlink } from '@/api/environment';
import { open } from '@tauri-apps/plugin-dialog';
import { VersionManagerList, NodeVersionRow, EmptyVersionState } from './shared';
import type { NodePanelProps } from './types';

const NODE_MANAGER_LINKS = [
  { name: 'nvm', url: 'https://github.com/nvm-sh/nvm' },
  { name: 'fnm', url: 'https://fnm.vercel.app' },
  { name: 'Volta', url: 'https://volta.sh' },
];

export function NodeVersionsPanel({ nodeInfo, onRefresh }: NodePanelProps) {
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
          <VersionManagerList
            managers={nodeInfo?.managers}
            emptyMessage={t('node.managers.empty')}
            managerLinks={NODE_MANAGER_LINKS}
            activeColorClass="bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300"
          />
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
