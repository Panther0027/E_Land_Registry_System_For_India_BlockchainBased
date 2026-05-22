import { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [propertySearch, setPropertySearch] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpChannel, setOtpChannel] = useState('');
  const [otpSentTo, setOtpSentTo] = useState('');
  const [sendOtpLoading, setSendOtpLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [formValues, setFormValues] = useState(null);
  const [recipientDetails, setRecipientDetails] = useState(null);
  const [lookupError, setLookupError] = useState('');

  useEffect(() => {
    if (!recipientDetails) {
      setOtpChannel('');
      return;
    }
    if (recipientDetails.email) {
      setOtpChannel('email');
      return;
    }
    if (recipientDetails.phone) {
      setOtpChannel('sms');
    }
  }, [recipientDetails]);

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
      setRecipientDetails(null);
      setLookupError('');
      return;
    }
    try {
      const res = await authAPI.lookupOwnerByAadhaar(digits);
      setRecipientDetails(res.data.data);
      setLookupError('');
    } catch (err) {
      setRecipientDetails(null);
      setLookupError(err.response?.data?.message || 'Recipient not found');
    }
  }, []);

  const newOwnerAadhaar = watch('newOwnerAadhaar');
  const selectedPropertyId = watch('propertyId');

  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    if (!propertySearch.trim()) return properties;
    const query = propertySearch.toLowerCase();
    return properties.filter((p) =>
      p.propertyId.toLowerCase().includes(query) ||
      p.surveyNumber?.toLowerCase().includes(query) ||
      p.district.toLowerCase().includes(query)
    );
  }, [properties, propertySearch]);

  const selectedProperty = useMemo(
    () => filteredProperties.find((p) => p.propertyId === selectedPropertyId) || null,
    [filteredProperties, selectedPropertyId]
  );

  useEffect(() => {
    if (!newOwnerAadhaar) {
      setRecipientDetails(null);
      setLookupError('');
      return;
    }
    const t = setTimeout(() => lookupRecipient(newOwnerAadhaar), 400);
    return () => clearTimeout(t);
  }, [newOwnerAadhaar, lookupRecipient]);

  const sendOtp = async () => {
    if (!recipientDetails) {
      toast.error('Lookup recipient before sending OTP');
      return;
    }
    if (!otpChannel) {
      toast.error('Select email or phone to send OTP');
      return;
    }

    setSendOtpLoading(true);
    try {
      const res = await propertyAPI.sendTransferOtp({
        propertyId: watch('propertyId'),
        newOwnerAadhaar: watch('newOwnerAadhaar').replace(/\D/g, ''),
        channel: otpChannel,
      });
      setOtpSent(true);
      setOtpSentTo(res.data.message || `via ${otpChannel}`);
      toast.success(res.data.message || `OTP sent via ${otpChannel}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Unable to send OTP');
    } finally {
      setSendOtpLoading(false);
    }
  };

  const onSubmit = (data) => {
    if (!otpSent) {
      toast.error('Please send and enter the OTP first');
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
        otp: formValues.otp,
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
        <Input
          label="Search Property"
          placeholder="Search by ID, survey, or district"
          value={propertySearch}
          onChange={(e) => setPropertySearch(e.target.value)}
        />
        <Select
          label="Select Property"
          options={filteredProperties?.map((p) => ({
            value: p.propertyId,
            label: `${p.propertyId} — ${p.district} ${p.surveyNumber ? `(${p.surveyNumber})` : ''}`,
          })) || []}
          error={errors.propertyId?.message}
          {...register('propertyId')}
        />
        {selectedProperty && (
          <div className="rounded-xl border border-primary/10 bg-primary/5 p-3 text-sm text-text-secondary">
            <p><strong>Selected property:</strong> {selectedProperty.propertyId}</p>
            <p>{selectedProperty.district}, {selectedProperty.state}</p>
            {selectedProperty.surveyNumber && <p>Survey: {selectedProperty.surveyNumber}</p>}
          </div>
        )}
        <Input
          label="New Owner Aadhaar"
          placeholder="XXXX-XXXX-XXXX"
          value={watch('newOwnerAadhaar') || ''}
          onChange={(e) => setValue('newOwnerAadhaar', formatAadhaarInput(e.target.value), { shouldValidate: true })}
          error={errors.newOwnerAadhaar?.message}
        />
        {recipientDetails && (
          <div className="rounded-xl border border-success/20 bg-success/5 p-4 text-sm text-text-secondary space-y-3">
            <div>
              <p className="font-medium text-success">New owner found</p>
              <p className="font-semibold text-primary">{recipientDetails.fullName}</p>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {recipientDetails.email && (
                <div className="rounded-lg bg-white/80 p-3 border border-white/80">
                  <p className="text-xs uppercase tracking-widest text-text-secondary">Email</p>
                  <p className="font-medium text-sm">{recipientDetails.email}</p>
                </div>
              )}
              {recipientDetails.phone && (
                <div className="rounded-lg bg-white/80 p-3 border border-white/80">
                  <p className="text-xs uppercase tracking-widest text-text-secondary">Phone</p>
                  <p className="font-medium text-sm">{recipientDetails.phone}</p>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-widest text-text-secondary">Send OTP via</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  type="button"
                  onClick={() => setOtpChannel('email')}
                  className={`btn btn-sm w-full ${otpChannel === 'email' ? 'btn-primary' : 'btn-outline'}`}
                  disabled={!recipientDetails.email}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setOtpChannel('sms')}
                  className={`btn btn-sm w-full ${otpChannel === 'sms' ? 'btn-primary' : 'btn-outline'}`}
                  disabled={!recipientDetails.phone}
                >
                  SMS
                </button>
              </div>
              {(recipientDetails.email || recipientDetails.phone) ? (
                <p className="text-xs text-text-secondary">Choose the way you want the recipient to receive the OTP.</p>
              ) : (
                <p className="text-xs text-error">Recipient has no email or phone on file. Ask them to update their Bhumi profile first.</p>
              )}
            </div>
          </div>
        )}
        {lookupError && !recipientDetails && (
          <p className="text-sm text-error bg-red-50 rounded-lg px-3 py-2">{lookupError}</p>
        )}
        <Input label="Transfer Reason" error={errors.transferReason?.message} {...register('transferReason')} />

        {!otpSent ? (
          <Button
            type="button"
            variant="outline"
            onClick={sendOtp}
            className="w-full"
            disabled={!recipientDetails || (!recipientDetails.email && !recipientDetails.phone) || !otpChannel || sendOtpLoading}
          >
            {sendOtpLoading ? 'Sending OTP…' : 'Send OTP for Verification'}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg bg-primary/5 p-3 text-sm text-text-secondary">
              <p className="font-medium">OTP sent</p>
              <p>{otpSentTo}</p>
            </div>
            <Input label="Enter OTP" placeholder="6-digit OTP" maxLength={6} error={errors.otp?.message} {...register('otp')} />
          </div>
        )}

        <Button type="submit" className="w-full" disabled={!otpSent}>Review Transfer</Button>
      </form>

      <ConfirmModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmTransfer}
        title="Confirm Transfer"
        message={
          selectedProperty
            ? `Transfer ${selectedProperty.propertyId} to ${recipientDetails?.fullName || 'new owner'}? This action is irreversible and will update ownership on the blockchain.`
            : 'This action is irreversible. The property ownership will be transferred on the blockchain.'
        }
        confirmText="Confirm Transfer"
        loading={loading}
      />
    </div>
  );
};

export default TransferOwnershipPage;
