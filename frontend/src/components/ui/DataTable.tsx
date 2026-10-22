import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { AppleCard } from './AppleCard';
import { AppleButton } from './AppleButton';
import { LoadingSpinner } from './LoadingSpinner';
import { EmptyState } from './EmptyState';

export interface Column<T> {
  header: string;
  accessorKey?: keyof T | string;
  cell?: (row: T) => React.ReactNode;
  sortable?: boolean;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  onSort?: (columnKey: string) => void;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  toolbar?: React.ReactNode;
}

export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  page = 1,
  limit = 10,
  total = 0,
  totalPages = 1,
  onPageChange,
  sortBy,
  sortOrder = 'DESC',
  onSort,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching your filter criteria.',
  emptyAction,
  toolbar,
}: DataTableProps<T>) {
  return (
    <AppleCard className="p-0 overflow-hidden shadow-apple-card border border-black/5 dark:border-white/10 rounded-3xl">
      {toolbar && (
        <div className="p-4 border-b border-black/5 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01]">
          {toolbar}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.02]">
              {columns.map((col, idx) => {
                const sortable = !!col.sortable && !!col.accessorKey && !!onSort;
                const isActive = sortable && sortBy === col.accessorKey;
                const ariaSort: 'ascending' | 'descending' | 'none' = isActive
                  ? sortOrder === 'ASC'
                    ? 'ascending'
                    : 'descending'
                  : 'none';
                return (
                  <th
                    key={idx}
                    aria-sort={sortable ? ariaSort : undefined}
                    className={`px-5 py-3.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400 ${
                      sortable ? 'cursor-pointer select-none hover:text-neutral-900 dark:hover:text-white' : ''
                    } ${col.className || ''}`}
                    onClick={() => {
                      if (sortable) onSort(String(col.accessorKey));
                    }}
                    onKeyDown={(e) => {
                      if (sortable && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onSort(String(col.accessorKey));
                      }
                    }}
                    tabIndex={sortable ? 0 : undefined}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{col.header}</span>
                      {sortable && (
                        <span className="text-neutral-400" aria-hidden="true">
                          {isActive ? (
                            sortOrder === 'ASC' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-apple-blue" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-apple-blue" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-40" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="py-16 text-center">
                  <LoadingSpinner message="Loading records..." />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="py-14">
                  <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
                </td>
              </tr>
            ) : (
              data.map((row, rowIdx) => (
                <tr
                  key={row.id || row.user_id || row.document_id || row.department_id || row.workflow_id || row.instance_id || rowIdx}
                  className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors"
                >
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className={`px-5 py-3.5 text-neutral-800 dark:text-neutral-200 ${col.className || ''}`}>
                      {col.cell ? col.cell(row) : col.accessorKey ? row[col.accessorKey as string] : null}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 0 && onPageChange && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-3.5 border-t border-black/5 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01] text-xs text-neutral-500 dark:text-neutral-400">
          <div>
            Showing <span className="font-bold text-neutral-900 dark:text-white">{data.length > 0 ? (page - 1) * limit + 1 : 0}</span> to{' '}
            <span className="font-bold text-neutral-900 dark:text-white">{Math.min(page * limit, total)}</span> of{' '}
            <span className="font-bold text-neutral-900 dark:text-white">{total}</span> records
          </div>

          <div className="flex items-center gap-1.5">
            <AppleButton
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={page <= 1}
              aria-label="Go to first page"
              icon={<ChevronsLeft className="w-3.5 h-3.5" />}
            />
            <AppleButton
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Go to previous page"
              icon={<ChevronLeft className="w-3.5 h-3.5" />}
            />
            <span className="px-3 py-1 text-xs font-bold text-neutral-700 dark:text-neutral-200">
              Page {page} of {totalPages}
            </span>
            <AppleButton
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Go to next page"
              icon={<ChevronRight className="w-3.5 h-3.5" />}
            />
            <AppleButton
              variant="secondary"
              size="sm"
              onClick={() => onPageChange(totalPages)}
              disabled={page >= totalPages}
              aria-label="Go to last page"
              icon={<ChevronsRight className="w-3.5 h-3.5" />}
            />
          </div>
        </div>
      )}
    </AppleCard>
  );
}
