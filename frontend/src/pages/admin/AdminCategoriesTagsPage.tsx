import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { DocCategory, Tag } from '../../types';
import { AppleCard } from '../../components/ui/AppleCard';
import { AppleButton } from '../../components/ui/AppleButton';
import { AppleInput } from '../../components/ui/AppleInput';
import { AppleBadge } from '../../components/ui/AppleBadge';
import { AppleModal } from '../../components/ui/AppleModal';
import { AppleSegmentedControl } from '../../components/ui/AppleSegmentedControl';
import { DataTable, Column } from '../../components/ui/DataTable';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Tags, Plus, Edit2, Trash2, Palette, FileText } from 'lucide-react';

export const AdminCategoriesTagsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'categories' | 'tags'>('categories');
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocCategory | null>(null);
  const [catForm, setCatForm] = useState({ name: '', code: '', color: '#007AFF', is_active: true });

  // Tag Modal
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagForm, setTagForm] = useState({ name: '', color: '#5856D6' });

  // Delete Target
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'category' | 'tag'; item: any } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [catsRes, tagsRes] = await Promise.all([
        api.categories.list(),
        api.tags.list(),
      ]);
      setCategories(catsRes.data);
      setTags(tagsRes.data);
    } catch (err: any) {
      showToast('error', 'Failed to load taxonomies', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catForm.name || !catForm.code) return;
    setSaving(true);
    try {
      if (editingCategory) {
        await api.categories.update(editingCategory.category_id, catForm);
        showToast('success', 'Category Updated', 'Saved.');
      } else {
        await api.categories.create(catForm);
        showToast('success', 'Category Created', 'New category added.');
      }
      setIsCategoryModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', 'Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleTagSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tagForm.name) return;
    setSaving(true);
    try {
      if (editingTag) {
        await api.tags.update(editingTag.tag_id, tagForm);
        showToast('success', 'Tag Updated', 'Saved.');
      } else {
        await api.tags.create(tagForm);
        showToast('success', 'Tag Created', 'New tag added.');
      }
      setIsTagModalOpen(false);
      loadData();
    } catch (err: any) {
      showToast('error', 'Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      if (deleteTarget.type === 'category') {
        const res = await api.categories.delete(deleteTarget.item.category_id);
        showToast('info', 'Category Removed', (res.data as any)?.message || 'Category deleted.');
      } else {
        await api.tags.delete(deleteTarget.item.tag_id);
        showToast('info', 'Tag Removed', 'Tag deleted.');
      }
      setDeleteTarget(null);
      loadData();
    } catch (err: any) {
      showToast('error', 'Delete Failed', err.message);
    } finally {
      setSaving(false);
    }
  };

  const catColumns: Column<DocCategory>[] = [
    {
      header: 'Category Name',
      accessorKey: 'name',
      cell: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: row.color }} />
          <span className="font-semibold text-neutral-900 dark:text-white">{row.name}</span>
        </div>
      ),
    },
    {
      header: 'Code',
      accessorKey: 'code',
      cell: (row) => <span className="font-mono text-xs text-neutral-500 font-bold">{row.code}</span>,
    },
    {
      header: 'Documents Attached',
      accessorKey: 'document_count',
      cell: (row) => (
        <span className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          <span>{row.document_count || 0}</span>
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
            onClick={() => {
              setEditingCategory(row);
              setCatForm({ name: row.name, code: row.code, color: row.color, is_active: row.is_active });
              setIsCategoryModalOpen(true);
            }}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteTarget({ type: 'category', item: row })}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-apple-red"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  const tagColumns: Column<Tag>[] = [
    {
      header: 'Tag Label',
      accessorKey: 'name',
      cell: (row) => (
        <AppleBadge variant="purple" size="sm" dot>
          {row.name}
        </AppleBadge>
      ),
    },
    {
      header: 'Color Code',
      accessorKey: 'color',
      cell: (row) => <span className="font-mono text-xs text-neutral-500">{row.color}</span>,
    },
    {
      header: 'Usage Count',
      accessorKey: 'document_count',
      cell: (row) => <span className="text-xs font-semibold">{row.document_count || 0} tagged</span>,
    },
    {
      header: 'Actions',
      cell: (row) => (
        <div className="flex items-center gap-1.5 justify-end">
          <button
            onClick={() => {
              setEditingTag(row);
              setTagForm({ name: row.name, color: row.color });
              setIsTagModalOpen(true);
            }}
            className="p-1.5 rounded-lg text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDeleteTarget({ type: 'tag', item: row })}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-apple-red"
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
            <Tags className="w-6 h-6 text-apple-indigo" />
            Categories & Taxonomy Tags
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Organize institutional document vaults with custom classifications and color tokens.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <AppleSegmentedControl
            options={[
              { value: 'categories', label: 'Categories' },
              { value: 'tags', label: 'Tags' },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as any)}
          />

          <AppleButton
            variant="primary"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              if (activeTab === 'categories') {
                setEditingCategory(null);
                setCatForm({ name: '', code: '', color: '#007AFF', is_active: true });
                setIsCategoryModalOpen(true);
              } else {
                setEditingTag(null);
                setTagForm({ name: '', color: '#5856D6' });
                setIsTagModalOpen(true);
              }
            }}
          >
            Add {activeTab === 'categories' ? 'Category' : 'Tag'}
          </AppleButton>
        </div>
      </div>

      {activeTab === 'categories' ? (
        <DataTable columns={catColumns} data={categories} loading={loading} />
      ) : (
        <DataTable columns={tagColumns} data={tags} loading={loading} />
      )}

      {/* Category Modal */}
      {isCategoryModalOpen && (
        <AppleModal
          isOpen={true}
          onClose={() => setIsCategoryModalOpen(false)}
          title={editingCategory ? `Edit Category: ${editingCategory.name}` : 'Create Document Category'}
          maxWidth="md"
          actions={
            <>
              <AppleButton variant="secondary" onClick={() => setIsCategoryModalOpen(false)} disabled={saving}>Cancel</AppleButton>
              <AppleButton variant="primary" onClick={handleCategorySubmit} loading={saving}>Save</AppleButton>
            </>
          }
        >
          <form onSubmit={handleCategorySubmit} className="space-y-4">
            <AppleInput
              label="Category Name *"
              placeholder="e.g. Academic Transcript"
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              required
            />
            <AppleInput
              label="Code *"
              placeholder="e.g. TRANSCRIPT"
              value={catForm.code}
              onChange={(e) => setCatForm({ ...catForm, code: e.target.value })}
              required
            />
            <AppleInput
              label="Badge Accent Color"
              type="color"
              value={catForm.color}
              onChange={(e) => setCatForm({ ...catForm, color: e.target.value })}
            />
          </form>
        </AppleModal>
      )}

      {/* Tag Modal */}
      {isTagModalOpen && (
        <AppleModal
          isOpen={true}
          onClose={() => setIsTagModalOpen(false)}
          title={editingTag ? `Edit Tag: ${editingTag.name}` : 'Create Tag'}
          maxWidth="md"
          actions={
            <>
              <AppleButton variant="secondary" onClick={() => setIsTagModalOpen(false)} disabled={saving}>Cancel</AppleButton>
              <AppleButton variant="primary" onClick={handleTagSubmit} loading={saving}>Save</AppleButton>
            </>
          }
        >
          <form onSubmit={handleTagSubmit} className="space-y-4">
            <AppleInput
              label="Tag Label *"
              placeholder="e.g. Urgent Review"
              value={tagForm.name}
              onChange={(e) => setTagForm({ ...tagForm, name: e.target.value })}
              required
            />
            <AppleInput
              label="Tag Color"
              type="color"
              value={tagForm.color}
              onChange={(e) => setTagForm({ ...tagForm, color: e.target.value })}
            />
          </form>
        </AppleModal>
      )}

      {/* Delete Target Confirm */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
          title={`Delete ${deleteTarget.type === 'category' ? 'Category' : 'Tag'}`}
          message={`Are you sure you want to delete ${deleteTarget.item.name}?`}
          confirmLabel="Delete"
          destructive
          loading={saving}
        />
      )}
    </div>
  );
};
