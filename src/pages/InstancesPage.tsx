import { useState } from 'react';
import {
  Plus,
  Play,
  Square,
  RefreshCw,
  ExternalLink,
  Settings,
  MoreVertical,
  Trash2,
  Edit2,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAemInstances, useAppStore } from '@/store';
import type { AEMInstance } from '@/types';

export function InstancesPage() {
  const instances = useAemInstances();
  const addNotification = useAppStore((s) => s.addNotification);
  const updateInstance = useAppStore((s) => s.updateAemInstance);

  const handleStart = (instance: AEMInstance) => {
    updateInstance(instance.id, { status: 'starting' });
    setTimeout(() => {
      updateInstance(instance.id, { status: 'running' });
      addNotification({
        type: 'success',
        title: 'Instance started',
        message: `${instance.name} is now running`,
      });
    }, 2000);
  };

  const handleStop = (instance: AEMInstance) => {
    updateInstance(instance.id, { status: 'stopping' });
    setTimeout(() => {
      updateInstance(instance.id, { status: 'stopped' });
      addNotification({
        type: 'success',
        title: 'Instance stopped',
        message: `${instance.name} has been stopped`,
      });
    }, 1500);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AEM Instances</h1>
          <p className="text-slate-500 mt-1">Manage your AEM author and publish instances</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" icon={<RefreshCw size={16} />}>
            Refresh All
          </Button>
          <Button icon={<Plus size={16} />}>Add Instance</Button>
        </div>
      </div>

      {/* Instance List */}
      {instances.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {instances.map((instance) => (
            <InstanceCard
              key={instance.id}
              instance={instance}
              onStart={() => handleStart(instance)}
              onStop={() => handleStop(instance)}
            />
          ))}
        </div>
      )}

      {/* Quick Links */}
      <Card>
        <CardHeader title="Quick Links" subtitle="Useful AEM resources" />
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickLink label="CRXDE Lite" path="/crx/de" />
            <QuickLink label="Package Manager" path="/crx/packmgr" />
            <QuickLink label="Web Console" path="/system/console" />
            <QuickLink label="Sites Console" path="/sites.html" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface InstanceCardProps {
  instance: AEMInstance;
  onStart: () => void;
  onStop: () => void;
}

function InstanceCard({ instance, onStart, onStop }: InstanceCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isRunning = instance.status === 'running';
  const isTransitioning = instance.status === 'starting' || instance.status === 'stopping';

  return (
    <Card className="relative">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <StatusBadge status={instance.status} size="lg" />
          <div>
            <h3 className="font-semibold text-slate-900">{instance.name}</h3>
            <p className="text-sm text-slate-500">
              {instance.host}:{instance.port} · {instance.type}
            </p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1.5 rounded hover:bg-slate-100"
          >
            <MoreVertical size={16} className="text-slate-400" />
          </button>
          {showMenu && <InstanceMenu onClose={() => setShowMenu(false)} />}
        </div>
      </div>

      {/* Instance Info */}
      <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
        <div>
          <span className="text-slate-500">Run Mode:</span>
          <span className="ml-2 font-medium text-slate-700">{instance.runMode}</span>
        </div>
        <div>
          <span className="text-slate-500">AEM Version:</span>
          <span className="ml-2 font-medium text-slate-700">
            {instance.aemVersion || 'Unknown'}
          </span>
        </div>
        {instance.javaVersion && (
          <div>
            <span className="text-slate-500">Java:</span>
            <span className="ml-2 font-medium text-slate-700">{instance.javaVersion}</span>
          </div>
        )}
        {instance.startupTime && (
          <div>
            <span className="text-slate-500">Uptime:</span>
            <span className="ml-2 font-medium text-slate-700">
              {Math.floor(instance.startupTime / 60)}m
            </span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {isRunning ? (
          <Button
            variant="outline"
            size="sm"
            icon={<Square size={14} />}
            onClick={onStop}
            loading={instance.status === 'stopping'}
          >
            Stop
          </Button>
        ) : (
          <Button
            variant="primary"
            size="sm"
            icon={<Play size={14} />}
            onClick={onStart}
            loading={instance.status === 'starting'}
            disabled={isTransitioning}
          >
            Start
          </Button>
        )}

        {isRunning && (
          <>
            <Button
              variant="outline"
              size="sm"
              icon={<ExternalLink size={14} />}
              onClick={() => window.open(`http://${instance.host}:${instance.port}`, '_blank')}
            >
              Open
            </Button>
            <Button
              variant="ghost"
              size="sm"
              icon={<Settings size={14} />}
              onClick={() =>
                window.open(`http://${instance.host}:${instance.port}/system/console`, '_blank')
              }
            >
              Console
            </Button>
          </>
        )}
      </div>
    </Card>
  );
}

function InstanceMenu({ onClose }: { onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          <Edit2 size={14} /> Edit
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
          <RefreshCw size={14} /> Health Check
        </button>
        <hr className="my-1 border-slate-200" />
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error-50">
          <Trash2 size={14} /> Remove
        </button>
      </div>
    </>
  );
}

function QuickLink({ label }: { label: string; path?: string }) {
  return (
    <button className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-slate-50 text-slate-600 hover:bg-azure-50 hover:text-azure-600 transition-colors text-sm">
      {label}
      <ExternalLink size={12} />
    </button>
  );
}

function EmptyState() {
  return (
    <Card className="p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-teal-50 flex items-center justify-center mb-4">
        <Plus size={24} className="text-teal" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700">No instances configured</h3>
      <p className="text-slate-500 mt-2 mb-6 max-w-md mx-auto">
        Add your first AEM instance to start managing your development environment.
      </p>
      <Button variant="secondary" icon={<Plus size={16} />}>
        Add Instance
      </Button>
    </Card>
  );
}
