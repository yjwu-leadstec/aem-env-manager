import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from './Button';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      icon: <Trash2 size={24} className="text-error-500" />,
      iconBg: 'bg-error-50 dark:bg-error-900/30',
    },
    warning: {
      icon: <AlertTriangle size={24} className="text-warning-500" />,
      iconBg: 'bg-warning-50 dark:bg-warning-900/30',
    },
    info: {
      icon: <AlertTriangle size={24} className="text-azure-500" />,
      iconBg: 'bg-azure-50 dark:bg-azure-900/30',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-md panel m-4 p-0 overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors z-10"
        >
          <X size={20} className="text-slate-500" />
        </button>

        {/* Content */}
        <div className="p-6 text-center">
          {/* Icon */}
          <div
            className={`w-12 h-12 mx-auto rounded-full ${styles.iconBg} flex items-center justify-center mb-4`}
          >
            {styles.icon}
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold mb-2">{title}</h3>

          {/* Message */}
          <p className="text-slate-600 dark:text-gray-400 mb-6">{message}</p>

          {/* Actions */}
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              {cancelText}
            </Button>
            <Button
              variant={variant === 'info' ? 'primary' : 'danger'}
              onClick={onConfirm}
              loading={isLoading}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
