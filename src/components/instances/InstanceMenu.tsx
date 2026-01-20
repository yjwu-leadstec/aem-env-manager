import { useTranslation } from 'react-i18next';
import { Edit2, Copy, Trash2 } from 'lucide-react';

interface InstanceMenuProps {
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function InstanceMenu({ onClose, onEdit, onDelete }: InstanceMenuProps) {
  const { t } = useTranslation();

  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-8 z-20 w-44 bg-white dark:bg-[#1a1a1a] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 py-1 overflow-hidden">
        <button
          onClick={() => {
            onEdit();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <Edit2 size={14} className="opacity-70" /> {t('common.edit')}
        </button>
        <button
          onClick={onClose}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
        >
          <Copy size={14} className="opacity-70" /> {t('common.copy')}
        </button>
        <hr className="my-1 border-gray-100 dark:border-white/10" />
        <button
          onClick={() => {
            onDelete();
            onClose();
          }}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error/10 transition-colors"
        >
          <Trash2 size={14} /> {t('common.delete')}
        </button>
      </div>
    </>
  );
}
