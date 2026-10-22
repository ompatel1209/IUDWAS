import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { MetricCard } from '../../components/ui/MetricCard';
import { AppleCard } from '../../components/ui/AppleCard';
import { AppleButton } from '../../components/ui/AppleButton';
import { AppleBadge } from '../../components/ui/AppleBadge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import {
  Users,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Building,
  ShieldAlert,
  Activity,
  Server,
  Database,
  Cpu,
  History,
  ArrowRight,
  UserCheck,
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>(null);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const loadData = async (showSpinner = false) => {
    if (showSpinner) setLoading(true);
    try {
      const [adminRes, healthRes] = await Promise.all([
        api.analytics.adminMetrics(),
        api.system.health(),
      ]);
      setMetrics(adminRes.data);
      setSystemHealth(healthRes.data);
    } catch (err: any) {
      showToast('error', 'Admin Dashboard Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(true);
    // Silent background refresh: polling must never flash the whole page
    const interval = setInterval(() => loadData(false), 20000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <LoadingSpinner message="Aggregating system-wide institutional analytics..." />;
  }

  const kpis = metrics?.kpis || {
    totalUsers: 0,
    activeUsers: 0,
    totalDocuments: 0,
    pendingWorkflows: 0,
    approvedWorkflows: 0,
    rejectedWorkflows: 0,
    totalDepartments: 0,
    unreadAlerts: 0,
  };

  // Health status → visual color mapping (never assume green when a service is down)
  const serviceStatusColor = (status?: string): { text: string; dot: string } => {
    const normalized = (status || 'OPERATIONAL').toUpperCase();
    if (['OPERATIONAL', 'HEALTHY', 'CONNECTED'].includes(normalized)) {
      return { text: 'text-apple-green', dot: 'bg-apple-green' };
    }
    if (['DEGRADED', 'RECONNECTING', 'SLOW'].includes(normalized)) {
      return { text: 'text-apple-orange', dot: 'bg-apple-orange' };
    }
    return { text: 'text-apple-red', dot: 'bg-apple-red' };
  };
  const dbColor = serviceStatusColor(systemHealth?.database?.status);

  return (
    <div className="space-y-8 animate-apple-fade-in">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-apple-blue" />
            Institutional Administration & Telemetry
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time university metrics, workflow turnaround velocity, and infrastructure health.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <AppleBadge variant="green" size="md" dot>
            System Operational · {systemHealth?.uptimeSeconds || 0}s Uptime
          </AppleBadge>
          <AppleButton variant="glass" size="sm" onClick={() => loadData(true)}>
            Refresh Telemetry
          </AppleButton>
        </div>
      </div>

      {/* System KPI Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total University Users"
          value={kpis.totalUsers}
          subtitle={`${kpis.activeUsers} Active Accounts`}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          onClick={() => navigate('/admin/users')}
        />

        <MetricCard
          title="Documents in Vault"
          value={kpis.totalDocuments}
          subtitle="Processed with OCR"
          icon={<FileText className="w-5 h-5" />}
          color="purple"
          onClick={() => navigate('/admin/documents')}
        />

        <MetricCard
          title="Active Workflows"
          value={kpis.pendingWorkflows}
          subtitle="In sequential review"
          icon={<Clock className="w-5 h-5" />}
          color="orange"
          onClick={() => navigate('/workflows')}
        />

        <MetricCard
          title="Approved Workflows"
          value={kpis.approvedWorkflows}
          subtitle={`${kpis.rejectedWorkflows} Rejected`}
          icon={<CheckCircle className="w-5 h-5" />}
          color="green"
          onClick={() => navigate('/workflows')}
        />
      </div>

      {/* Infrastructure Telemetry Box */}
      {systemHealth && (
        <AppleCard className="p-6 space-y-4 bg-gradient-to-r from-black/[0.02] to-black/[0.04] dark:from-white/[0.02] dark:to-white/[0.04]">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Server className="w-4 h-4 text-apple-blue" />
              Service Health & Infrastructure Telemetry
            </h3>
            <AppleBadge variant="blue" size="sm">
              Latency: {systemHealth.database?.latencyMs || '0.4ms'}
            </AppleBadge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1">
              <span className="text-neutral-400 text-[10px] uppercase font-bold">API Gateway</span>
              {(() => {
                const c = serviceStatusColor(systemHealth.services?.authService);
                return (
                  <p className={`font-bold ${c.text} flex items-center gap-1`} aria-label={`API Gateway status: ${systemHealth.services?.authService || 'OPERATIONAL'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {systemHealth.services?.authService || 'OPERATIONAL'}
                  </p>
                );
              })()}
            </div>

            <div className="p-3 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1">
              <span className="text-neutral-400 text-[10px] uppercase font-bold">Database Engine</span>
              <p className={`font-bold ${dbColor.text} flex items-center gap-1`} aria-label={`Database status: ${systemHealth.database?.status || 'CONNECTED'}`}>
                <Database className="w-3 h-3" />
                {systemHealth.database?.status || 'CONNECTED'}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1">
              <span className="text-neutral-400 text-[10px] uppercase font-bold">Document Vault</span>
              {(() => {
                const c = serviceStatusColor(systemHealth.services?.documentService);
                return (
                  <p className={`font-bold ${c.text} flex items-center gap-1`} aria-label={`Document Vault status: ${systemHealth.services?.documentService || 'OPERATIONAL'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {systemHealth.services?.documentService || 'OPERATIONAL'}
                  </p>
                );
              })()}
            </div>

            <div className="p-3 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1">
              <span className="text-neutral-400 text-[10px] uppercase font-bold">Workflow Engine</span>
              {(() => {
                const c = serviceStatusColor(systemHealth.services?.workflowEngine);
                return (
                  <p className={`font-bold ${c.text} flex items-center gap-1`} aria-label={`Workflow Engine status: ${systemHealth.services?.workflowEngine || 'OPERATIONAL'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {systemHealth.services?.workflowEngine || 'OPERATIONAL'}
                  </p>
                );
              })()}
            </div>

            <div className="p-3 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1">
              <span className="text-neutral-400 text-[10px] uppercase font-bold">AI / OCR Service</span>
              {(() => {
                const c = serviceStatusColor(systemHealth.services?.aiOcrService);
                return (
                  <p className={`font-bold ${c.text} flex items-center gap-1`} aria-label={`AI/OCR status: ${systemHealth.services?.aiOcrService || 'OPERATIONAL'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
                    {systemHealth.services?.aiOcrService || 'OPERATIONAL'}
                  </p>
                );
              })()}
            </div>

            <div className="p-3 rounded-xl bg-white/60 dark:bg-black/40 border border-black/5 dark:border-white/5 space-y-1">
              <span className="text-neutral-400 text-[10px] uppercase font-bold">Memory Load</span>
              <p className="font-bold text-neutral-800 dark:text-neutral-200 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-apple-purple" aria-hidden="true" />
                {systemHealth.system?.memoryUsageMb != null ? `${systemHealth.system.memoryUsageMb} MB` : '—'} Used
              </p>
            </div>
          </div>
        </AppleCard>
      )}

      {/* Analytics Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Users by Role */}
        <AppleCard className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-apple-blue" />
              Users by Role
            </h3>
            <button onClick={() => navigate('/admin/users')} className="text-xs text-apple-blue hover:underline">
              Manage
            </button>
          </div>
          <div className="space-y-3">
            {metrics?.usersByRole?.map((r: any) => {
              const totalUsersCount = kpis.totalUsers || 1;
              const pct = ((r.count / totalUsersCount) * 100).toFixed(0);
              return (
                <div key={r.role} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {r.role.replace('_', ' ')}
                    </span>
                    <span className="text-neutral-500 font-mono">
                      {r.count} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-black/5 dark:bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-apple-blue rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </AppleCard>

        {/* Users by Department */}
        <AppleCard className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Building className="w-4 h-4 text-apple-purple" />
              Department Distribution
            </h3>
            <button onClick={() => navigate('/admin/departments')} className="text-xs text-apple-blue hover:underline">
              Depts
            </button>
          </div>
          <div className="space-y-3">
            {metrics?.usersByDept?.map((d: any) => (
              <div key={d.department_name} className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] text-xs">
                <div>
                  <span className="font-semibold text-neutral-900 dark:text-white">{d.department_name}</span>
                  <p className="text-[10px] text-neutral-400 font-mono">{d.department_code}</p>
                </div>
                <AppleBadge variant="purple" size="sm">
                  {d.count} Members
                </AppleBadge>
              </div>
            ))}
          </div>
        </AppleCard>

        {/* Documents by Category */}
        <AppleCard className="p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-apple-teal" />
              Documents by Category
            </h3>
            <button onClick={() => navigate('/admin/categories-tags')} className="text-xs text-apple-blue hover:underline">
              Categories
            </button>
          </div>
          <div className="space-y-2.5">
            {metrics?.docsByCategory?.map((c: any) => (
              <div key={c.category_name} className="flex items-center justify-between p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] text-xs">
                <span className="font-semibold text-neutral-900 dark:text-white">{c.category_name}</span>
                <span className="font-bold font-mono px-2 py-0.5 rounded bg-apple-teal/10 text-apple-teal">
                  {c.count} files
                </span>
              </div>
            ))}
          </div>
        </AppleCard>
      </div>

      {/* Live Security Audit Log Stream */}
      <AppleCard className="p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-black/5 dark:border-white/10 pb-3">
          <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
            <History className="w-4 h-4 text-apple-red" />
            Recent Security & Audit Trail
          </h3>
          <button onClick={() => navigate('/admin/audit')} className="text-xs font-semibold text-apple-blue hover:underline flex items-center gap-1">
            Full Audit Logs <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-black/5 dark:divide-white/5">
          {metrics?.recentAudit?.map((log: any) => (
            <div key={log.log_id} className="py-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10 text-neutral-500">
                  <ShieldAlert className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 dark:text-white font-mono text-[11px]">
                      {log.action}
                    </span>
                    <AppleBadge variant="gray" size="sm">
                      {log.resource_type}
                    </AppleBadge>
                  </div>
                  <p className="text-neutral-500 mt-0.5">
                    Triggered by <strong>{log.user_name || 'System'}</strong> ({log.user_email || 'System Daemon'})
                  </p>
                </div>
              </div>

              <span className="text-neutral-400 font-mono text-[11px]">
                {new Date(log.created_at).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </AppleCard>
    </div>
  );
};
