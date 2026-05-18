import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  HiOutlineBell, HiOutlineSwitchHorizontal, HiOutlineShieldCheck,
  HiOutlineExclamation, HiOutlineCheckCircle, HiOutlineDocumentAdd,
} from 'react-icons/hi';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Skeleton';
import { notificationAPI } from '../services';
import { formatDate } from '../utils';

const typeIcons = {
  transfer_request: HiOutlineSwitchHorizontal,
  verification_completed: HiOutlineShieldCheck,
  dispute_raised: HiOutlineExclamation,
  transaction_confirmed: HiOutlineCheckCircle,
  property_registered: HiOutlineDocumentAdd,
  property_rejected: HiOutlineExclamation,
};

const FILTERS = ['all', 'unread', 'transfer_request', 'verification_completed', 'dispute_raised'];

const NotificationsPage = () => {
  const [filter, setFilter] = useState('all');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => notificationAPI.getAll({ filter: filter === 'all' ? undefined : filter }).then((r) => r.data),
  });

  const markAllRead = useMutation({
    mutationFn: () => notificationAPI.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markRead = useMutation({
    mutationFn: (id) => notificationAPI.markAsRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">Notifications</h1>
          {data?.unreadCount > 0 && (
            <p className="text-text-secondary">{data.unreadCount} unread</p>
          )}
        </div>
        {data?.unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={() => markAllRead.mutate()}>Mark all read</Button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto pb-2">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap ${
              filter === f ? 'bg-primary text-white' : 'bg-white text-text-secondary'
            }`}>
            {f.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <CardSkeleton key={i} />)}</div>
      ) : data?.data?.length > 0 ? (
        <div className="space-y-3">
          {data.data.map((n) => {
            const Icon = typeIcons[n.type] || HiOutlineBell;
            return (
              <motion.div
                key={n._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => !n.isRead && markRead.mutate(n._id)}
                className={`card flex gap-4 cursor-pointer transition-all ${
                  !n.isRead ? 'border-l-4 border-l-secondary bg-secondary/5' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
                  <Icon size={20} className="text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{n.title}</p>
                  <p className="text-sm text-text-secondary">{n.message}</p>
                  <p className="text-xs text-text-secondary mt-1">{formatDate(n.createdAt)}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={HiOutlineBell} title="No notifications" description="You're all caught up!" />
      )}
    </div>
  );
};

export default NotificationsPage;
