import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { Settings, FolderOpen, Database, Download } from 'lucide-react';
import {
  SettingsNavItem,
  GeneralSettings,
  PathsSettings,
  DataSettings,
  UpdateSettings,
} from '@/components/settings';
import type { SettingsTab } from '@/components/settings';

const validTabs: SettingsTab[] = ['general', 'paths', 'data', 'updates'];

export function SettingsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Get tab from URL parameter, default to 'general'
  const tabFromUrl = searchParams.get('tab') as SettingsTab | null;
  const initialTab = tabFromUrl && validTabs.includes(tabFromUrl) ? tabFromUrl : 'general';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Sync URL with active tab
  useEffect(() => {
    const currentTabInUrl = searchParams.get('tab');
    if (currentTabInUrl !== activeTab) {
      setSearchParams({ tab: activeTab }, { replace: true });
    }
  }, [activeTab, searchParams, setSearchParams]);

  // Handle tab change
  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          <span className="mr-2">⚙️</span>
          {t('settings.title')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">{t('settings.subtitle')}</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 space-y-1">
          <SettingsNavItem
            icon={<Settings size={18} />}
            label={t('settings.tabs.general')}
            active={activeTab === 'general'}
            onClick={() => handleTabChange('general')}
          />
          <SettingsNavItem
            icon={<FolderOpen size={18} />}
            label={t('settings.tabs.paths')}
            active={activeTab === 'paths'}
            onClick={() => handleTabChange('paths')}
          />
          <SettingsNavItem
            icon={<Database size={18} />}
            label={t('settings.tabs.data')}
            active={activeTab === 'data'}
            onClick={() => handleTabChange('data')}
          />
          <SettingsNavItem
            icon={<Download size={18} />}
            label={t('settings.tabs.updates')}
            active={activeTab === 'updates'}
            onClick={() => handleTabChange('updates')}
          />
        </div>

        {/* Content */}
        <div className="flex-1">
          {activeTab === 'general' && <GeneralSettings />}
          {activeTab === 'paths' && <PathsSettings />}
          {activeTab === 'data' && <DataSettings />}
          {activeTab === 'updates' && <UpdateSettings />}
        </div>
      </div>
    </div>
  );
}
