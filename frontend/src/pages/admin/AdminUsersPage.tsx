import React, { useState, useEffect } from 'react';
import { api, downloadWithAuth } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { User, Department, UserRole } from '../../types';
import { AppleCard } from '../../components/ui/AppleCard';
import { AppleButton } from '../../components/ui/AppleButton';
import { AppleInput } from '../../components/ui/AppleInput';
import { AppleSelect } from '../../components/ui/AppleSelect';
import { AppleBadge } from '../../components/ui/AppleBadge';
import { AppleModal } from '../../components/ui/AppleModal';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  Users,
  UserPlus,
  Search,
  Download,
  Edit2,
  Lock,
  Power,
  Trash2,
  Shield,
  KeyRound,
} from 'lucide-react';

export const AdminUsersPage: React.FC = () => {
  const { user: currentUser, isAdmin } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<User | null>(null);
  const [deleteTargetUser, setDeleteTargetUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'STUDENT' as UserRole,
    department_id: '',
    employee_id: '',
  });
  const [editFormData, setEditFormData] = useState({
    email: '',
    full_name: '',
    role: 'STUDENT' as UserRole,
    department_id: '',
    employee_id: '',
    is_active: true,
  });
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Debounce search so typing doesn't fire one API call per keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        api.users.list({
          page,
          limit: 10,
          search: debouncedSearch.trim() || undefined,
          role: roleFilter || undefined,
          department_id: deptFilter || undefined,
          status: statusFilter || undefined,
        }),
        api.departments.list(),
      ]);
      setUsers(usersRes.data);
      setTotal(usersRes.meta?.total || 0);
      setTotalPages(usersRes.meta?.totalPages || 1);
      setDepartments(deptsRes.data);
    } catch (err: any) {
      showToast('error', 'Error loading users', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, roleFilter, deptFilter, statusFilter]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.full_name) {
      showToast('warning', 'Missing Fields', 'Please complete required fields');
      return;
    }

    setSaving(true);
    try {
      await api.users.create(formData);
      showToast('success', 'User Created', 'New user account successfully provisioned.');
      setIsCreateModalOpen(false);
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'STUDENT',
        department_id: '',
        employee_id: '',
      });
      loadData();
    } catch (err: any) {
      showToast('error', 'Create Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setSaving(true);
    try {
      await api.users.update(editingUser.user_id, editFormData);
      showToast('success', 'User Updated', 'Profile and permissions saved.');
      setEditingUser(null);
      loadData();
    } catch (err: any) {
      showToast('error', 'Update Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    try {
      const res = await api.users.toggleStatus(user.user_id);
      showToast('info', 'Status Changed', res.data.message);
      loadData();
    } catch (err: any) {
      showToast('error', 'Failed to toggle status', err.message);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPasswordUser || !newPassword || newPassword.length < 6) {
      showToast('warning', 'Invalid Password', 'Must be at least 6 characters');
      return;
    }

    setSaving(true);
    try {
      await api.users.resetPassword(resetPasswordUser.user_id, newPassword);
      showToast('success', 'Password Reset', `Password updated for ${resetPasswordUser.email}`);
      setResetPasswordUser(null);
      setNewPassword('');
    } catch (err: any) {
      showToast('error', 'Reset Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetUser) return;
    setSaving(true);
    try {
      const res = await api.users.delete(deleteTargetUser.user_id);
      showToast('info', 'Action Completed', (res.data as any)?.message || 'User deleted/deactivated.');
      setDeleteTargetUser(null);
      loadData();
    } catch (err: any) {
      showToast('error', 'Action Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (u: User) => {
    setEditingUser(u);
    setEditFormData({
      email: u.email,
      full_name: u.full_name,
      role: u.role,
      department_id: u.department_id || '',
      employee_id: u.employee_id || '',
      is_active: u.is_active,
    });
  };

  const roleVariants: Record<UserRole, any> = {
    SUPER_ADMIN: 'red',
    DEPT_ADMIN: 'purple',
    FACULTY: 'blue',
    STUDENT: 'teal',
  };

  const columns: Column<User>[] = [
    {
      header: 'Full Name & Email',
      accessorKey: 'full_name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-apple-blue/10 dark:bg-apple-blue/20 text-apple-blue flex items-center justify-center font-bold text-xs border border-apple-blue/20 flex-shrink-0">
            {row.avatar_url ? (
              <img src={row.avatar_url} alt={row.full_name} className="w-full h-full object-cover" />
            ) : (
              <span>{row.full_name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <span className="font-semibold text-neutral-900 dark:text-white truncate block">{row.full_name}</span>
            <p className="text-xs text-neutral-400 truncate">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessorKey: 'role',
      cell: (row) => (
        <AppleBadge variant={roleVariants[row.role] || 'gray'} size="sm">
          {row.role.replace('_', ' ')}
        </AppleBadge>
      ),
    },
    {
      header: 'Department',
      accessorKey: 'department_name',
      cell: (row) => (
        <span className="text-xs text-neutral-700 dark:text-neutral-300">
          {row.department_name || '—'}
        </span>
      ),
    },
    {
      header: 'Identifier',
      accessorKey: 'employee_id',
      cell: (row) => (
        <span className="text-xs font-mono text-neutral-500">
          {row.employee_id || '—'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'is_active',
      cell: (row) => (
        <AppleBadge variant={row.is_active ? 'green' : 'gray'} size="sm" dot>
          {row.is_active ? 'Active' : 'Inactive'}
        </AppleBadge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => openEditModal(row)}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
            title="Edit User Profile"
            aria-label={`Edit ${row.full_name}`}
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleToggleStatus(row)}
            className={`p-2 rounded-lg ${row.is_active ? 'text-neutral-400 hover:text-apple-orange hover:bg-amber-500/10' : 'text-neutral-400 hover:text-apple-green hover:bg-emerald-500/10'}`}
            title={row.is_active ? 'Deactivate User' : 'Activate User'}
            aria-label={row.is_active ? `Deactivate ${row.full_name}` : `Activate ${row.full_name}`}
          >
            <Power className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              setResetPasswordUser(row);
              setNewPassword('');
            }}
            className="p-2 rounded-lg text-neutral-500 hover:text-apple-purple hover:bg-purple-500/10"
            title="Admin Reset Password"
            aria-label={`Reset password for ${row.full_name}`}
          >
            <KeyRound className="w-5 h-5" />
          </button>
          <button
            onClick={() => setDeleteTargetUser(row)}
            className="p-2 rounded-lg text-neutral-400 hover:text-apple-red hover:bg-red-500/10"
            title="Delete / Safe Deactivate"
            aria-label={`Delete ${row.full_name}`}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-apple-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Users className="w-6 h-6 text-apple-blue" />
            User Management & RBAC
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Provision accounts, assign departmental roles, toggle active status, and export rosters.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AppleButton
            variant="glass"
            size="md"
            icon={<Download className="w-5 h-5" />}
            loading={exporting}
            onClick={async () => {
              if (exporting) return;
              setExporting(true);
              try {
                await downloadWithAuth('/users/export/csv', 'iudwas-users.csv');
                showToast('success', 'Export Ready', 'User roster downloaded as CSV.');
              } catch (err: any) {
                showToast('error', 'Export Failed', err.message);
              } finally {
                setExporting(false);
              }
            }}
          >
            Export CSV
          </AppleButton>
          <AppleButton
            variant="primary"
            size="md"
            icon={<UserPlus className="w-5 h-5" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add New User
          </AppleButton>
        </div>
      </div>

      {/* Filters Toolbar */}
      <AppleCard className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-4">
            <AppleInput
              placeholder="Search by name, email, or employee ID..."
              icon={<Search className="w-5 h-5" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="lg:col-span-3">
            <AppleSelect
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="DEPT_ADMIN">Dept Admin</option>
              <option value="FACULTY">Faculty</option>
              <option value="STUDENT">Student</option>
            </AppleSelect>
          </div>

          <div className="lg:col-span-3">
            <AppleSelect
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.name}
                </option>
              ))}
            </AppleSelect>
          </div>

          <div className="lg:col-span-2">
            <AppleSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="active">Active Accounts</option>
              <option value="inactive">Deactivated</option>
            </AppleSelect>
          </div>
        </div>
      </AppleCard>

      {/* DataTable */}
      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        page={page}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyTitle="No users found"
        emptyDescription="Adjust your search filters or click Add New User above."
      />

      {/* Create User Modal */}
      <AppleModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Provision New University Account"
        subtitle="Create an authenticated user profile with assigned RBAC permissions."
        maxWidth="2xl"
        actions={
          <>
            <AppleButton variant="secondary" onClick={() => setIsCreateModalOpen(false)} disabled={saving}>
              Cancel
            </AppleButton>
            <AppleButton variant="primary" onClick={handleCreateSubmit} loading={saving}>
              Create User
            </AppleButton>
          </>
        }
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <AppleInput
            label="Full Name *"
            placeholder="e.g. Dr. Alan Turing"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            required
          />

          <AppleInput
            label="University Email *"
            type="email"
            placeholder="e.g. a.turing@iudwas.edu"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <AppleInput
            label="Initial Password *"
            type="password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppleSelect
              label="Role Assignment *"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
            >
              <option value="STUDENT">Student</option>
              <option value="FACULTY">Faculty Member</option>
              <option value="DEPT_ADMIN">Department Admin</option>
              {/* Only a Super Admin may provision admin-level accounts; Dept
                  Admins are restricted server-side, so hide these options. */}
              {isAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
            </AppleSelect>

            <AppleSelect
              label="Department"
              value={formData.department_id}
              onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
            >
              <option value="">No Specific Department</option>
              {departments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </AppleSelect>
          </div>

          <AppleInput
            label="Employee / Student ID"
            placeholder="e.g. EMP-2026-99"
            value={formData.employee_id}
            onChange={(e) => setFormData({ ...formData, employee_id: e.target.value })}
          />
        </form>
      </AppleModal>

      {/* Edit User Modal */}
      {editingUser && (
        <AppleModal
          isOpen={true}
          onClose={() => setEditingUser(null)}
          title={`Edit User: ${editingUser.full_name}`}
          subtitle="Update user details, departmental affiliation, and security status."
          maxWidth="2xl"
          actions={
            <>
              <AppleButton variant="secondary" onClick={() => setEditingUser(null)} disabled={saving}>
                Cancel
              </AppleButton>
              <AppleButton variant="primary" onClick={handleEditSubmit} loading={saving}>
                Save Changes
              </AppleButton>
            </>
          }
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            {/* Avatar Preview & Upload */}
            <div className="flex items-center gap-4 p-3 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
              <div className="w-14 h-14 rounded-full overflow-hidden bg-apple-blue/10 dark:bg-apple-blue/20 text-apple-blue flex items-center justify-center font-bold text-xl border border-apple-blue/20 flex-shrink-0">
                {editingUser.avatar_url ? (
                  <img src={editingUser.avatar_url} alt={editingUser.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span>{editingUser.full_name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              <div className="space-y-1 text-xs">
                <p className="font-semibold text-neutral-800 dark:text-neutral-200">User Profile Photo</p>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="text-xs text-neutral-500 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-apple-blue/10 file:text-apple-blue hover:file:bg-apple-blue/20 cursor-pointer"
                  onChange={async (e) => {
                    if (e.target.files && e.target.files[0] && editingUser) {
                      const file = e.target.files[0];
                      const formData = new FormData();
                      formData.append('avatar', file);
                      try {
                        const res = await api.users.uploadAvatar(editingUser.user_id, formData);
                        setEditingUser(res.data.user);
                        showToast('success', 'Avatar Updated', 'Profile photo uploaded.');
                        loadData();
                      } catch (err: any) {
                        showToast('error', 'Upload Failed', err.message);
                      }
                    }
                  }}
                />
              </div>
            </div>

            <AppleInput
              label="Full Name *"
              value={editFormData.full_name}
              onChange={(e) => setEditFormData({ ...editFormData, full_name: e.target.value })}
              required
            />

            <AppleInput
              label="Email Address *"
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              required
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <AppleSelect
                label="Role *"
                value={editFormData.role}
                onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value as UserRole })}
              >
                <option value="STUDENT">Student</option>
                <option value="FACULTY">Faculty Member</option>
                <option value="DEPT_ADMIN">Department Admin</option>
                <option value="SUPER_ADMIN">Super Admin</option>
              </AppleSelect>

              <AppleSelect
                label="Department"
                value={editFormData.department_id}
                onChange={(e) => setEditFormData({ ...editFormData, department_id: e.target.value })}
              >
                <option value="">No Department</option>
                {departments.map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.name} ({d.code})
                  </option>
                ))}
              </AppleSelect>
            </div>

            <AppleInput
              label="Employee / Student ID"
              value={editFormData.employee_id}
              onChange={(e) => setEditFormData({ ...editFormData, employee_id: e.target.value })}
            />

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="edit-active-check"
                checked={editFormData.is_active}
                onChange={(e) => setEditFormData({ ...editFormData, is_active: e.target.checked })}
                className="rounded text-apple-blue focus:ring-apple-blue"
              />
              <label htmlFor="edit-active-check" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Account Active
              </label>
            </div>
          </form>
        </AppleModal>
      )}

      {/* Admin Reset Password Modal */}
      {resetPasswordUser && (
        <AppleModal
          isOpen={true}
          onClose={() => setResetPasswordUser(null)}
          title={`Reset Password for ${resetPasswordUser.full_name}`}
          subtitle={`Account: ${resetPasswordUser.email}`}
          maxWidth="xl"
          actions={
            <>
              <AppleButton variant="secondary" onClick={() => setResetPasswordUser(null)} disabled={saving}>
                Cancel
              </AppleButton>
              <AppleButton variant="primary" onClick={handlePasswordReset} loading={saving}>
                Update Password
              </AppleButton>
            </>
          }
        >
          <form onSubmit={handlePasswordReset} className="space-y-4">
            <p className="text-xs text-neutral-500">
              Enter a temporary or new password. All active login sessions for this account will be invalidated immediately.
            </p>
            <AppleInput
              label="New Password (min 6 chars) *"
              type="password"
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </form>
        </AppleModal>
      )}

      {/* Delete / Deactivate Confirm Dialog */}
      {deleteTargetUser && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteTargetUser(null)}
          onConfirm={handleDelete}
          title="Delete or Deactivate User Account"
          message={`Are you sure you want to delete ${deleteTargetUser.full_name} (${deleteTargetUser.email})? If this user has uploaded documents or workflows, they will be safely deactivated to protect audit integrity.`}
          confirmLabel="Delete / Deactivate"
          destructive
          loading={saving}
        />
      )}
    </div>
  );
};
