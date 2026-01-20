import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, FolderOpen, Search } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';
import * as versionApi from '@/api/version';
import { getActiveProfile, updateProfile } from '@/api/profile';
import { setJavaSymlink } from '@/api/environment';
import { open } from '@tauri-apps/plugin-dialog';
import { VersionManagerList, JavaVersionRow, EmptyVersionState } from './shared';
import type { JavaPanelProps } from './types';

const JAVA_MANAGER_LINKS = [
  { name: 'SDKMAN', url: 'https://sdkman.io' },
  { name: 'jEnv', url: 'https://www.jenv.be' },
  { name: 'jabba', url: 'https://github.com/shyiko/jabba' },
];

export function JavaVersionsPanel({ javaInfo, onRefresh }: JavaPanelProps) {
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
          <VersionManagerList
            managers={javaInfo?.managers}
            emptyMessage={t('java.managers.empty')}
            managerLinks={JAVA_MANAGER_LINKS}
            activeColorClass="bg-azure-50 dark:bg-azure-900/30 text-azure-700 dark:text-azure-300"
          />
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
