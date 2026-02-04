import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { RefreshCw, ExternalLink } from 'lucide-react';
import * as versionApi from '../../api/version';
import { useActiveProfile } from '../../store';

interface StatusCardProps {
  icon: string;
  iconBgClass: string;
  label: string;
  value: string | number;
  subtext: string;
  isActive?: boolean;
  isLoading?: boolean;
  onClick?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}

function StatusCard({
  icon,
  iconBgClass,
  label,
  value,
  subtext,
  isActive = true,
  isLoading,
  onClick,
  actionLabel,
  onAction,
  t,
}: StatusCardProps) {
  return (
    <div
      className={`panel p-5 ${onClick ? 'cursor-pointer hover:shadow-elevated transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 ${iconBgClass} rounded-xl flex items-center justify-center shadow-soft dark:shadow-none`}
        >
          <span className="text-2xl">{icon}</span>
        </div>
        {isLoading ? (
          <RefreshCw size={14} className="animate-spin text-slate-400 dark:text-gray-500" />
        ) : isActive ? (
          <span className="badge-success text-xs px-2.5 py-1 rounded-full">
            {t('common.active')}
          </span>
        ) : actionLabel && onAction ? (
          <button
            className="text-azure dark:text-tech-orange text-xs font-semibold hover:text-azure-600 dark:hover:text-tech-orange-400 transition-colors flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
          >
            {actionLabel} <ExternalLink size={12} />
          </button>
        ) : null}
      </div>
      <div className="text-slate-500 dark:text-gray-400 text-xs font-semibold uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-gray-100 truncate">
        {isLoading ? '...' : value}
      </div>
      <div className="text-slate-400 dark:text-gray-500 text-sm mt-1 truncate">{subtext}</div>
    </div>
  );
}

interface StatusCardsContainerProps {
  refreshTrigger?: number;
}

export function StatusCards({ refreshTrigger }: StatusCardsContainerProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const activeProfile = useActiveProfile();
  const [versionInfo, setVersionInfo] = useState<versionApi.VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadVersionInfo = useCallback(async () => {
    setIsLoading(true);
    try {
      const info = await versionApi.getAllVersionInfo();
      setVersionInfo(info);
    } catch {
      // Failed to load version info
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVersionInfo();
  }, [loadVersionInfo, refreshTrigger]);

  // Extract Java major version number
  const javaVersion = versionInfo?.java.current;
  const javaDisplay = javaVersion ? javaVersion.split('.')[0] : '--';
  const javaSubtext = versionInfo?.java.current
    ? `${versionInfo.java.current} Corretto`
    : t('dashboard.stats.notDetected');

  // Extract Node major version number
  const nodeVersion = versionInfo?.node.current;
  const nodeDisplay = nodeVersion ? nodeVersion.replace('v', '').split('.')[0] : '--';
  const nodeSubtext = versionInfo?.node.current
    ? `${versionInfo.node.current} LTS`
    : t('dashboard.stats.notDetected');

  // Maven config - prefer profile's maven_config_id over current config name
  const mavenConfigId = activeProfile?.mavenConfigId;
  const mavenName = versionInfo?.maven.current?.name || 'default';
  // Simplify "Current settings.xml" to just "default" for display
  const mavenDisplay = mavenConfigId || (mavenName.startsWith('Current ') ? 'default' : mavenName);
  const mavenPath = versionInfo?.maven.current?.path || '~/.m2/settings.xml';
  const mavenSubtext = mavenPath.split('/').slice(-2).join('/');

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <StatusCard
        icon="☕"
        iconBgClass="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-tech-orange-900/30 dark:to-orange-900/30"
        label="JAVA"
        value={javaDisplay}
        subtext={javaSubtext}
        isActive={!!versionInfo?.java.current}
        isLoading={isLoading}
        onClick={() => navigate('/java')}
        t={t}
      />

      <StatusCard
        icon="📦"
        iconBgClass="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30"
        label="NODE"
        value={nodeDisplay}
        subtext={nodeSubtext}
        isActive={!!versionInfo?.node.current}
        isLoading={isLoading}
        onClick={() => navigate('/node')}
        t={t}
      />

      <StatusCard
        icon="🔧"
        iconBgClass="bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30"
        label="MAVEN"
        value={mavenDisplay}
        subtext={mavenSubtext}
        isActive={!!versionInfo?.maven.current}
        isLoading={isLoading}
        onClick={() => navigate('/maven')}
        t={t}
      />
    </div>
  );
}
