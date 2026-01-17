import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus,
  MoreVertical,
  Play,
  Copy,
  Trash2,
  Edit2,
  Download,
  Upload,
  RefreshCw,
  Check,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { ProfileForm, ConfirmDialog } from '@/components/profiles';
import type { ProfileFormData } from '@/components/profiles';
import { useProfiles, useActiveProfile, useAppStore } from '@/store';
import type { EnvironmentProfile } from '@/types';
import { formatDate } from '@/utils';
import * as profileApi from '@/api/profile';
import { mapApiProfileToFrontend } from '@/api/mappers';

export function ProfilesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const profiles = useProfiles();
  const activeProfile = useActiveProfile();
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const setProfiles = useAppStore((s) => s.setProfiles);
  const addNotification = useAppStore((s) => s.addNotification);

  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);

  // Dialog states
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [editingProfile, setEditingProfile] = useState<EnvironmentProfile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<EnvironmentProfile | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadProfiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const apiProfiles = await profileApi.listProfiles();
      const mappedProfiles = apiProfiles.map(mapApiProfileToFrontend);
      setProfiles(mappedProfiles);

      // Set active profile
      const active = apiProfiles.find((p) => p.is_active);
      if (active) {
        setActiveProfile(mapApiProfileToFrontend(active));
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: '加载配置文件失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsLoading(false);
    }
  }, [setProfiles, setActiveProfile, addNotification]);

  const handleImportClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        try {
          const imported = await profileApi.importProfileFromFile(file);
          await loadProfiles();
          addNotification({
            type: 'success',
            title: '导入成功',
            message: `${imported.name} 已导入`,
          });
        } catch (error) {
          addNotification({
            type: 'error',
            title: '导入失败',
            message: error instanceof Error ? error.message : '未知错误',
          });
        }
      }
    };
    input.click();
  }, [loadProfiles, addNotification]);

  // Load profiles on mount
  useEffect(() => {
    loadProfiles();
  }, [loadProfiles]);

  // Handle URL action params
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new') {
      setShowProfileForm(true);
      setSearchParams({});
    } else if (action === 'import') {
      handleImportClick();
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, handleImportClick]);

  const handleActivate = async (profile: EnvironmentProfile) => {
    if (isSwitching) return;

    setIsSwitching(profile.id);
    try {
      const result = await profileApi.switchProfile(profile.id);

      if (result.success) {
        await loadProfiles();
        addNotification({
          type: 'success',
          title: '配置已激活',
          message: `已切换到 ${profile.name}`,
        });
      } else {
        const errors = result.errors.join(', ') || '未知错误';
        addNotification({
          type: 'error',
          title: '切换失败',
          message: errors,
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: '切换失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsSwitching(null);
    }
  };

  const handleCreate = async (data: ProfileFormData) => {
    const apiProfile = await profileApi.createProfile({
      name: data.name,
      description: data.description || null,
      java_version: data.javaVersion,
      java_manager_id: data.javaManagerId,
      node_version: data.nodeVersion,
      node_manager_id: data.nodeManagerId,
      maven_config_id: data.mavenConfigId,
      env_vars: data.envVars,
    });

    await loadProfiles();
    addNotification({
      type: 'success',
      title: '配置已创建',
      message: `${apiProfile.name} 已创建`,
    });
  };

  const handleEdit = async (data: ProfileFormData) => {
    if (!editingProfile) return;

    await profileApi.updateProfile(editingProfile.id, {
      name: data.name,
      description: data.description || null,
      java_version: data.javaVersion,
      java_manager_id: data.javaManagerId,
      node_version: data.nodeVersion,
      node_manager_id: data.nodeManagerId,
      maven_config_id: data.mavenConfigId,
      env_vars: data.envVars,
    });

    await loadProfiles();
    setEditingProfile(null);
    addNotification({
      type: 'success',
      title: '配置已更新',
      message: `${data.name} 已更新`,
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      await profileApi.deleteProfile(deleteConfirm.id);
      await loadProfiles();
      addNotification({
        type: 'success',
        title: '配置已删除',
        message: `${deleteConfirm.name} 已删除`,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: '删除失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleDuplicate = async (profile: EnvironmentProfile) => {
    try {
      const duplicated = await profileApi.duplicateProfile(profile.id);
      await loadProfiles();
      addNotification({
        type: 'success',
        title: '配置已复制',
        message: `已创建 "${duplicated.name}"`,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: '复制失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };

  const handleExport = async (profile: EnvironmentProfile) => {
    try {
      await profileApi.exportProfileToFile(profile.id, `${profile.name}.json`);
      addNotification({
        type: 'success',
        title: '导出成功',
        message: `${profile.name} 已导出`,
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: '导出失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            <span className="mr-2">📋</span>环境配置
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">管理开发环境配置文件</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={<Upload size={16} />} onClick={handleImportClick}>
            导入
          </Button>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setShowProfileForm(true)}
          >
            新建配置
          </Button>
        </div>
      </div>

      {/* Profile List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={32} className="animate-spin text-azure" />
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState onCreateClick={() => setShowProfileForm(true)} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isActive={activeProfile?.id === profile.id}
              isSelected={selectedProfile === profile.id}
              isSwitching={isSwitching === profile.id}
              onSelect={() => setSelectedProfile(profile.id)}
              onActivate={() => handleActivate(profile)}
              onEdit={() => setEditingProfile(profile)}
              onDuplicate={() => handleDuplicate(profile)}
              onDelete={() => setDeleteConfirm(profile)}
              onExport={() => handleExport(profile)}
            />
          ))}
        </div>
      )}

      {/* Create Profile Dialog */}
      <ProfileForm
        isOpen={showProfileForm}
        onClose={() => setShowProfileForm(false)}
        onSubmit={handleCreate}
        title="新建配置"
      />

      {/* Edit Profile Dialog */}
      {editingProfile && (
        <ProfileForm
          isOpen={!!editingProfile}
          onClose={() => setEditingProfile(null)}
          onSubmit={handleEdit}
          title="编辑配置"
          initialData={{
            name: editingProfile.name,
            description: editingProfile.description || '',
            javaVersion:
              editingProfile.javaVersion === 'Not set' ? null : editingProfile.javaVersion,
            nodeVersion:
              editingProfile.nodeVersion === 'Not set' ? null : editingProfile.nodeVersion,
            javaManagerId: null,
            nodeManagerId: null,
            mavenConfigId: null,
            envVars: editingProfile.envVars || {},
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title="删除配置？"
        message={`确定要删除 "${deleteConfirm?.name}" 吗？此操作无法撤销。`}
        confirmText="删除"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

interface ProfileCardProps {
  profile: EnvironmentProfile;
  isActive: boolean;
  isSelected: boolean;
  isSwitching: boolean;
  onSelect: () => void;
  onActivate: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onExport: () => void;
}

function ProfileCard({
  profile,
  isActive,
  isSelected,
  isSwitching,
  onSelect,
  onActivate,
  onEdit,
  onDuplicate,
  onDelete,
  onExport,
}: ProfileCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card
      className={`relative ${isActive ? 'ring-2 ring-azure dark:ring-azure-400' : ''} ${isSelected ? 'ring-2 ring-teal dark:ring-teal-400' : ''}`}
      hover
      onClick={onSelect}
    >
      {/* Active Badge */}
      {isActive && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-azure text-white text-xs font-medium rounded-full flex items-center gap-1">
          <Check size={12} />
          当前
        </div>
      )}

      <CardHeader
        title={profile.name}
        subtitle={profile.description ?? undefined}
        action={
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <MoreVertical size={16} className="text-slate-400" />
            </button>
            {showMenu && (
              <ProfileMenu
                onClose={() => setShowMenu(false)}
                onEdit={() => {
                  setShowMenu(false);
                  onEdit();
                }}
                onDuplicate={() => {
                  setShowMenu(false);
                  onDuplicate();
                }}
                onExport={() => {
                  setShowMenu(false);
                  onExport();
                }}
                onDelete={() => {
                  setShowMenu(false);
                  onDelete();
                }}
                isActive={isActive}
              />
            )}
          </div>
        }
      />

      <CardContent className="space-y-3">
        {/* Version Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-slate-500 dark:text-slate-400">Java:</span>
            <span className="ml-2 font-medium text-slate-700 dark:text-slate-300">
              {profile.javaVersion || '未设置'}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Node:</span>
            <span className="ml-2 font-medium text-slate-700 dark:text-slate-300">
              {profile.nodeVersion || '未设置'}
            </span>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-slate-400 dark:text-slate-500">
          更新时间: {formatDate(profile.updatedAt)}
        </div>

        {/* Actions */}
        {!isActive && (
          <Button
            variant="primary"
            size="sm"
            fullWidth
            icon={
              isSwitching ? <RefreshCw size={14} className="animate-spin" /> : <Play size={14} />
            }
            onClick={(e) => {
              e.stopPropagation();
              onActivate();
            }}
            disabled={isSwitching}
          >
            {isSwitching ? '切换中...' : '激活'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

interface ProfileMenuProps {
  onClose: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onExport: () => void;
  onDelete: () => void;
  isActive: boolean;
}

function ProfileMenu({
  onClose,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
  isActive,
}: ProfileMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-8 z-20 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1">
        <button
          onClick={onEdit}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Edit2 size={14} /> 编辑
        </button>
        <button
          onClick={onDuplicate}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Copy size={14} /> 复制
        </button>
        <button
          onClick={onExport}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Download size={14} /> 导出
        </button>
        <hr className="my-1 border-slate-200 dark:border-slate-700" />
        <button
          onClick={onDelete}
          disabled={isActive}
          className={`
            w-full flex items-center gap-2 px-3 py-2 text-sm
            ${
              isActive
                ? 'text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'text-error-500 hover:bg-error-50 dark:hover:bg-error-900/30'
            }
          `}
          title={isActive ? '无法删除当前激活的配置' : undefined}
        >
          <Trash2 size={14} /> 删除
        </button>
      </div>
    </>
  );
}

interface EmptyStateProps {
  onCreateClick: () => void;
}

function EmptyState({ onCreateClick }: EmptyStateProps) {
  return (
    <Card className="p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-azure-50 dark:bg-azure-900/30 flex items-center justify-center mb-4">
        <Plus size={24} className="text-azure" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">暂无配置</h3>
      <p className="text-slate-500 dark:text-slate-400 mt-2 mb-6 max-w-md mx-auto">
        创建您的第一个环境配置来开始管理 AEM 开发环境。
      </p>
      <Button icon={<Plus size={16} />} onClick={onCreateClick}>
        创建配置
      </Button>
    </Card>
  );
}
