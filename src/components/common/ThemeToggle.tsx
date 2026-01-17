import { Sun, Moon, Monitor } from 'lucide-react';
import { useConfig, useAppStore } from '../../store';

type Theme = 'light' | 'dark' | 'system';

export function ThemeToggle() {
  const config = useConfig();
  const updateConfig = useAppStore((s) => s.updateConfig);

  const setTheme = (theme: Theme) => {
    updateConfig({ theme });
    applyTheme(theme);
  };

  return (
    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
      <ThemeButton
        isActive={config.theme === 'light'}
        onClick={() => setTheme('light')}
        icon={<Sun size={14} />}
        title="浅色模式"
      />
      <ThemeButton
        isActive={config.theme === 'dark'}
        onClick={() => setTheme('dark')}
        icon={<Moon size={14} />}
        title="深色模式"
      />
      <ThemeButton
        isActive={config.theme === 'system'}
        onClick={() => setTheme('system')}
        icon={<Monitor size={14} />}
        title="跟随系统"
      />
    </div>
  );
}

interface ThemeButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
}

function ThemeButton({ isActive, onClick, icon, title }: ThemeButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`
        p-1.5 rounded-md transition-colors
        ${
          isActive
            ? 'bg-white dark:bg-slate-600 text-azure shadow-soft'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
        }
      `}
    >
      {icon}
    </button>
  );
}

/**
 * Apply theme to document
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  if (theme === 'dark' || (theme === 'system' && systemDark)) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

/**
 * Initialize theme on app load
 */
export function initializeTheme(theme: Theme) {
  applyTheme(theme);

  // Listen for system theme changes when using 'system' mode
  if (theme === 'system') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }
}
