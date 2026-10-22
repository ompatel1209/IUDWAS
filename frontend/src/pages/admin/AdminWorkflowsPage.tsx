import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { WorkflowTemplate, WorkflowStep, Department, UserRole } from '../../types';
import { AppleCard } from '../../components/ui/AppleCard';
import { AppleButton } from '../../components/ui/AppleButton';
import { AppleInput } from '../../components/ui/AppleInput';
import { AppleSelect } from '../../components/ui/AppleSelect';
import { AppleBadge } from '../../components/ui/AppleBadge';
import { AppleModal } from '../../components/ui/AppleModal';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import {
  CheckSquare,
  Plus,
  Edit2,
  Copy,
  Trash2,
  ArrowDown,
  ArrowUp,
  Clock,
  Layers,
  Shield,
  FileText,
} from 'lucide-react';

export const AdminWorkflowsPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<WorkflowTemplate[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [isBuilderModalOpen, setIsBuilderModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WorkflowTemplate | null>(null);
  const [saving, setSaving] = useState(false);

  // Template Form State
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateDept, setTemplateDept] = useState('');
  const [templateSla, setTemplateSla] = useState(5);
  const [autoEscalate, setAutoEscalate] = useState(true);
  const [steps, setSteps] = useState<Partial<WorkflowStep>[]>([
    { step_name: 'Advisor / Faculty Review', approver_role: 'FACULTY', sla_hours: 48 },
    { step_name: 'Department Chair Approval', approver_role: 'DEPT_ADMIN', sla_hours: 48 },
  ]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [wfRes, deptsRes] = await Promise.all([
        api.workflows.list(),
        api.departments.list(),
      ]);
      setWorkflows(wfRes.data);
      setDepartments(deptsRes.data);
    } catch (err: any) {
      showToast('error', 'Error loading workflows', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateBuilder = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplateDesc('');
    setTemplateDept('');
    setTemplateSla(5);
    setAutoEscalate(true);
    setSteps([
      { step_name: 'Advisor / Faculty Review', approver_role: 'FACULTY', sla_hours: 48 },
      { step_name: 'Department Chair Approval', approver_role: 'DEPT_ADMIN', sla_hours: 48 },
    ]);
    setIsBuilderModalOpen(true);
  };

  const openEditBuilder = async (wf: WorkflowTemplate) => {
    try {
      const res = await api.workflows.get(wf.workflow_id);
      const full = res.data;
      setEditingTemplate(full);
      setTemplateName(full.name);
      setTemplateDesc(full.description || '');
      setTemplateDept(full.department_id || '');
      setTemplateSla(full.max_days_sla);
      setAutoEscalate(full.auto_escalate);
      setSteps(full.steps || []);
      setIsBuilderModalOpen(true);
    } catch (err: any) {
      showToast('error', 'Failed to load workflow details', err.message);
    }
  };

  const handleDuplicate = async (wfId: string) => {
    try {
      await api.workflows.duplicate(wfId);
      showToast('success', 'Workflow Cloned', 'New copy template created.');
      loadData();
    } catch (err: any) {
      showToast('error', 'Duplicate Failed', err.message);
    }
  };

  const addStep = () => {
    setSteps((prev) => [
      ...prev,
      {
        step_name: `Approval Step ${prev.length + 1}`,
        approver_role: 'FACULTY',
        sla_hours: 48,
      },
    ]);
  };

  const removeStep = (idx: number) => {
    if (steps.length <= 1) {
      showToast('warning', 'Minimum 1 Step', 'A workflow must have at least one step');
      return;
    }
    setSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const moveStep = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= steps.length) return;
    const newSteps = [...steps];
    const temp = newSteps[idx];
    newSteps[idx] = newSteps[targetIdx];
    newSteps[targetIdx] = temp;
    setSteps(newSteps);
  };

  const handleSaveWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateName.trim()) {
      showToast('warning', 'Missing Name', 'Workflow template name is required');
      return;
    }
    if (steps.length === 0) {
      showToast('warning', 'Steps Required', 'Add at least one approval step');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: templateName.trim(),
        description: templateDesc.trim() || undefined,
        department_id: templateDept || undefined,
        max_days_sla: Number(templateSla),
        auto_escalate: autoEscalate,
        steps: steps.map((s, idx) => ({
          step_order: idx + 1,
          step_name: s.step_name || `Step ${idx + 1}`,
          approver_role: s.approver_role || 'FACULTY',
          sla_hours: Number(s.sla_hours || 48),
        })),
      };

      if (editingTemplate) {
        await api.workflows.update(editingTemplate.workflow_id, payload);
        showToast('success', 'Template Updated', 'Workflow saved successfully.');
      } else {
        await api.workflows.create(payload);
        showToast('success', 'Workflow Created', 'New workflow template ready for submissions.');
      }
      setIsBuilderModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', 'Save Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await api.workflows.delete(deleteTarget.workflow_id);
      showToast('info', 'Action Completed', (res.data as any)?.message || 'Workflow removed.');
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns: Column<WorkflowTemplate>[] = [
    {
      header: 'Workflow Name',
      accessorKey: 'name',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-apple-orange flex-shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="font-semibold text-neutral-900 dark:text-white">{row.name}</span>
            <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{row.description || 'No description'}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Department Scope',
      accessorKey: 'department_name',
      cell: (row) => (
        <span className="text-xs text-neutral-700 dark:text-neutral-300">
          {row.department_name || 'University-Wide'}
        </span>
      ),
    },
    {
      header: 'Approval Steps',
      accessorKey: 'step_count',
      cell: (row) => (
        <AppleBadge variant="blue" size="sm">
          {row.step_count || 0} Levels
        </AppleBadge>
      ),
    },
    {
      header: 'Max SLA',
      accessorKey: 'max_days_sla',
      cell: (row) => (
        <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300 flex items-center gap-1">
          <Clock className="w-3 h-3 text-apple-orange" />
          <span>{row.max_days_sla} Days</span>
        </span>
      ),
    },
    {
      header: 'Active Runs',
      accessorKey: 'instance_count',
      cell: (row) => <span className="text-xs font-mono">{row.instance_count || 0} runs</span>,
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => openEditBuilder(row)}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
            title="Design Workflow Steps"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleDuplicate(row.workflow_id)}
            className="p-2 rounded-lg text-neutral-500 hover:text-apple-blue hover:bg-black/5 dark:hover:bg-white/10"
            title="Duplicate Template"
          >
            <Copy className="w-5 h-5" />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="p-2 rounded-lg text-neutral-400 hover:text-apple-red hover:bg-red-500/10"
            title="Delete / Archive"
          >
            <Trash2 className="w-5 h-5" />
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
            <CheckSquare className="w-6 h-6 text-apple-orange" />
            Visual Workflow Template Designer
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Build multi-level sequential and parallel approval paths with SLA deadlines.
          </p>
        </div>

        <AppleButton
          variant="primary"
          size="md"
          icon={<Plus className="w-5 h-5" />}
          onClick={openCreateBuilder}
        >
          Create Workflow Template
        </AppleButton>
      </div>

      <DataTable
        columns={columns}
        data={workflows}
        loading={loading}
        emptyTitle="No workflow templates configured"
        emptyDescription="Click Create Workflow Template to build your first approval chain."
      />

      {/* Visual Workflow Builder Modal */}
      {isBuilderModalOpen && (
        <AppleModal
          isOpen={true}
          onClose={() => setIsBuilderModalOpen(false)}
          title={editingTemplate ? `Workflow Designer: ${editingTemplate.name}` : 'Design New Approval Workflow'}
          subtitle="Configure template properties and arrange sequential approval stages."
          maxWidth="3xl"
          actions={
            <>
              <AppleButton variant="secondary" onClick={() => setIsBuilderModalOpen(false)} disabled={saving}>
                Cancel
              </AppleButton>
              <AppleButton variant="primary" onClick={handleSaveWorkflow} loading={saving}>
                Save Workflow Template
              </AppleButton>
            </>
          }
        >
          <form onSubmit={handleSaveWorkflow} className="space-y-6">
            {/* General Properties */}
            <div className="space-y-4">
              <AppleInput
                label="Workflow Template Title *"
                placeholder="e.g. Course Exemption Approval Workflow"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                required
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <AppleSelect
                  label="Department Scope"
                  value={templateDept}
                  onChange={(e) => setTemplateDept(e.target.value)}
                >
                  <option value="">University-Wide (All Departments)</option>
                  {departments.map((d) => (
                    <option key={d.department_id} value={d.department_id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </AppleSelect>

                <AppleInput
                  label="Overall Max SLA (Days)"
                  type="number"
                  min="1"
                  max="60"
                  value={templateSla}
                  onChange={(e) => setTemplateSla(Number(e.target.value))}
                />
              </div>

              <AppleInput
                label="Description & Intended Scope"
                placeholder="e.g. Multi-step review for student transfer credits and course waivers."
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
              />
            </div>

            {/* Visual Step Builder Canvas */}
            <div className="space-y-3 pt-4 border-t border-black/5 dark:border-white/10">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-apple-blue" />
                  Approval Chain Stages ({steps.length} Levels)
                </h4>
                <AppleButton
                  type="button"
                  variant="glass"
                  size="sm"
                  icon={<Plus className="w-4 h-4" />}
                  onClick={addStep}
                >
                  Add Step
                </AppleButton>
              </div>

              <div className="space-y-2.5">
                {steps.map((step, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-apple-blue text-white text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="font-semibold text-xs text-neutral-900 dark:text-white">
                          Stage {idx + 1}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveStep(idx, 'up')}
                          disabled={idx === 0}
                          className="p-1 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30"
                          title="Move step earlier"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(idx, 'down')}
                          disabled={idx === steps.length - 1}
                          className="p-1 rounded text-neutral-400 hover:text-neutral-900 dark:hover:text-white disabled:opacity-30"
                          title="Move step later"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStep(idx)}
                          className="p-1 rounded text-neutral-400 hover:text-apple-red ml-1"
                          title="Remove stage"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <AppleInput
                        label="Step Name"
                        placeholder="e.g. Faculty Review"
                        value={step.step_name}
                        onChange={(e) => {
                          const updated = [...steps];
                          updated[idx].step_name = e.target.value;
                          setSteps(updated);
                        }}
                      />

                      <AppleSelect
                        label="Approver Role"
                        value={step.approver_role}
                        onChange={(e) => {
                          const updated = [...steps];
                          updated[idx].approver_role = e.target.value as UserRole;
                          setSteps(updated);
                        }}
                      >
                        <option value="FACULTY">Faculty Member</option>
                        <option value="DEPT_ADMIN">Department Admin</option>
                        <option value="SUPER_ADMIN">Super Admin / Registrar</option>
                      </AppleSelect>

                      <AppleInput
                        label="Stage SLA (Hours)"
                        type="number"
                        min="1"
                        max="168"
                        value={step.sla_hours || 48}
                        onChange={(e) => {
                          const updated = [...steps];
                          updated[idx].sla_hours = Number(e.target.value);
                          setSteps(updated);
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </form>
        </AppleModal>
      )}

      {/* Delete Target Confirm Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title="Delete or Deactivate Workflow Template"
          message={`Are you sure you want to delete ${deleteTarget.name}? If any submitted workflow instances are currently linked, it will be safely deactivated.`}
          confirmLabel="Delete / Deactivate"
          destructive
          loading={saving}
        />
      )}
    </div>
  );
};
