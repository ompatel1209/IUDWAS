import React, { useState, useEffect } from 'react';
import { api, downloadWithAuth } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useLiveEvents } from '../../context/LiveUpdatesContext';
import { FilePreviewModal } from '../../components/ui/FilePreviewModal';
import { DocumentItem, DocCategory, Department, DocumentVersion } from '../../types';
import { AppleCard } from '../../components/ui/AppleCard';
import { AppleButton } from '../../components/ui/AppleButton';
import { AppleInput } from '../../components/ui/AppleInput';
import { AppleSelect } from '../../components/ui/AppleSelect';
import { AppleBadge } from '../../components/ui/AppleBadge';
import { AppleModal } from '../../components/ui/AppleModal';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FileText, Search, Download, Trash2, Eye, Lock, History, Sparkles, BookOpen } from 'lucide-react';

export const AdminDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [previewDoc, setPreviewDoc] = useState<DocumentItem | null>(null);
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Live updates: admin vault reflects uploads/archives from every session
  useLiveEvents(['document:changed'], () => {
    void loadData();
  });

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Download & delete flow state
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Debounce search so typing doesn't fire one API call per keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const handleDownload = async (documentId: string, filename: string) => {
    if (downloadingId) return;
    setDownloadingId(documentId);
    try {
      await downloadWithAuth(`/documents/${documentId}/download`, filename);
      showToast('success', 'Download Started', filename);
    } catch (err: any) {
      showToast('error', 'Download Failed', err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDownloadVersion = async (documentId: string, versionNumber: number) => {
    if (downloadingId) return;
    setDownloadingId(documentId);
    try {
      await downloadWithAuth(
        `/documents/${documentId}/versions/${versionNumber}/download`,
        `document-v${versionNumber}`
      );
      showToast('success', 'Download Started', `Version ${versionNumber}`);
    } catch (err: any) {
      showToast('error', 'Download Failed', err.message);
    } finally {
      setDownloadingId(null);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [docsRes, catsRes, deptsRes] = await Promise.all([
        api.documents.list({
          page,
          limit: 10,
          search: debouncedSearch.trim() || undefined,
          category_id: categoryId || undefined,
          department_id: departmentId || undefined,
          status: status || undefined,
        }),
        api.categories.list(),
        api.departments.list(),
      ]);
      setDocuments(docsRes.data);
      setTotal(docsRes.meta?.total || 0);
      setTotalPages(docsRes.meta?.totalPages || 1);
      setCategories(catsRes.data);
      setDepartments(deptsRes.data);
    } catch (err: any) {
      showToast('error', 'Error loading documents', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, categoryId, departmentId, status]);

  const openDocDetails = async (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setIsDetailModalOpen(true);
    try {
      const vRes = await api.documents.getVersions(doc.document_id);
      setVersions(vRes.data || []);
    } catch {
      setVersions([]);
    }
  };

  const handleDeleteRequest = (doc: DocumentItem) => {
    setDeleteTarget({ id: doc.document_id, title: doc.title });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.documents.delete(deleteTarget.id);
      showToast('info', 'Document Removed', 'Moved to archive/deleted status');
      if (isDetailModalOpen) setIsDetailModalOpen(false);
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      showToast('error', 'Action Failed', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<DocumentItem>[] = [
    {
      header: 'Document & Filename',
      accessorKey: 'title',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-apple-blue/10 text-apple-blue flex-shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-900 dark:text-white cursor-pointer hover:text-apple-blue" onClick={() => openDocDetails(row)}>
                {row.title}
              </span>
              {row.is_confidential && <Lock className="w-4 h-4 text-apple-purple" />}
            </div>
            <p className="text-xs text-neutral-400 mt-0.5">{row.file_name} · {(row.file_size / 1024).toFixed(0)} KB</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      accessorKey: 'category_name',
      cell: (row) => (
        <AppleBadge variant="blue" size="sm">
          {row.category_name || 'General'}
        </AppleBadge>
      ),
    },
    {
      header: 'Department Scope',
      accessorKey: 'department_name',
      cell: (row) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-300">
          {row.department_name || 'All University'}
        </span>
      ),
    },
    {
      header: 'Uploaded By',
      accessorKey: 'uploader_name',
      cell: (row) => (
        <div>
          <p className="text-xs font-semibold text-neutral-800 dark:text-neutral-200">{row.uploader_name || 'User'}</p>
          <p className="text-[10px] text-neutral-400">{row.uploader_email}</p>
        </div>
      ),
    },
    {
      header: 'Version',
      accessorKey: 'version',
      cell: (row) => (
        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/5 dark:bg-white/10">
          v{row.version}
        </span>
      ),
    },
    {
      header: 'Status',
      accessorKey: 'status',
      cell: (row) => (
        <AppleBadge
          variant={row.status === 'active' ? 'green' : row.status === 'archived' ? 'orange' : 'gray'}
          size="sm"
        >
          {row.status.toUpperCase()}
        </AppleBadge>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => setPreviewDoc(row)}
            className="p-2 rounded-lg text-neutral-500 hover:text-apple-blue hover:bg-blue-500/10"
            title="Preview file in browser"
            aria-label={`Preview ${row.title || 'document'}`}
          >
            <BookOpen className="w-5 h-5" />
          </button>
          <button
            onClick={() => openDocDetails(row)}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
            title="Inspect OCR & Versions"
          >
            <Eye className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleDownload(row.document_id, row.file_name || row.title || 'document')}
            disabled={downloadingId === row.document_id}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
            title="Download Original"
            aria-label={`Download ${row.title || 'document'}`}
          >
            <Download className={`w-5 h-5 ${downloadingId === row.document_id ? 'animate-pulse' : ''}`} />
          </button>
          <button
            onClick={() => handleDeleteRequest(row)}
            className="p-2 rounded-lg text-neutral-400 hover:text-apple-red hover:bg-red-500/10"
            title="Delete Document"
            aria-label={`Delete ${row.title || 'document'}`}
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-apple-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
          <FileText className="w-6 h-6 text-apple-teal" />
          University Document Vault Administration
        </h1>
        <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
          System-wide repository audit, version verification, and OCR content inspection.
        </p>
      </div>

      <AppleCard className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-4">
            <AppleInput
              placeholder="Search documents and OCR text..."
              icon={<Search className="w-5 h-5" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="lg:col-span-3">
            <AppleSelect
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </AppleSelect>
          </div>

          <div className="lg:col-span-3">
            <AppleSelect
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
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
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="deleted">Trash</option>
            </AppleSelect>
          </div>
        </div>
      </AppleCard>

      <DataTable
        columns={columns}
        data={documents}
        loading={loading}
        page={page}
        total={total}
        totalPages={totalPages}
        onPageChange={setPage}
        emptyTitle="No documents match criteria"
      />

      {/* Details Modal */}
      {selectedDoc && (
        <AppleModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={`Admin Audit: ${selectedDoc.title}`}
          subtitle={`Document ID: ${selectedDoc.document_id} · Uploaded by ${selectedDoc.uploader_name} (${selectedDoc.uploader_email})`}
          maxWidth="4xl"
          actions={
            <div className="flex items-center justify-between w-full">
              <AppleBadge variant={selectedDoc.is_confidential ? 'red' : 'green'} size="md">
                {selectedDoc.is_confidential ? 'Confidential Record' : 'Standard Access'}
              </AppleBadge>
              <div className="flex items-center gap-2">
                <AppleButton
                  variant="primary"
                  size="sm"
                  icon={<Download className="w-5 h-5" />}
                  loading={downloadingId === selectedDoc.document_id}
                  onClick={() =>
                    handleDownload(
                      selectedDoc.document_id,
                      selectedDoc.file_name || selectedDoc.title || 'document'
                    )
                  }
                >
                  Download
                </AppleButton>
                <AppleButton variant="secondary" size="sm" onClick={() => setIsDetailModalOpen(false)}>
                  Close
                </AppleButton>
              </div>
            </div>
          }
        >
          <div className="space-y-6">
            {/* AI OCR Text */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-apple-purple" />
                  AI OCR Extracted Content
                </h4>
                <AppleBadge variant="teal" size="sm">OCR Extracted</AppleBadge>
              </div>
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-black/40 border border-black/5 dark:border-white/5 font-mono text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {selectedDoc.ocr_text || 'No OCR extracted.'}
              </div>
            </div>

            {/* Version List */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <History className="w-4 h-4 text-apple-blue" />
                Immutable Version History
              </h4>
              <div className="divide-y divide-black/5 dark:divide-white/5 border border-black/5 dark:border-white/5 rounded-2xl overflow-hidden text-xs">
                {versions.map((v) => (
                  <div key={v.version_id} className="p-3 flex items-center justify-between bg-black/[0.01] dark:bg-white/[0.01]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 dark:text-white">Version {v.version_number}</span>
                        <span className="text-neutral-400">({(v.file_size / 1024).toFixed(0)} KB)</span>
                      </div>
                      <p className="text-neutral-500 mt-0.5">{v.change_description} · {new Date(v.created_at).toLocaleString()}</p>
                    </div>
                    <button
                      onClick={() => handleDownloadVersion(selectedDoc.document_id, v.version_number)}
                      disabled={downloadingId === selectedDoc.document_id}
                      className="p-2 rounded-lg text-neutral-500 hover:text-apple-blue hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
                      title="Download this version"
                      aria-label={`Download version ${v.version_number}`}
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AppleModal>
      )}

      {/* Delete Document Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message={`"${deleteTarget?.title ?? 'This document'}" will be moved to archived/trash status. Related workflow history is preserved for compliance.`}
        confirmLabel="Delete"
        destructive
        loading={deleting}
      />

      {/* In-app document preview (PDF viewer / image viewer) */}
      {previewDoc && (
        <FilePreviewModal
          isOpen
          onClose={() => setPreviewDoc(null)}
          documentId={previewDoc.document_id}
          title={previewDoc.title}
          fileName={previewDoc.file_name}
        />
      )}
    </div>
  );
};
