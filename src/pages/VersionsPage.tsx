import { useState } from 'react';
import { Coffee, Hexagon, RefreshCw, Check, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useVersionManagers, useAppStore } from '@/store';
import type { VersionManager, InstalledVersion } from '@/types';

type TabType = 'java' | 'node';

export function VersionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('java');
  const versionManagers = useVersionManagers();

  const javaManagers = versionManagers.filter(
    (m) => m.type === 'sdkman' || m.type === 'jenv' || m.type === 'jabba'
  );
  const nodeManagers = versionManagers.filter(
    (m) => m.type === 'nvm' || m.type === 'fnm' || m.type === 'volta'
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Version Management</h1>
          <p className="text-slate-500 mt-1">Manage Java and Node.js versions</p>
        </div>
        <Button variant="outline" icon={<RefreshCw size={16} />}>
          Scan Versions
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <TabButton
          active={activeTab === 'java'}
          onClick={() => setActiveTab('java')}
          icon={<Coffee size={18} />}
          label="Java"
        />
        <TabButton
          active={activeTab === 'node'}
          onClick={() => setActiveTab('node')}
          icon={<Hexagon size={18} />}
          label="Node.js"
        />
      </div>

      {/* Content */}
      {activeTab === 'java' ? (
        <JavaVersionsPanel managers={javaManagers} />
      ) : (
        <NodeVersionsPanel managers={nodeManagers} />
      )}
    </div>
  );
}

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}

function TabButton({ active, onClick, icon, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
        active
          ? 'text-azure border-azure'
          : 'text-slate-500 border-transparent hover:text-slate-700'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

interface VersionsPanelProps {
  managers: VersionManager[];
}

function JavaVersionsPanel({ managers }: VersionsPanelProps) {
  const addNotification = useAppStore((s) => s.addNotification);

  // Demo versions for display
  const demoVersions: InstalledVersion[] = [
    { version: '21.0.2', path: '/usr/lib/jvm/java-21', isDefault: true, vendor: 'openjdk' },
    { version: '17.0.9', path: '/usr/lib/jvm/java-17', isDefault: false, vendor: 'temurin' },
    { version: '11.0.21', path: '/usr/lib/jvm/java-11', isDefault: false, vendor: 'corretto' },
  ];

  const handleSwitch = (version: string) => {
    addNotification({
      type: 'success',
      title: 'Java version switched',
      message: `Now using Java ${version}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Version Managers */}
      <Card>
        <CardHeader title="Version Managers" subtitle="Detected Java version management tools" />
        <CardContent>
          {managers.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-500 mb-4">No Java version managers detected</p>
              <div className="flex justify-center gap-2">
                <ManagerLink name="SDKMAN" url="https://sdkman.io" />
                <ManagerLink name="jEnv" url="https://www.jenv.be" />
                <ManagerLink name="jabba" url="https://github.com/shyiko/jabba" />
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {managers.map((m) => (
                <div
                  key={m.id}
                  className={`px-3 py-2 rounded-lg ${m.isActive ? 'bg-azure-50 text-azure-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  {m.name}
                  {m.isActive && <Check size={14} className="inline ml-2" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Installed Versions */}
      <Card>
        <CardHeader title="Installed Versions" subtitle="Available Java installations" />
        <CardContent>
          <div className="space-y-2">
            {demoVersions.map((v) => (
              <VersionRow
                key={v.version}
                version={v}
                type="java"
                onSwitch={() => handleSwitch(v.version)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function NodeVersionsPanel({ managers }: VersionsPanelProps) {
  const addNotification = useAppStore((s) => s.addNotification);

  // Demo versions for display
  const demoVersions: InstalledVersion[] = [
    { version: '20.11.0', path: '/home/user/.nvm/versions/node/v20.11.0', isDefault: true },
    { version: '18.19.0', path: '/home/user/.nvm/versions/node/v18.19.0', isDefault: false },
    { version: '16.20.2', path: '/home/user/.nvm/versions/node/v16.20.2', isDefault: false },
  ];

  const handleSwitch = (version: string) => {
    addNotification({
      type: 'success',
      title: 'Node version switched',
      message: `Now using Node.js ${version}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Version Managers */}
      <Card>
        <CardHeader title="Version Managers" subtitle="Detected Node.js version management tools" />
        <CardContent>
          {managers.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-slate-500 mb-4">No Node.js version managers detected</p>
              <div className="flex justify-center gap-2">
                <ManagerLink name="nvm" url="https://github.com/nvm-sh/nvm" />
                <ManagerLink name="fnm" url="https://fnm.vercel.app" />
                <ManagerLink name="Volta" url="https://volta.sh" />
              </div>
            </div>
          ) : (
            <div className="flex gap-2">
              {managers.map((m) => (
                <div
                  key={m.id}
                  className={`px-3 py-2 rounded-lg ${m.isActive ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-600'}`}
                >
                  {m.name}
                  {m.isActive && <Check size={14} className="inline ml-2" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Installed Versions */}
      <Card>
        <CardHeader title="Installed Versions" subtitle="Available Node.js installations" />
        <CardContent>
          <div className="space-y-2">
            {demoVersions.map((v) => (
              <VersionRow
                key={v.version}
                version={v}
                type="node"
                onSwitch={() => handleSwitch(v.version)}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface VersionRowProps {
  version: InstalledVersion;
  type: 'java' | 'node';
  onSwitch: () => void;
}

function VersionRow({ version, type, onSwitch }: VersionRowProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
      <div className="flex items-center gap-3">
        {type === 'java' ? (
          <Coffee size={20} className="text-warning" />
        ) : (
          <Hexagon size={20} className="text-success" />
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900">v{version.version}</span>
            {version.isDefault && (
              <span className="px-1.5 py-0.5 bg-azure-100 text-azure-700 text-xs rounded">
                Current
              </span>
            )}
            {version.vendor && <span className="text-xs text-slate-500">{version.vendor}</span>}
          </div>
          <span className="text-xs text-slate-400">{version.path}</span>
        </div>
      </div>
      {!version.isDefault && (
        <Button variant="ghost" size="sm" onClick={onSwitch}>
          Use
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
      className="flex items-center gap-1 text-sm text-azure hover:underline"
    >
      {name} <ExternalLink size={12} />
    </a>
  );
}
