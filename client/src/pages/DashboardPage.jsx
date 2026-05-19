import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  HiOutlineHome, HiOutlineSwitchHorizontal, HiOutlineCheckCircle,
  HiOutlineDocumentAdd, HiOutlineClipboardList, HiOutlineUpload,
  HiOutlineShieldCheck, HiOutlineExclamation,
} from 'react-icons/hi';
import { useAuthStore } from '../store';
import { propertyAPI } from '../services';
import { formatDate } from '../utils';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';

const ownerActions = [
  { path: '/register-property', labelKey: 'property.register', icon: HiOutlineDocumentAdd, color: 'bg-primary text-white' },
  { path: '/transfer', labelKey: 'nav.transfer', icon: HiOutlineSwitchHorizontal, color: 'bg-secondary text-primary' },
  { path: '/properties', labelKey: 'nav.properties', icon: HiOutlineClipboardList, color: 'bg-primary/10 text-primary' },
  { path: '/documents', labelKey: 'nav.documents', icon: HiOutlineUpload, color: 'bg-success/10 text-success' },
];

const officialActions = [
  { path: '/government', labelKey: 'gov.pendingRegistrations', icon: HiOutlineShieldCheck, color: 'bg-primary text-white' },
  { path: '/search', labelKey: 'nav.search', icon: HiOutlineClipboardList, color: 'bg-secondary text-primary' },
];

const DashboardPage = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isOfficial = user?.role === 'government_official' || user?.role === 'verifier';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => propertyAPI.getDashboardStats().then((r) => r.data.data),
    retry: 1,
    placeholderData: {
      totalProperties: 0,
      pendingTransfers: 0,
      verifiedDocuments: 0,
      pendingCount: 0,
      verifiedCount: 0,
      disputedCount: 0,
      recentActivity: [],
    },
  });

  if (isLoading && !data) return <DashboardSkeleton />;

  const ownerStats = [
    { key: 'totalProperties', label: t('dashboard.totalProperties'), icon: HiOutlineHome, color: 'bg-primary/10 text-primary' },
    { key: 'pendingTransfers', label: t('dashboard.pendingTransfers'), icon: HiOutlineSwitchHorizontal, color: 'bg-secondary/10 text-secondary-dark' },
    { key: 'verifiedDocuments', label: t('dashboard.verifiedDocs'), icon: HiOutlineCheckCircle, color: 'bg-success/10 text-success' },
  ];

  const officialStats = [
    { key: 'pendingCount', label: t('dashboard.pendingReview'), icon: HiOutlineShieldCheck, color: 'bg-yellow-100 text-yellow-700' },
    { key: 'verifiedCount', label: t('dashboard.verified'), icon: HiOutlineCheckCircle, color: 'bg-success/10 text-success' },
    { key: 'disputedCount', label: t('dashboard.disputes'), icon: HiOutlineExclamation, color: 'bg-red-100 text-error' },
  ];

  const statCards = isOfficial ? officialStats : ownerStats;
  const quickActions = isOfficial ? officialActions : ownerActions;

  return (
    <div className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold text-primary">
          {t('dashboard.greeting', { name: user?.fullName?.split(' ')[0] })}
        </h1>
        <p className="text-text-secondary mt-1">{t('dashboard.subtitle')}</p>
        {isError && (
          <p className="text-sm text-amber-700 mt-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Could not load live stats — start the API server (port 5000) and ensure MongoDB is connected.
          </p>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map(({ key, label, icon: Icon, color }, i) => (
          <motion.div key={key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="card flex items-center gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${color}`}>
              <Icon size={28} />
            </div>
            <div>
              <p className="text-text-secondary text-sm">{label}</p>
              <p className="text-3xl font-bold text-primary">{data?.[key] ?? 0}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div>
        <h2 className="font-display text-xl font-semibold text-primary mb-4">{t('dashboard.quickActions')}</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map(({ path, labelKey, icon: Icon, color }, i) => (
            <motion.div key={path} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 + i * 0.05 }}>
              <Link to={path} className={`${color} rounded-2xl p-6 flex flex-col items-center gap-3 hover:scale-105 transition-transform shadow-card`}>
                <Icon size={32} />
                <span className="font-semibold text-sm text-center">{t(labelKey)}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="font-display text-xl font-semibold text-primary mb-4">{t('dashboard.recentActivity')}</h2>
        {data?.recentActivity?.length > 0 ? (
          <div className="space-y-3">
            {data.recentActivity.map((tx) => (
              <div key={tx._id} className="flex items-center justify-between p-4 bg-accent rounded-xl">
                <div>
                  <p className="font-medium text-text-primary">
                    {tx.actionType} — {tx.propertyId}
                    {tx.initiatedBy?.fullName && (
                      <span className="text-text-secondary font-normal"> by {tx.initiatedBy.fullName}</span>
                    )}
                  </p>
                  <p className="text-sm text-text-secondary">{formatDate(tx.createdAt)}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  tx.status === 'confirmed' ? 'bg-green-100 text-success' : 'bg-yellow-100 text-yellow-700'
                }`}>
                  {tx.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title={t('dashboard.noActivity')} description="Transactions will appear here." />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
