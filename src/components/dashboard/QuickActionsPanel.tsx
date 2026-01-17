import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store';
import * as versionApi from '../../api/version';

export function QuickActionsPanel() {
  const navigate = useNavigate();
  const addNotification = useAppStore((s) => s.addNotification);

  const handleRefresh = async () => {
    try {
      addNotification({
        type: 'info',
        title: '扫描中...',
        message: '正在扫描版本并检查实例',
        duration: 2000,
      });

      await versionApi.getAllVersionInfo();

      addNotification({
        type: 'success',
        title: '扫描完成',
        message: '所有数据已更新',
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: '扫描失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };

  return (
    <div className="panel p-6">
      <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">快捷操作</h2>
      <div className="flex flex-wrap gap-3">
        <button
          className="btn-outline px-5 py-3 text-sm flex items-center gap-2"
          onClick={handleRefresh}
        >
          <span>🔄</span> 扫描环境
        </button>

        <button
          className="btn-outline px-5 py-3 text-sm flex items-center gap-2"
          onClick={() => navigate('/profiles?action=new')}
        >
          <span>📋</span> 新建配置
        </button>

        <button
          className="btn-outline px-5 py-3 text-sm flex items-center gap-2"
          onClick={() => navigate('/instances?action=new')}
        >
          <span>🖥️</span> 添加实例
        </button>

        <button
          className="btn-outline px-5 py-3 text-sm flex items-center gap-2"
          onClick={() => {
            // Open terminal
            addNotification({
              type: 'info',
              title: '终端',
              message: '功能开发中...',
            });
          }}
        >
          <span>💻</span> 打开终端
        </button>
      </div>
    </div>
  );
}
