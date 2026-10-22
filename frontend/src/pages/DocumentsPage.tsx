import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { api, downloadWithAuth } from '../services/api';
import { DocumentItem, DocCategory, Department, Tag, DocumentVersion } from '../types';
import { AppleCard } from '../components/ui/AppleCard';
import { AppleButton } from '../components/ui/AppleButton';
import { AppleInput } from '../components/ui/AppleInput';
import { AppleSelect } from '../components/ui/AppleSelect';
import { AppleBadge } from '../components/ui/AppleBadge';
import { AppleModal } from '../components/ui/AppleModal';
import { AppleSegmentedControl } from '../components/ui/AppleSegmentedControl';
import { DataTable, Column } from '../components/ui/DataTable';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  FileText,
  Upload,
  Search,
  Filter,
  Download,
  Eye,
  Share2,
  Trash2,
  Layers,
  Sparkles,
  Lock,
  Plus,
  History,
  Grid,
  List,
  Check,
} from 'lucide-react';

export const DocumentsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast, celebrate } = useToast();

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [tagsList, setTagsList] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [status, setStatus] = useState('active');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [docVersions, setDocVersions] = useState<DocumentVersion[]>([]);

  // Upload Form State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadDept, setUploadDept] = useState('');
  const [uploadConfidential, setUploadConfidential] = useState(false);
  const [uploadTags, setUploadTags] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);

  // Version Upload Form State
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionDescription, setVersionDescription] = useState('');
  const [versionUploading, setVersionUploading] = useState(false);

  // Share Form State
  const [shareUserEmail, setShareUserEmail] = useState('');
  const [shareMessage, setShareMessage] = useState('');
  const [sharing, setSharing] = useState(false);

  // Download state (authenticated blob download, one in-flight per document)
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Delete confirmation state (replaces blocking window.confirm)
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Check URL query parameters for action & highlight deep-links
  useEffect(() => {
    if (searchParams.get('action') === 'upload') {
      setIsUploadModalOpen(true);
      // Clear the param so refresh / back-forward navigation does not re-open it
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Deep-link support: /documents?highlight=<id> opens the document detail
  // modal (used by dashboard recents, notifications, and AI search results).
  useEffect(() => {
    const highlightId = searchParams.get('highlight');
    if (highlightId && documents.length > 0) {
      const target = documents.find((d) => d.document_id === highlightId);
      if (target) openDocumentDetails(target);
      searchParams.delete('highlight');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams, documents]);

  // Debounce search so typing doesn't fire one API call per keystroke
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const loadMetadata = async () => {
    try {
      const [catsRes, deptsRes, tagsRes] = await Promise.all([
        api.categories.list(),
        api.departments.list(),
        api.tags.list(),
      ]);
      setCategories(catsRes.data);
      setDepartments(deptsRes.data);
      setTagsList(tagsRes.data);
    } catch {
      // Ignore
    }
  };

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const res = await api.documents.list({
        page,
        limit: 10,
        search: debouncedSearch.trim() || undefined,
        category_id: categoryId || undefined,
        department_id: departmentId || undefined,
        status: status || undefined,
      });
      setDocuments(res.data);
      setTotal(res.meta?.total || 0);
      setTotalPages(res.meta?.totalPages || 1);
    } catch (err: any) {
      showToast('error', 'Failed to load documents', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  useEffect(() => {
    loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, debouncedSearch, categoryId, departmentId, status]);

  const handleFileSelect = (file: File) => {
    setUploadFile(file);
    if (!uploadTitle) {
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
    // Truthful progress hint — real OCR extraction happens server-side after upload
    setOcrPreview(`Ready to upload "${file.name}" (${(file.size / 1024).toFixed(1)} KB).\nAI OCR text extraction will run automatically once the upload completes.`);
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile || !uploadTitle) {
      showToast('warning', 'Missing Details', 'Please choose a file and provide a document title');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('title', uploadTitle);
      if (uploadCategory) formData.append('category_id', uploadCategory);
      if (uploadDept) formData.append('department_id', uploadDept);
      formData.append('is_confidential', String(uploadConfidential));
      formData.append('tags', JSON.stringify(uploadTags));

      await api.documents.upload(formData);
      showToast('success', 'Document Uploaded', 'Document processed with AI OCR and saved.');
      celebrate();
      setIsUploadModalOpen(false);
      resetUploadForm();
      loadDocuments();
    } catch (err: any) {
      showToast('error', 'Upload Failed', err.message);
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setUploadFile(null);
    setUploadTitle('');
    setUploadCategory('');
    setUploadDept('');
    setUploadConfidential(false);
    setUploadTags([]);
    setOcrPreview(null);
  };

  const openDocumentDetails = async (doc: DocumentItem) => {
    setSelectedDoc(doc);
    setIsDetailModalOpen(true);
    try {
      const vRes = await api.documents.getVersions(doc.document_id);
      setDocVersions(vRes.data || []);
    } catch {
      setDocVersions([]);
    }
  };

  const handleNewVersionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    if (!versionFile) {
      showToast('warning', 'File Required', 'Select the updated file to upload as a new revision.');
      return;
    }
    if (!versionDescription.trim()) {
      showToast('warning', 'Description Required', 'Describe what changed in this revision.');
      return;
    }

    setVersionUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', versionFile);
      formData.append('change_description', versionDescription || 'Updated document revision');

      await api.documents.uploadVersion(selectedDoc.document_id, formData);
      showToast('success', 'New Version Uploaded', `Document is now at Version ${selectedDoc.version + 1}`);
      setIsVersionModalOpen(false);
      setVersionFile(null);
      setVersionDescription('');

      // Refresh details & list
      const updatedDocRes = await api.documents.get(selectedDoc.document_id);
      setSelectedDoc(updatedDocRes.data);
      const vRes = await api.documents.getVersions(selectedDoc.document_id);
      setDocVersions(vRes.data || []);
      loadDocuments();
    } catch (err: any) {
      showToast('error', 'Version Upload Failed', err.message);
    } finally {
      setVersionUploading(false);
    }
  };

  const handleShareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc) return;
    // Inline validation — recipient email is required by the share API
    if (!shareUserEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shareUserEmail.trim())) {
      showToast('warning', 'Invalid Email', 'Enter a valid university email address to share with.');
      return;
    }

    setSharing(true);
    try {
      await api.documents.share(selectedDoc.document_id, {
        recipient_email: shareUserEmail.trim(),
        message: shareMessage || undefined,
      });
      showToast('success', 'Document Shared', 'Notification dispatched to collaborators.');
      setIsShareModalOpen(false);
      setShareUserEmail('');
      setShareMessage('');
    } catch (err: any) {
      showToast('error', 'Share Failed', err.message);
    } finally {
      setSharing(false);
    }
  };

  const handleDeleteRequest = (doc: { document_id: string; title: string }) => {
    setDeleteTarget({ id: doc.document_id, title: doc.title });
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.documents.delete(deleteTarget.id);
      showToast('info', 'Document Removed', 'Moved to archive/trash');
      if (isDetailModalOpen) setIsDetailModalOpen(false);
      setDeleteTarget(null);
      loadDocuments();
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.message);
    } finally {
      setDeleting(false);
    }
  };

  const columns: Column<DocumentItem>[] = [
    {
      header: 'Document Title',
      accessorKey: 'title',
      sortable: true,
      cell: (row) => (
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-apple-blue/10 text-apple-blue flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-neutral-900 dark:text-white hover:text-apple-blue cursor-pointer" onClick={() => openDocumentDetails(row)}>
                {row.title}
              </span>
              {row.is_confidential && (
                <span title="Confidential document">
                  <Lock className="w-3.5 h-3.5 text-apple-purple" />
                </span>
              )}
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
      header: 'Version',
      accessorKey: 'version',
      sortable: true,
      cell: (row) => (
        <span className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-xs font-bold font-mono">
          v{row.version}
        </span>
      ),
    },
    {
      header: 'Department',
      accessorKey: 'department_name',
      cell: (row) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-300">
          {row.department_name || 'All University'}
        </span>
      ),
    },
    {
      header: 'Uploaded Date',
      accessorKey: 'created_at',
      sortable: true,
      cell: (row) => (
        <span className="text-xs text-neutral-500">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => openDocumentDetails(row)}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10"
            title="Inspect Details & OCR"
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() =>
              handleDownload(row.document_id, row.file_name || row.title || 'document')
            }
            disabled={downloadingId === row.document_id}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
            title="Download Document"
            aria-label={`Download ${row.title || 'document'}`}
          >
            <Download className={`w-4 h-4 ${downloadingId === row.document_id ? 'animate-pulse' : ''}`} />
          </button>
          <button
            onClick={() => handleDeleteRequest(row)}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-apple-red hover:bg-red-500/10"
            title="Delete Document"
            aria-label={`Delete ${row.title || 'document'}`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 animate-apple-fade-in">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Document Vault
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Store, OCR extract, version, and manage institutional university records.
          </p>
        </div>

        <AppleButton
          variant="primary"
          size="md"
          icon={<Upload className="w-4 h-4" />}
          onClick={() => setIsUploadModalOpen(true)}
        >
          Upload Document
        </AppleButton>
      </div>

      {/* Filter and View Controls Toolbar */}
      <AppleCard className="p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          <div className="lg:col-span-3">
            <AppleInput
              placeholder="Search by title, filename, or OCR text..."
              icon={<Search className="w-4 h-4" />}
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

          <div className="lg:col-span-2">
            <AppleSelect
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              aria-label="Filter by department"
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
              onChange={(e) => { setPage(1); setStatus(e.target.value); }}
              aria-label="Filter by document status"
            >
              <option value="active">Active</option>
              <option value="archived">Archived</option>
              <option value="deleted">Trash</option>
            </AppleSelect>
          </div>

          <div className="lg:col-span-2 flex items-center justify-end">
            <AppleSegmentedControl
              options={[
                { value: 'table', label: 'Table' },
                { value: 'grid', label: 'Grid' },
              ]}
              value={viewMode}
              onChange={(v) => setViewMode(v as any)}
              size="sm"
            />
          </div>
        </div>
      </AppleCard>

      {/* Main Content: Table or Grid View */}
      {viewMode === 'table' ? (
        <DataTable
          columns={columns}
          data={documents}
          loading={loading}
          page={page}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          emptyTitle="No documents found"
          emptyDescription="Try adjusting your filter search terms or upload a new file."
        />
      ) : (
        <div>
          {loading ? (
            <LoadingSpinner message="Loading document cards..." />
          ) : documents.length === 0 ? (
            <EmptyState
              title="No documents found"
              description="No records match your criteria."
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {documents.map((doc) => (
                <AppleCard
                  key={doc.document_id}
                  hoverable
                  onClick={() => openDocumentDetails(doc)}
                  className="cursor-pointer flex flex-col justify-between space-y-4 p-5"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="p-3 rounded-2xl bg-apple-blue/10 text-apple-blue">
                        <FileText className="w-6 h-6" />
                      </div>
                      <AppleBadge variant="blue" size="sm">
                        v{doc.version}
                      </AppleBadge>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white line-clamp-1">
                        {doc.title}
                      </h4>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                        {doc.ocr_text || doc.file_name}
                      </p>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-xs text-neutral-400">
                    <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                    <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  </div>
                </AppleCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Upload Document Modal */}
      <AppleModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        title="Upload University Document"
        subtitle="Automatic AI OCR text extraction and indexing will be applied."
        maxWidth="2xl"
        actions={
          <>
            <AppleButton variant="secondary" onClick={() => setIsUploadModalOpen(false)} disabled={uploading}>
              Cancel
            </AppleButton>
            <AppleButton variant="primary" onClick={handleUploadSubmit} loading={uploading}>
              Upload & Process OCR
            </AppleButton>
          </>
        }
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          {/* Drag & Drop File Box */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-black/15 dark:border-white/15 hover:border-apple-blue dark:hover:border-apple-blue rounded-2xl p-6 text-center cursor-pointer transition-colors apple-press bg-black/[0.01] dark:bg-white/[0.02]"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.doc,.xlsx,.xls,.png,.jpg,.jpeg,.tiff"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
            />
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 rounded-full bg-apple-blue/10 text-apple-blue">
                <Upload className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                {uploadFile ? uploadFile.name : 'Click to browse or drag file here'}
              </p>
              <p className="text-xs text-neutral-400">
                Supports PDF, DOCX, XLSX, PNG, JPG (up to 50MB)
              </p>
            </div>
          </div>

          {ocrPreview && (
            <div className="p-3.5 rounded-xl bg-apple-blue/10 border border-apple-blue/20 text-xs text-neutral-800 dark:text-neutral-200 font-mono whitespace-pre-wrap">
              {ocrPreview}
            </div>
          )}

          <AppleInput
            label="Document Title *"
            placeholder="e.g. Course Exemption Transcript & Syllabus"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AppleSelect
              label="Document Category"
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
            >
              <option value="">Select Category</option>
              {categories.map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </AppleSelect>

            <AppleSelect
              label="Department Scope"
              value={uploadDept}
              onChange={(e) => setUploadDept(e.target.value)}
            >
              <option value="">University-wide / Default</option>
              {departments.map((d) => (
                <option key={d.department_id} value={d.department_id}>
                  {d.name}
                </option>
              ))}
            </AppleSelect>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="confidential-check"
              checked={uploadConfidential}
              onChange={(e) => setUploadConfidential(e.target.checked)}
              className="rounded text-apple-blue focus:ring-apple-blue"
            />
            <label htmlFor="confidential-check" className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 select-none cursor-pointer">
              Mark as Confidential (Restricts access to author & assigned approvers)
            </label>
          </div>
        </form>
      </AppleModal>

      {/* Document Details, OCR & Versioning Modal */}
      {selectedDoc && (
        <AppleModal
          isOpen={isDetailModalOpen}
          onClose={() => setIsDetailModalOpen(false)}
          title={selectedDoc.title}
          subtitle={`Version ${selectedDoc.version} · ${(selectedDoc.file_size / 1024).toFixed(0)} KB · Uploaded by ${selectedDoc.uploader_name || 'User'}`}
          maxWidth="3xl"
          actions={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <AppleButton
                  variant="destructive"
                  size="sm"
                  icon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => handleDeleteRequest(selectedDoc)}
                >
                  Delete
                </AppleButton>
                <AppleButton
                  variant="ghost"
                  size="sm"
                  icon={<Share2 className="w-3.5 h-3.5" />}
                  onClick={() => setIsShareModalOpen(true)}
                >
                  Share
                </AppleButton>
              </div>
              <div className="flex items-center gap-2">
                <AppleButton
                  variant="secondary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => setIsVersionModalOpen(true)}
                >
                  Upload New Version
                </AppleButton>
                <AppleButton
                  variant="primary"
                  size="sm"
                  icon={<Download className={`w-3.5 h-3.5 ${downloadingId === selectedDoc.document_id ? 'animate-pulse' : ''}`} />}
                  loading={downloadingId === selectedDoc.document_id}
                  onClick={() =>
                    handleDownload(
                      selectedDoc.document_id,
                      selectedDoc.file_name || selectedDoc.title || 'document'
                    )
                  }
                >
                  Download File
                </AppleButton>
              </div>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Metadata Badges */}
            <div className="flex flex-wrap items-center gap-2">
              <AppleBadge variant="blue" size="sm">
                {selectedDoc.category_name || 'Academic Record'}
              </AppleBadge>
              <AppleBadge variant="purple" size="sm">
                v{selectedDoc.version}
              </AppleBadge>
              {selectedDoc.is_confidential && (
                <AppleBadge variant="red" size="sm" dot>
                  Confidential
                </AppleBadge>
              )}
              <span className="text-xs text-neutral-400">
                Created on {new Date(selectedDoc.created_at).toLocaleString()}
              </span>
            </div>

            {/* Extracted AI OCR Text Section */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-apple-purple" />
                  AI Extracted OCR Content
                </h4>
                <AppleBadge variant="teal" size="sm">
                  OCR Extracted
                </AppleBadge>
              </div>
              <div className="p-4 rounded-2xl bg-black/[0.03] dark:bg-black/40 border border-black/5 dark:border-white/5 font-mono text-xs text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                {selectedDoc.ocr_text || 'No OCR text extracted for this file.'}
              </div>
            </div>

            {/* Version History Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-apple-blue" />
                Version History
              </h4>
              <div className="divide-y divide-black/5 dark:divide-white/5 rounded-2xl border border-black/5 dark:border-white/5 overflow-hidden">
                {docVersions.map((v) => (
                  <div key={v.version_id} className="p-3 flex items-center justify-between bg-black/[0.01] dark:bg-white/[0.01] text-xs">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-neutral-900 dark:text-white">Version {v.version_number}</span>
                        {v.version_number === selectedDoc.version && (
                          <AppleBadge variant="green" size="sm">Current</AppleBadge>
                        )}
                      </div>
                      <p className="text-neutral-500 mt-0.5">{v.change_description} · {new Date(v.created_at).toLocaleDateString()}</p>
                    </div>
                    <button
                      onClick={() =>
                        handleDownload(
                          selectedDoc.document_id,
                          `${selectedDoc.file_name || selectedDoc.title || 'document'}-v${v.version_number}`
                        )
                      }
                      disabled={downloadingId === selectedDoc.document_id}
                      className="p-1.5 rounded-lg text-neutral-500 hover:text-apple-blue hover:bg-black/5 dark:hover:bg-white/10 disabled:opacity-40"
                      title="Download this version"
                      aria-label={`Download version ${v.version_number}`}
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </AppleModal>
      )}

      {/* Upload New Version Modal */}
      {selectedDoc && isVersionModalOpen && (
        <AppleModal
          isOpen={isVersionModalOpen}
          onClose={() => setIsVersionModalOpen(false)}
          title={`Upload New Version for "${selectedDoc.title}"`}
          subtitle={`Will create Version ${selectedDoc.version + 1}`}
          maxWidth="md"
          actions={
            <>
              <AppleButton variant="secondary" onClick={() => setIsVersionModalOpen(false)} disabled={versionUploading}>
                Cancel
              </AppleButton>
              <AppleButton variant="primary" onClick={handleNewVersionSubmit} loading={versionUploading}>
                Upload Revision
              </AppleButton>
            </>
          }
        >
          <form onSubmit={handleNewVersionSubmit} className="space-y-4">
            <AppleInput
              label="Select New File *"
              type="file"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setVersionFile(e.target.files[0]);
                }
              }}
              required
            />
            <AppleInput
              label="Change Summary / Description *"
              placeholder="e.g. Added revised syllabus and dean signature."
              value={versionDescription}
              onChange={(e) => setVersionDescription(e.target.value)}
              required
            />
          </form>
        </AppleModal>
      )}

      {/* Share Document Modal */}
      {selectedDoc && isShareModalOpen && (
        <AppleModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          title={`Share Document: "${selectedDoc.title}"`}
          maxWidth="md"
          actions={
            <>
              <AppleButton variant="secondary" onClick={() => setIsShareModalOpen(false)} disabled={sharing}>
                Cancel
              </AppleButton>
              <AppleButton variant="primary" onClick={handleShareSubmit} loading={sharing}>
                Send Notification
              </AppleButton>
            </>
          }
        >
          <form onSubmit={handleShareSubmit} className="space-y-4">
            <AppleInput
              label="User Email"
              type="email"
              placeholder="e.g. faculty.smith@iudwas.edu"
              value={shareUserEmail}
              onChange={(e) => setShareUserEmail(e.target.value)}
            />
            <AppleInput
              label="Optional Note / Message"
              placeholder="e.g. Please review this prior transcript before committee meeting."
              value={shareMessage}
              onChange={(e) => setShareMessage(e.target.value)}
            />
          </form>
        </AppleModal>
      )}

      {/* Delete Document Confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Document"
        message={`"${deleteTarget?.title ?? 'This document'}" will be moved to archive/trash. You can restore it from the admin documents page until it is permanently removed.`}
        confirmLabel="Move to Trash"
        destructive
        loading={deleting}
      />
    </div>
  );
};
