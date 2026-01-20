import { RefreshCw } from 'lucide-react';
import { useActiveProfile, useIsLoading } from '../../store';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageSwitcher } from '../common/LanguageSwitcher';

export function Header() {
  const activeProfile = useActiveProfile();
  const isLoading = useIsLoading();

  return (
    <header className="relative z-50 h-16 bg-white/70 dark:bg-viewport backdrop-blur-xl dark:backdrop-blur-none border-b border-white/50 dark:border-border flex items-center justify-between px-6">
      {/* Left spacer */}
      <div className="flex-1" />

      {/* Right Section */}
      <div className="flex items-center gap-4">
        {/* Active Profile Badge */}
        {activeProfile && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-azure-50/80 dark:bg-tech-orange-500/20 backdrop-blur rounded-full">
            <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
            <span className="text-sm font-medium text-azure-700 dark:text-tech-orange-400">
              {activeProfile.name}
            </span>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <RefreshCw size={20} className="text-azure dark:text-tech-orange animate-spin" />
        )}

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  );
}
