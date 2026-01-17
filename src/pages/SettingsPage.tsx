import { useState, useEffect, useCallback } from 'react';
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
  X,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useConfig, useAppStore } from '@/store';
import type { AppConfig } from '@/types';
import * as settingsApi from '@/api/settings';

type SettingsTab = 'general' | 'paths' | 'data';

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          <span className="mr-2">⚙️</span>设置
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">配置应用程序偏好设置</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 space-y-1">
          <SettingsNavItem
            icon={<Settings size={18} />}
            label="通用"
            active={activeTab === 'general'}
            onClick={() => setActiveTab('general')}
          />
          <SettingsNavItem
            icon={<FolderOpen size={18} />}
            label="路径"
            active={activeTab === 'paths'}
            onClick={() => setActiveTab('paths')}
          />
          <SettingsNavItem
            icon={<Database size={18} />}
            label="数据"
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
        active
          ? 'bg-azure-50 dark:bg-azure-900/30 text-azure-700 dark:text-azure-400 font-medium'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
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
      title: '主题已更新',
      message: `已切换到${theme === 'light' ? '浅色' : theme === 'dark' ? '深色' : '系统'}模式`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Appearance */}
      <Card>
        <CardHeader title="外观" subtitle="自定义应用程序外观" />
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-700 dark:text-slate-300">主题</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">选择您喜欢的配色方案</p>
            </div>
            <div className="flex gap-2">
              <ThemeButton
                icon={<Sun size={16} />}
                label="浅色"
                active={config.theme === 'light'}
                onClick={() => handleThemeChange('light')}
              />
              <ThemeButton
                icon={<Moon size={16} />}
                label="深色"
                active={config.theme === 'dark'}
                onClick={() => handleThemeChange('dark')}
              />
              <ThemeButton
                icon={<Monitor size={16} />}
                label="系统"
                active={config.theme === 'system'}
                onClick={() => handleThemeChange('system')}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader title="通知" subtitle="配置提醒偏好设置" />
        <CardContent className="space-y-4">
          <ToggleSetting
            icon={<Bell size={18} />}
            title="显示通知"
            description="为重要事件显示桌面通知"
            enabled={config.showNotifications}
            onChange={(enabled) => updateConfig({ showNotifications: enabled })}
          />
        </CardContent>
      </Card>

      {/* Behavior */}
      <Card>
        <CardHeader title="行为" subtitle="应用程序行为设置" />
        <CardContent className="space-y-4">
          <ToggleSetting
            icon={<Settings size={18} />}
            title="自动切换配置"
            description="选择配置文件时自动切换环境"
            enabled={config.autoSwitchProfile}
            onChange={(enabled) => updateConfig({ autoSwitchProfile: enabled })}
          />
          <ToggleSetting
            icon={<Monitor size={18} />}
            title="启动时最小化"
            description="启动应用程序时最小化到系统托盘"
            enabled={config.startMinimized}
            onChange={(enabled) => updateConfig({ startMinimized: enabled })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function PathsSettings() {
  const addNotification = useAppStore((s) => s.addNotification);
  const [scanPaths, setScanPaths] = useState<settingsApi.ScanPaths | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Load scan paths on mount
  useEffect(() => {
    const loadPaths = async () => {
      try {
        const paths = await settingsApi.loadScanPaths();
        setScanPaths(paths);
      } catch (error) {
        addNotification({
          type: 'error',
          title: '加载失败',
          message: error instanceof Error ? error.message : '未知错误',
        });
      } finally {
        setIsLoading(false);
      }
    };
    loadPaths();
  }, [addNotification]);

  const handleSave = useCallback(async () => {
    if (!scanPaths) return;

    setIsSaving(true);
    try {
      await settingsApi.saveScanPaths(scanPaths);
      addNotification({
        type: 'success',
        title: '保存成功',
        message: '扫描路径配置已保存',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: '保存失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsSaving(false);
    }
  }, [scanPaths, addNotification]);

  const handleBrowseFolder = async (
    field: 'maven_home' | 'aem_base_dir' | 'logs_dir',
    title: string
  ) => {
    const path = await settingsApi.selectFolder(title);
    if (path && scanPaths) {
      setScanPaths({ ...scanPaths, [field]: path });
    }
  };

  const handleUpdateArrayPath = (
    field: 'java_paths' | 'node_paths',
    index: number,
    value: string
  ) => {
    if (!scanPaths) return;
    const newPaths = [...scanPaths[field]];
    newPaths[index] = value;
    setScanPaths({ ...scanPaths, [field]: newPaths });
  };

  const handleAddPath = (field: 'java_paths' | 'node_paths') => {
    if (!scanPaths) return;
    setScanPaths({
      ...scanPaths,
      [field]: [...scanPaths[field], ''],
    });
  };

  const handleRemovePath = (field: 'java_paths' | 'node_paths', index: number) => {
    if (!scanPaths) return;
    const newPaths = scanPaths[field].filter((_, i) => i !== index);
    setScanPaths({ ...scanPaths, [field]: newPaths });
  };

  const handleBrowseArrayPath = async (
    field: 'java_paths' | 'node_paths',
    index: number,
    title: string
  ) => {
    const path = await settingsApi.selectFolder(title);
    if (path && scanPaths) {
      handleUpdateArrayPath(field, index, path);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-azure"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="扫描目录" subtitle="搜索 Java 和 Node 安装的目录" />
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Java 扫描路径
            </label>
            <div className="space-y-2">
              {scanPaths?.java_paths.map((path, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => handleUpdateArrayPath('java_paths', index, e.target.value)}
                    className="input flex-1"
                    placeholder="/usr/lib/jvm"
                  />
                  <Button
                    variant="outline"
                    icon={<FolderOpen size={16} />}
                    onClick={() => handleBrowseArrayPath('java_paths', index, '选择 Java 目录')}
                  />
                  <Button
                    variant="ghost"
                    icon={<X size={16} />}
                    onClick={() => handleRemovePath('java_paths', index)}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddPath('java_paths')}
                className="mt-2"
              >
                添加路径
              </Button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Node 扫描路径
            </label>
            <div className="space-y-2">
              {scanPaths?.node_paths.map((path, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={path}
                    onChange={(e) => handleUpdateArrayPath('node_paths', index, e.target.value)}
                    className="input flex-1"
                    placeholder="~/.nvm/versions/node"
                  />
                  <Button
                    variant="outline"
                    icon={<FolderOpen size={16} />}
                    onClick={() => handleBrowseArrayPath('node_paths', index, '选择 Node 目录')}
                  />
                  <Button
                    variant="ghost"
                    icon={<X size={16} />}
                    onClick={() => handleRemovePath('node_paths', index)}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAddPath('node_paths')}
                className="mt-2"
              >
                添加路径
              </Button>
            </div>
          </div>

          <PathInputSingle
            label="Maven 主目录"
            value={scanPaths?.maven_home || ''}
            placeholder="~/.m2"
            onChange={(value) => scanPaths && setScanPaths({ ...scanPaths, maven_home: value })}
            onBrowse={() => handleBrowseFolder('maven_home', '选择 Maven 目录')}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="AEM 目录" subtitle="AEM 安装的默认路径" />
        <CardContent className="space-y-4">
          <PathInputSingle
            label="AEM 基础目录"
            value={scanPaths?.aem_base_dir || ''}
            placeholder="/opt/aem"
            onChange={(value) => scanPaths && setScanPaths({ ...scanPaths, aem_base_dir: value })}
            onBrowse={() => handleBrowseFolder('aem_base_dir', '选择 AEM 目录')}
          />
          <PathInputSingle
            label="日志目录"
            value={scanPaths?.logs_dir || ''}
            placeholder="/var/log/aem"
            onChange={(value) => scanPaths && setScanPaths({ ...scanPaths, logs_dir: value })}
            onBrowse={() => handleBrowseFolder('logs_dir', '选择日志目录')}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          icon={isSaving ? undefined : <Check size={16} />}
        >
          {isSaving ? '保存中...' : '保存设置'}
        </Button>
      </div>
    </div>
  );
}

function DataSettings() {
  const addNotification = useAppStore((s) => s.addNotification);
  const reset = useAppStore((s) => s.reset);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await settingsApi.exportConfiguration();
      if (result.success) {
        addNotification({
          type: 'success',
          title: '导出成功',
          message: `已导出 ${result.profiles_count} 个配置文件和 ${result.instances_count} 个实例`,
        });
      } else if (result.error !== '操作已取消') {
        addNotification({
          type: 'error',
          title: '导出失败',
          message: result.error || '未知错误',
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: '导出失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    setIsImporting(true);
    try {
      const result = await settingsApi.importConfiguration();
      if (result.success) {
        addNotification({
          type: 'success',
          title: '导入成功',
          message: `已导入 ${result.profiles_imported} 个配置文件和 ${result.instances_imported} 个实例`,
        });
        // Reload the page to reflect imported data
        window.location.reload();
      } else if (result.errors[0] !== '操作已取消') {
        addNotification({
          type: 'error',
          title: '导入失败',
          message: result.errors.join('; '),
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: '导入失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = async () => {
    setIsResetting(true);
    try {
      const result = await settingsApi.resetAllConfiguration();
      if (result.success) {
        // Reset local store
        reset();
        addNotification({
          type: 'success',
          title: '重置成功',
          message: `已删除 ${result.profiles_deleted} 个配置文件和 ${result.instances_deleted} 个实例`,
        });
        setShowResetConfirm(false);
        // Reload the page to reflect reset state
        window.location.reload();
      } else {
        addNotification({
          type: 'error',
          title: '重置失败',
          message: result.error || '未知错误',
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: '重置失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="导出 / 导入" subtitle="备份和恢复您的配置" />
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <Button
              variant="outline"
              icon={<Download size={16} />}
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? '导出中...' : '导出配置'}
            </Button>
            <Button
              variant="outline"
              icon={<Upload size={16} />}
              onClick={handleImport}
              disabled={isImporting}
            >
              {isImporting ? '导入中...' : '导入配置'}
            </Button>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            导出包含所有配置文件、实例和设置。敏感数据如密码会被加密。
          </p>
        </CardContent>
      </Card>

      <Card className="border-error-200 dark:border-error-800">
        <CardHeader title="危险区域" subtitle="不可逆的操作" />
        <CardContent>
          <div className="flex items-center justify-between p-4 bg-error-50 dark:bg-error-900/30 rounded-lg">
            <div>
              <p className="font-medium text-error-700 dark:text-error-400">重置所有设置</p>
              <p className="text-sm text-error-600 dark:text-error-500">
                这将删除所有配置文件、实例并重置为默认值
              </p>
            </div>
            <Button
              variant="danger"
              icon={<RotateCcw size={16} />}
              onClick={() => setShowResetConfirm(true)}
            >
              重置
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="p-3 rounded-full bg-error-100 dark:bg-error-900/50">
                  <AlertTriangle size={24} className="text-error-600 dark:text-error-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    确认重置
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">此操作不可撤销</p>
                </div>
              </div>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                您确定要重置所有设置吗？这将删除所有配置文件、AEM
                实例配置和应用程序设置。此操作无法恢复。
              </p>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowResetConfirm(false)}>
                  取消
                </Button>
                <Button variant="danger" onClick={handleReset} disabled={isResetting}>
                  {isResetting ? '重置中...' : '确认重置'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
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
        active
          ? 'bg-azure-100 dark:bg-azure-900/50 text-azure-700 dark:text-azure-400'
          : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
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
        <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
          {icon}
        </div>
        <div>
          <p className="font-medium text-slate-700 dark:text-slate-300">{title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${
          enabled ? 'bg-azure' : 'bg-slate-300 dark:bg-slate-600'
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

interface PathInputSingleProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onBrowse: () => void;
}

function PathInputSingle({ label, value, placeholder, onChange, onBrowse }: PathInputSingleProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
        {label}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="input flex-1"
        />
        <Button variant="outline" icon={<FolderOpen size={16} />} onClick={onBrowse}>
          浏览
        </Button>
      </div>
    </div>
  );
}
