import { useState, useEffect, useCallback } from 'react';
import {
  Coffee,
  Hexagon,
  FileCode,
  RefreshCw,
  Check,
  ExternalLink,
  Plus,
  AlertCircle,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';
import * as versionApi from '@/api/version';

type TabType = 'java' | 'node' | 'maven';

export function VersionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('java');
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
        title: 'Failed to load versions',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsScanning(false);
    }
  }, [addNotification]);

  useEffect(() => {
    loadVersionInfo();
  }, [loadVersionInfo]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Version Management
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Manage Java, Node.js, and Maven configurations
          </p>
        </div>
        <Button
          variant="outline"
          icon={
            isScanning ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />
          }
          onClick={loadVersionInfo}
          disabled={isScanning}
        >
          Scan Versions
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <TabButton
          active={activeTab === 'java'}
          onClick={() => setActiveTab('java')}
          icon={<Coffee size={18} />}
          label="Java"
          badge={versionInfo?.java.versions.length}
        />
        <TabButton
          active={activeTab === 'node'}
          onClick={() => setActiveTab('node')}
          icon={<Hexagon size={18} />}
          label="Node.js"
          badge={versionInfo?.node.versions.length}
        />
        <TabButton
          active={activeTab === 'maven'}
          onClick={() => setActiveTab('maven')}
          icon={<FileCode size={18} />}
          label="Maven"
          badge={versionInfo?.maven.configs.length}
        />
      </div>

      {/* Content */}
      {isScanning && !versionInfo ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={32} className="animate-spin text-azure" />
        </div>
      ) : activeTab === 'java' ? (
        <JavaVersionsPanel javaInfo={versionInfo?.java} onRefresh={loadVersionInfo} />
      ) : activeTab === 'node' ? (
        <NodeVersionsPanel nodeInfo={versionInfo?.node} onRefresh={loadVersionInfo} />
      ) : (
        <MavenConfigPanel mavenInfo={versionInfo?.maven} onRefresh={loadVersionInfo} />
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
  const addNotification = useAppStore((s) => s.addNotification);
  const [switchingVersion, setSwitchingVersion] = useState<string | null>(null);

  const handleSwitch = async (version: string) => {
    setSwitchingVersion(version);
    try {
      const result = await versionApi.switchJavaVersion(version);
      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Java version switched',
          message: `Now using Java ${result.current_version}`,
        });
        onRefresh();
      } else {
        addNotification({
          type: 'error',
          title: 'Switch failed',
          message: result.error || 'Unknown error',
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Switch failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSwitchingVersion(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Version Managers */}
      <Card>
        <CardHeader title="Version Managers" subtitle="Detected Java version management tools" />
        <CardContent>
          {!javaInfo?.managers || javaInfo.managers.length === 0 ? (
            <div className="text-center py-6">
              <AlertCircle size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                No Java version managers detected
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
          title="Installed Versions"
          subtitle={`${javaInfo?.versions.length || 0} Java installations detected`}
        />
        <CardContent>
          {!javaInfo?.versions || javaInfo.versions.length === 0 ? (
            <EmptyVersionState type="Java" />
          ) : (
            <div className="space-y-2">
              {javaInfo.versions.map((v) => (
                <JavaVersionRow
                  key={`${v.version}-${v.path}`}
                  version={v}
                  isCurrent={v.is_current}
                  isSwitching={switchingVersion === v.version}
                  onSwitch={() => handleSwitch(v.version)}
                />
              ))}
            </div>
          )}
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
  const addNotification = useAppStore((s) => s.addNotification);
  const [switchingVersion, setSwitchingVersion] = useState<string | null>(null);

  const handleSwitch = async (version: string) => {
    setSwitchingVersion(version);
    try {
      const result = await versionApi.switchNodeVersion(version);
      if (result.success) {
        addNotification({
          type: 'success',
          title: 'Node version switched',
          message: `Now using Node.js ${result.current_version}`,
        });
        onRefresh();
      } else {
        addNotification({
          type: 'error',
          title: 'Switch failed',
          message: result.error || 'Unknown error',
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Switch failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSwitchingVersion(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Version Managers */}
      <Card>
        <CardHeader title="Version Managers" subtitle="Detected Node.js version management tools" />
        <CardContent>
          {!nodeInfo?.managers || nodeInfo.managers.length === 0 ? (
            <div className="text-center py-6">
              <AlertCircle size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                No Node.js version managers detected
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
          title="Installed Versions"
          subtitle={`${nodeInfo?.versions.length || 0} Node.js installations detected`}
        />
        <CardContent>
          {!nodeInfo?.versions || nodeInfo.versions.length === 0 ? (
            <EmptyVersionState type="Node.js" />
          ) : (
            <div className="space-y-2">
              {nodeInfo.versions.map((v) => (
                <NodeVersionRow
                  key={`${v.version}-${v.path}`}
                  version={v}
                  isCurrent={v.is_current}
                  isSwitching={switchingVersion === v.version}
                  onSwitch={() => handleSwitch(v.version)}
                />
              ))}
            </div>
          )}
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
  const addNotification = useAppStore((s) => s.addNotification);
  const [switchingConfig, setSwitchingConfig] = useState<string | null>(null);

  const handleSwitch = async (configId: string) => {
    setSwitchingConfig(configId);
    try {
      await versionApi.switchMavenConfig(configId);
      addNotification({
        type: 'success',
        title: 'Maven config switched',
        message: 'Successfully updated Maven settings',
      });
      onRefresh();
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Switch failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setSwitchingConfig(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Configuration */}
      <Card>
        <CardHeader title="Current Configuration" subtitle="Active Maven settings.xml" />
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
              Using default Maven settings
            </p>
          )}
        </CardContent>
      </Card>

      {/* Saved Configurations */}
      <Card>
        <CardHeader
          title="Saved Configurations"
          subtitle={`${mavenInfo?.configs.length || 0} Maven configurations`}
          action={
            <Button variant="outline" size="sm" icon={<Plus size={14} />}>
              Import
            </Button>
          }
        />
        <CardContent>
          {!mavenInfo?.configs || mavenInfo.configs.length === 0 ? (
            <div className="text-center py-6">
              <FileCode size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
              <p className="text-slate-500 dark:text-slate-400 mb-4">
                No saved Maven configurations
              </p>
              <Button variant="outline" size="sm" icon={<Plus size={14} />}>
                Import settings.xml
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
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {config.name}
                      </p>
                      {config.is_active && (
                        <span className="px-1.5 py-0.5 bg-azure-100 dark:bg-azure-800 text-azure-700 dark:text-azure-300 text-xs rounded">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{config.path}</p>
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
                        'Use'
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
  );
}

interface JavaVersionRowProps {
  version: versionApi.JavaVersion;
  isCurrent: boolean;
  isSwitching: boolean;
  onSwitch: () => void;
}

function JavaVersionRow({ version, isCurrent, isSwitching, onSwitch }: JavaVersionRowProps) {
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
                Current
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">{version.vendor}</span>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">{version.path}</span>
        </div>
      </div>
      {!isCurrent && (
        <Button variant="ghost" size="sm" onClick={onSwitch} disabled={isSwitching}>
          {isSwitching ? <RefreshCw size={14} className="animate-spin" /> : 'Use'}
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
                Current
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">{version.path}</span>
        </div>
      </div>
      {!isCurrent && (
        <Button variant="ghost" size="sm" onClick={onSwitch} disabled={isSwitching}>
          {isSwitching ? <RefreshCw size={14} className="animate-spin" /> : 'Use'}
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

function EmptyVersionState({ type }: { type: string }) {
  return (
    <div className="text-center py-6">
      <AlertCircle size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
      <p className="text-slate-500 dark:text-slate-400">No {type} installations detected</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
        Install a version manager to manage {type} versions
      </p>
    </div>
  );
}
