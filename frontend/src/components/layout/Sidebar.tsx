import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  GitPullRequest,
  Bot,
  Bell,
  Users,
  Building,
  Tags,
  Shield,
  Settings,
  History,
  CheckSquare,
} from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const isAdminOrDeptAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'DEPT_ADMIN';
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const navItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-semibold transition-all duration-150 apple-press select-none ${
      isActive
        ? 'bg-apple-blue text-white shadow-sm border-t border-white/25 font-bold'
        : 'text-neutral-600 dark:text-neutral-400 hover:bg-black/5 dark:hover:bg-white/10 hover:text-neutral-900 dark:hover:text-white'
    }`;

  const mainNav = [
    { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { to: '/documents', label: 'Documents', icon: <FileText className="w-5 h-5" /> },
    { to: '/workflows', label: 'Workflow Requests', icon: <GitPullRequest className="w-5 h-5" /> },
    { to: '/ai-assistant', label: 'AI Assistant & OCR', icon: <Bot className="w-5 h-5" /> },
    { to: '/notifications', label: 'Notifications', icon: <Bell className="w-5 h-5" /> },
  ];

  const adminNav = [
    { to: '/admin', label: 'Admin Overview', icon: <Shield className="w-5 h-5" />, exact: true },
    { to: '/admin/users', label: 'User Management', icon: <Users className="w-5 h-5" /> },
    { to: '/admin/departments', label: 'Departments', icon: <Building className="w-5 h-5" /> },
    { to: '/admin/documents', label: 'All Documents', icon: <FileText className="w-5 h-5" /> },
    { to: '/admin/workflows', label: 'Workflow Templates', icon: <CheckSquare className="w-5 h-5" /> },
    { to: '/admin/categories-tags', label: 'Categories & Tags', icon: <Tags className="w-5 h-5" /> },
    { to: '/admin/audit', label: 'Audit Trail', icon: <History className="w-5 h-5" /> },
  ];

  if (isSuperAdmin) {
    adminNav.push({ to: '/admin/settings', label: 'System Settings', icon: <Settings className="w-5 h-5" /> });
  }

  const content = (
    <div className="flex flex-col h-full justify-between p-4 space-y-6">
      <div className="space-y-6">
        {/* Main Navigation */}
        <div>
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            Workspace
          </p>
          <nav className="space-y-1">
            {mainNav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={onClose}
                className={navItemClass}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Administration Section */}
        {isAdminOrDeptAdmin && (
          <div>
            <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              Administration
            </p>
            <nav className="space-y-1">
              {adminNav.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  onClick={onClose}
                  className={navItemClass}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* University System Card in Sidebar */}
      <div className="p-3.5 rounded-3xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 text-[11px] space-y-1.5 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="font-bold text-neutral-800 dark:text-neutral-200">IUDWAS Ecosystem</span>
          <span className="w-2 h-2 rounded-full bg-[#34C759] shadow-xs" />
        </div>
        <p className="text-neutral-500 dark:text-neutral-400 text-[10px] leading-relaxed">
          iOS HIG Theme · 3NF SQLite Engine · WCAG 2.1 AA
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside id="app-sidebar" className="hidden md:block w-64 glass-nav border-r border-black/5 dark:border-white/10 h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto">
        {content}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <MobileDrawer onClose={onClose} content={content} />
      )}
    </>
  );
};

const MobileDrawer: React.FC<{ onClose?: () => void; content: React.ReactNode }> = ({ onClose, content }) => {
  // Escape to close, body scroll lock, and dialog semantics for the drawer
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div className="fixed inset-0 z-40 md:hidden flex" role="dialog" aria-modal="true" aria-label="Navigation menu">
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-md transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className="relative w-64 max-w-[80vw] h-full glass-panel dark:bg-[#1C1C1E] z-50 overflow-y-auto shadow-apple-modal animate-apple-modal outline-none">
        {content}
      </aside>
    </div>
  );
};
