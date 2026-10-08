'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bell, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { api } from '@/lib/api';
import { Notification } from '@/lib/types';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export function NotificationPanel({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user } = useAuth();

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      setItems(await api.notifications.list());
    } catch {
      setError('Unable to load notifications. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen]);

  const unread = items.filter((n) => !n.is_read).length;

  const markAll = async () => {
    try {
      await api.notifications.markAllRead();
      await load();
    } catch {
      setError('Unable to mark notifications as read.');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-80 md:w-96 bg-white shadow-2xl z-50 flex flex-col"
          >
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold flex items-center gap-2">
                <Bell className="w-4 h-4" /> Notifications
                {unread > 0 && <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">{unread}</span>}
              </h2>
              <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading && <p className="text-sm text-slate-500">Loading...</p>}
              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>}
              {!loading && items.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-8">No notifications yet.</p>
              )}
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-lg border text-sm ${n.is_read ? 'bg-white border-slate-100' : 'bg-indigo-50 border-indigo-100'}`}
                >
                  <p className="font-medium text-slate-900">{n.title}</p>
                  <p className="text-slate-600 mt-1">{n.message}</p>
                  <p className="text-[10px] text-slate-400 mt-2">
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </p>
                  {n.complaint_id && (
                    <Link
                      href={user?.role === 'staff'
                        ? `/staff/complaints/${n.complaint_id}`
                        : user?.role === 'admin'
                          ? '/admin/complaints'
                          : `/student/complaints/${n.complaint_id}`}
                      className="text-xs text-indigo-600 font-medium mt-2 inline-block"
                    >
                      View complaint
                    </Link>
                  )}
                  {n.issue_group_id && user?.role === 'admin' && (
                    <Link href={`/admin/issues/${n.issue_group_id}`} className="text-xs text-indigo-600 font-medium mt-2 inline-block">
                      Investigate signal
                    </Link>
                  )}
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100">
              <button
                onClick={markAll}
                disabled={loading || unread === 0}
                className="w-full py-2 text-sm text-center text-slate-600 font-medium hover:bg-slate-50 rounded-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Mark all as read
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
