import { useState, useEffect, useCallback } from 'react';
import { FileCode, RefreshCw, Check, Plus } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';
import * as versionApi from '@/api/version';

export function MavenPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [mavenInfo, setMavenInfo] = useState<versionApi.VersionInfo['maven'] | null>(null);
  const [switchingConfig, setSwitchingConfig] = useState<string | null>(null);
  const addNotification = useAppStore((s) => s.addNotification);

  const loadMavenInfo = useCallback(async () => {
    setIsScanning(true);
    try {
      const info = await versionApi.getAllVersionInfo();
      setMavenInfo(info.maven);
    } catch (error) {
      addNotification({
        type: 'error',
        title: '加载失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsScanning(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadMavenInfo();
  }, [loadMavenInfo]);

  const handleSwitch = async (configId: string) => {
    setSwitchingConfig(configId);
    try {
      await versionApi.switchMavenConfig(configId);
      addNotification({
        type: 'success',
        title: 'Maven 配置已切换',
        message: '成功更新 Maven settings',
      });
      loadMavenInfo();
    } catch (error) {
      addNotification({
        type: 'error',
        title: '切换失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setSwitchingConfig(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            <span className="mr-2">🔧</span>Maven 配置管理
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            管理和切换 Maven settings.xml 配置文件
          </p>
        </div>
        <Button
          variant="outline"
          icon={
            isScanning ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />
          }
          onClick={loadMavenInfo}
          disabled={isScanning}
        >
          刷新配置
        </Button>
      </div>

      {isScanning && !mavenInfo ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={32} className="animate-spin text-azure" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Current Configuration */}
          <Card>
            <CardHeader title="当前配置" subtitle="活跃的 Maven settings.xml" />
            <CardContent>
              {mavenInfo?.current ? (
                <div className="flex items-center justify-between p-3 rounded-lg bg-azure-50 dark:bg-azure-900/30">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">
                      {mavenInfo.current.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {mavenInfo.current.path}
                    </p>
                  </div>
                  <Check size={20} className="text-azure" />
                </div>
              ) : (
                <p className="text-slate-500 dark:text-slate-400 text-center py-4">
                  使用默认 Maven settings
                </p>
              )}
            </CardContent>
          </Card>

          {/* Saved Configurations */}
          <Card>
            <CardHeader
              title="已保存配置"
              subtitle={`${mavenInfo?.configs.length || 0} 个 Maven 配置文件`}
              action={
                <Button variant="outline" size="sm" icon={<Plus size={14} />}>
                  导入
                </Button>
              }
            />
            <CardContent>
              {!mavenInfo?.configs || mavenInfo.configs.length === 0 ? (
                <div className="text-center py-6">
                  <FileCode size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                  <p className="text-slate-500 dark:text-slate-400 mb-4">没有已保存的 Maven 配置</p>
                  <Button variant="outline" size="sm" icon={<Plus size={14} />}>
                    导入 settings.xml
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
                                活跃
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {config.path}
                          </p>
                        </div>
                      </div>
                      {!config.is_active && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSwitch(config.id)}
                          disabled={switchingConfig === config.id}
                        >
                          {switchingConfig === config.id ? (
                            <RefreshCw size={14} className="animate-spin" />
                          ) : (
                            '使用'
                          )}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tips */}
          <Card>
            <CardHeader title="提示" />
            <CardContent>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
                <div className="flex items-start gap-2">
                  <span className="text-azure">•</span>
                  <p>Maven settings.xml 文件通常位于 ~/.m2/settings.xml</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-azure">•</span>
                  <p>你可以为不同的项目或环境保存多个配置文件</p>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-azure">•</span>
                  <p>切换配置会更新 ~/.m2/settings.xml 的符号链接</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
