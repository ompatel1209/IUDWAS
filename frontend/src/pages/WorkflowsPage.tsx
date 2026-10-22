import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, downloadWithAuth } from '../services/api';
import { WorkflowTemplate, WorkflowInstance, DocumentItem, User } from '../types';
import { AppleCard } from '../components/ui/AppleCard';
import { AppleButton } from '../components/ui/AppleButton';
import { AppleInput } from '../components/ui/AppleInput';
import { AppleSelect } from '../components/ui/AppleSelect';
import { AppleBadge } from '../components/ui/AppleBadge';
import { AppleModal } from '../components/ui/AppleModal';
import { AppleSegmentedControl } from '../components/ui/AppleSegmentedControl';
import { WorkflowTimeline } from '../components/ui/WorkflowTimeline';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import {
  GitPullRequest,
  PlusCircle,
  Clock,
  CheckCircle,
  XCircle,
  FileText,
  UserCheck,
  ShieldCheck,
  Check,
  X,
  Share2,
  Eye,
  ArrowRight,
  Download,
} from 'lucide-react';

export const WorkflowsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isFaculty, isDeptAdmin, isAdmin } = useAuth();
  const { showToast, celebrate } = useToast();

  const [activeTab, setActiveTab] = useState<'my_requests' | 'approvals'>('my_requests');
  const [instances, setInstances] = useState<WorkflowInstance[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<WorkflowInstance[]>([]);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [myDocuments, setMyDocuments] = useState<DocumentItem[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // New Request Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [selectedDocId, setSelectedDocId] = useState('');
  const [requestComments, setRequestComments] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Action (Approve / Reject / Delegate) Modal
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject' | 'delegate'; instance: WorkflowInstance } | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [delegateUserId, setDelegateUserId] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Instance Detail View Modal
  const [detailInstance, setDetailInstance] = useState<WorkflowInstance | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Authenticated document download from the detail modal
  const [downloadingDocId, setDownloadingDocId] = useState<string | null>(null);
  const handleDetailDownload = async (documentId: string, filename: string) => {
    if (downloadingDocId) return;
    setDownloadingDocId(documentId);
    try {
      await downloadWithAuth(`/documents/${documentId}/download`, filename);
      showToast('success', 'Download Started', filename);
    } catch (err: any) {
      showToast('error', 'Download Failed', err.message);
    } finally {
      setDownloadingDocId(null);
    }
  };

  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || '');

  const canApprove = isFaculty || isDeptAdmin || isAdmin;

  // Deep-linked status filter (e.g. Dashboard "Approved Requests" → /workflows?status=APPROVED)
  const visibleInstances = statusFilter
    ? instances.filter((inst) => inst.status === statusFilter)
    : instances;

  // Honest progress: completed steps / total steps of the template.
  // Terminal statuses render 100% with the status color.
  const getWorkflowProgress = (inst: WorkflowInstance): number => {
    if (inst.status === 'approved' || inst.status === 'rejected' || inst.status === 'cancelled') {
      return 100;
    }
    const template = templates.find((t) => t.workflow_id === inst.workflow_id);
    const totalSteps = template?.step_count ?? template?.steps?.length ?? 0;
    const completedUpTo = (inst.current_step_order ?? 1) - 1; // steps approved before the one awaiting review
    if (!totalSteps || totalSteps <= 0) {
      return completedUpTo > 0 ? Math.min(90, completedUpTo * 20) : 5;
    }
    return Math.max(5, Math.min(95, Math.round((completedUpTo / totalSteps) * 100)));
  };

  // Check URL parameters
  useEffect(() => {
    if (searchParams.get('action') === 'new') {
      setIsNewModalOpen(true);
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
    const viewId = searchParams.get('view');
    if (viewId) {
      api.workflowInstances
        .get(viewId)
        .then((res) => {
          setDetailInstance(res.data);
          setIsDetailModalOpen(true);
        })
        .catch((err: any) => {
          // Surface why a deep-linked request could not be opened
          showToast('error', 'Could not open request', err?.message || 'It may have been removed.');
        })
        .finally(() => {
          searchParams.delete('view');
          setSearchParams(searchParams, { replace: true });
        });
    }
  }, [searchParams, setSearchParams]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [instRes, wfRes, docsRes] = await Promise.all([
        api.workflowInstances.list(),
        api.workflows.list(),
        api.documents.list({ limit: 100 }),
      ]);
      setInstances(instRes.data);
      setTemplates(wfRes.data);
      setMyDocuments(docsRes.data);

      if (canApprove) {
        const pendingRes = await api.workflowInstances.getPending();
        setPendingApprovals(pendingRes.data || []);
      }

      if (isAdmin || isDeptAdmin) {
        const usersRes = await api.users.list({ limit: 100 });
        setUsersList(usersRes.data || []);
      }
    } catch (err: any) {
      showToast('error', 'Failed to load workflow data', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleStartWorkflow = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplateId || !selectedDocId) {
      showToast('warning', 'Incomplete Form', 'Please select a workflow template and an attached document');
      return;
    }

    setSubmitting(true);
    try {
      await api.workflowInstances.start({
        workflow_id: selectedTemplateId,
        document_id: selectedDocId,
        comments: requestComments,
      });
      showToast('success', 'Request Submitted', 'Workflow initialized and queued for Step 1 review.');
      celebrate();
      setIsNewModalOpen(false);
      setSelectedTemplateId('');
      setSelectedDocId('');
      setRequestComments('');
      loadData();
    } catch (err: any) {
      showToast('error', 'Submission Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const openDetailModal = async (instanceId: string) => {
    try {
      const res = await api.workflowInstances.get(instanceId);
      setDetailInstance(res.data);
      setIsDetailModalOpen(true);
    } catch (err: any) {
      showToast('error', 'Could not open request details', err.message);
    }
  };

  const handleApprove = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      await api.workflowInstances.approve(actionModal.instance.instance_id, actionComment || 'Approved');
      showToast('success', 'Step Approved', 'Advanced to next stage in approval chain.');
      celebrate();
      setActionModal(null);
      setActionComment('');
      if (isDetailModalOpen) setIsDetailModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', 'Approval Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!actionModal) return;
    if (!actionComment.trim()) {
      showToast('warning', 'Reason Required', 'Please provide a rejection explanation');
      return;
    }
    setActionLoading(true);
    try {
      await api.workflowInstances.reject(actionModal.instance.instance_id, actionComment.trim());
      showToast('info', 'Request Rejected', 'The submitter has been notified of the decision.');
      setActionModal(null);
      setActionComment('');
      if (isDetailModalOpen) setIsDetailModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', 'Rejection Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelegate = async () => {
    if (!actionModal || !delegateUserId) {
      showToast('warning', 'Select User', 'Please choose a delegate user');
      return;
    }
    setActionLoading(true);
    try {
      await api.workflowInstances.delegate(actionModal.instance.instance_id, delegateUserId, actionComment || 'Delegated approval');
      showToast('success', 'Delegated Successfully', 'Target reviewer has been assigned.');
      setActionModal(null);
      setDelegateUserId('');
      setActionComment('');
      loadData();
    } catch (err: any) {
      showToast('error', 'Delegation Failed', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'green';
      case 'rejected': return 'red';
      case 'in_progress': return 'blue';
      case 'pending': return 'orange';
      default: return 'gray';
    }
  };

  return (
    <div className="space-y-6 animate-apple-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Workflow Center
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Submit academic requests, track multi-level approvals, and review pending queues.
          </p>
        </div>

        <AppleButton
          variant="primary"
          size="md"
          icon={<PlusCircle className="w-5 h-5" />}
          onClick={() => setIsNewModalOpen(true)}
        >
          New Workflow Request
        </AppleButton>
      </div>

      {/* Tabs Switcher for Reviewers */}
      {canApprove && (
        <div className="flex items-center justify-start flex-wrap gap-3">
          <AppleSegmentedControl
            options={[
              { value: 'my_requests', label: 'My Submissions', count: instances.length },
              { value: 'approvals', label: 'Pending Approvals Queue', count: pendingApprovals.length },
            ]}
            value={activeTab}
            onChange={(val) => setActiveTab(val as any)}
          />
          {activeTab === 'my_requests' && (
            <AppleSelect
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-44"
              aria-label="Filter submissions by status"
            >
              <option value="">All Statuses</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </AppleSelect>
          )}
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <LoadingSpinner message="Loading workflow instances..." />
      ) : activeTab === 'approvals' ? (
        /* Approvals Queue Tab */
        <div className="space-y-4">
          {pendingApprovals.length === 0 ? (
            <AppleCard>
              <EmptyState
                title="All Caught Up!"
                description="There are no pending requests waiting for your approval right now."
                icon={<CheckCircle className="w-8 h-8 text-apple-green" />}
              />
            </AppleCard>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {pendingApprovals.map((inst) => (
                <AppleCard key={inst.instance_id} className="p-5 flex flex-col justify-between space-y-4 border-l-4 border-l-apple-purple">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                          {inst.workflow_name}
                        </h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Submitted on {new Date(inst.submitted_at).toLocaleString()}
                        </p>
                      </div>
                      <AppleBadge variant="orange" size="sm" dot>
                        {inst.current_step_name || 'Pending Review'}
                      </AppleBadge>
                    </div>

                    <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-apple-blue" />
                        <span className="font-semibold text-neutral-800 dark:text-neutral-200 truncate">{inst.document_title}</span>
                      </div>
                      <p className="text-neutral-500">Requester: <strong>{inst.submitter_name}</strong> ({inst.submitter_email})</p>
                      {inst.comments && (
                        <p className="text-neutral-600 dark:text-neutral-400 italic pt-1">"{inst.comments}"</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-black/5 dark:border-white/5">
                    <AppleButton
                      variant="ghost"
                      size="sm"
                      icon={<Eye className="w-4 h-4" />}
                      onClick={() => openDetailModal(inst.instance_id)}
                    >
                      Inspect Timeline
                    </AppleButton>

                    <div className="flex items-center gap-2">
                      <AppleButton
                        variant="ghost"
                        size="sm"
                        icon={<UserCheck className="w-4 h-4" />}
                        onClick={() => setActionModal({ type: 'delegate', instance: inst })}
                        disabled={usersList.length === 0}
                        title={usersList.length === 0 ? 'No colleagues available to delegate to' : 'Pass this request to another authorized approver'}
                      >
                        Delegate
                      </AppleButton>
                      <AppleButton
                        variant="destructive"
                        size="sm"
                        icon={<X className="w-4 h-4" />}
                        onClick={() => setActionModal({ type: 'reject', instance: inst })}
                      >
                        Reject
                      </AppleButton>
                      <AppleButton
                        variant="primary"
                        size="sm"
                        icon={<Check className="w-4 h-4" />}
                        onClick={() => setActionModal({ type: 'approve', instance: inst })}
                      >
                        Approve
                      </AppleButton>
                    </div>
                  </div>
                </AppleCard>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* My Requests Tab */
        <div className="space-y-4">
          {instances.length === 0 ? (
            <AppleCard>
              <EmptyState
                title="No Workflow Requests"
                description="You haven't initiated any workflow submissions yet."
                action={
                  <AppleButton
                    variant="primary"
                    size="sm"
                    icon={<PlusCircle className="w-4 h-4" />}
                    onClick={() => setIsNewModalOpen(true)}
                  >
                    Start First Request
                  </AppleButton>
                }
              />
            </AppleCard>
          ) : (
            <div className="space-y-3">
              {visibleInstances.map((inst) => (
                <AppleCard
                  key={inst.instance_id}
                  hoverable
                  onClick={() => openDetailModal(inst.instance_id)}
                  className="p-5 cursor-pointer space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                          {inst.workflow_name}
                        </h3>
                        <AppleBadge variant={getStatusBadgeVariant(inst.status) as any} size="sm">
                          {inst.status.toUpperCase()}
                        </AppleBadge>
                      </div>
                      <p className="text-xs text-neutral-500 mt-1 flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>Attached Doc: <strong>{inst.document_title}</strong></span>
                        <span>· Submitted: {new Date(inst.submitted_at).toLocaleDateString()}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-neutral-500">Current Stage</p>
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {inst.status === 'approved' ? 'Final Authorization Granted' : inst.current_step_name || 'Completed'}
                      </p>
                    </div>
                  </div>

                  {/* Progress Line — real position in the approval chain */}
                  <div className="pt-1">
                    <div className="w-full h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          inst.status === 'approved'
                            ? 'bg-apple-green'
                            : inst.status === 'rejected'
                            ? 'bg-apple-red'
                            : 'bg-apple-blue'
                        }`}
                        style={{ width: `${getWorkflowProgress(inst)}%` }}
                        role="progressbar"
                        aria-label={`Workflow progress: step ${inst.current_step_order ?? 0}`}
                        aria-valuenow={getWorkflowProgress(inst)}
                        aria-valuemin={0}
                        aria-valuemax={100}
                      />
                    </div>
                  </div>
                </AppleCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Start New Workflow Request Modal */}
      <AppleModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Initialize New Workflow Request"
        subtitle="Select a university template and attach the required supporting document."
        maxWidth="2xl"
        actions={
          <>
            <AppleButton variant="secondary" onClick={() => setIsNewModalOpen(false)} disabled={submitting}>
              Cancel
            </AppleButton>
            <AppleButton variant="primary" onClick={handleStartWorkflow} loading={submitting}>
              Submit for Review
            </AppleButton>
          </>
        }
      >
        <form onSubmit={handleStartWorkflow} className="space-y-4">
          <AppleSelect
            label="Workflow Template *"
            value={selectedTemplateId}
            onChange={(e) => setSelectedTemplateId(e.target.value)}
            required
          >
            <option value="">Choose Template...</option>
            {templates.map((t) => (
              <option key={t.workflow_id} value={t.workflow_id}>
                {t.name} ({t.max_days_sla} Days SLA)
              </option>
            ))}
          </AppleSelect>

          <AppleSelect
            label="Attached Supporting Document *"
            value={selectedDocId}
            onChange={(e) => setSelectedDocId(e.target.value)}
            required
          >
            <option value="">Select from your uploaded documents...</option>
            {myDocuments.map((d) => (
              <option key={d.document_id} value={d.document_id}>
                {d.title} (v{d.version})
              </option>
            ))}
          </AppleSelect>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">
              Requester Notes / Justification
            </label>
            <textarea
              rows={3}
              value={requestComments}
              onChange={(e) => setRequestComments(e.target.value)}
              placeholder="e.g. Attaching official transcript from previous institution covering 4.0 credit course syllabus."
              className="w-full rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 p-3 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue"
            />
          </div>
        </form>
      </AppleModal>

      {/* Instance Details Modal with Timeline & Audit Trail */}
      {detailInstance && (
        <AppleModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={detailInstance.workflow_name || 'Workflow Instance'}
          subtitle={`Submitted by ${detailInstance.submitter_name} (${detailInstance.submitter_email}) on ${new Date(detailInstance.submitted_at).toLocaleString()}`}
          maxWidth="5xl"
          actions={
            <div className="flex items-center justify-between w-full">
              <AppleBadge variant={getStatusBadgeVariant(detailInstance.status) as any} size="md">
                Status: {detailInstance.status.toUpperCase()}
              </AppleBadge>

              <div className="flex items-center gap-2">
                {canApprove && ['pending', 'in_progress'].includes(detailInstance.status) && (
                  <>
                    <AppleButton
                      variant="destructive"
                      size="sm"
                      icon={<X className="w-4 h-4" />}
                      onClick={() => setActionModal({ type: 'reject', instance: detailInstance })}
                    >
                      Reject
                    </AppleButton>
                    <AppleButton
                      variant="primary"
                      size="sm"
                      icon={<Check className="w-4 h-4" />}
                      onClick={() => setActionModal({ type: 'approve', instance: detailInstance })}
                    >
                      Approve
                    </AppleButton>
                  </>
                )}
                <AppleButton variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </AppleButton>
              </div>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Visual Step Progress */}
            {detailInstance.steps && detailInstance.steps.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                  Sequential Approval Chain
                </h4>
                <WorkflowTimeline
                  steps={detailInstance.steps}
                  currentStepOrder={detailInstance.current_step_order || 1}
                  status={detailInstance.status}
                />
              </div>
            )}

            {/* Attached Document Card */}
            <div className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-apple-blue/10 text-apple-blue">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                    {detailInstance.document_title}
                  </h4>
                  <p className="text-xs text-neutral-500 mt-0.5">{detailInstance.file_name} · {(Number(detailInstance.file_size || 0) / 1024).toFixed(0)} KB</p>
                </div>
              </div>
              <AppleButton
                variant="glass"
                size="sm"
                icon={<Download className="w-4 h-4" />}
                loading={downloadingDocId === detailInstance.document_id}
                onClick={() =>
                  handleDetailDownload(
                    detailInstance.document_id,
                    detailInstance.file_name || detailInstance.document_title || 'document'
                  )
                }
              >
                View Document
              </AppleButton>
            </div>

            {/* Step Action Audit Trail */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500">
                Action & Decision History
              </h4>
              <div className="divide-y divide-black/5 dark:divide-white/5 border border-black/5 dark:border-white/5 rounded-2xl overflow-hidden">
                {detailInstance.logs?.map((log) => (
                  <div key={log.log_id} className="p-3.5 flex items-start justify-between bg-black/[0.01] dark:bg-white/[0.01] text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 dark:text-white">
                          {log.actor_name} ({log.actor_role?.replace('_', ' ')})
                        </span>
                        <AppleBadge
                          variant={
                            log.action === 'APPROVE'
                              ? 'green'
                              : log.action === 'REJECT'
                              ? 'red'
                              : log.action === 'SUBMIT'
                              ? 'blue'
                              : 'purple'
                          }
                          size="sm"
                        >
                          {log.action}
                        </AppleBadge>
                      </div>
                      {log.comments && (
                        <p className="text-neutral-600 dark:text-neutral-300 mt-1 italic">
                          "{log.comments}"
                        </p>
                      )}
                    </div>
                    <span className="text-neutral-400 flex-shrink-0 ml-2">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AppleModal>
      )}

      {/* Action (Approve / Reject / Delegate) Modal */}
      {actionModal && (
        <AppleModal
          isOpen={true}
          onClose={() => setActionModal(null)}
          title={
            actionModal.type === 'approve'
              ? 'Approve Workflow Step'
              : actionModal.type === 'reject'
              ? 'Reject Workflow Request'
              : 'Delegate Workflow Approval'
          }
          subtitle={`Request: ${actionModal.instance.workflow_name}`}
          maxWidth="xl"
          actions={
            <>
              <AppleButton variant="secondary" onClick={() => setActionModal(null)} disabled={actionLoading}>
                Cancel
              </AppleButton>
              <AppleButton
                variant={actionModal.type === 'approve' ? 'primary' : 'destructive'}
                onClick={actionModal.type === 'approve' ? handleApprove : actionModal.type === 'reject' ? handleReject : handleDelegate}
                loading={actionLoading}
              >
                Confirm {actionModal.type.toUpperCase()}
              </AppleButton>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {actionModal.type === 'approve'
                ? 'Your authorization will advance this academic request to the next step or final registry record.'
                : 'Please detail the justification for rejection so the requester can adjust their submission.'}
            </p>

            {actionModal.type === 'delegate' && (
              <AppleSelect
                label="Assign Delegate User *"
                value={delegateUserId}
                onChange={(e) => setDelegateUserId(e.target.value)}
                required
              >
                <option value="">Select Faculty / Staff User...</option>
                {usersList.map((u) => (
                  <option key={u.user_id} value={u.user_id}>
                    {u.full_name} ({u.role}) - {u.email}
                  </option>
                ))}
              </AppleSelect>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                {actionModal.type === 'reject' ? 'Rejection Reason *' : 'Comments (Optional)'}
              </label>
              <textarea
                rows={3}
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder={actionModal.type === 'reject' ? 'e.g. Missing required course prerequisite transcript.' : 'e.g. Verified and approved.'}
                className="w-full rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 p-3 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue"
                required={actionModal.type === 'reject'}
              />
            </div>
          </div>
        </AppleModal>
      )}
    </div>
  );
};
