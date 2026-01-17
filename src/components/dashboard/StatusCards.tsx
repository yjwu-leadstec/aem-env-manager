import { useState, useEffect } from 'react';
import { Coffee, Hexagon, FileCode, Folder, RefreshCw } from 'lucide-react';
import { Card } from '../common/Card';
import * as versionApi from '../../api/version';

interface StatusCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
  isLoading?: boolean;
  onClick?: () => void;
}

function StatusCard({ icon, label, value, subtext, isLoading, onClick }: StatusCardProps) {
  return (
    <Card className={onClick ? 'cursor-pointer' : ''} hover={!!onClick} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-700">{icon}</div>
        {isLoading && <RefreshCw size={14} className="animate-spin text-slate-400" />}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 truncate">
          {isLoading ? '...' : value}
        </p>
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300 mt-1">{label}</p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtext}</p>
      </div>
    </Card>
  );
}

interface StatusCardsProps {
  onCardClick?: (type: 'java' | 'node' | 'maven' | 'project') => void;
}

export function StatusCards({ onCardClick }: StatusCardsProps) {
  const [versionInfo, setVersionInfo] = useState<versionApi.VersionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadVersionInfo();
  }, []);

  const loadVersionInfo = async () => {
    setIsLoading(true);
    try {
      const info = await versionApi.getAllVersionInfo();
      setVersionInfo(info);
    } catch (error) {
      console.error('Failed to load version info:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const javaValue = versionInfo?.java.current || 'Not detected';
  const nodeValue = versionInfo?.node.current || 'Not detected';
  const mavenValue = versionInfo?.maven.current?.name || 'Default';

  const javaSubtext = versionInfo
    ? `${versionInfo.java.versions.length} versions available`
    : 'Loading...';

  const nodeSubtext = versionInfo
    ? `${versionInfo.node.versions.length} versions available`
    : 'Loading...';

  const mavenSubtext = versionInfo
    ? `${versionInfo.maven.configs.length} configurations`
    : 'Loading...';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatusCard
        icon={<Coffee className="text-warning-500" size={20} />}
        label="Java Version"
        value={javaValue}
        subtext={javaSubtext}
        isLoading={isLoading}
        onClick={() => onCardClick?.('java')}
      />

      <StatusCard
        icon={<Hexagon className="text-success-500" size={20} />}
        label="Node Version"
        value={nodeValue}
        subtext={nodeSubtext}
        isLoading={isLoading}
        onClick={() => onCardClick?.('node')}
      />

      <StatusCard
        icon={<FileCode className="text-azure-500" size={20} />}
        label="Maven Config"
        value={mavenValue}
        subtext={mavenSubtext}
        isLoading={isLoading}
        onClick={() => onCardClick?.('maven')}
      />

      <StatusCard
        icon={<Folder className="text-teal-500" size={20} />}
        label="Project Directory"
        value="Not set"
        subtext="No active project"
        onClick={() => onCardClick?.('project')}
      />
    </div>
  );
}
