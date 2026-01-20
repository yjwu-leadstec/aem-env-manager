import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { useNotifications, useAppStore } from '../../store';
import type { Notification } from '../../types';

const icons = {
  success: <CheckCircle size={20} className="text-success" />,
  error: <AlertCircle size={20} className="text-error" />,
  warning: <AlertTriangle size={20} className="text-warning" />,
  info: <Info size={20} className="text-azure" />,
};

const bgColors = {
  success: 'bg-success-50 dark:bg-success-500/20 border-success-200 dark:border-success-500/30',
  error: 'bg-error-50 dark:bg-error-500/20 border-error-200 dark:border-error-500/30',
  warning: 'bg-warning-50 dark:bg-warning-500/20 border-warning-200 dark:border-warning-500/30',
  info: 'bg-azure-50 dark:bg-tech-orange-500/20 border-azure-200 dark:border-tech-orange-500/30',
};

interface NotificationItemProps {
  notification: Notification;
  onClose: () => void;
}

function NotificationItem({ notification, onClose }: NotificationItemProps) {
  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-soft
        animate-slide-in ${bgColors[notification.type]}
      `}
    >
      {icons[notification.type]}

      <div className="flex-1 min-w-0">
        <p className="font-medium text-slate-900 dark:text-gray-100">{notification.title}</p>
        {notification.message && (
          <p className="mt-1 text-sm text-slate-600 dark:text-gray-300">{notification.message}</p>
        )}
      </div>

      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-white/50 dark:hover:bg-white/10 text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-gray-200 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}

export function NotificationToast() {
  const notifications = useNotifications();
  const removeNotification = useAppStore((s) => s.removeNotification);

  if (notifications.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full">
      {notifications.slice(-5).map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}
