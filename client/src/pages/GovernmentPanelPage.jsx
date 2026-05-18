import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import {
  HiOutlineShieldCheck, HiOutlineX, HiOutlineLocationMarker,
  HiOutlineExclamation, HiOutlineTrendingUp,
} from 'react-icons/hi';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import { ConfirmModal } from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import { CardSkeleton } from '../components/ui/Skeleton';
import { propertyAPI } from '../services';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { formatArea, formatDate } from '../utils';
import { SEPOLIA_EXPLORER } from '../constants';

const GovernmentPanelPage = () => {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const isOfficial = user?.role === 'government_official' || user?.role === 'verifier';

  if (!isOfficial) {
    return <Navigate to="/dashboard" replace />;
  }

  const isGovOfficial = user?.role === 'government_official';
  const [tab, setTab] = useState('pending');
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ['gov-stats'],
    queryFn: () => propertyAPI.getGovernmentStats().then((r) => r.data.data),
  });

  const { data: pending, isLoading: pendingLoading } = useQuery({
    queryKey: ['pending-properties'],
    queryFn: () => propertyAPI.getPending().then((r) => r.data.data),
  });

  const { data: disputed, isLoading: disputedLoading } = useQuery({
    queryKey: ['disputed-properties'],
    queryFn: () => propertyAPI.getDisputed().then((r) => r.data.data),
    enabled: isOfficial,
  });

  const handleAction = async () => {
    if (!selected || !action) return;
    setLoading(true);
    try {
      if (action === 'approve') {
        await propertyAPI.verify(selected.propertyId, { remarks });
        toast.success('Property verified on blockchain!');
      } else if (action === 'reject') {
        await propertyAPI.reject(selected.propertyId, { remarks });
        toast.success('Property rejected');
      } else if (action === 'resolve') {
        await propertyAPI.resolveDispute(selected.propertyId, { resolution: remarks, newStatus: 'verified' });
        toast.success('Dispute resolved');
      }
      queryClient.invalidateQueries();
      setSelected(null);
      setAction(null);
      setRemarks('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const PropertyRow = ({ prop, actions }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-semibold text-primary">{prop.propertyId}</h3>
            <Badge status={prop.status} />
          </div>
          <div className="text-sm text-text-secondary space-y-1">
            <p className="flex items-center gap-1"><HiOutlineLocationMarker /> {prop.district}, {prop.state}</p>
            <p>Owner: {prop.ownerName} • {formatArea(prop.area)} • {prop.landType}</p>
            <p>Survey: {prop.surveyNumber} • {formatDate(prop.createdAt)}</p>
            {prop.verificationRemarks && <p className="text-error/80">Remarks: {prop.verificationRemarks}</p>}
            {prop.transactionHash && (
              <a href={`${SEPOLIA_EXPLORER}${prop.transactionHash}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                View blockchain tx →
              </a>
            )}
          </div>
        </div>
        <div className="flex gap-2">{actions}</div>
      </div>
    </motion.div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-secondary/20 flex items-center justify-center">
          <HiOutlineShieldCheck size={28} className="text-secondary-dark" />
        </div>
        <div>
          <h1 className="font-display text-3xl font-bold text-primary">
            {isGovOfficial ? t('gov.panel') : t('gov.verifierPanel')}
          </h1>
          <p className="text-text-secondary">Review, verify, and manage land registry records</p>
        </div>
      </div>

      {/* Analytics */}
      {stats && (
        <div>
          <h2 className="font-display text-lg font-semibold text-primary mb-4 flex items-center gap-2">
            <HiOutlineTrendingUp /> {t('gov.analytics')}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            {[
              { label: 'Total', value: stats.totalProperties, color: 'text-primary' },
              { label: t('dashboard.pendingReview'), value: stats.pendingCount, color: 'text-yellow-600' },
              { label: t('dashboard.verified'), value: stats.verifiedCount, color: 'text-success' },
              { label: t('dashboard.disputes'), value: stats.disputedCount, color: 'text-error' },
              { label: t('gov.verificationRate'), value: `${stats.verificationRate}%`, color: 'text-secondary-dark' },
            ].map((s) => (
              <div key={s.label} className="card text-center py-4">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-text-secondary mt-1">{s.label}</p>
              </div>
            ))}
          </div>
          {stats.byState?.length > 0 && (
            <div className="card">
              <h3 className="font-semibold text-primary mb-3">Properties by State</h3>
              <div className="space-y-2">
                {stats.byState.slice(0, 5).map((s) => (
                  <div key={s._id} className="flex items-center gap-3">
                    <span className="text-sm w-32 truncate">{s._id}</span>
                    <div className="flex-1 bg-accent rounded-full h-2">
                      <div className="bg-primary h-2 rounded-full" style={{ width: `${(s.count / stats.totalProperties) * 100}%` }} />
                    </div>
                    <span className="text-sm font-medium w-8">{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-200 pb-2">
        {['pending', ...(isGovOfficial ? ['disputed'] : [])].map((tabKey) => (
          <button
            key={tabKey}
            onClick={() => setTab(tabKey)}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-all ${
              tab === tabKey ? 'bg-primary text-white' : 'text-text-secondary hover:bg-primary/5'
            }`}
          >
            {tabKey === 'pending' ? t('gov.pendingRegistrations') : t('gov.disputedProperties')}
            {tabKey === 'pending' && pending?.length > 0 && (
              <span className="ml-2 bg-secondary text-primary text-xs px-2 py-0.5 rounded-full">{pending.length}</span>
            )}
          </button>
        ))}
      </div>

      {tab === 'pending' && (
        pendingLoading ? <CardSkeleton /> :
        pending?.length > 0 ? (
          <div className="space-y-4">
            {pending.map((prop) => (
              <PropertyRow
                key={prop._id}
                prop={prop}
                actions={
                  <>
                    <Button size="sm" onClick={() => { setSelected(prop); setAction('approve'); }}>
                      <HiOutlineShieldCheck /> {t('gov.approve')}
                    </Button>
                    {isGovOfficial && (
                      <Button variant="danger" size="sm" onClick={() => { setSelected(prop); setAction('reject'); }}>
                        <HiOutlineX /> {t('gov.reject')}
                      </Button>
                    )}
                  </>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={HiOutlineShieldCheck} title="No pending registrations" description="All registrations have been processed." />
        )
      )}

      {tab === 'disputed' && isGovOfficial && (
        disputedLoading ? <CardSkeleton /> :
        disputed?.length > 0 ? (
          <div className="space-y-4">
            {disputed.map((prop) => (
              <PropertyRow
                key={prop._id}
                prop={prop}
                actions={
                  <Button size="sm" onClick={() => { setSelected(prop); setAction('resolve'); }}>
                    <HiOutlineExclamation /> {t('gov.resolve')}
                  </Button>
                }
              />
            ))}
          </div>
        ) : (
          <EmptyState icon={HiOutlineExclamation} title="No active disputes" description="All disputes have been resolved." />
        )
      )}

      <ConfirmModal
        isOpen={!!action}
        onClose={() => { setAction(null); setRemarks(''); }}
        onConfirm={handleAction}
        title={
          action === 'approve' ? 'Approve Property' :
          action === 'reject' ? 'Reject Property' : 'Resolve Dispute'
        }
        confirmText={
          action === 'approve' ? 'Approve & Verify' :
          action === 'reject' ? 'Reject' : 'Resolve'
        }
        loading={loading}
        danger={action === 'reject'}
      >
        <div className="space-y-3">
          <p className="text-text-secondary">
            {action === 'approve' && `Verify ${selected?.propertyId} on the blockchain?`}
            {action === 'reject' && `Reject registration for ${selected?.propertyId}?`}
            {action === 'resolve' && `Resolve dispute for ${selected?.propertyId}?`}
          </p>
          <Input label="Remarks" placeholder="Add remarks..." value={remarks} onChange={(e) => setRemarks(e.target.value)} />
        </div>
      </ConfirmModal>
    </div>
  );
};

export default GovernmentPanelPage;
