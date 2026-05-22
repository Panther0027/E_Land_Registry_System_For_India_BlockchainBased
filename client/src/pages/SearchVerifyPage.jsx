import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineSearch, HiOutlineCheckCircle, HiOutlineXCircle } from 'react-icons/hi';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import BlockchainVerifyPanel from '../components/BlockchainVerifyPanel';
import { getDemoBlockchainVerification } from '../data/demoProperties';
import { searchSchema } from '../utils/validation';
import { propertyAPI } from '../services';
import { formatDate, formatArea } from '../utils';
import { SEPOLIA_EXPLORER } from '../constants';

const SearchVerifyPage = () => {
  const [result, setResult] = useState(null);
  const [blockchainData, setBlockchainData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(searchSchema),
  });

  const onSearch = async (data) => {
    setLoading(true);
    setBlockchainData(null);
    try {
      const params = {};
      if (data.propertyId) params.propertyId = data.propertyId;
      else params.surveyNumber = data.surveyNumber;

      const res = await propertyAPI.search(params);
      if (res.data?.success) {
        setResult(res.data);
      } else {
        toast.error(res.data?.message || 'Search failed');
        setResult(null);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Search failed. Please try again.');
      setResult(null);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-primary">Search & Verify</h1>
        <p className="text-text-secondary">Verify land records on the blockchain</p>
      </div>

      <form onSubmit={handleSubmit(onSearch)} className="card space-y-4">
        <Input label="Property ID" placeholder="e.g. BH-001-KHURDA" error={errors.propertyId?.message} {...register('propertyId')} />
        <p className="text-center text-text-secondary text-sm">— OR —</p>
        <Input label="Survey Number" placeholder="e.g. SN-2024-001" error={errors.surveyNumber?.message} {...register('surveyNumber')} />
        <Button type="submit" loading={loading} className="w-full"><HiOutlineSearch className="inline mr-1" /> Search</Button>
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
                <div>
                  <h2 className="font-semibold text-lg">{result.verified ? 'Verified ✓' : 'Pending Verification'}</h2>
                  <p className="text-text-secondary text-sm">{result.data.propertyId}</p>
                </div>
                <Badge status={result.data.status} />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div><span className="text-text-secondary">Owner</span><p className="font-medium">{result.data.ownerName}</p></div>
                <div><span className="text-text-secondary">Location</span><p className="font-medium">{result.data.district}, {result.data.state}</p></div>
                <div><span className="text-text-secondary">Area</span><p className="font-medium">{formatArea(result.data.area)}</p></div>
                <div><span className="text-text-secondary">Survey No</span><p className="font-medium">{result.data.surveyNumber}</p></div>
              </div>

              {result.data.transactionHash && (
                <a href={`${SEPOLIA_EXPLORER}${result.data.transactionHash}`} target="_blank" rel="noopener noreferrer"
                  className="text-primary text-sm hover:underline block mb-4">
                  View transaction on Etherscan →
                </a>
              )}

              <Button onClick={verifyOnBlockchain} loading={verifying} variant="outline" className="w-full">
                Verify on Blockchain
              </Button>

              <BlockchainVerifyPanel blockchainData={blockchainData} />
            </>
          ) : (
            <div className="text-center py-8">
              <HiOutlineXCircle size={48} className="text-error mx-auto mb-4" />
              <h2 className="font-semibold text-lg">Not Found ✗</h2>
              <p className="text-text-secondary">No property matching your search criteria</p>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default SearchVerifyPage;
