import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { QRCodeSVG } from 'qrcode.react';
import {
  HiOutlineLocationMarker, HiOutlineScale, HiOutlineSwitchHorizontal,
  HiOutlineExclamation, HiOutlineShare, HiOutlineExternalLink,
  HiOutlineSave, HiOutlineLink,
} from 'react-icons/hi';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import { CardSkeleton } from '../components/ui/Skeleton';
import { propertyAPI } from '../services';
import { formatDate, formatArea, truncateHash, copyToClipboard } from '../utils';
import { SEPOLIA_EXPLORER } from '../constants';

const PropertyDetailPage = () => {
  const { id } = useParams();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showQR, setShowQR] = useState(false);
  const [showDispute, setShowDispute] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeLoading, setDisputeLoading] = useState(false);
  const [certLoading, setCertLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: () => propertyAPI.getById(id).then((r) => r.data.data),
  });

  const ownerName = data?.property?.owner?.fullName || data?.property?.ownerName || 'Unknown';
  const walletAddress = data?.property?.owner?.walletAddress || '';
  const createdAt = data?.property?.createdAt ? new Date(data.property.createdAt) : null;
  const verifiedAt = data?.property?.verifiedAt ? new Date(data.property.verifiedAt) : null;

  const handleShare = async () => {
    const url = `${window.location.origin}/verify?id=${id}`;
    const ok = await copyToClipboard(url);
    toast[ok ? 'success' : 'error'](ok ? 'Verification link copied!' : 'Failed to copy');
  };

  const handleDownloadCert = async () => {
    setCertLoading(true);
    try {
      const res = await propertyAPI.downloadCertificate(id);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `Bhumi-Certificate-${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Certificate downloaded!');
    } catch {
      toast.error('Certificate not available');
    } finally {
      setCertLoading(false);
    }
  };

  const handleRaiseDispute = async () => {
    if (disputeReason.length < 10) {
      toast.error('Please provide a detailed reason (min 10 characters)');
      return;
    }
    setDisputeLoading(true);
    try {
      await propertyAPI.raiseDispute(id, { reason: disputeReason });
      toast.success(t('property.disputeSuccess'));
      setShowDispute(false);
      queryClient.invalidateQueries({ queryKey: ['property', id] });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to raise dispute');
    } finally {
      setDisputeLoading(false);
    }
  };

  if (isLoading) return <CardSkeleton />;
  if (!data?.property) return <div className="text-center py-16 text-text-secondary">Property not found</div>;

  const { property, transactions, ownershipHistory } = data;
  const verifyUrl = `${window.location.origin}/verify?id=${property.propertyId}`;
  const historyItems = ownershipHistory?.length > 0
    ? ownershipHistory
    : transactions?.map((tx) => ({ actionType: tx.actionType, timestamp: null, createdAt: tx.createdAt }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-display text-3xl font-bold text-primary">{property.propertyId}</h1>
            <Badge status={property.status} />
            {property.blockchainVerified && (
              <span className="text-xs bg-secondary/20 text-secondary-dark px-2 py-1 rounded-full font-semibold">⛓ On Chain</span>
            )}
          </div>
          <p className="text-text-secondary">Survey No: {property.surveyNumber}</p>
              {property.demo && (
                <p className="text-sm text-warning mt-2">This is a demo property record for offline/demo mode.</p>
              )}
        </div>
        <div className="flex gap-2 flex-wrap">
          {property.status === 'verified' && (
            <>
              <Link to={`/transfer?property=${property.propertyId}`}>
                <Button variant="secondary" size="sm"><HiOutlineSwitchHorizontal /> Transfer</Button>
              </Link>
              <Button variant="outline" size="sm" onClick={handleDownloadCert} loading={certLoading}>
                <HiOutlineSave /> {t('property.downloadCert')}
              </Button>
            </>
          )}
          {property.status !== 'disputed' && property.status !== 'pending' && (
            <Button variant="ghost" size="sm" onClick={() => setShowDispute(true)}>
              <HiOutlineExclamation /> {t('property.raiseDispute')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => setShowQR(true)}>
            <HiOutlineLink /> {t('property.shareQR')}
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}><HiOutlineShare /> Share</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card space-y-4">
          <h2 className="font-semibold text-primary">{t('property.details')}</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><HiOutlineLocationMarker className="text-secondary" /><span>{property.district}, {property.state} — {property.pincode}</span></div>
            <div className="flex items-center gap-2"><HiOutlineScale className="text-secondary" /><span>{formatArea(property.area)} • {property.landType}</span></div>
            <div><span className="text-text-secondary">Owner: </span><span className="font-medium">{ownerName}</span></div>
            {walletAddress && (
              <div><span className="text-text-secondary">Wallet: </span><span className="font-medium">{walletAddress}</span></div>
            )}
            {property.verificationRemarks && (
              <div><span className="text-text-secondary">Remarks: </span><span>{property.verificationRemarks}</span></div>
            )}
            {createdAt && (
              <div><span className="text-text-secondary">Registered: </span><span>{createdAt.toLocaleString()}</span></div>
            )}
            {verifiedAt && (
              <div><span className="text-text-secondary">Verified: </span><span>{verifiedAt.toLocaleString()}</span></div>
            )}
            {property.transactionHash && (
              <div>
                <span className="text-text-secondary">Tx Hash: </span>
                <a href={`${SEPOLIA_EXPLORER}${property.transactionHash}`} target="_blank" rel="noopener noreferrer"
                  className="text-primary hover:underline font-mono text-xs inline-flex items-center gap-1">
                  {truncateHash(property.transactionHash)} <HiOutlineExternalLink />
                </a>
              </div>
            )}
            {property.coOwners?.length > 0 && (
              <div>
                <span className="text-text-secondary">Co-owners: </span>
                <span className="font-medium">{property.coOwners.map((co) => co.name).join(', ')}</span>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card">
          <h2 className="font-semibold text-primary mb-4">Documents</h2>
          {property.documents?.length > 0 ? (
            <div className="space-y-2">
              {property.documents.map((doc, i) => (
                <a key={i} href={`https://gateway.pinata.cloud/ipfs/${doc.ipfsHash}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-between p-3 bg-accent rounded-xl hover:bg-primary/5 transition-colors">
                  <span className="text-sm font-medium">{doc.name}</span>
                  <HiOutlineExternalLink className="text-primary" />
                </a>
              ))}
            </div>
          ) : (
            <p className="text-text-secondary text-sm">No documents uploaded</p>
          )}
        </motion.div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-primary mb-4">Ownership History</h2>
        <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary/20">
          {historyItems?.map((item, i) => (
            <div key={i} className="relative">
              <div className="absolute -left-4 w-3 h-3 rounded-full bg-secondary border-2 border-white" />
              <p className="font-medium text-sm">{item.actionType}</p>
              <p className="text-xs text-text-secondary">
                {formatDate(item.timestamp ? new Date(item.timestamp * 1000) : item.createdAt)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="font-semibold text-primary mb-4">Blockchain Transactions</h2>
        {transactions?.length > 0 ? (
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div key={tx._id} className="flex justify-between items-center p-3 bg-accent rounded-xl text-sm">
                <div>
                  <p className="font-medium">{tx.actionType}</p>
                  <p className="text-text-secondary">{formatDate(tx.createdAt)}</p>
                </div>
                <a href={`${SEPOLIA_EXPLORER}${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="text-primary text-xs font-mono hover:underline">
                  {truncateHash(tx.txHash)}
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-text-secondary text-sm">No transactions yet</p>
        )}
      </div>

      <Modal isOpen={showQR} onClose={() => setShowQR(false)} title={t('property.shareQR')} size="sm">
        <div className="flex flex-col items-center py-4">
          <QRCodeSVG value={verifyUrl} size={200} fgColor="#1B4332" />
          <p className="text-sm text-text-secondary mt-4 text-center">{property.propertyId}</p>
          <p className="text-xs text-text-secondary mt-1 break-all text-center">{verifyUrl}</p>
          <Button className="mt-4" onClick={handleShare}>Copy Link</Button>
        </div>
      </Modal>

      <Modal
        isOpen={showDispute}
        onClose={() => setShowDispute(false)}
        title={t('property.raiseDispute')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowDispute(false)}>{t('common.cancel')}</Button>
            <Button variant="danger" onClick={handleRaiseDispute} loading={disputeLoading}>{t('common.confirm')}</Button>
          </>
        }
      >
        <Input
          label={t('property.disputeReason')}
          placeholder="Describe the issue with this property record..."
          value={disputeReason}
          onChange={(e) => setDisputeReason(e.target.value)}
        />
      </Modal>
    </div>
  );
};

export default PropertyDetailPage;
