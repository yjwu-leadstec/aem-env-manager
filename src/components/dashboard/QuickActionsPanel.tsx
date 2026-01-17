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
        title: '刷新中...',
        message: '正在扫描版本并检查实例',
        duration: 2000,
      });

      await versionApi.getAllVersionInfo();

      addNotification({
        type: 'success',
        title: '刷新完成',
        message: '所有数据已更新',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: '刷新失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };

  return (
    <Card>
      <CardHeader title="快捷操作" />
      <CardContent className="space-y-3">
        <Button
          variant="primary"
          fullWidth
          icon={<Play size={16} />}
          onClick={() => navigate('/profiles')}
        >
          切换配置
        </Button>

        <Button
          variant="secondary"
          fullWidth
          icon={<Server size={16} />}
          onClick={() => navigate('/instances')}
        >
          管理实例
        </Button>

        <Button variant="outline" fullWidth icon={<RefreshCw size={16} />} onClick={handleRefresh}>
          刷新状态
        </Button>

        <hr className="border-slate-200 dark:border-slate-700 my-2" />

        <Button
          variant="ghost"
          fullWidth
          icon={<FolderPlus size={16} />}
          onClick={() => navigate('/profiles?action=new')}
        >
          新建配置
        </Button>

        <Button
          variant="ghost"
          fullWidth
          icon={<FileUp size={16} />}
          onClick={() => navigate('/profiles?action=import')}
        >
          导入配置
        </Button>

        <Button
          variant="ghost"
          fullWidth
          icon={<Download size={16} />}
          onClick={() => navigate('/profiles?action=export')}
        >
          导出配置
        </Button>

        <hr className="border-slate-200 dark:border-slate-700 my-2" />

        <Button
          variant="ghost"
          fullWidth
          icon={<Settings size={16} />}
          onClick={() => navigate('/settings')}
        >
          设置
        </Button>
      </CardContent>
    </Card>
  );
}
