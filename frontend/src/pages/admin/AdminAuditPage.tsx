import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { AuditLog } from '../../types';
import { AppleCard } from '../../components/ui/AppleCard';
import { AppleButton } from '../../components/ui/AppleButton';
import { AppleInput } from '../../components/ui/AppleInput';
import { AppleSelect } from '../../components/ui/AppleSelect';
import { AppleBadge } from '../../components/ui/AppleBadge';
import { AppleModal } from '../../components/ui/AppleModal';
import { DataTable, Column } from '../../components/ui/DataTable';
import { History, Search, Eye, ShieldAlert, Code2, Globe } from 'lucide-react';

export const AdminAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.audit.list({
        page,
        limit: 15,
        action: actionFilter || undefined,
        search: search.trim() || undefined,
      });
      setLogs(res.data);
      setTotal(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (err: any) {
      showToast('error', 'Failed to load audit trail', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, actionFilter]);

  const columns: Column<AuditLog>[] = [
    {
      header: 'Timestamp',
      accessorKey: 'created_at',
      cell: (row) => (
        <span className="font-mono text-xs text-neutral-600 dark:text-neutral-300">
          {new Date(row.created_at).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Action',
      accessorKey: 'action',
      cell: (row) => {
        let variant: any = 'blue';
        if (row.action.includes('REJECT') || row.action.includes('DELETE')) variant = 'red';
        if (row.action.includes('APPROVE')) variant = 'green';
        if (row.action.includes('LOGIN') || row.action.includes('AUTH')) variant = 'purple';
        return (
          <AppleBadge variant={variant} size="sm" className="font-mono text-[11px]">
            {row.action}
          </AppleBadge>
        );
      },
    },
    {
      header: 'Actor / User',
      accessorKey: 'user_name',
      cell: (row) => (
        <div>
          <span className="font-semibold text-xs text-neutral-900 dark:text-white">
            {row.user_name || 'System / Unauthenticated'}
          </span>
          <p className="text-[10px] text-neutral-400 font-mono">{row.user_email || '—'}</p>
        </div>
      ),
    },
    {
      header: 'Resource',
      accessorKey: 'resource_type',
      cell: (row) => (
        <span className="text-xs font-mono text-neutral-500">
          {row.resource_type ? `${row.resource_type} #${row.resource_id?.slice(0, 8)}` : 'System'}
        </span>
      ),
    },
    {
      header: 'IP & Client',
      accessorKey: 'ip_address',
      cell: (row) => (
        <span className="text-xs font-mono text-neutral-400">
          {row.ip_address || '127.0.0.1'}
        </span>
      ),
    },
    {
      header: 'Inspect',
      cell: (row) => (
        <div className="flex justify-end">
          <button
            onClick={() => setSelectedLog(row)}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-apple-blue hover:bg-black/5 dark:hover:bg-white/10"
            title="Inspect Metadata Payload"
            aria-label="Inspect metadata payload"
          >
            <Eye className="w-4 h-4" />
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
            <History className="w-6 h-6 text-apple-red" />
            Immutable Security Audit Trail
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Complete cryptographic event timeline covering auth, document mutations, and workflow decisions.
          </p>
        </div>

        <AppleButton variant="glass" size="sm" onClick={loadData}>
          Refresh Stream
        </AppleButton>
      </div>

      <AppleCard className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-8">
            <AppleInput
              placeholder="Search by user email or ID..."
              icon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadData()}
            />
          </div>

          <div className="sm:col-span-4">
            <AppleSelect
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
            >
              <option value="">All Security Actions</option>
              <option value="AUTH_LOGIN">AUTH_LOGIN</option>
              <option value="AUTH_LOGOUT">AUTH_LOGOUT</option>
              <option value="DOCUMENT_UPLOAD">DOCUMENT_UPLOAD</option>
              <option value="DOCUMENT_VERSION_UPLOAD">DOCUMENT_VERSION_UPLOAD</option>
              <option value="WORKFLOW_STARTED">WORKFLOW_STARTED</option>
              <option value="WORKFLOW_APPROVED">WORKFLOW_APPROVED</option>
              <option value="WORKFLOW_REJECTED">WORKFLOW_REJECTED</option>
              <option value="USER_CREATED">USER_CREATED</option>
            </AppleSelect>
          </div>
        </div>
      </AppleCard>

      <DataTable
        columns={columns}
        data={logs}
        loading={loading}
        page={page}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyTitle="No audit records found"
      />

      {/* Metadata Inspector Modal */}
      {selectedLog && (
        <AppleModal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event: ${selectedLog.action}`}
          subtitle={`Event ID: ${selectedLog.log_id} · Recorded at ${new Date(selectedLog.created_at).toLocaleString()}`}
          maxWidth="2xl"
          actions={
            <AppleButton variant="secondary" onClick={() => setSelectedLog(null)}>
              Close
            </AppleButton>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] space-y-1">
                <span className="text-neutral-400 text-[10px] uppercase font-bold">Actor Account</span>
                <p className="font-semibold text-neutral-900 dark:text-white">{selectedLog.user_name || 'System'}</p>
                <p className="text-neutral-500 font-mono">{selectedLog.user_email || 'daemon'}</p>
              </div>

              <div className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] space-y-1">
                <span className="text-neutral-400 text-[10px] uppercase font-bold">Client IP & Agent</span>
                <p className="font-mono text-neutral-800 dark:text-neutral-200">{selectedLog.ip_address || '127.0.0.1'}</p>
                <p className="text-neutral-500 truncate text-[10px]">{selectedLog.user_agent || 'Unknown Browser'}</p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5 text-apple-blue" />
                Raw Event Payload (JSON)
              </h4>
              <div className="p-4 rounded-2xl bg-black/[0.04] dark:bg-black/50 border border-black/5 dark:border-white/5 font-mono text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
                {(() => {
                  if (!selectedLog.details) return 'No extra metadata recorded.';
                  if (typeof selectedLog.details !== 'string') {
                    return JSON.stringify(selectedLog.details, null, 2);
                  }
                  try {
                    return JSON.stringify(JSON.parse(selectedLog.details), null, 2);
                  } catch {
                    // Malformed payload — show raw text instead of crashing.
                    return selectedLog.details;
                  }
                })()}
              </div>
            </div>
          </div>
        </AppleModal>
      )}
    </div>
  );
};
