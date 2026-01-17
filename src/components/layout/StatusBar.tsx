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
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <footer className="h-8 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 text-xs text-slate-500 dark:text-slate-400">
      {/* Left Section - Status */}
      <div className="flex items-center gap-4">
        {/* Active Profile */}
        {activeProfile && (
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <span>{activeProfile.name}</span>
          </div>
        )}

        {/* AEM Instances */}
        <div className="flex items-center gap-1.5">
          <Activity size={12} />
          <span>
            {runningCount}/{totalCount} instances
          </span>
        </div>
      </div>

      {/* Center - Quick Stats */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Cpu size={12} />
          <span>Java: {activeProfile?.javaVersion || 'N/A'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <HardDrive size={12} />
          <span>Node: {activeProfile?.nodeVersion || 'N/A'}</span>
        </div>
      </div>

      {/* Right Section - Time & Version */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span>{formatTime(currentTime)}</span>
        </div>
        <span className="text-slate-400 dark:text-slate-500">v0.1.0</span>
      </div>
    </footer>
  );
}
