import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Hexagon, RefreshCw, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';
import * as versionApi from '@/api/version';
import { updateProfile, getActiveProfile } from '@/api/profile';
import { setNodeSymlink } from '@/api/environment';

export function NodePage() {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [nodeInfo, setNodeInfo] = useState<versionApi.VersionInfo['node'] | null>(null);
  const [switchingVersion, setSwitchingVersion] = useState<string | null>(null);
  const addNotification = useAppStore((s) => s.addNotification);

  const loadNodeInfo = useCallback(async () => {
    setIsScanning(true);
    try {
      const info = await versionApi.getAllVersionInfo();
      setNodeInfo(info.node);
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('node.notifications.loadFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsScanning(false);
    }
  }, [addNotification, t]);

  useEffect(() => {
    loadNodeInfo();
  }, [loadNodeInfo]);

  // Handle "Use" button click - updates current profile and sets symlink
  const handleSwitch = async (version: string, nodePath: string) => {
    setSwitchingVersion(version);
    try {
      // Get current active profile
      const activeProfile = await getActiveProfile();

      if (!activeProfile) {
        addNotification({
          type: 'warning',
          title: t('node.notifications.noProfile'),
          message: t('node.notifications.noProfileMessage'),
        });
        setSwitchingVersion(null);
        return;
      }

      // Update profile with new node version and path
      await updateProfile(activeProfile.id, {
        node_version: version,
        node_path: nodePath,
      });

      // Set symlink to immediately apply the change
      const symlinkResult = await setNodeSymlink(nodePath);

      if (symlinkResult.success) {
        addNotification({
          type: 'success',
          title: t('node.notifications.switched'),
          message: t('node.notifications.switchedMessage', { version }),
        });
        loadNodeInfo();
      } else {
        addNotification({
          type: 'warning',
          title: t('node.notifications.switched'),
          message: symlinkResult.message || t('node.notifications.switchedMessage', { version }),
        });
        loadNodeInfo();
      }
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            <span className="mr-2">📦</span>
            {t('node.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('node.subtitle')}</p>
        </div>
        <Button
          variant="outline"
          icon={
            isScanning ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />
          }
          onClick={loadNodeInfo}
          disabled={isScanning}
        >
          {t('node.scan')}
        </Button>
      </div>

      {isScanning && !nodeInfo ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={32} className="animate-spin text-teal" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Version Managers */}
          <Card>
            <CardHeader title={t('node.managers.title')} subtitle={t('node.managers.subtitle')} />
            <CardContent>
              {!nodeInfo?.managers || nodeInfo.managers.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle
                    size={40}
                    className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
                  />
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    {t('node.managers.empty')}
                  </p>
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
                <div className="text-center py-6">
                  <AlertCircle
                    size={40}
                    className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
                  />
                  <p className="text-slate-500 dark:text-slate-400">{t('node.versions.empty')}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {t('node.versions.emptyHint')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {nodeInfo.versions.map((v) => (
                    <div
                      key={`${v.version}-${v.path}`}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        v.is_current
                          ? 'bg-teal-50 dark:bg-teal-900/30'
                          : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Hexagon size={20} className="text-success-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {v.version}
                            </span>
                            {v.is_current && (
                              <span className="px-1.5 py-0.5 bg-teal-100 dark:bg-teal-800 text-teal-700 dark:text-teal-300 text-xs rounded">
                                {t('common.current')}
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {v.path}
                          </span>
                        </div>
                      </div>
                      {!v.is_current && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSwitch(v.version, v.path)}
                          disabled={switchingVersion === v.version}
                        >
                          {switchingVersion === v.version ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            t('common.use')
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
      className="flex items-center gap-1 text-sm text-teal dark:text-teal-400 hover:underline"
    >
      {name} <ExternalLink size={12} />
    </a>
  );
}
