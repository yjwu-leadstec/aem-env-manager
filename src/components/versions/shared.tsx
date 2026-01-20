// Shared components for version management

import { useTranslation } from 'react-i18next';
import { Coffee, Hexagon, ExternalLink, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type * as versionApi from '@/api/version';
import type { TabButtonProps, JavaVersionRowProps, NodeVersionRowProps } from './types';

export function TabButton({ active, onClick, icon, label, badge }: TabButtonProps) {
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

export function ManagerLink({ name, url }: { name: string; url: string }) {
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

export function EmptyVersionState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-6">
      <AlertCircle size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
      <p className="text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{description}</p>
    </div>
  );
}

export function JavaVersionRow({ version, isCurrent, isSwitching, onSwitch }: JavaVersionRowProps) {
  const { t } = useTranslation();
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
                {t('common.current')}
              </span>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400">{version.vendor}</span>
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">{version.path}</span>
        </div>
      </div>
      {!isCurrent && (
        <Button variant="ghost" size="sm" onClick={onSwitch} disabled={isSwitching}>
          {isSwitching ? <RefreshCw size={14} className="animate-spin" /> : t('common.use')}
        </Button>
      )}
    </div>
  );
}

export function NodeVersionRow({ version, isCurrent, isSwitching, onSwitch }: NodeVersionRowProps) {
  const { t } = useTranslation();
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
                {t('common.current')}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-400 dark:text-slate-500">{version.path}</span>
        </div>
      </div>
      {!isCurrent && (
        <Button variant="ghost" size="sm" onClick={onSwitch} disabled={isSwitching}>
          {isSwitching ? <RefreshCw size={14} className="animate-spin" /> : t('common.use')}
        </Button>
      )}
    </div>
  );
}

// Version manager display for Java panel
interface VersionManagerListProps {
  managers?: versionApi.VersionManager[];
  emptyMessage: string;
  managerLinks: Array<{ name: string; url: string }>;
  activeColorClass: string;
}

export function VersionManagerList({
  managers,
  emptyMessage,
  managerLinks,
  activeColorClass,
}: VersionManagerListProps) {
  if (!managers || managers.length === 0) {
    return (
      <div className="text-center py-6">
        <AlertCircle size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
        <p className="text-slate-500 dark:text-slate-400 mb-4">{emptyMessage}</p>
        <div className="flex justify-center gap-2">
          {managerLinks.map((link) => (
            <ManagerLink key={link.name} name={link.name} url={link.url} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {managers.map((m) => (
        <div
          key={m.id}
          className={`px-3 py-2 rounded-lg flex items-center gap-2 ${
            m.is_active
              ? activeColorClass
              : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
          }`}
        >
          {m.name}
          {m.is_active && <Check size={14} />}
        </div>
      ))}
    </div>
  );
}
