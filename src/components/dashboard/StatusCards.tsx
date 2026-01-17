import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, ExternalLink } from 'lucide-react';
import * as versionApi from '../../api/version';

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
}: StatusCardProps) {
  return (
    <div
      className={`panel p-5 ${onClick ? 'cursor-pointer hover:shadow-elevated transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 ${iconBgClass} rounded-xl flex items-center justify-center shadow-soft`}
        >
          <span className="text-2xl">{icon}</span>
        </div>
        {isLoading ? (
          <RefreshCw size={14} className="animate-spin text-slate-400" />
        ) : isActive ? (
          <span className="badge-success text-xs px-2.5 py-1 rounded-full">Active</span>
        ) : actionLabel && onAction ? (
          <button
            className="text-azure text-xs font-semibold hover:text-azure-600 transition-colors flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              onAction();
            }}
          >
            {actionLabel} <ExternalLink size={12} />
          </button>
        ) : null}
      </div>
      <div className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="text-3xl font-bold text-slate-900 dark:text-slate-100 truncate">
        {isLoading ? '...' : value}
      </div>
      <div className="text-slate-400 dark:text-slate-500 text-sm mt-1 truncate">{subtext}</div>
    </div>
  );
}

export function StatusCards() {
  const navigate = useNavigate();
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
  }, [loadVersionInfo]);

  // Extract Java major version number
  const javaVersion = versionInfo?.java.current;
  const javaDisplay = javaVersion ? javaVersion.split('.')[0] : '--';
  const javaSubtext = versionInfo?.java.current
    ? `${versionInfo.java.current} Corretto`
    : '未检测到';

  // Extract Node major version number
  const nodeVersion = versionInfo?.node.current;
  const nodeDisplay = nodeVersion ? nodeVersion.replace('v', '').split('.')[0] : '--';
  const nodeSubtext = versionInfo?.node.current ? `${versionInfo.node.current} LTS` : '未检测到';

  // Maven config
  const mavenDisplay = versionInfo?.maven.current?.name || 'default';
  const mavenSubtext = versionInfo?.maven.current?.path
    ? versionInfo.maven.current.path.split('/').pop() || 'settings.xml'
    : 'settings.xml';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <StatusCard
        icon="☕"
        iconBgClass="bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30"
        label="Java"
        value={javaDisplay}
        subtext={javaSubtext}
        isActive={!!versionInfo?.java.current}
        isLoading={isLoading}
        onClick={() => navigate('/java')}
      />

      <StatusCard
        icon="📦"
        iconBgClass="bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30"
        label="Node"
        value={nodeDisplay}
        subtext={nodeSubtext}
        isActive={!!versionInfo?.node.current}
        isLoading={isLoading}
        onClick={() => navigate('/node')}
      />

      <StatusCard
        icon="🔧"
        iconBgClass="bg-gradient-to-br from-sky-100 to-blue-100 dark:from-sky-900/30 dark:to-blue-900/30"
        label="Maven"
        value={mavenDisplay}
        subtext={mavenSubtext}
        isActive={!!versionInfo?.maven.current}
        isLoading={isLoading}
        onClick={() => navigate('/maven')}
      />

      <StatusCard
        icon="📁"
        iconBgClass="bg-gradient-to-br from-yellow-100 to-amber-100 dark:from-yellow-900/30 dark:to-amber-900/30"
        label="项目"
        value="project-a"
        subtext="~/projects/aem-cloud"
        isActive={false}
        actionLabel="打开 →"
        onAction={() => {
          /* Open project folder */
        }}
      />
    </div>
  );
}
