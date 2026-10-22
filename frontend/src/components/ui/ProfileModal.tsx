import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { AppleModal } from './AppleModal';
import { AppleButton } from './AppleButton';
import { AppleInput } from './AppleInput';
import { AppleBadge } from './AppleBadge';
import { AppleSegmentedControl } from './AppleSegmentedControl';
import { Camera, Trash2, User, Lock, Mail, Building, CheckCircle2, KeyRound } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateCurrentUser } = useAuth();
  const { showToast, celebrate } = useToast();

  const [activeTab, setActiveTab] = useState<'photo' | 'info' | 'password'>('photo');

  // Photo State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile Info State
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [infoSaving, setInfoSaving] = useState(false);

  // Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      showToast('warning', 'Invalid File', 'Please select an image (JPG, PNG, WEBP)');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('warning', 'File Too Large', 'Maximum image size is 5MB');
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  const handleUploadPhoto = async () => {
    if (!selectedFile) return;

    setPhotoUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', selectedFile);

      const res = await api.auth.uploadAvatar(formData);
      updateCurrentUser(res.data.user);
      showToast('success', 'Photo Updated', 'Your profile picture has been updated.');
      celebrate();
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      showToast('error', 'Upload Failed', err.message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleDeletePhoto = async () => {
    if (!window.confirm('Are you sure you want to remove your profile photo?')) return;

    setPhotoUploading(true);
    try {
      const res = await api.auth.deleteAvatar();
      updateCurrentUser(res.data.user);
      setSelectedFile(null);
      setPreviewUrl(null);
      showToast('info', 'Photo Removed', 'Your avatar has been reset to default.');
    } catch (err: any) {
      showToast('error', 'Removal Failed', err.message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      showToast('warning', 'Required', 'Name and email are required');
      return;
    }

    setInfoSaving(true);
    try {
      const res = await api.auth.updateProfile({
        full_name: fullName.trim(),
        email: email.trim(),
      });
      updateCurrentUser(res.data.user);
      showToast('success', 'Profile Updated', 'Your information has been saved.');
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    } finally {
      setInfoSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('warning', 'Required', 'Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('error', 'Mismatch', 'New passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      showToast('warning', 'Weak Password', 'New password must be at least 6 characters');
      return;
    }

    setPasswordSaving(true);
    try {
      await api.auth.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      showToast('success', 'Password Changed', 'Your security password has been updated.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      showToast('error', 'Change Failed', err.message);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (!isOpen) return null;

  const currentAvatarSrc = previewUrl || (user?.avatar_url ? user.avatar_url : null);

  const roleVariant = {
    SUPER_ADMIN: 'red',
    DEPT_ADMIN: 'purple',
    FACULTY: 'blue',
    STUDENT: 'teal',
  }[user?.role || 'STUDENT'] as any;

  return (
    <AppleModal
      isOpen={isOpen}
      onClose={onClose}
      title="User Account & Profile Settings"
      subtitle={`${user?.full_name} · ${user?.email}`}
      maxWidth="xl"
      actions={
        <AppleButton variant="secondary" onClick={onClose}>
          Close
        </AppleButton>
      }
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex justify-center">
          <AppleSegmentedControl
            options={[
              { value: 'photo', label: 'Profile Photo' },
              { value: 'info', label: 'Personal Info' },
              { value: 'password', label: 'Change Password' },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as any)}
            size="sm"
          />
        </div>

        {/* Tab 1: Profile Photo Upload */}
        {activeTab === 'photo' && (
          <div className="flex flex-col items-center space-y-6 py-2 animate-apple-fade-in">
            {/* Avatar Preview */}
            <div className="relative group">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-tr from-apple-blue to-apple-purple flex items-center justify-center text-white text-4xl font-bold shadow-apple-card border-4 border-white/40 dark:border-white/10">
                {currentAvatarSrc ? (
                  <img
                    src={currentAvatarSrc}
                    alt={user?.full_name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span>{user?.full_name?.charAt(0).toUpperCase() || 'U'}</span>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 p-2.5 rounded-full bg-apple-blue text-white shadow-lg hover:bg-blue-600 apple-press transition-colors border-2 border-white dark:border-[#1C1C1E]"
                title="Change Photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />

            <div className="text-center space-y-1">
              <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                {user?.full_name}
              </h4>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Upload a professional avatar picture. Supports JPG, PNG, WEBP up to 5MB.
              </p>
            </div>

            {/* Photo Action Buttons */}
            <div className="flex items-center gap-3">
              {selectedFile ? (
                <>
                  <AppleButton
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null);
                      setPreviewUrl(null);
                    }}
                    disabled={photoUploading}
                  >
                    Cancel
                  </AppleButton>
                  <AppleButton
                    variant="primary"
                    size="sm"
                    icon={<Camera className="w-4 h-4" />}
                    onClick={handleUploadPhoto}
                    loading={photoUploading}
                  >
                    Save New Photo
                  </AppleButton>
                </>
              ) : (
                <>
                  <AppleButton
                    variant="primary"
                    size="sm"
                    icon={<Camera className="w-4 h-4" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Choose Photo
                  </AppleButton>

                  {user?.avatar_url && (
                    <AppleButton
                      variant="destructive"
                      size="sm"
                      icon={<Trash2 className="w-4 h-4" />}
                      onClick={handleDeletePhoto}
                      loading={photoUploading}
                    >
                      Remove Photo
                    </AppleButton>
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Personal Information */}
        {activeTab === 'info' && (
          <form onSubmit={handleSaveInfo} className="space-y-4 animate-apple-fade-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-xs">
              <div>
                <span className="text-neutral-400 font-semibold text-[10px] uppercase">Account Role</span>
                <div className="mt-1">
                  <AppleBadge variant={roleVariant} size="sm">
                    {user?.role.replace('_', ' ')}
                  </AppleBadge>
                </div>
              </div>

              <div>
                <span className="text-neutral-400 font-semibold text-[10px] uppercase">Department Unit</span>
                <p className="font-semibold text-neutral-800 dark:text-neutral-200 mt-1">
                  {user?.department_name || 'Academic Division'}
                </p>
              </div>
            </div>

            <AppleInput
              label="Full Legal Name *"
              icon={<User className="w-4 h-4" />}
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />

            <AppleInput
              label="University Email Address *"
              type="email"
              icon={<Mail className="w-4 h-4" />}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <div className="pt-2 flex justify-end">
              <AppleButton
                type="submit"
                variant="primary"
                size="md"
                loading={infoSaving}
              >
                Save Details
              </AppleButton>
            </div>
          </form>
        )}

        {/* Tab 3: Change Password (with Hide & Show Option) */}
        {activeTab === 'password' && (
          <form onSubmit={handleChangePassword} className="space-y-4 animate-apple-fade-in">
            <p className="text-xs text-neutral-500">
              Update your secure access password. Click the eye icon on any field to show or hide the entered characters.
            </p>

            <AppleInput
              label="Current Password *"
              type="password"
              placeholder="••••••••"
              icon={<KeyRound className="w-4 h-4" />}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />

            <AppleInput
              label="New Password (min 6 characters) *"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />

            <AppleInput
              label="Confirm New Password *"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />

            <div className="pt-2 flex justify-end">
              <AppleButton
                type="submit"
                variant="primary"
                size="md"
                loading={passwordSaving}
              >
                Update Password
              </AppleButton>
            </div>
          </form>
        )}
      </div>
    </AppleModal>
  );
};
