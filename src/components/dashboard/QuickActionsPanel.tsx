import { useNavigate } from 'react-router-dom';
import { Play, Server, RefreshCw, FolderPlus, Settings, Download, FileUp } from 'lucide-react';
import { Card, CardHeader, CardContent } from '../common/Card';
import { Button } from '../common/Button';
import { useAppStore } from '../../store';
import * as versionApi from '../../api/version';

export function QuickActionsPanel() {
  const navigate = useNavigate();
  const addNotification = useAppStore((s) => s.addNotification);

  const handleRefresh = async () => {
    try {
      addNotification({
        type: 'info',
        title: 'Refreshing...',
        message: 'Scanning versions and checking instances',
        duration: 2000,
      });

      await versionApi.getAllVersionInfo();

      addNotification({
        type: 'success',
        title: 'Refresh complete',
        message: 'All data has been updated',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: 'Refresh failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  };

  return (
    <Card>
      <CardHeader title="Quick Actions" />
      <CardContent className="space-y-3">
        <Button
          variant="primary"
          fullWidth
          icon={<Play size={16} />}
          onClick={() => navigate('/profiles')}
        >
          Switch Profile
        </Button>

        <Button
          variant="secondary"
          fullWidth
          icon={<Server size={16} />}
          onClick={() => navigate('/instances')}
        >
          Manage Instances
        </Button>

        <Button variant="outline" fullWidth icon={<RefreshCw size={16} />} onClick={handleRefresh}>
          Refresh Status
        </Button>

        <hr className="border-slate-200 dark:border-slate-700 my-2" />

        <Button
          variant="ghost"
          fullWidth
          icon={<FolderPlus size={16} />}
          onClick={() => navigate('/profiles?action=new')}
        >
          New Profile
        </Button>

        <Button
          variant="ghost"
          fullWidth
          icon={<FileUp size={16} />}
          onClick={() => navigate('/profiles?action=import')}
        >
          Import Profile
        </Button>

        <Button
          variant="ghost"
          fullWidth
          icon={<Download size={16} />}
          onClick={() => navigate('/profiles?action=export')}
        >
          Export Profile
        </Button>

        <hr className="border-slate-200 dark:border-slate-700 my-2" />

        <Button
          variant="ghost"
          fullWidth
          icon={<Settings size={16} />}
          onClick={() => navigate('/settings')}
        >
          Settings
        </Button>
      </CardContent>
    </Card>
  );
}
