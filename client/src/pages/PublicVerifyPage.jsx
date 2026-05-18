import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi';
import PublicLayout from '../layouts/PublicLayout';
import BlockchainVerifyPanel from '../components/BlockchainVerifyPanel';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { searchSchema } from '../utils/validation';
import { propertyAPI } from '../services';
import { formatArea } from '../utils';
import { SEPOLIA_EXPLORER, DEMO_PROPERTY_IDS } from '../constants';
import { findDemoProperty, getDemoBlockchainVerification } from '../data/demoProperties';

const PublicVerifyPage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const [result, setResult] = useState(null);
  const [blockchainData, setBlockchainData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(searchSchema),
    defaultValues: {
      propertyId: searchParams.get('id') || '',
    },
  });

  const resolveDemo = (data) => {
    const demo = findDemoProperty({
      propertyId: data.propertyId?.trim(),
      surveyNumber: data.surveyNumber?.trim(),
    });
    if (!demo) return null;
    return {
      success: true,
      data: demo,
      verified: demo.status === 'verified',
      demo: true,
    };
  };

  const onSearch = async (data) => {
    setLoading(true);
    setBlockchainData(null);
    setShowQR(false);
    try {
      const params = {};
      if (data.propertyId) params.propertyId = data.propertyId.trim();
      else if (data.surveyNumber) params.surveyNumber = data.surveyNumber.trim();
      const res = await propertyAPI.search(params);
      if (res.data?.data) {
        setResult(res.data);
        setShowQR(true);
      } else {
        const fallback = resolveDemo(data);
        setResult(fallback || { data: null, verified: false });
        if (fallback) setShowQR(true);
      }
    } catch {
      const fallback = resolveDemo(data);
      setResult(fallback || { data: null, verified: false });
      if (fallback) setShowQR(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) onSearch({ propertyId: id });
  }, []);

  const verifyOnBlockchain = async () => {
    if (!result?.data) return;
    setVerifying(true);
    setBlockchainData(null);
    try {
      const res = await propertyAPI.verifyBlockchain(result.data.propertyId);
      setBlockchainData(res.data);
      if (res.data?.verified) {
        toast.success(res.data.onChain ? 'Verified on Sepolia blockchain!' : 'Blockchain record matched');
      } else {
        toast.error(res.data?.message || 'Not found on blockchain');
      }
    } catch {
      const fallback = getDemoBlockchainVerification(result.data.propertyId);
      if (fallback) {
        setBlockchainData(fallback);
        toast.success('Blockchain record matched (demo mode)');
      } else {
        toast.error('Blockchain verification failed');
      }
    } finally {
      setVerifying(false);
    }
  };

  const verifyUrl = result?.data
    ? `${window.location.origin}/verify?id=${result.data.propertyId}`
    : '';

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl font-bold text-primary mb-2">{t('nav.verify')}</h1>
          <p className="text-text-secondary mb-4">Publicly verify any land record registered on Bhumi — no login required.</p>

          <motion.div className="card bg-primary/5 border border-primary/10 p-4 mb-6">
            <p className="text-sm font-semibold text-primary mb-2">Demo for presentation — try these Property IDs:</p>
            <div className="flex flex-wrap gap-2">
              {DEMO_PROPERTY_IDS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setValue('propertyId', id);
                    setValue('surveyNumber', '');
                    onSearch({ propertyId: id });
                  }}
                  className="text-xs px-3 py-1.5 rounded-full bg-white border border-primary/20 text-primary hover:bg-primary hover:text-white transition-colors"
                >
                  {id}
                </button>
              ))}
            </div>
            <p className="text-xs text-text-secondary mt-2">Try: <strong>LR-7D185238</strong> (from imported dataset)</p>
          </motion.div>

          <form onSubmit={handleSubmit(onSearch)} className="card space-y-4 mb-6">
            <Input label="Property ID" placeholder="e.g. BH-001-KHURDA" error={errors.propertyId?.message} {...register('propertyId')} />
            <p className="text-center text-text-secondary text-sm">— OR —</p>
            <Input label="Survey Number" placeholder="e.g. SN-2024-001" error={errors.surveyNumber?.message} {...register('surveyNumber')} />
            <Button type="submit" loading={loading} className="w-full">
              <HiOutlineSearch className="inline mr-1" /> {t('common.search')}
            </Button>
          </form>

          {result && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card">
              {result.data ? (
                <>
                  <div className="flex items-center gap-3 mb-6">
                    {result.verified ? (
                      <HiOutlineCheckCircle size={32} className="text-success" />
                    ) : (
                      <HiOutlineXCircle size={32} className="text-yellow-500" />
                    )}
                    <div className="flex-1">
                      <h2 className="font-semibold text-lg">{result.verified ? 'Verified ✓' : result.data.status === 'disputed' ? 'Disputed' : 'Pending Verification'}</h2>
                      <p className="text-text-secondary text-sm">{result.data.propertyId}</p>
                      {result.demo && (
                        <p className="text-xs text-secondary mt-1">Demo record (works without database)</p>
                      )}
                    </div>
                    <Badge status={result.data.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                    <div><span className="text-text-secondary">Owner</span><p className="font-medium">{result.data.ownerName}</p></div>
                    <div><span className="text-text-secondary">Location</span><p className="font-medium">{result.data.district}, {result.data.state}</p></div>
                    <div><span className="text-text-secondary">Area</span><p className="font-medium">{formatArea(result.data.area)}</p></div>
                    <div><span className="text-text-secondary">Land Type</span><p className="font-medium capitalize">{result.data.landType}</p></div>
                  </div>

                  {showQR && (
                    <div className="flex flex-col items-center bg-accent rounded-xl p-6 mb-6">
                      <QRCodeSVG value={verifyUrl} size={160} fgColor="#1B4332" />
                      <p className="text-xs text-text-secondary mt-3 text-center">Scan to verify this property</p>
                    </div>
                  )}

                  {result.data.transactionHash && (
                    <a href={`${SEPOLIA_EXPLORER}${result.data.transactionHash}`} target="_blank" rel="noopener noreferrer"
                      className="text-primary text-sm hover:underline block mb-4">
                      View on Etherscan →
                    </a>
                  )}

                  <Button onClick={verifyOnBlockchain} loading={verifying} variant="outline" className="w-full">
                    {t('property.verifyBlockchain')}
                  </Button>

                  <BlockchainVerifyPanel blockchainData={blockchainData} />
                </>
              ) : (
                <div className="text-center py-8">
                  <HiOutlineXCircle size={48} className="text-error mx-auto mb-4" />
                  <h2 className="font-semibold text-lg">Not Found ✗</h2>
                  <p className="text-text-secondary">No property matching your search</p>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
    </PublicLayout>
  );
};

export default PublicVerifyPage;
