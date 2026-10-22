import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Department, User } from '../../types';
import { AppleCard } from '../../components/ui/AppleCard';
import { AppleButton } from '../../components/ui/AppleButton';
import { AppleInput } from '../../components/ui/AppleInput';
import { AppleSelect } from '../../components/ui/AppleSelect';
import { AppleBadge } from '../../components/ui/AppleBadge';
import { AppleModal } from '../../components/ui/AppleModal';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Building, Plus, Edit2, Trash2, Users, FileText, GitFork } from 'lucide-react';

export const AdminDepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [facultyUsers, setFacultyUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deleteTargetDept, setDeleteTargetDept] = useState<Department | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    head_user_id: '',
    parent_dept_id: '',
    is_active: true,
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptsRes, usersRes] = await Promise.all([
        api.departments.list(),
        api.users.list({ limit: 100 }),
      ]);
      setDepartments(deptsRes.data);
      setFacultyUsers(usersRes.data.filter((u) => ['DEPT_ADMIN', 'FACULTY', 'SUPER_ADMIN'].includes(u.role)));
    } catch (err: any) {
      showToast('error', 'Failed to load departments', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingDept(null);
    setFormData({
      name: '',
      code: '',
      head_user_id: '',
      parent_dept_id: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      name: dept.name,
      code: dept.code,
      head_user_id: dept.head_user_id || '',
      parent_dept_id: dept.parent_dept_id || '',
      is_active: dept.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.code) {
      showToast('warning', 'Required', 'Department name and code are required');
      return;
    }

    setSaving(true);
    try {
      if (editingDept) {
        await api.departments.update(editingDept.department_id, formData);
        showToast('success', 'Department Updated', 'Changes saved successfully.');
      } else {
        await api.departments.create(formData);
        showToast('success', 'Department Created', 'New university department added.');
      }
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', 'Operation Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTargetDept) return;
    setSaving(true);
    try {
      const res = await api.departments.delete(deleteTargetDept.department_id);
      showToast('info', 'Department Removed', (res.data as any)?.message || 'Department removed.');
      setDeleteTargetDept(null);
      loadData();
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<Department>[] = [
    {
      header: 'Department Name & Code',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-500/10 text-apple-purple flex-shrink-0">
            <Building className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-neutral-900 dark:text-white">{row.name}</span>
            <p className="text-xs font-mono text-apple-purple mt-0.5">{row.code}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Department Head',
      accessorKey: 'head_user_name',
      cell: (row) => (
        <span className="text-xs text-neutral-700 dark:text-neutral-300">
          {row.head_user_name ? `${row.head_user_name} (${row.head_user_email || ''})` : '— Unassigned —'}
        </span>
      ),
    },
    {
      header: 'Parent Unit',
      accessorKey: 'parent_dept_name',
      cell: (row) => (
        <span className="text-xs text-neutral-500">
          {row.parent_dept_name || 'Top-Level Division'}
        </span>
      ),
    },
    {
      header: 'Users',
      accessorKey: 'user_count',
      cell: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-400">
          <Users className="w-3.5 h-3.5" />
          <span>{row.user_count || 0}</span>
        </div>
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
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
            title="Edit Department"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteTargetDept(row)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-apple-red hover:bg-red-500/10"
            title="Delete / Deactivate"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-apple-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Building className="w-6 h-6 text-apple-purple" />
            Department Management
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Configure academic schools, divisions, department heads, and hierarchy trees.
          </p>
        </div>

        <AppleButton
          variant="primary"
          size="md"
          icon={<Plus className="w-4 h-4" />}
          onClick={openCreateModal}
        >
          Add Department
        </AppleButton>
      </div>

      <DataTable
        columns={columns}
        data={departments}
        loading={loading}
        emptyTitle="No departments found"
        emptyDescription="Create your first academic department."
      />

      {/* Modal */}
      {isModalOpen && (
        <AppleModal
          isOpen={true}
          onClose={() => setIsModalOpen(false)}
          title={editingDept ? `Edit Department: ${editingDept.name}` : 'Create Academic Department'}
          subtitle="Define organizational structure, code, and assign department chair."
          maxWidth="md"
          actions={
            <>
              <AppleButton variant="secondary" onClick={() => setIsModalOpen(false)} disabled={saving}>
                Cancel
              </AppleButton>
              <AppleButton variant="primary" onClick={handleSubmit} loading={saving}>
                {editingDept ? 'Save Changes' : 'Create Department'}
              </AppleButton>
            </>
          }
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <AppleInput
              label="Department Name *"
              placeholder="e.g. Computer Science & Engineering"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />

            <AppleInput
              label="Department Code *"
              placeholder="e.g. CSE"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              required
            />

            <AppleSelect
              label="Department Head / Chair"
              value={formData.head_user_id}
              onChange={(e) => setFormData({ ...formData, head_user_id: e.target.value })}
            >
              <option value="">Select Faculty / Chair...</option>
              {facultyUsers.map((u) => (
                <option key={u.user_id} value={u.user_id}>
                  {u.full_name} ({u.role}) - {u.email}
                </option>
              ))}
            </AppleSelect>

            <AppleSelect
              label="Parent Division (Hierarchy)"
              value={formData.parent_dept_id}
              onChange={(e) => setFormData({ ...formData, parent_dept_id: e.target.value })}
            >
              <option value="">None (Top-Level Unit)</option>
              {departments
                .filter((d) => !editingDept || d.department_id !== editingDept.department_id)
                .map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.name} ({d.code})
                  </option>
                ))}
            </AppleSelect>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="dept-active-check"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="rounded text-apple-blue focus:ring-apple-blue"
              />
              <label htmlFor="dept-active-check" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                Department Active
              </label>
            </div>
          </form>
        </AppleModal>
      )}

      {/* Delete / Deactivate Confirm Dialog */}
      {deleteTargetDept && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteTargetDept(null)}
          onConfirm={handleDelete}
          title="Delete or Deactivate Department"
          message={`Are you sure you want to delete ${deleteTargetDept.name}? If any users or documents are attached, it will be deactivated safely.`}
          confirmLabel="Delete / Deactivate"
          destructive
          loading={saving}
        />
      )}
    </div>
  );
};
