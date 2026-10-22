import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useLiveEvents } from '../context/LiveUpdatesContext';
import { api } from '../services/api';
import { DocumentItem, WorkflowInstance } from '../types';
import { MetricCard } from '../components/ui/MetricCard';
import { AppleCard } from '../components/ui/AppleCard';
import { AppleButton } from '../components/ui/AppleButton';
import { AppleBadge } from '../components/ui/AppleBadge';
import { AppleModal } from '../components/ui/AppleModal';
import { WorkflowTimeline } from '../components/ui/WorkflowTimeline';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
  Upload,
  PlusCircle,
  Bot,
  Search,
  ArrowRight,
  ShieldCheck,
  Check,
  X,
  Download,
  Eye,
  Camera,
  Send,
} from 'lucide-react';
import { ProfileModal } from '../components/ui/ProfileModal';
import { SendNotificationModal } from '../components/ui/SendNotificationModal';

export const DashboardPage: React.FC = () => {
  const { user, isFaculty, isDeptAdmin, isAdmin } = useAuth();
  const { showToast, celebrate } = useToast();

  // Live updates: dashboard KPIs and latest activity refresh themselves
  useLiveEvents(['workflow:changed', 'document:changed', 'notification:changed'], () => {
    void loadDashboardData();
  });
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [pendingApprovals, setPendingApprovals] = useState<WorkflowInstance[]>([]);
  const [selectedInstance, setSelectedInstance] = useState<WorkflowInstance | null>(null);
  const [actionModal, setActionModal] = useState<{ type: 'approve' | 'reject'; instance: WorkflowInstance } | null>(null);
  const [actionComment, setActionComment] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isSendNotifModalOpen, setIsSendNotifModalOpen] = useState(false);

  const canApprove = isFaculty || isDeptAdmin || isAdmin;

  const loadDashboardData = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const userRes = await api.analytics.userMetrics();
      setMetrics(userRes.data);

      if (canApprove) {
        const pendingRes = await api.workflowInstances.getPending();
        setPendingApprovals(pendingRes.data || []);
      }
    } catch (err: any) {
      showToast('error', 'Dashboard Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleApprove = async () => {
    if (!actionModal) return;
    setActionLoading(true);
    try {
      await api.workflowInstances.approve(actionModal.instance.instance_id, actionComment || 'Approved');
      showToast('success', 'Workflow Approved', 'The request has advanced to the next step.');
      celebrate();
      setActionModal(null);
      setActionComment('');
      // Silent refresh: keep the page mounted rather than flashing a full-page spinner
      loadDashboardData(false);
    } catch (err: any) {
      showToast('error', 'Approval Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!actionModal) return;
    if (!actionComment.trim()) {
      showToast('warning', 'Reason Required', 'Please state the reason for rejecting this request');
      return;
    }
    setActionLoading(true);
    try {
      await api.workflowInstances.reject(actionModal.instance.instance_id, actionComment.trim());
      showToast('info', 'Workflow Rejected', 'The submitter has been notified.');
      setActionModal(null);
      setActionComment('');
      // Silent refresh instead of a full-page spin
      loadDashboardData(false);
    } catch (err: any) {
      showToast('error', 'Rejection Error', err.message);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your university workspace..." />;
  }

  const summary = metrics?.summary || {
    myDocuments: 0,
    myPendingRequests: 0,
    myApprovedRequests: 0,
    myRejectedRequests: 0,
    unreadNotifications: 0,
    pendingApprovalsCount: 0,
  };

  return (
    <div className="space-y-8 animate-apple-fade-in">
      {/* Welcome Header & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            onClick={() => setIsProfileModalOpen(true)}
            className="relative group cursor-pointer apple-press"
            title="Click to change profile picture"
          >
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-gradient-to-tr from-apple-blue to-apple-purple flex items-center justify-center text-white text-xl font-bold shadow-apple-card border border-white/20 dark:border-white/10">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{user?.full_name ? user.full_name.charAt(0).toUpperCase() : 'U'}</span>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-apple-blue text-white shadow opacity-90 group-hover:scale-110 transition-transform">
              <Camera className="w-3 h-3" />
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
              Welcome, {user?.full_name}
            </h1>
            <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
              {user?.role.replace('_', ' ')} · {user?.department_name || 'Academic Division'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(isAdmin || isDeptAdmin || isFaculty) && (
            <AppleButton
              variant="glass"
              size="md"
              icon={<Send className="w-5 h-5 text-apple-blue" />}
              onClick={() => setIsSendNotifModalOpen(true)}
            >
              Send Notice
            </AppleButton>
          )}
          <AppleButton
            variant="primary"
            size="md"
            icon={<Upload className="w-5 h-5" />}
            onClick={() => navigate('/documents?action=upload')}
          >
            Upload Document
          </AppleButton>
          <AppleButton
            variant="glass"
            size="md"
            icon={<PlusCircle className="w-5 h-5" />}
            onClick={() => navigate('/workflows?action=new')}
          >
            New Request
          </AppleButton>
        </div>
      </div>

      {/* Role-Adaptive KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="My Documents"
          value={summary.myDocuments}
          subtitle="Processed with AI OCR"
          icon={<FileText className="w-5 h-5" />}
          color="blue"
          onClick={() => navigate('/documents')}
        />

        <MetricCard
          title="Pending Requests"
          value={summary.myPendingRequests}
          subtitle="In review SLA"
          icon={<Clock className="w-5 h-5" />}
          color="orange"
          onClick={() => navigate('/workflows')}
        />

        <MetricCard
          title="Approved Requests"
          value={summary.myApprovedRequests}
          subtitle="Fully verified"
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          onClick={() => navigate('/workflows?status=approved')}
        />

        {canApprove ? (
          <MetricCard
            title="Approvals Waiting for Me"
            value={pendingApprovals.length}
            subtitle="Requires your review"
            icon={<ShieldCheck className="w-5 h-5" />}
            color="purple"
            trend={{ value: `${pendingApprovals.length} Actionable`, positive: pendingApprovals.length === 0 }}
          />
        ) : (
          <MetricCard
            title="Rejected Requests"
            value={summary.myRejectedRequests}
            subtitle="See comments"
            icon={<XCircle className="w-5 h-5" />}
            color="red"
            onClick={() => navigate('/workflows?status=rejected')}
          />
        )}
      </div>

      {/* Pending Approvals Section for Reviewers (Faculty / Admins) */}
      {canApprove && pendingApprovals.length > 0 && (
        <AppleCard className="space-y-4 border-l-4 border-l-apple-purple">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-apple-purple" />
                Action Required: Pending Approval Queue
              </h2>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                You have {pendingApprovals.length} request(s) awaiting your authorization.
              </p>
            </div>
            <AppleBadge variant="purple" size="md" dot>
              {pendingApprovals.length} Pending
            </AppleBadge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {pendingApprovals.map((inst) => (
              <div
                key={inst.instance_id}
                className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/5 dark:border-white/10 hover:border-apple-purple/40 transition-all flex flex-col justify-between gap-3"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
                      {inst.workflow_name}
                    </h3>
                    <AppleBadge variant="orange" size="sm">
                      {inst.current_step_name || 'Pending'}
                    </AppleBadge>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-neutral-400" />
                    <span>{inst.document_title}</span>
                  </p>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Submitted by <span className="font-semibold">{inst.submitter_name}</span> ({inst.submitter_email}) · {new Date(inst.submitted_at).toLocaleDateString()}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                  <AppleButton
                    variant="ghost"
                    size="sm"
                    icon={<Eye className="w-4 h-4" />}
                    onClick={() => navigate(`/workflows?view=${inst.instance_id}`)}
                  >
                    View Details
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
            ))}
          </div>
        </AppleCard>
      )}

      {/* Two Column Layout: Workflow Tracker & Recent Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 7 Columns: Active Workflow Tracker */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-apple-orange" />
              Live Request Status
            </h2>
            <button
              onClick={() => navigate('/workflows')}
              className="text-xs font-semibold text-apple-blue hover:underline flex items-center gap-1"
            >
              View All Requests <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <AppleCard className="space-y-4 p-5">
            {metrics?.recentWorkflows?.length === 0 ? (
              <EmptyState
                title="No Active Requests"
                description="You haven't submitted any workflow requests yet."
                action={
                  <AppleButton
                    variant="primary"
                    size="sm"
                    icon={<PlusCircle className="w-4 h-4" />}
                    onClick={() => navigate('/workflows?action=new')}
                  >
                    Start New Request
                  </AppleButton>
                }
              />
            ) : (
              metrics?.recentWorkflows?.map((wf: WorkflowInstance) => {
                const statusVariant = {
                  approved: 'green',
                  rejected: 'red',
                  in_progress: 'blue',
                  pending: 'orange',
                  cancelled: 'gray',
                }[wf.status] as any;

                return (
                  <div
                    key={wf.instance_id}
                    onClick={() => navigate(`/workflows?view=${wf.instance_id}`)}
                    className="p-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 hover:border-apple-blue/30 cursor-pointer transition-all apple-press space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {wf.workflow_name}
                        </h4>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          Doc: {wf.document_title} · Submitted {new Date(wf.submitted_at).toLocaleDateString()}
                        </p>
                      </div>
                      <AppleBadge variant={statusVariant} size="sm">
                        {wf.status.toUpperCase()}
                      </AppleBadge>
                    </div>

                    {/* Step Timeline Indicator */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between text-xs text-neutral-500 mb-1">
                        <span>Current Stage: <strong className="text-neutral-900 dark:text-white">{wf.current_step_name || 'Completed'}</strong></span>
                        <span>Step {wf.current_step_order || 'Final'}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            wf.status === 'approved'
                              ? 'w-full bg-apple-green'
                              : wf.status === 'rejected'
                              ? 'w-full bg-apple-red'
                              : 'w-2/3 bg-apple-blue'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </AppleCard>
        </div>

        {/* Right 5 Columns: Recent Documents */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5 text-apple-blue" />
              Recent Documents
            </h2>
            <button
              onClick={() => navigate('/documents')}
              className="text-xs font-semibold text-apple-blue hover:underline flex items-center gap-1"
            >
              Document Vault <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <AppleCard className="p-4 space-y-3">
            {metrics?.recentDocuments?.length === 0 ? (
              <EmptyState
                title="No Documents Yet"
                description="Upload transcripts, grant files, or certificates to start."
                action={
                  <AppleButton
                    variant="primary"
                    size="sm"
                    icon={<Upload className="w-4 h-4" />}
                    onClick={() => navigate('/documents?action=upload')}
                  >
                    Upload Document
                  </AppleButton>
                }
              />
            ) : (
              metrics?.recentDocuments?.map((doc: DocumentItem) => (
                <div
                  key={doc.document_id}
                  onClick={() => navigate(`/documents?highlight=${doc.document_id}`)}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-black/[0.03] dark:hover:bg-white/[0.04] cursor-pointer transition-colors apple-press"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2.5 rounded-xl bg-apple-blue/10 text-apple-blue flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                        {doc.title}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                        v{doc.version} · {doc.category_name || 'General'} · {(doc.file_size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>

                  <span className="text-[11px] text-neutral-400 flex-shrink-0 ml-2">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </AppleCard>

          {/* AI University Assistant Quick Banner */}
          <AppleCard className="bg-gradient-to-br from-apple-blue/10 via-apple-purple/10 to-apple-teal/10 border border-apple-blue/20 p-5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-apple-blue to-apple-purple text-white shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                  AI University Assistant
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5 leading-relaxed">
                  Have questions about course exemption policies, grant deadlines, or need automated document summaries?
                </p>
              </div>
            </div>
            <AppleButton
              variant="primary"
              size="sm"
              className="w-full"
              icon={<Bot className="w-4 h-4" />}
              onClick={() => navigate('/ai-assistant')}
            >
              Open AI Chatbot & OCR Engine
            </AppleButton>
          </AppleCard>
        </div>
      </div>

      {/* Approval / Rejection Modal Dialog */}
      {actionModal && (
        <AppleModal
          isOpen={true}
          onClose={() => setActionModal(null)}
          title={actionModal.type === 'approve' ? 'Approve Workflow Step' : 'Reject Workflow Request'}
          subtitle={`Request: ${actionModal.instance.workflow_name} (${actionModal.instance.document_title})`}
          maxWidth="3xl"
          actions={
            <>
              <AppleButton variant="secondary" onClick={() => setActionModal(null)} disabled={actionLoading}>
                Cancel
              </AppleButton>
              <AppleButton
                variant={actionModal.type === 'approve' ? 'primary' : 'destructive'}
                onClick={actionModal.type === 'approve' ? handleApprove : handleReject}
                loading={actionLoading}
              >
                {actionModal.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </AppleButton>
            </>
          }
        >
          <div className="space-y-4">
            <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {actionModal.type === 'approve'
                ? 'Your approval will be cryptographically logged to the audit trail and advance the workflow to the next step or final authorization.'
                : 'Please provide a clear justification or reason for rejection so the submitter can make appropriate corrections.'}
            </p>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                {actionModal.type === 'approve' ? 'Approval Comments (Optional)' : 'Rejection Reason *'}
              </label>
              <textarea
                rows={3}
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder={actionModal.type === 'approve' ? 'e.g. Verified syllabus and prerequisite requirements.' : 'e.g. Missing official university seal.'}
                className="w-full rounded-xl bg-black/[0.03] dark:bg-white/[0.06] border border-black/10 dark:border-white/10 p-3 text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-apple-blue/30 focus:border-apple-blue"
                required={actionModal.type === 'reject'}
              />
            </div>
          </div>
        </AppleModal>
      )}

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      <SendNotificationModal
        isOpen={isSendNotifModalOpen}
        onClose={() => setIsSendNotifModalOpen(false)}
        onSuccess={loadDashboardData}
      />
    </div>
  );
};
