/**
 * UpdateDialog Component
 *
 * Modal dialog for displaying update information and controlling the update process.
 * Shows version info, release notes, download progress, and action buttons.
 */

import { X, Download, Clock, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import type { UpdateInfo } from '@/api/update';

interface UpdateDialogProps {
  /** Whether dialog is open */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Update information */
  updateInfo: UpdateInfo | null;
  /** Whether currently downloading */
  downloading: boolean;
  /** Whether currently installing */
  installing: boolean;
  /** Download progress (0-100) */
  downloadProgress: number;
  /** Handler for "Later" button */
  onLater: () => void;
  /** Handler for "Install Now" button */
  onInstallNow: () => void;
}

export function UpdateDialog({
  isOpen,
  onClose,
  updateInfo,
  downloading,
  installing,
  downloadProgress,
  onLater,
  onInstallNow,
}: UpdateDialogProps) {
  const { t } = useTranslation();

  if (!isOpen || !updateInfo) return null;

  const isProcessing = downloading || installing;

  // Format release date
  const releaseDate = updateInfo.date
    ? new Date(updateInfo.date).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={!isProcessing ? onClose : undefined} />

      {/* Dialog */}
      <div className="relative w-full max-w-lg panel mx-4 p-0 overflow-hidden">
        {/* Close button */}
        {!isProcessing && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors z-10"
          >
            <X size={20} className="text-slate-500" />
          </button>
        )}

        {/* Header */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-azure-50 dark:bg-azure-900/30 flex items-center justify-center">
              <Sparkles size={20} className="text-azure-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{t('update.dialog.title')}</h2>
              {releaseDate && (
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock size={12} />
                  {releaseDate}
                </p>
              )}
            </div>
          </div>

          {/* Version info */}
          <div className="flex items-center gap-2 text-sm mb-4">
            <span className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              v{updateInfo.currentVersion}
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-2 py-1 rounded bg-azure-50 dark:bg-azure-900/30 text-azure-600 dark:text-azure-400 font-medium">
              v{updateInfo.version}
            </span>
          </div>
        </div>

        {/* Release notes */}
        {updateInfo.body && (
          <div className="px-6 pb-4">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {t('update.dialog.releaseNotes')}
            </h3>
            <div className="max-h-48 overflow-y-auto rounded-lg bg-slate-50 dark:bg-slate-800/50 p-4 text-sm text-slate-600 dark:text-slate-400">
              <div className="prose prose-sm dark:prose-invert prose-slate max-w-none">
                {/* Simple markdown-like rendering */}
                {updateInfo.body.split('\n').map((line, i) => {
                  // Handle bullet points
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                    return (
                      <p key={i} className="flex items-start gap-2 mb-1">
                        <span className="text-azure-500 mt-1">•</span>
                        <span>{line.slice(2)}</span>
                      </p>
                    );
                  }
                  // Handle headers
                  if (line.startsWith('## ')) {
                    return (
                      <p
                        key={i}
                        className="font-semibold text-slate-700 dark:text-slate-300 mt-3 mb-1"
                      >
                        {line.slice(3)}
                      </p>
                    );
                  }
                  if (line.startsWith('### ')) {
                    return (
                      <p
                        key={i}
                        className="font-medium text-slate-600 dark:text-slate-400 mt-2 mb-1"
                      >
                        {line.slice(4)}
                      </p>
                    );
                  }
                  // Empty lines
                  if (!line.trim()) {
                    return <br key={i} />;
                  }
                  // Regular text
                  return (
                    <p key={i} className="mb-1">
                      {line}
                    </p>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Progress bar (shown during download) */}
        {downloading && (
          <div className="px-6 pb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-600 dark:text-slate-400">
                {t('update.dialog.downloading', { progress: downloadProgress })}
              </span>
              <span className="font-medium text-azure-600 dark:text-azure-400">
                {downloadProgress}%
              </span>
            </div>
            <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-azure-500 rounded-full transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Installing indicator */}
        {installing && (
          <div className="px-6 pb-4">
            <div className="flex items-center justify-center gap-2 text-azure-600 dark:text-azure-400">
              <div className="w-4 h-4 border-2 border-azure-500 border-t-transparent rounded-full animate-spin" />
              <span>{t('update.dialog.installing')}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3">
          <Button variant="ghost" onClick={onLater} disabled={isProcessing}>
            {t('update.dialog.later')}
          </Button>
          <Button
            variant="primary"
            onClick={onInstallNow}
            disabled={isProcessing}
            loading={downloading}
            icon={!isProcessing ? <Download size={16} /> : undefined}
          >
            {t('update.dialog.installNow')}
          </Button>
        </div>
      </div>
    </div>
  );
}
