import {
  FolderCog,
  Server,
  Coffee,
  Hexagon,
  ArrowRight,
  Play,
  Square,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { StatusBadge } from '../common/StatusBadge';
import { useDashboardStats, useAemInstances, useAppStore } from '../../store';

export function DashboardView() {
  const stats = useDashboardStats();
  const instances = useAemInstances();
  const setCurrentView = useAppStore((s) => s.setCurrentView);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Overview of your AEM development environment
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FolderCog className="text-azure" />}
          label="Environment Profiles"
          value={stats.totalProfiles}
          subtext={stats.activeProfile ? `Active: ${stats.activeProfile}` : 'No active profile'}
        />
        <StatCard
          icon={<Server className="text-teal" />}
          label="AEM Instances"
          value={`${stats.runningInstances}/${stats.totalInstances}`}
          subtext="Running"
        />
        <StatCard
          icon={<Coffee className="text-warning" />}
          label="Java Version"
          value={stats.javaVersion || 'Not set'}
          subtext="Current"
        />
        <StatCard
          icon={<Hexagon className="text-success" />}
          label="Node Version"
          value={stats.nodeVersion || 'Not set'}
          subtext="Current"
        />
      </div>

      {/* Quick Actions & Instances */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader title="Quick Actions" />
          <CardContent className="space-y-3">
            <Button
              variant="primary"
              fullWidth
              icon={<Play size={16} />}
              onClick={() => setCurrentView('profiles')}
            >
              Switch Profile
            </Button>
            <Button
              variant="secondary"
              fullWidth
              icon={<Server size={16} />}
              onClick={() => setCurrentView('instances')}
            >
              Manage Instances
            </Button>
            <Button
              variant="outline"
              fullWidth
              icon={<RefreshCw size={16} />}
            >
              Refresh Status
            </Button>
          </CardContent>
        </Card>

        {/* AEM Instances */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="AEM Instances"
            action={
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowRight size={16} />}
                iconPosition="right"
                onClick={() => setCurrentView('instances')}
              >
                View All
              </Button>
            }
          />
          <CardContent>
            {instances.length === 0 ? (
              <EmptyState
                message="No AEM instances configured"
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentView('instances')}
                  >
                    Add Instance
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {instances.slice(0, 4).map((instance) => (
                  <InstanceRow key={instance.id} instance={instance} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext: string;
}

function StatCard({ icon, label, value, subtext }: StatCardProps) {
  return (
    <Card>
      <div className="flex items-start justify-between">
        <div className="p-2 rounded-lg bg-slate-50">{icon}</div>
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-sm font-medium text-slate-600 mt-1">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>
      </div>
    </Card>
  );
}

interface InstanceRowProps {
  instance: {
    id: string;
    name: string;
    type: string;
    status: 'running' | 'stopped' | 'starting' | 'stopping' | 'error' | 'unknown';
    host: string;
    port: number;
  };
}

function InstanceRow({ instance }: InstanceRowProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
      <div className="flex items-center gap-3">
        <StatusBadge status={instance.status} />
        <div>
          <p className="font-medium text-slate-900">{instance.name}</p>
          <p className="text-xs text-slate-500">
            {instance.host}:{instance.port} · {instance.type}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {instance.status === 'stopped' ? (
          <Button variant="ghost" size="sm" icon={<Play size={14} />}>
            Start
          </Button>
        ) : instance.status === 'running' ? (
          <Button variant="ghost" size="sm" icon={<Square size={14} />}>
            Stop
          </Button>
        ) : null}
      </div>
    </div>
  );
}

interface EmptyStateProps {
  message: string;
  action?: React.ReactNode;
}

function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <p className="text-slate-500 mb-4">{message}</p>
      {action}
    </div>
  );
}
