import { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useConfig, useAppStore } from '@/store';
import type { AppConfig } from '@/types';

type SettingsTab = 'general' | 'paths' | 'data';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-500 mt-1">Configure application preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 space-y-1">
          <SettingsNavItem
            icon={<Settings size={18} />}
            label="General"
            active={activeTab === 'general'}
            onClick={() => setActiveTab('general')}
          />
          <SettingsNavItem
            icon={<FolderOpen size={18} />}
            label="Paths"
            active={activeTab === 'paths'}
            onClick={() => setActiveTab('paths')}
          />
          <SettingsNavItem
            icon={<Database size={18} />}
            label="Data"
            active={activeTab === 'data'}
            onClick={() => setActiveTab('data')}
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
        active ? 'bg-azure-50 text-azure-700 font-medium' : 'text-slate-600 hover:bg-slate-50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function GeneralSettings() {
  const config = useConfig();
  const updateConfig = useAppStore((s) => s.updateConfig);
  const addNotification = useAppStore((s) => s.addNotification);

  const handleThemeChange = (theme: AppConfig['theme']) => {
    updateConfig({ theme });
    addNotification({
      type: 'success',
      title: 'Theme updated',
      message: `Switched to ${theme} mode`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader title="Appearance" subtitle="Customize the look and feel" />
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700">Theme</p>
              <p className="text-sm text-slate-500">Choose your preferred color scheme</p>
            </div>
            <div className="flex gap-2">
              <ThemeButton
                icon={<Sun size={16} />}
                label="Light"
                active={config.theme === 'light'}
                onClick={() => handleThemeChange('light')}
              />
              <ThemeButton
                icon={<Moon size={16} />}
                label="Dark"
                active={config.theme === 'dark'}
                onClick={() => handleThemeChange('dark')}
              />
              <ThemeButton
                icon={<Monitor size={16} />}
                label="System"
                active={config.theme === 'system'}
                onClick={() => handleThemeChange('system')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader title="Notifications" subtitle="Configure alert preferences" />
        <CardContent className="space-y-4">
          <ToggleSetting
            icon={<Bell size={18} />}
            title="Show notifications"
            description="Display desktop notifications for important events"
            enabled={config.showNotifications}
            onChange={(enabled) => updateConfig({ showNotifications: enabled })}
          />
        </CardContent>
      </Card>

      {/* Behavior */}
      <Card>
        <CardHeader title="Behavior" subtitle="Application behavior settings" />
        <CardContent className="space-y-4">
          <ToggleSetting
            icon={<Settings size={18} />}
            title="Auto-switch profile"
            description="Automatically switch environment when profile is selected"
            enabled={config.autoSwitchProfile}
            onChange={(enabled) => updateConfig({ autoSwitchProfile: enabled })}
          />
          <ToggleSetting
            icon={<Monitor size={18} />}
            title="Start minimized"
            description="Start application in the system tray"
            enabled={config.startMinimized}
            onChange={(enabled) => updateConfig({ startMinimized: enabled })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function PathsSettings() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader
          title="Scan Directories"
          subtitle="Directories to search for Java and Node installations"
        />
        <CardContent className="space-y-4">
          <PathInput label="Java scan paths" placeholder="/usr/lib/jvm, /opt/java" />
          <PathInput label="Node scan paths" placeholder="~/.nvm, ~/.fnm" />
          <PathInput label="Maven home" placeholder="~/.m2" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="AEM Directories" subtitle="Default paths for AEM installations" />
        <CardContent className="space-y-4">
          <PathInput label="AEM base directory" placeholder="/opt/aem" />
          <PathInput label="Logs directory" placeholder="/var/log/aem" />
        </CardContent>
      </Card>
    </div>
  );
}

function DataSettings() {
  const addNotification = useAppStore((s) => s.addNotification);

  const handleExport = () => {
    addNotification({
      type: 'info',
      title: 'Export started',
      message: 'Preparing configuration export...',
    });
  };

  const handleImport = () => {
    addNotification({
      type: 'info',
      title: 'Import',
      message: 'Select a configuration file to import',
    });
  };

  const handleReset = () => {
    addNotification({
      type: 'warning',
      title: 'Reset confirmation required',
      message: 'This action cannot be undone',
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Export / Import" subtitle="Backup and restore your configuration" />
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button variant="outline" icon={<Download size={16} />} onClick={handleExport}>
              Export Configuration
            </Button>
            <Button variant="outline" icon={<Upload size={16} />} onClick={handleImport}>
              Import Configuration
            </Button>
          </div>
          <p className="text-sm text-slate-500">
            Export includes all profiles, instances, and settings. Sensitive data like passwords are
            encrypted.
          </p>
        </CardContent>
      </Card>

      <Card className="border-error-200">
        <CardHeader title="Danger Zone" subtitle="Irreversible actions" />
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-error-50 rounded-lg">
            <div>
              <p className="font-medium text-error-700">Reset all settings</p>
              <p className="text-sm text-error-600">
                This will delete all profiles, instances, and reset to defaults
              </p>
            </div>
            <Button variant="danger" icon={<RotateCcw size={16} />} onClick={handleReset}>
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>
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
        active ? 'bg-azure-100 text-azure-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
        <div className="p-2 rounded-lg bg-slate-100 text-slate-600">{icon}</div>
        <div>
          <p className="font-medium text-slate-700">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-azure' : 'bg-slate-300'
        }`}
      >
        <div
          className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function PathInput({ label, placeholder }: { label: string; placeholder: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <div className="flex gap-2">
        <input type="text" placeholder={placeholder} className="input flex-1" />
        <Button variant="outline" icon={<FolderOpen size={16} />}>
          Browse
        </Button>
      </div>
    </div>
  );
}
