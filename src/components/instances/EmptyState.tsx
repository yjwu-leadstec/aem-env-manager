import { useTranslation } from 'react-i18next';
import { Server, Plus } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';

interface EmptyStateProps {
  onAdd: () => void;
}

export function EmptyState({ onAdd }: EmptyStateProps) {
  const { t } = useTranslation();

  return (
    <Card className="p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-teal-50 dark:bg-teal-900/30 flex items-center justify-center mb-4">
        <Server size={24} className="text-teal-500" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
        {t('instance.empty.title')}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6 max-w-md mx-auto">
        {t('instance.empty.description')}
      </p>
      <Button variant="secondary" icon={<Plus size={16} />} onClick={onAdd}>
        {t('instance.add')}
      </Button>
    </Card>
  );
}
