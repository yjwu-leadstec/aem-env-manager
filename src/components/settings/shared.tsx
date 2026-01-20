// Shared components for settings pages

import { FolderOpen } from 'lucide-react';
import { Button } from '@/components/common/Button';
import type {
  SettingsNavItemProps,
  ThemeButtonProps,
  ToggleSettingProps,
  PathInputSingleProps,
} from './types';

export function SettingsNavItem({ icon, label, active, onClick }: SettingsNavItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors ${
        active
          ? 'bg-primary/10 text-primary font-medium'
          : 'text-slate-600 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function ThemeButton({ icon, label, active, onClick }: ThemeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-primary/20 text-primary'
          : 'bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-black/10 dark:hover:bg-white/10'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

export function ToggleSetting({ icon, title, description, enabled, onChange }: ToggleSettingProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5 text-slate-600 dark:text-slate-400">
          {icon}
        </div>
        <div>
          <p className="font-medium text-slate-700 dark:text-slate-300">{title}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative inline-flex h-7 w-12 flex-shrink-0 items-center rounded-full transition-colors ${
          enabled ? 'bg-azure-500 dark:bg-tech-orange-500' : 'bg-slate-300 dark:bg-slate-600'
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export function PathInputSingle({
  label,
  value,
  placeholder,
  onChange,
  onBrowse,
  browseLabel = 'Browse',
}: PathInputSingleProps) {
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
          {browseLabel}
        </Button>
      </div>
    </div>
  );
}
