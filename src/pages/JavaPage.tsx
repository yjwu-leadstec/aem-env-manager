import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Coffee, RefreshCw, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';
import * as versionApi from '@/api/version';
import { updateProfile, getActiveProfile } from '@/api/profile';
import { setJavaSymlink } from '@/api/environment';

export function JavaPage() {
  const { t } = useTranslation();
  const [isScanning, setIsScanning] = useState(false);
  const [javaInfo, setJavaInfo] = useState<versionApi.VersionInfo['java'] | null>(null);
  const [switchingVersion, setSwitchingVersion] = useState<string | null>(null);
  const addNotification = useAppStore((s) => s.addNotification);

  const loadJavaInfo = useCallback(async () => {
    setIsScanning(true);
    try {
      const info = await versionApi.getAllVersionInfo();
      setJavaInfo(info.java);
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('java.notifications.loadFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsScanning(false);
    }
  }, [addNotification, t]);

  useEffect(() => {
    loadJavaInfo();
  }, [loadJavaInfo]);

  // Handle "Use" button click - updates current profile and sets symlink
  const handleSwitch = async (version: string, javaPath: string) => {
    setSwitchingVersion(version);
    try {
      // Get current active profile
      const activeProfile = await getActiveProfile();

      if (!activeProfile) {
        addNotification({
          type: 'warning',
          title: t('java.notifications.noProfile'),
          message: t('java.notifications.noProfileMessage'),
        });
        setSwitchingVersion(null);
        return;
      }

      // Update profile with new java version and path
      await updateProfile(activeProfile.id, {
        java_version: version,
        java_path: javaPath,
      });

      // Set symlink to immediately apply the change
      const symlinkResult = await setJavaSymlink(javaPath);

      if (symlinkResult.success) {
        addNotification({
          type: 'success',
          title: t('java.notifications.switched'),
          message: t('java.notifications.switchedMessage', { version }),
        });
        loadJavaInfo();
      } else {
        addNotification({
          type: 'warning',
          title: t('java.notifications.switched'),
          message: symlinkResult.message || t('java.notifications.switchedMessage', { version }),
        });
        loadJavaInfo();
      }
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
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            <span className="mr-2">☕</span>
            {t('java.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('java.subtitle')}</p>
        </div>
        <Button
          variant="outline"
          icon={
            isScanning ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />
          }
          onClick={loadJavaInfo}
          disabled={isScanning}
        >
          {t('java.scan')}
        </Button>
      </div>

      {isScanning && !javaInfo ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={32} className="animate-spin text-azure" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Version Managers */}
          <Card>
            <CardHeader title={t('java.managers.title')} subtitle={t('java.managers.subtitle')} />
            <CardContent>
              {!javaInfo?.managers || javaInfo.managers.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle
                    size={40}
                    className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
                  />
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    {t('java.managers.empty')}
                  </p>
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
                <div className="text-center py-6">
                  <AlertCircle
                    size={40}
                    className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
                  />
                  <p className="text-slate-500 dark:text-slate-400">{t('java.versions.empty')}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    {t('java.versions.emptyHint')}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {javaInfo.versions.map((v) => (
                    <div
                      key={`${v.version}-${v.path}`}
                      className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                        v.is_current
                          ? 'bg-azure-50 dark:bg-azure-900/30'
                          : 'bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Coffee size={20} className="text-warning-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-900 dark:text-slate-100">
                              {v.version}
                            </span>
                            {v.is_current && (
                              <span className="px-1.5 py-0.5 bg-azure-100 dark:bg-azure-800 text-azure-700 dark:text-azure-300 text-xs rounded">
                                {t('common.current')}
                              </span>
                            )}
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              {v.vendor}
                            </span>
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
      className="flex items-center gap-1 text-sm text-azure dark:text-azure-400 hover:underline"
    >
      {name} <ExternalLink size={12} />
    </a>
  );
}
