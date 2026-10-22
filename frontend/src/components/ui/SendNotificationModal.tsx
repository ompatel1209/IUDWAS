import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import { Department, User } from '../../types';
import { AppleModal } from './AppleModal';
import { AppleButton } from './AppleButton';
import { AppleInput } from './AppleInput';
import { AppleSelect } from './AppleSelect';
import { AppleBadge } from './AppleBadge';
import { Send, ShieldCheck, CheckCircle, UserCheck, AlertCircle, Sparkles, Building, Users } from 'lucide-react';

interface SendNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const SendNotificationModal: React.FC<SendNotificationModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, isAdmin, isDeptAdmin, isFaculty } = useAuth();
  const { showToast, celebrate } = useToast();

  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<'NORMAL' | 'IMPORTANT' | 'URGENT' | 'ANNOUNCEMENT'>('NORMAL');
  const [targetType, setTargetType] = useState<'ALL' | 'DEPARTMENT' | 'ROLE' | 'USER'>('ALL');
  const [targetDeptId, setTargetDeptId] = useState<string>('');
  const [targetRole, setTargetRole] = useState<string>('STUDENT');
  const [targetUserId, setTargetUserId] = useState<string>('');
  const [confirmedSignature, setConfirmedSignature] = useState(false);
  const [sending, setSending] = useState(false);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadDependencies();
      // Reset form
      setTitle('');
      setMessage('');
      setPriority('NORMAL');
      setTargetType('ALL');
      setTargetDeptId(user?.department_id || '');
      setTargetRole('STUDENT');
      setTargetUserId('');
      setConfirmedSignature(false);
    }
  }, [isOpen]);

  const loadDependencies = async () => {
    setLoadingData(true);
    try {
      const [deptRes, usersRes] = await Promise.all([
        api.departments.list().catch(() => ({ data: [] })),
        api.users.list({ limit: 100 }).catch(() => ({ data: [] })),
      ]);
      setDepartments(deptRes.data || []);
      setUsersList(usersRes.data || []);
    } catch {
      // Ignore
    } finally {
      setLoadingData(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      showToast('warning', 'Missing Fields', 'Please provide a title and announcement message.');
      return;
    }

    if (!confirmedSignature) {
      showToast('warning', 'Signature Required', 'Please confirm and digitally sign this notification.');
      return;
    }

    if (targetType === 'DEPARTMENT' && !targetDeptId) {
      showToast('warning', 'Department Required', 'Please select a target department.');
      return;
    }

    if (targetType === 'USER' && !targetUserId) {
      showToast('warning', 'Recipient Required', 'Please select a recipient user.');
      return;
    }

    setSending(true);
    try {
      const res = await api.notifications.send({
        title: title.trim(),
        message: message.trim(),
        priority,
        target_type: targetType,
        target_department_id: targetType === 'DEPARTMENT' ? targetDeptId : (targetType === 'ROLE' ? targetDeptId || null : null),
        target_role: targetType === 'ROLE' ? targetRole : null,
        target_user_id: targetType === 'USER' ? targetUserId : null,
        confirm_signature: true,
      });

      showToast('success', 'Notification Dispatched', res.data.message);
      celebrate();
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast('error', 'Dispatch Failed', err.message);
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  const roleLabel = {
    SUPER_ADMIN: 'Super Administrator',
    DEPT_ADMIN: 'Department Administrator',
    FACULTY: 'Faculty Member',
    STUDENT: 'Student',
  }[user?.role || 'STUDENT'];

  return (
    <AppleModal
      isOpen={isOpen}
      onClose={onClose}
      title="Dispatch Official Signed Notification"
      subtitle="Broadcast authenticated announcements with verified digital signature."
      maxWidth="xl"
      actions={
        <>
          <AppleButton variant="secondary" onClick={onClose} disabled={sending}>
            Cancel
          </AppleButton>
          <AppleButton
            variant="primary"
            icon={<Send className="w-4 h-4" />}
            onClick={handleSend}
            loading={sending}
            disabled={!confirmedSignature || !title.trim() || !message.trim()}
          >
            Digitally Sign & Dispatch
          </AppleButton>
        </>
      }
    >
      <form onSubmit={handleSend} className="space-y-5">
        {/* Recipient Audience & Priority Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <AppleSelect
            label="Recipient Audience *"
            value={targetType}
            onChange={(e) => setTargetType(e.target.value as any)}
          >
            {isAdmin && <option value="ALL">All University Members (Global Broadcast)</option>}
            {isDeptAdmin && <option value="ALL">Entire Department Division</option>}
            {isFaculty && <option value="ALL">All Department Members</option>}
            <option value="DEPARTMENT">Specific Department</option>
            <option value="ROLE">Specific Role Group</option>
            <option value="USER">Specific Individual User</option>
          </AppleSelect>

          <AppleSelect
            label="Priority Level *"
            value={priority}
            onChange={(e) => setPriority(e.target.value as any)}
          >
            <option value="NORMAL">Normal (Standard Update)</option>
            <option value="IMPORTANT">Important (Action Needed)</option>
            <option value="URGENT">Urgent (Immediate Attention)</option>
            <option value="ANNOUNCEMENT">Official University Notice</option>
          </AppleSelect>
        </div>

        {/* Dynamic target filters */}
        {targetType === 'DEPARTMENT' && (
          <AppleSelect
            label="Select Target Department *"
            value={targetDeptId}
            onChange={(e) => setTargetDeptId(e.target.value)}
            required
          >
            <option value="">Choose Department...</option>
            {departments.map((d) => (
              <option key={d.department_id} value={d.department_id}>
                {d.name} ({d.code})
              </option>
            ))}
          </AppleSelect>
        )}

        {targetType === 'ROLE' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppleSelect
              label="Target Role *"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            >
              <option value="STUDENT">All Students</option>
              <option value="FACULTY">All Faculty</option>
              <option value="DEPT_ADMIN">Department Admins</option>
              {isAdmin && <option value="SUPER_ADMIN">Super Admins</option>}
            </AppleSelect>

            <AppleSelect
              label="Department Filter (Optional)"
              value={targetDeptId}
              onChange={(e) => setTargetDeptId(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </AppleSelect>
          </div>
        )}

        {targetType === 'USER' && (
          <AppleSelect
            label="Select Target Recipient *"
            value={targetUserId}
            onChange={(e) => setTargetUserId(e.target.value)}
            required
          >
            <option value="">Select a user...</option>
            {usersList.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.full_name} ({u.email}) — {u.role.replace('_', ' ')}
              </option>
            ))}
          </AppleSelect>
        )}

        {/* Notification Title & Content */}
        <AppleInput
          label="Notification Headline / Subject *"
          placeholder="e.g. End-of-Semester Grade Submission Deadline"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="space-y-1.5 text-left">
          <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">
            Announcement Message Body *
          </label>
          <textarea
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type your official announcement or message here. Markdown formatting is supported..."
            className="w-full rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 p-3.5 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue resize-none transition-all"
            required
          />
        </div>

        {/* Digital Signature & Identity Verification Card */}
        <div className="p-4 rounded-2xl bg-apple-blue/[0.04] dark:bg-apple-blue/[0.08] border border-apple-blue/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-apple-blue font-semibold text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>Cryptographic Sender Signature & Identity Seal</span>
            </div>
            <AppleBadge variant="blue" size="sm">
              Official Seal
            </AppleBadge>
          </div>

          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-white/70 dark:bg-black/40 border border-black/5 dark:border-white/10">
            <div className="w-10 h-10 rounded-full overflow-hidden bg-gradient-to-tr from-apple-blue to-apple-purple flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {user?.avatar_url ? (
                <img src={user.avatar_url} alt={user.full_name} className="w-full h-full object-cover" />
              ) : (
                <span>{user?.full_name?.charAt(0).toUpperCase() || 'U'}</span>
              )}
            </div>
            <div className="min-w-0 flex-1 text-xs">
              <p className="font-bold text-neutral-900 dark:text-white truncate">
                {user?.full_name}
              </p>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                {roleLabel} · {user?.department_name || 'Academic Administration'}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 pt-1">
            <input
              type="checkbox"
              id="confirm-sig-check"
              checked={confirmedSignature}
              onChange={(e) => setConfirmedSignature(e.target.checked)}
              className="mt-0.5 rounded text-apple-blue focus:ring-apple-blue w-4 h-4 cursor-pointer"
            />
            <label
              htmlFor="confirm-sig-check"
              className="text-xs font-medium text-neutral-700 dark:text-neutral-300 leading-snug cursor-pointer select-none"
            >
              I officially confirm and digitally sign this notification as{' '}
              <span className="font-bold text-apple-blue">{user?.full_name}</span>. A unique verification hash will be sealed to the record.
            </label>
          </div>
        </div>
      </form>
    </AppleModal>
  );
};
