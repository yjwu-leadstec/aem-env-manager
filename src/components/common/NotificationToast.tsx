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
  success: 'bg-success-50 border-success-200',
  error: 'bg-error-50 border-error-200',
  warning: 'bg-warning-50 border-warning-200',
  info: 'bg-azure-50 border-azure-200',
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
        <p className="font-medium text-slate-900">{notification.title}</p>
        {notification.message && (
          <p className="mt-1 text-sm text-slate-600">{notification.message}</p>
        )}
      </div>

      <button
        onClick={onClose}
        className="p-1 rounded hover:bg-white/50 text-slate-400 hover:text-slate-600 transition-colors"
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
