import { useState } from 'react';
import { Plus, MoreVertical, Play, Copy, Trash2, Edit2 } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { useProfiles, useActiveProfile, useAppStore } from '@/store';
import type { EnvironmentProfile } from '@/types';
import { formatDate } from '@/utils';

export function ProfilesPage() {
  const profiles = useProfiles();
  const activeProfile = useActiveProfile();
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const addNotification = useAppStore((s) => s.addNotification);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

  const handleActivate = (profile: EnvironmentProfile) => {
    setActiveProfile(profile);
    addNotification({
      type: 'success',
      title: 'Profile activated',
      message: `Switched to ${profile.name}`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Environment Profiles</h1>
          <p className="text-slate-500 mt-1">Manage your development environment configurations</p>
        </div>
        <Button icon={<Plus size={16} />}>New Profile</Button>
      </div>

      {/* Profile List */}
      {profiles.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {profiles.map((profile) => (
            <ProfileCard
              key={profile.id}
              profile={profile}
              isActive={activeProfile?.id === profile.id}
              isSelected={selectedProfile === profile.id}
              onSelect={() => setSelectedProfile(profile.id)}
              onActivate={() => handleActivate(profile)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface ProfileCardProps {
  profile: EnvironmentProfile;
  isActive: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onActivate: () => void;
}

function ProfileCard({ profile, isActive, isSelected, onSelect, onActivate }: ProfileCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card
      className={`relative ${isActive ? 'ring-2 ring-azure' : ''} ${isSelected ? 'ring-2 ring-teal' : ''}`}
      hover
      onClick={onSelect}
    >
      {/* Active Badge */}
      {isActive && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-azure text-white text-xs font-medium rounded-full">
          Active
        </div>
      )}

      <CardHeader
        title={profile.name}
        subtitle={profile.description}
        action={
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 rounded hover:bg-slate-100"
            >
              <MoreVertical size={16} className="text-slate-400" />
            </button>
            {showMenu && (
              <ProfileMenu
                onClose={() => setShowMenu(false)}
                onEdit={() => {}}
                onDuplicate={() => {}}
                onDelete={() => {}}
              />
            )}
          </div>
        }
      />

      <CardContent className="space-y-3">
        {/* Version Info */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-slate-500">Java:</span>
            <span className="ml-2 font-medium text-slate-700">{profile.javaVersion}</span>
          </div>
          <div>
            <span className="text-slate-500">Node:</span>
            <span className="ml-2 font-medium text-slate-700">{profile.nodeVersion}</span>
          </div>
        </div>

        {/* Last Used */}
        <div className="text-xs text-slate-400">Last used: {formatDate(profile.lastUsedAt)}</div>

        {/* Actions */}
        {!isActive && (
          <Button
            variant="primary"
            size="sm"
            fullWidth
            icon={<Play size={14} />}
            onClick={(e) => {
              e.stopPropagation();
              onActivate();
            }}
          >
            Activate
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
  onDelete: () => void;
}

function ProfileMenu({ onClose, onEdit, onDuplicate, onDelete }: ProfileMenuProps) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-lg shadow-lg border border-slate-200 py-1">
        <button
          onClick={onEdit}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Edit2 size={14} /> Edit
        </button>
        <button
          onClick={onDuplicate}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
        >
          <Copy size={14} /> Duplicate
        </button>
        <hr className="my-1 border-slate-200" />
        <button
          onClick={onDelete}
          className="w-full flex items-center gap-2 px-3 py-2 text-sm text-error hover:bg-error-50"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </>
  );
}

function EmptyState() {
  return (
    <Card className="p-12 text-center">
      <div className="w-16 h-16 mx-auto rounded-full bg-azure-50 flex items-center justify-center mb-4">
        <Plus size={24} className="text-azure" />
      </div>
      <h3 className="text-lg font-semibold text-slate-700">No profiles yet</h3>
      <p className="text-slate-500 mt-2 mb-6 max-w-md mx-auto">
        Create your first environment profile to start managing your AEM development setup.
      </p>
      <Button icon={<Plus size={16} />}>Create Profile</Button>
    </Card>
  );
}
