import { RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useActiveProfile, useIsLoading } from '../../store';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageSwitcher } from '../common/LanguageSwitcher';
import { UpdateBadge, UpdateDialog } from '../common';
import { useUpdate } from '@/hooks';

export function Header() {
  const activeProfile = useActiveProfile();
  const isLoading = useIsLoading();
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const { available, updateInfo, downloading, installing, downloadProgress, installUpdate } =
    useUpdate();

  const handleOpenUpdateDialog = () => {
    setShowUpdateDialog(true);
  };

  const handleCloseUpdateDialog = () => {
    setShowUpdateDialog(false);
  };

  const handleLater = () => {
    setShowUpdateDialog(false);
    // Keep the badge visible - user can check later
  };

  const handleInstallNow = async () => {
    await installUpdate();
  };

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

        {/* Update Badge */}
        <UpdateBadge hasUpdate={available} onClick={handleOpenUpdateDialog} />

        {/* Language Switcher */}
        <LanguageSwitcher />

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>

      {/* Update Dialog */}
      <UpdateDialog
        isOpen={showUpdateDialog}
        onClose={handleCloseUpdateDialog}
        updateInfo={updateInfo}
        downloading={downloading}
        installing={installing}
        downloadProgress={downloadProgress}
        onLater={handleLater}
        onInstallNow={handleInstallNow}
      />
    </header>
  );
}
