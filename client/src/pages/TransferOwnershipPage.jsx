import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';
import { HiOutlineCheck } from 'react-icons/hi';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { ConfirmModal } from '../components/ui/Modal';
import { transferSchema } from '../utils/validation';
import { formatAadhaarInput } from '../utils';
import { propertyAPI, authAPI } from '../services';
import { validateAadhaar } from '../utils';
import { SEPOLIA_EXPLORER } from '../constants';

const TransferOwnershipPage = () => {
  const [searchParams] = useSearchParams();
  const [otpSent, setOtpSent] = useState(false);
  const [mockOtp] = useState(() => String(Math.floor(100000 + Math.random() * 900000)));
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [formValues, setFormValues] = useState(null);
  const [recipientName, setRecipientName] = useState('');
  const [lookupError, setLookupError] = useState('');

  const { data: properties } = useQuery({
    queryKey: ['my-properties-transfer'],
    queryFn: () => propertyAPI.getMyProperties({ status: 'verified' }).then((r) => r.data.data),
  });

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(transferSchema),
  });

  useEffect(() => {
    const prop = searchParams.get('property');
    if (prop) setValue('propertyId', prop);
  }, [searchParams, setValue]);

  const lookupRecipient = useCallback(async (aadhaarRaw) => {
    const digits = aadhaarRaw.replace(/\D/g, '');
    if (digits.length !== 12 || !validateAadhaar(digits)) {
      setRecipientName('');
      setLookupError('');
      return;
    }
    try {
      const res = await authAPI.lookupOwnerByAadhaar(digits);
      setRecipientName(res.data.data.fullName);
      setLookupError('');
    } catch (err) {
      setRecipientName('');
      setLookupError(err.response?.data?.message || 'Recipient not found');
    }
  }, []);

  const newOwnerAadhaar = watch('newOwnerAadhaar');

  useEffect(() => {
    if (!newOwnerAadhaar) {
      setRecipientName('');
      setLookupError('');
      return;
    }
    const t = setTimeout(() => lookupRecipient(newOwnerAadhaar), 400);
    return () => clearTimeout(t);
  }, [newOwnerAadhaar, lookupRecipient]);

  const sendOtp = () => {
    setOtpSent(true);
    toast.success(`OTP sent! (Demo OTP: ${mockOtp})`);
  };

  const onSubmit = (data) => {
    if (otpSent && data.otp !== mockOtp) {
      toast.error('Invalid OTP');
      return;
    }
    setFormValues(data);
    setConfirmOpen(true);
  };

  const confirmTransfer = async () => {
    setLoading(true);
    try {
      const res = await propertyAPI.transfer({
        propertyId: formValues.propertyId,
        newOwnerAadhaar: formValues.newOwnerAadhaar.replace(/\D/g, ''),
        transferReason: formValues.transferReason,
      });
      setResult(res.data.data);
      setConfirmOpen(false);
      toast.success('Ownership transferred!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto text-center card">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
          <HiOutlineCheck size={40} className="text-success" />
        </div>
        <h1 className="font-display text-2xl font-bold text-primary mb-2">Transfer Complete!</h1>
        <p className="text-text-secondary mb-4">New owner: {result.newOwner?.fullName}</p>
        <p className="font-mono text-xs break-all bg-accent p-3 rounded-xl mb-4">{result.transactionHash}</p>
        <a href={`${SEPOLIA_EXPLORER}${result.transactionHash}`} target="_blank" rel="noopener noreferrer">
          <Button>View on Blockchain</Button>
        </a>
      </motion.div>
    );
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="font-display text-3xl font-bold text-primary mb-2">Transfer Ownership</h1>
      <p className="text-text-secondary mb-8">Securely transfer property via blockchain</p>

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
        <Select
          label="Select Property"
          options={properties?.map((p) => ({ value: p.propertyId, label: `${p.propertyId} — ${p.district}` })) || []}
          error={errors.propertyId?.message}
          {...register('propertyId')}
        />
        <Input
          label="New Owner Aadhaar"
          placeholder="XXXX-XXXX-XXXX"
          value={watch('newOwnerAadhaar') || ''}
          onChange={(e) => setValue('newOwnerAadhaar', formatAadhaarInput(e.target.value), { shouldValidate: true })}
          error={errors.newOwnerAadhaar?.message}
        />
        {recipientName && (
          <p className="text-sm text-success font-medium bg-success/10 rounded-lg px-3 py-2">
            New owner (from database): <strong>{recipientName}</strong>
          </p>
        )}
        {lookupError && !recipientName && (
          <p className="text-sm text-error bg-red-50 rounded-lg px-3 py-2">{lookupError}</p>
        )}
        <Input label="Transfer Reason" error={errors.transferReason?.message} {...register('transferReason')} />

        {!otpSent ? (
          <Button type="button" variant="outline" onClick={sendOtp} className="w-full">Send OTP for Verification</Button>
        ) : (
          <Input label="Enter OTP" placeholder="6-digit OTP" maxLength={6} error={errors.otp?.message} {...register('otp')} />
        )}

        <Button type="submit" className="w-full" disabled={!otpSent}>Review Transfer</Button>
      </form>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmTransfer}
        title="Confirm Transfer"
        message="This action is irreversible. The property ownership will be transferred on the blockchain."
        confirmText="Confirm Transfer"
        loading={loading}
      />
    </div>
  );
};

export default TransferOwnershipPage;
