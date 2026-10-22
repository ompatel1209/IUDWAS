import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, GitPullRequest, Bot, Users, Building, Shield, Settings, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // The palette is controlled by the parent; signal via a custom event
          window.dispatchEvent(new CustomEvent('iudwas:open-command'));
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Restore focus to the search field whenever the palette opens
  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setSearchError(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setSearchError(null);
      try {
        const res = await api.ai.search(query);
        setSearchResults(res.data || []);
      } catch (err: any) {
        // Surface search failures instead of silently hiding results
        setSearchResults([]);
        setSearchError(err?.message || 'Semantic search is unavailable right now.');
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  if (!isOpen) return null;

  const quickNav = [
    { label: 'User Dashboard', path: '/dashboard', icon: <FileText className="w-4 h-4 text-apple-blue" /> },
    { label: 'Document Explorer', path: '/documents', icon: <FileText className="w-4 h-4 text-apple-purple" /> },
    { label: 'Workflows & Requests', path: '/workflows', icon: <GitPullRequest className="w-4 h-4 text-apple-orange" /> },
    { label: 'AI Document Assistant', path: '/ai-assistant', icon: <Bot className="w-4 h-4 text-apple-teal" /> },
  ];

  if (user?.role === 'SUPER_ADMIN' || user?.role === 'DEPT_ADMIN') {
    quickNav.push(
      { label: 'Admin Dashboard', path: '/admin', icon: <Shield className="w-4 h-4 text-apple-red" /> },
      { label: 'Manage Users', path: '/admin/users', icon: <Users className="w-4 h-4 text-apple-blue" /> },
      { label: 'Manage Departments', path: '/admin/departments', icon: <Building className="w-4 h-4 text-apple-green" /> },
    );
    // System Settings is Super-Admin-only (matches the RoleGuard in App.tsx)
    if (user.role === 'SUPER_ADMIN') {
      quickNav.push({ label: 'System Settings', path: '/admin/settings', icon: <Settings className="w-4 h-4 text-neutral-400" /> });
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 dark:bg-black/70 backdrop-blur-md" onClick={onClose} aria-hidden="true" />

      {/* Spotlight Window */}
      <div className="relative w-full max-w-2xl glass-panel dark:bg-[#1C1C1E]/95 rounded-3xl sm:rounded-4xl shadow-apple-modal border border-white/60 dark:border-white/10 overflow-hidden z-10 animate-apple-modal flex flex-col">
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-black/5 dark:border-white/10">
          <Search className="w-5 h-5 text-neutral-400" aria-hidden="true" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents with AI, navigate, or ask a question... (Cmd+K)"
            aria-label="Search documents and navigate"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-results"
            className="w-full bg-transparent text-base font-medium text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-block px-2.5 py-1 text-[11px] font-bold text-neutral-400 bg-black/5 dark:bg-white/10 rounded-lg">
            ESC
          </kbd>
        </div>

        {/* Results Area */}
        <div id="command-palette-results" className="max-h-96 overflow-y-auto p-3 space-y-4" role="listbox" aria-label="Command palette results">
          {loading && (
            <p className="px-3 py-2 text-xs text-neutral-400">Searching documents…</p>
          )}

          {searchError && !loading && (
            <p className="px-3 py-2 text-xs text-apple-red" role="alert">
              {searchError}
            </p>
          )}

          {searchResults.length > 0 && (
            <div>
              <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                AI Document Search Results
              </p>
              <div className="mt-1 space-y-1">
                {searchResults.map((item) => (
                  <button
                    key={item.document_id}
                    type="button"
                    onClick={() => {
                      navigate(`/documents?highlight=${item.document_id}`);
                      onClose();
                    }}
                    className="w-full text-left p-3 rounded-2xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer transition-colors apple-press flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-apple-blue/10 text-apple-blue mt-0.5">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {item.title}
                        </h5>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5">
                          {item.snippet}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-neutral-400 flex-shrink-0 mt-1" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && !searchError && query.trim() && searchResults.length === 0 && (
            <p className="px-3 py-2 text-xs text-neutral-400">
              No documents matched “{query.trim()}”.
            </p>
          )}

          {/* Quick Navigation Links */}
          <div>
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
              Quick Navigation
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
              {quickNav.map((item) => (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => {
                    navigate(item.path);
                    onClose();
                  }}
                  className="flex items-center justify-between p-3 rounded-2xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] cursor-pointer transition-colors apple-press text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-black/5 dark:bg-white/10">{item.icon}</div>
                    <span className="text-sm font-medium text-neutral-800 dark:text-neutral-200">
                      {item.label}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-neutral-400" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 border-t border-black/5 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01] flex items-center justify-between text-[11px] text-neutral-400">
          <span>Tip: Press <kbd className="px-1.5 py-0.5 bg-black/5 dark:bg-white/10 rounded">Cmd+K</kbd> anywhere to open</span>
          <span>IUDWAS Semantic Search Engine</span>
        </div>
      </div>
    </div>
  );
};
