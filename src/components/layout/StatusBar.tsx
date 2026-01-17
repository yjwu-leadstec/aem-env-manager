import { useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive, Clock } from 'lucide-react';
import { useAemInstances, useActiveProfile } from '../../store';

export function StatusBar() {
  const instances = useAemInstances();
  const activeProfile = useActiveProfile();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const runningCount = instances.filter((i) => i.status === 'running').length;
  const totalCount = instances.length;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <footer className="h-10 bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border-t border-white/50 dark:border-slate-700/50 flex items-center justify-between px-4 text-xs text-slate-500 dark:text-slate-400">
      {/* Left Section - Status */}
      <div className="flex items-center gap-4">
        {/* Active Profile */}
        {activeProfile && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="font-medium">{activeProfile.name}</span>
          </div>
        )}

        {/* AEM Instances */}
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-azure-500" />
          <span>
            {runningCount}/{totalCount} 个实例
          </span>
        </div>
      </div>

      {/* Center - Quick Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Cpu size={12} className="text-warning-500" />
          <span>Java: {activeProfile?.javaVersion || '未设置'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <HardDrive size={12} className="text-teal-500" />
          <span>Node: {activeProfile?.nodeVersion || '未设置'}</span>
        </div>
      </div>

      {/* Right Section - Time & Version */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span>{formatTime(currentTime)}</span>
        </div>
        <span className="text-slate-400 dark:text-slate-500 font-medium">v0.1.0</span>
      </div>
    </footer>
  );
}
