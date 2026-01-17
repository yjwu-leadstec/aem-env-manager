import { useState, useEffect, useCallback } from 'react';
import { Hexagon, RefreshCw, Check, ExternalLink, AlertCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';
import * as versionApi from '@/api/version';

export function NodePage() {
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
        title: '加载失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsScanning(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadNodeInfo();
  }, [loadNodeInfo]);

  const handleSwitch = async (version: string) => {
    setSwitchingVersion(version);
    try {
      const result = await versionApi.switchNodeVersion(version);
      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Node 版本已切换',
          message: `当前使用 Node.js ${result.current_version}`,
        });
        loadNodeInfo();
      } else {
        addNotification({
          type: 'error',
          title: '切换失败',
          message: result.error || '未知错误',
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: '切换失败',
        message: error instanceof Error ? error.message : '未知错误',
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
            <span className="mr-2">📦</span>Node.js 版本管理
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">管理和切换 Node.js 运行环境版本</p>
        </div>
        <Button
          variant="outline"
          icon={
            isScanning ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />
          }
          onClick={loadNodeInfo}
          disabled={isScanning}
        >
          扫描版本
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
            <CardHeader title="版本管理器" subtitle="检测到的 Node.js 版本管理工具" />
            <CardContent>
              {!nodeInfo?.managers || nodeInfo.managers.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle
                    size={40}
                    className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
                  />
                  <p className="text-slate-500 dark:text-slate-400 mb-4">
                    未检测到 Node.js 版本管理器
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
              title="已安装版本"
              subtitle={`检测到 ${nodeInfo?.versions.length || 0} 个 Node.js 安装`}
            />
            <CardContent>
              {!nodeInfo?.versions || nodeInfo.versions.length === 0 ? (
                <div className="text-center py-6">
                  <AlertCircle
                    size={40}
                    className="mx-auto mb-3 text-slate-300 dark:text-slate-600"
                  />
                  <p className="text-slate-500 dark:text-slate-400">未检测到 Node.js 安装</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    安装版本管理器来管理 Node.js 版本
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
                                当前
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
                          onClick={() => handleSwitch(v.version)}
                          disabled={switchingVersion === v.version}
                        >
                          {switchingVersion === v.version ? (
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
