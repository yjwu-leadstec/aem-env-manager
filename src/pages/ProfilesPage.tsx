import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
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
import { ProfileForm } from '@/components/profiles';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import type { ProfileFormData } from '@/components/profiles';
import { useProfiles, useActiveProfile, useAppStore } from '@/store';
import type { EnvironmentProfile } from '@/types';
import { formatDate } from '@/utils';
import * as profileApi from '@/api/profile';
import { mapApiProfileToFrontend } from '@/api/mappers';

export function ProfilesPage() {
  const { t } = useTranslation();
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
        title: t('profile.notifications.loadFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsLoading(false);
    }
  }, [setProfiles, setActiveProfile, addNotification, t]);

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
            title: t('profile.notifications.importSuccess'),
            message: t('profile.notifications.imported', { name: imported.name }),
          });
        } catch (error) {
          addNotification({
            type: 'error',
            title: t('profile.notifications.importFailed'),
            message: error instanceof Error ? error.message : t('common.unknown'),
          });
        }
      }
    };
    input.click();
  }, [loadProfiles, addNotification, t]);

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
          title: t('profile.notifications.activated'),
          message: t('profile.notifications.switchedTo', { name: profile.name }),
        });
      } else {
        const errors = result.errors.join(', ') || t('common.unknown');
        addNotification({
          type: 'error',
          title: t('profile.notifications.switchFailed'),
          message: errors,
        });
      }
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('profile.notifications.switchFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    } finally {
      setIsSwitching(null);
    }
  };

  const handleCreate = async (data: ProfileFormData) => {
    try {
      const apiProfile = await profileApi.createProfile({
        name: data.name,
        description: data.description || null,
        java_version: data.javaVersion,
        java_manager_id: data.javaManagerId,
        node_version: data.nodeVersion,
        node_manager_id: data.nodeManagerId,
        maven_config_id: data.mavenConfigId,
        author_instance_id: data.authorInstanceId,
        publish_instance_id: data.publishInstanceId,
        env_vars: data.envVars,
      });

      await loadProfiles();
      addNotification({
        type: 'success',
        title: t('profile.notifications.created'),
        message: t('profile.notifications.createdMessage', { name: apiProfile.name }),
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('profile.notifications.createFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    }
  };

  const handleEdit = async (data: ProfileFormData) => {
    if (!editingProfile) return;

    try {
      await profileApi.updateProfile(editingProfile.id, {
        name: data.name,
        description: data.description || null,
        java_version: data.javaVersion,
        java_manager_id: data.javaManagerId,
        node_version: data.nodeVersion,
        node_manager_id: data.nodeManagerId,
        maven_config_id: data.mavenConfigId,
        author_instance_id: data.authorInstanceId,
        publish_instance_id: data.publishInstanceId,
        env_vars: data.envVars,
      });

      await loadProfiles();
      setEditingProfile(null);
      addNotification({
        type: 'success',
        title: t('profile.notifications.updated'),
        message: t('profile.notifications.updatedMessage', { name: data.name }),
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('profile.notifications.updateFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    setIsDeleting(true);
    try {
      await profileApi.deleteProfile(deleteConfirm.id);
      await loadProfiles();
      addNotification({
        type: 'success',
        title: t('profile.notifications.deleted'),
        message: t('profile.notifications.deletedMessage', { name: deleteConfirm.name }),
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('profile.notifications.deleteFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
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
        title: t('profile.notifications.duplicated'),
        message: t('profile.notifications.duplicatedMessage', { name: duplicated.name }),
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('profile.notifications.duplicateFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    }
  };

  const handleExport = async (profile: EnvironmentProfile) => {
    try {
      await profileApi.exportProfileToFile(profile.id, `${profile.name}.json`);
      addNotification({
        type: 'success',
        title: t('profile.notifications.exportSuccess'),
        message: t('profile.notifications.exported', { name: profile.name }),
      });
    } catch (error) {
      addNotification({
        type: 'error',
        title: t('profile.notifications.exportFailed'),
        message: error instanceof Error ? error.message : t('common.unknown'),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            <span className="mr-2">📋</span>
            {t('profile.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">{t('profile.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" icon={<Upload size={16} />} onClick={handleImportClick}>
            {t('common.import')}
          </Button>
          <Button
            variant="primary"
            icon={<Plus size={16} />}
            onClick={() => setShowProfileForm(true)}
          >
            {t('profile.create')}
          </Button>
        </div>
      </div>

      {/* Profile List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={32} className="animate-spin text-azure" />
        </div>
      ) : profiles.length === 0 ? (
        <EmptyState />
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
        title={t('profile.create')}
      />

      {/* Edit Profile Dialog */}
      {editingProfile && (
        <ProfileForm
          isOpen={!!editingProfile}
          onClose={() => setEditingProfile(null)}
          onSubmit={handleEdit}
          title={t('profile.edit')}
          initialData={{
            name: editingProfile.name,
            description: editingProfile.description || '',
            javaVersion:
              editingProfile.javaVersion === 'Not set' ? null : editingProfile.javaVersion,
            nodeVersion:
              editingProfile.nodeVersion === 'Not set' ? null : editingProfile.nodeVersion,
            javaManagerId: editingProfile.javaManagerId || null,
            nodeManagerId: editingProfile.nodeManagerId || null,
            mavenConfigId: editingProfile.mavenConfigId || null,
            authorInstanceId: editingProfile.authorInstanceId || null,
            publishInstanceId: editingProfile.publishInstanceId || null,
            envVars: editingProfile.envVars || {},
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={handleDelete}
        title={t('profile.dialog.deleteTitle')}
        message={t('profile.dialog.deleteConfirm', { name: deleteConfirm?.name })}
        confirmText={t('common.delete')}
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
  const { t } = useTranslation();
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
          {t('profile.current')}
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
              {profile.javaVersion || t('common.notSet')}
            </span>
          </div>
          <div>
            <span className="text-slate-500 dark:text-slate-400">Node:</span>
            <span className="ml-2 font-medium text-slate-700 dark:text-slate-300">
              {profile.nodeVersion || t('common.notSet')}
            </span>
          </div>
        </div>

        {/* Last Updated */}
        <div className="text-xs text-slate-400 dark:text-slate-500">
          {t('profile.updatedAt', { date: formatDate(profile.updatedAt) })}
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
            {isSwitching ? t('profile.switching') : t('profile.activate')}
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
  const { t } = useTranslation();
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-8 z-20 w-44 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1">
        <button
          onClick={onEdit}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Edit2 size={14} /> {t('common.edit')}
        </button>
        <button
          onClick={onDuplicate}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Copy size={14} /> {t('common.copy')}
        </button>
        <button
          onClick={onExport}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
        >
          <Download size={14} /> {t('common.export')}
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
          title={isActive ? t('profile.cannotDeleteActive') : undefined}
        >
          <Trash2 size={14} /> {t('common.delete')}
        </button>
      </div>
    </>
  );
}

function EmptyState() {
  const { t } = useTranslation();
  return (
    <Card className="p-12 text-center">
      <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-300">
        {t('profile.empty.title')}
      </h3>
      <p className="text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
        {t('profile.empty.description')}
      </p>
    </Card>
  );
}
