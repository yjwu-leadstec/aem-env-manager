// Settings component types

export type SettingsTab = 'general' | 'paths' | 'data' | 'updates';

export interface SettingsNavItemProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

export interface ThemeButtonProps {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}

export interface ToggleSettingProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}

export interface PathInputSingleProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onBrowse: () => void;
  browseLabel?: string;
}
