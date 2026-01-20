import { ExternalLink } from 'lucide-react';

interface QuickLinkProps {
  label: string;
  path: string;
}

export function QuickLink({ label, path }: QuickLinkProps) {
  const handleClick = async () => {
    // Copy path to clipboard for user convenience
    try {
      await window.navigator.clipboard.writeText(path);
    } catch {
      // Fallback for older browsers
    }
  };

  return (
    <button
      onClick={handleClick}
      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-azure-50 dark:hover:bg-azure-900/30 hover:text-azure-600 dark:hover:text-azure-400 transition-colors text-sm"
      title={`Copy path: ${path}`}
    >
      {label}
      <ExternalLink size={12} />
    </button>
  );
}
