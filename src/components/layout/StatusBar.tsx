import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Cpu, HardDrive, Clock } from 'lucide-react';
import { useActiveProfile } from '../../store';
import { useAppVersion } from '../../hooks';
import * as versionApi from '../../api/version';

export function StatusBar() {
  const { t, i18n } = useTranslation();
  const activeProfile = useActiveProfile();
  const appVersion = useAppVersion();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [javaVersion, setJavaVersion] = useState<string | null>(null);
  const [nodeVersion, setNodeVersion] = useState<string | null>(null);

  // Fetch actual system versions
  const loadVersionInfo = useCallback(async () => {
    try {
      const info = await versionApi.getAllVersionInfo();
      setJavaVersion(info.java.current ? info.java.current.split('.')[0] : null);
      setNodeVersion(info.node.current || null);
    } catch {
      // Failed to load, keep null
    }
  }, []);

  // Load versions on mount and when profile changes
  useEffect(() => {
    loadVersionInfo();
  }, [loadVersionInfo, activeProfile?.id]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    const locale = i18n.language === 'en' ? 'en-US' : i18n.language === 'zh-TW' ? 'zh-TW' : 'zh-CN';
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <footer className="h-10 bg-white/70 dark:bg-charcoal backdrop-blur-xl dark:backdrop-blur-none border-t border-white/50 dark:border-border flex items-center justify-between px-4 text-xs text-slate-500 dark:text-gray-400">
      {/* Left Section - Status */}
      <div className="flex items-center gap-4">
        {/* Active Profile */}
        {activeProfile && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="font-medium">{activeProfile.name}</span>
          </div>
        )}
      </div>

      {/* Center - Quick Stats (shows actual system versions) */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Cpu size={12} className="text-warning-500" />
          <span>Java: {javaVersion || t('statusBar.notSet')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <HardDrive size={12} className="text-teal-500 dark:text-tech-orange-400" />
          <span>Node: {nodeVersion || t('statusBar.notSet')}</span>
        </div>
      </div>

      {/* Right Section - Time & Version */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span>{formatTime(currentTime)}</span>
        </div>
        <span className="text-slate-400 dark:text-gray-500 font-medium">v{appVersion}</span>
      </div>
    </footer>
  );
}
