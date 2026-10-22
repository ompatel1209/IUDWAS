import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { api } from '../../services/api';
import { Bell, Sun, Moon, Search, LogOut, User as UserIcon, Shield, Layers, Camera } from 'lucide-react';
import { AppleBadge } from '../ui/AppleBadge';
import { ProfileModal } from '../ui/ProfileModal';

interface NavbarProps {
  onOpenCommand: () => void;
  onToggleSidebar?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenCommand, onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const navigate = useNavigate();

  const fetchUnread = async () => {
    try {
      if (user) {
        const res = await api.notifications.unreadCount();
        setUnreadCount(res.data.unread_count || 0);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 15000);
    return () => clearInterval(interval);
  }, [user]);

  // Close the profile dropdown with Escape
  useEffect(() => {
    if (!showProfileMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowProfileMenu(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showProfileMenu]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const roleVariant = {
    SUPER_ADMIN: 'red',
    DEPT_ADMIN: 'purple',
    FACULTY: 'blue',
    STUDENT: 'teal',
  }[user?.role || 'STUDENT'] as any;

  return (
    <>
      <header className="sticky top-0 z-30 w-full glass-nav backdrop-blur-apple h-16 flex items-center justify-between px-4 sm:px-6">
        {/* Left: Mobile Toggle & Logo */}
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10"
              aria-label="Open navigation menu"
              aria-controls="app-sidebar"
            >
              <Layers className="w-5 h-5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2.5 cursor-pointer apple-press select-none"
            aria-label="IUDWAS home — go to dashboard"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-apple-blue to-apple-purple flex items-center justify-center text-white font-black text-base shadow-sm">
              IU
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-1.5">
                IUDWAS
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-neutral-500">
                  PRO
                </span>
              </h1>
              <p className="text-[10px] text-neutral-500 dark:text-neutral-400 hidden sm:block">
                Intelligent University Platform
              </p>
            </div>
          </button>
        </div>

        {/* Middle: Spotlight Search Launcher */}
        <button
          onClick={onOpenCommand}
          className="hidden md:flex items-center justify-between gap-6 px-3.5 py-1.5 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] border border-black/5 dark:border-white/5 text-xs text-neutral-500 dark:text-neutral-400 transition-colors w-72 apple-press"
        >
          <span className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <span>Spotlight Search...</span>
          </span>
          <kbd className="px-1.5 py-0.5 text-[10px] font-semibold bg-white dark:bg-black/40 rounded border border-black/10 dark:border-white/10">
            ⌘K
          </kbd>
        </button>

        {/* Right: Actions, Theme, Notifications & User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Spotlight icon button for mobile */}
          <button
            onClick={onOpenCommand}
            className="md:hidden p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10"
            aria-label="Open Spotlight search"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            className="p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 apple-press transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            aria-label="View notifications"
            className="relative p-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 apple-press transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-apple-red text-white text-[10px] font-bold flex items-center justify-center shadow-sm animate-pulse">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-haspopup="menu"
              aria-expanded={showProfileMenu}
              aria-label="Open account menu"
              className="flex items-center gap-2.5 p-1.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 apple-press transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-apple-blue/10 dark:bg-apple-blue/20 text-apple-blue flex items-center justify-center font-bold text-xs border border-apple-blue/20">
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
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate max-w-[120px]">
                  {user?.full_name}
                </p>
                <AppleBadge variant={roleVariant} size="sm" className="mt-0.5 text-[9px] px-1.5 py-0">
                  {user?.role.replace('_', ' ')}
                </AppleBadge>
              </div>
            </button>

            {/* Profile Dropdown */}
            {showProfileMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowProfileMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-64 glass-panel dark:bg-[#1C1C1E] rounded-2xl shadow-apple-modal border border-white/20 dark:border-white/10 p-2 z-50 animate-apple-fade-in space-y-1">
                  <div className="px-3 py-2.5 border-b border-black/5 dark:border-white/10 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full overflow-hidden bg-apple-blue/10 dark:bg-apple-blue/20 text-apple-blue flex items-center justify-center font-bold text-sm border border-apple-blue/20 flex-shrink-0">
                      {user?.avatar_url ? (
                        <img
                          src={user.avatar_url}
                          alt={user.full_name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{user?.full_name?.charAt(0).toUpperCase() || 'U'}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-neutral-900 dark:text-white truncate">
                        {user?.full_name}
                      </p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">
                        {user?.email}
                      </p>
                      {user?.department_name && (
                        <p className="text-[10px] text-apple-blue mt-0.5 font-medium truncate">
                          {user.department_name}
                        </p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setIsProfileModalOpen(true);
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <Camera className="w-5 h-5 text-apple-blue" />
                    <span>Profile Photo & Account</span>
                  </button>

                  <button
                    onClick={() => {
                      navigate('/dashboard');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                  >
                    <UserIcon className="w-5 h-5 text-neutral-400" />
                    <span>My Dashboard</span>
                  </button>

                  {(user?.role === 'SUPER_ADMIN' || user?.role === 'DEPT_ADMIN') && (
                    <button
                      onClick={() => {
                        navigate('/admin');
                        setShowProfileMenu(false);
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    >
                      <Shield className="w-5 h-5 text-apple-red" />
                      <span>Admin Control Center</span>
                    </button>
                  )}

                  <div className="pt-1 border-t border-black/5 dark:border-white/10">
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-apple-red hover:bg-red-500/10 transition-colors"
                    >
                      <LogOut className="w-5 h-5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Profile modal lives outside the z-30 header stacking context so its
          z-50 overlay is never trapped beneath the command palette (M16). */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};
