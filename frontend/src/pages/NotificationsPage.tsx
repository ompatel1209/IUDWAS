import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { NotificationItem } from '../types';
import { AppleCard } from '../components/ui/AppleCard';
import { AppleButton } from '../components/ui/AppleButton';
import { AppleBadge } from '../components/ui/AppleBadge';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { EmptyState } from '../components/ui/EmptyState';
import { SendNotificationModal } from '../components/ui/SendNotificationModal';
import {
  Bell,
  CheckCheck,
  Check,
  ArrowRight,
  Clock,
  Send,
  ShieldCheck,
  Award,
  AlertTriangle,
  Info,
  Sparkles,
} from 'lucide-react';

export const NotificationsPage: React.FC = () => {
  const { user, isAdmin, isDeptAdmin, isFaculty } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterUnread, setFilterUnread] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const canSend = isAdmin || isDeptAdmin || isFaculty;

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.notifications.list({ unread: filterUnread || undefined, limit: 50 });
      setNotifications(res.data);
    } catch (err: any) {
      showToast('error', 'Notification Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [filterUnread]);

  const handleMarkRead = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await api.notifications.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n))
      );
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      showToast('success', 'Completed', 'All notifications marked as read.');
    } catch (err: any) {
      showToast('error', 'Error', err.message);
    }
  };

  const handleNotificationClick = (n: NotificationItem) => {
    if (!n.is_read) {
      api.notifications.markRead(n.notification_id).catch(() => {});
      setNotifications((prev) =>
        prev.map((item) => (item.notification_id === n.notification_id ? { ...item, is_read: true } : item))
      );
    }

    if (n.related_resource_type === 'workflow_instance' && n.related_resource_id) {
      navigate(`/workflows?view=${n.related_resource_id}`);
    } else if (n.related_resource_type === 'document' && n.related_resource_id) {
      navigate(`/documents?highlight=${n.related_resource_id}`);
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'URGENT':
        return <AppleBadge variant="red" size="sm">Urgent</AppleBadge>;
      case 'IMPORTANT':
        return <AppleBadge variant="orange" size="sm">Important</AppleBadge>;
      case 'ANNOUNCEMENT':
        return <AppleBadge variant="purple" size="sm">Announcement</AppleBadge>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 animate-apple-fade-in max-w-4xl mx-auto">
      {/* Header & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white flex items-center gap-2.5">
            <Bell className="w-6 h-6 text-apple-blue" />
            Notifications & Announcements
          </h1>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Real-time status updates on submitted workflows, OCR processing, and official signed university notices.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canSend && (
            <AppleButton
              variant="primary"
              size="sm"
              icon={<Send className="w-5 h-5" />}
              onClick={() => setIsSendModalOpen(true)}
            >
              Send Notification
            </AppleButton>
          )}

          <AppleButton
            variant="glass"
            size="sm"
            onClick={() => setFilterUnread(!filterUnread)}
          >
            {filterUnread ? 'Show All' : 'Show Unread Only'}
          </AppleButton>

          <AppleButton
            variant="secondary"
            size="sm"
            icon={<CheckCheck className="w-5 h-5" />}
            onClick={handleMarkAllRead}
            disabled={notifications.length === 0 || notifications.every((n) => n.is_read)}
          >
            Mark All Read
          </AppleButton>
        </div>
      </div>

      {/* Notifications Feed Card */}
      <AppleCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingSpinner message="Retrieving alerts and announcements..." />
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="No Notifications"
              description={filterUnread ? 'You have no unread notifications.' : 'Your notification feed is clear.'}
            />
          </div>
        ) : (
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {notifications.map((n) => (
              <div
                key={n.notification_id}
                onClick={() => handleNotificationClick(n)}
                className={`p-4 sm:p-5 flex items-start justify-between gap-4 transition-colors cursor-pointer apple-press ${
                  !n.is_read
                    ? 'bg-blue-500/[0.04] dark:bg-blue-500/[0.06] hover:bg-blue-500/[0.08]'
                    : 'hover:bg-black/[0.02] dark:hover:bg-white/[0.02]'
                }`}
              >
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  {/* Unread indicator */}
                  <div
                    className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                      !n.is_read ? 'bg-apple-blue shadow-sm ring-4 ring-apple-blue/20' : 'bg-transparent'
                    }`}
                  />

                  <div className="space-y-2 flex-1 min-w-0">
                    {/* Header: Title & Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <h4
                        className={`text-sm ${
                          !n.is_read
                            ? 'font-bold text-neutral-900 dark:text-white'
                            : 'font-semibold text-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {n.title}
                      </h4>
                      {getPriorityBadge(n.priority)}
                      {n.related_resource_type && (
                        <AppleBadge variant="blue" size="sm">
                          {n.related_resource_type.replace('_', ' ')}
                        </AppleBadge>
                      )}
                    </div>

                    {/* Message Body */}
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed break-words whitespace-pre-line">
                      {n.message}
                    </p>

                    {/* Digital Signature & Sender Identification Block */}
                    {n.sender_name && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-6 h-6 rounded-full overflow-hidden bg-apple-blue/10 dark:bg-apple-blue/20 text-apple-blue flex items-center justify-center font-bold text-[10px] flex-shrink-0 border border-apple-blue/20">
                            {n.sender_avatar_url ? (
                              <img
                                src={n.sender_avatar_url}
                                alt={n.sender_name}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span>{n.sender_name.charAt(0).toUpperCase()}</span>
                            )}
                          </div>
                          <div className="min-w-0 truncate">
                            <span className="font-semibold text-neutral-800 dark:text-neutral-200">
                              {n.sender_name}
                            </span>
                            <span className="text-[11px] text-neutral-400 ml-1.5">
                              ({n.sender_role?.replace('_', ' ')} · {n.sender_department_name})
                            </span>
                          </div>
                        </div>

                        {n.sender_signature && (
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-apple-blue bg-apple-blue/10 dark:bg-apple-blue/20 px-2 py-1 rounded-lg flex-shrink-0">
                            <ShieldCheck className="w-4 h-4 text-apple-blue" />
                            <span>Signed: {n.sender_signature}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="text-[11px] text-neutral-400 flex items-center gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(n.created_at).toLocaleString()}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 pt-1">
                  {!n.is_read && (
                    <button
                      onClick={(e) => handleMarkRead(n.notification_id, e)}
                      className="p-2 rounded-lg text-neutral-400 hover:text-apple-blue hover:bg-black/5 dark:hover:bg-white/10"
                      title="Mark as read"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  )}
                  <ArrowRight className="w-5 h-5 text-neutral-400" />
                </div>
              </div>
            ))}
          </div>
        )}
      </AppleCard>

      {/* Send Notification Modal */}
      <SendNotificationModal
        isOpen={isSendModalOpen}
        onClose={() => setIsSendModalOpen(false)}
        onSuccess={loadNotifications}
      />
    </div>
  );
};
