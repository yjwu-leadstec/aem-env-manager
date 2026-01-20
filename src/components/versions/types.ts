// Shared types for version management components

import type * as versionApi from '@/api/version';

export type TabType = 'java' | 'node' | 'maven' | 'licenses';

export const validTabs: TabType[] = ['java', 'node', 'maven', 'licenses'];

export interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}

export interface JavaPanelProps {
  javaInfo?: versionApi.VersionInfo['java'];
  onRefresh: () => void;
}

export interface NodePanelProps {
  nodeInfo?: versionApi.VersionInfo['node'];
  onRefresh: () => void;
}

export interface MavenPanelProps {
  mavenInfo?: versionApi.VersionInfo['maven'];
  onRefresh: () => void;
}

export interface JavaVersionRowProps {
  version: versionApi.JavaVersion;
  isCurrent: boolean;
  isSwitching: boolean;
  onSwitch: () => void;
}

export interface NodeVersionRowProps {
  version: versionApi.NodeVersion;
  isCurrent: boolean;
  isSwitching: boolean;
  onSwitch: () => void;
}

export interface LicensesPanelProps {
  onLicensesChange?: () => void;
}
