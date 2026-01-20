import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Coffee, Hexagon, FileCode, RefreshCw, Key } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useAppStore } from '@/store';
import * as versionApi from '@/api/version';
import * as licenseApi from '@/api/license';
import {
  TabButton,
  JavaVersionsPanel,
  NodeVersionsPanel,
  MavenConfigPanel,
  LicensesPanel,
  validTabs,
  type TabType,
} from '@/components/versions';

export function VersionsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get tab from URL parameter, default to 'java'
  const tabFromUrl = searchParams.get('tab') as TabType | null;
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'java';
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [isScanning, setIsScanning] = useState(false);
  const [versionInfo, setVersionInfo] = useState<versionApi.VersionInfo | null>(null);
  const [licenseCount, setLicenseCount] = useState<number>(0);
  const addNotification = useAppStore((s) => s.addNotification);

  const loadVersionInfo = useCallback(async () => {
    setIsScanning(true);
    try {
      const info = await versionApi.getAllVersionInfo();
      setVersionInfo(info);
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('versions.notifications.loadFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsScanning(false);
    }
  }, [addNotification, t]);

  // Load license count for tab badge
  const loadLicenseCount = useCallback(async () => {
    try {
      const stats = await licenseApi.getLicenseStatistics();
      setLicenseCount(stats.total);
    } catch (error) {
      console.error('Failed to load license count:', error);
    }
  }, []);

  useEffect(() => {
    loadVersionInfo();
    loadLicenseCount();
  }, [loadVersionInfo, loadLicenseCount]);

  // Sync URL with active tab
  useEffect(() => {
    const currentTabInUrl = searchParams.get('tab');
    if (currentTabInUrl !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Handle tab change - update both state and URL
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            <span className="mr-2">🔧</span>
            {t('versions.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('versions.subtitle')}</p>
        </div>
        <Button
          variant="outline"
          icon={
            isScanning ? <RefreshCw size={16} className="animate-spin" /> : <RefreshCw size={16} />
          }
          onClick={loadVersionInfo}
          disabled={isScanning}
        >
          {t('versions.scan')}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-700">
        <TabButton
          active={activeTab === 'java'}
          onClick={() => handleTabChange('java')}
          icon={<Coffee size={18} />}
          label={t('nav.java')}
          badge={versionInfo?.java.versions.length}
        />
        <TabButton
          active={activeTab === 'node'}
          onClick={() => handleTabChange('node')}
          icon={<Hexagon size={18} />}
          label={t('nav.node')}
          badge={versionInfo?.node.versions.length}
        />
        <TabButton
          active={activeTab === 'maven'}
          onClick={() => handleTabChange('maven')}
          icon={<FileCode size={18} />}
          label={t('nav.maven')}
          badge={versionInfo?.maven.configs.length}
        />
        <TabButton
          active={activeTab === 'licenses'}
          onClick={() => handleTabChange('licenses')}
          icon={<Key size={18} />}
          label={t('nav.licenses')}
          badge={licenseCount || undefined}
        />
      </div>

      {/* Content */}
      {isScanning && !versionInfo && activeTab !== 'licenses' ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={32} className="animate-spin text-azure" />
        </div>
      ) : activeTab === 'java' ? (
        <JavaVersionsPanel javaInfo={versionInfo?.java} onRefresh={loadVersionInfo} />
      ) : activeTab === 'node' ? (
        <NodeVersionsPanel nodeInfo={versionInfo?.node} onRefresh={loadVersionInfo} />
      ) : activeTab === 'maven' ? (
        <MavenConfigPanel mavenInfo={versionInfo?.maven} onRefresh={loadVersionInfo} />
      ) : (
        <LicensesPanel onLicensesChange={loadLicenseCount} />
      )}
    </div>
  );
}
