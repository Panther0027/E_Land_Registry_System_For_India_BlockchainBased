import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineCheck, HiOutlineUpload } from 'react-icons/hi';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { propertyStep1Schema, propertyStep2Schema } from '../utils/validation';
import { formatAadhaarInput } from '../utils';
import { INDIAN_STATES, LAND_TYPES, SEPOLIA_EXPLORER } from '../constants';
import { propertyAPI } from '../services';

const STEPS = ['Property Details', 'Owner Details', 'Upload Documents', 'Review'];

const RegisterPropertyPage = () => {
  const [step, setStep] = useState(0);
  const [formData, setFormData] = useState({});
  const [files, setFiles] = useState({ landDeed: null, ownershipProof: null });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const navigate = useNavigate();

  const step1Form = useForm({ resolver: zodResolver(propertyStep1Schema) });
  const step2Form = useForm({
    resolver: zodResolver(propertyStep2Schema),
    defaultValues: { hasCoOwner: false },
  });

  const handleStep1 = (data) => { setFormData((p) => ({ ...p, ...data })); setStep(1); };
  const handleStep2 = (data) => { setFormData((p) => ({ ...p, ...data })); setStep(2); };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([k, v]) => {
        if (v !== undefined && v !== null) fd.append(k, v);
      });
      if (files.landDeed) fd.append('landDeed', files.landDeed);
      if (files.ownershipProof) fd.append('ownershipProof', files.ownershipProof);

      const res = await propertyAPI.register(fd);
      setResult(res.data.data);
      setStep(4);
      toast.success('Property registered on blockchain!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-lg mx-auto text-center">
        <div className="card">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-success/10 flex items-center justify-center">
            <HiOutlineCheck size={40} className="text-success" />
          </div>
          <h1 className="font-display text-2xl font-bold text-primary mb-2">Registration Successful!</h1>
          <p className="text-text-secondary mb-6">Your property has been registered on the blockchain.</p>
          <div className="bg-accent rounded-xl p-4 mb-6 text-left">
            <p className="text-sm text-text-secondary">Property ID</p>
            <p className="font-semibold text-primary">{result.property?.propertyId}</p>
            <p className="text-sm text-text-secondary mt-3">Transaction Hash</p>
            <p className="font-mono text-xs break-all">{result.transactionHash}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/properties')} className="flex-1">View Properties</Button>
            <a href={`${SEPOLIA_EXPLORER}${result.transactionHash}`} target="_blank" rel="noopener noreferrer" className="flex-1">
              <Button className="w-full">View on Blockchain</Button>
            </a>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="font-display text-3xl font-bold text-primary mb-2">Register Property</h1>
      <p className="text-text-secondary mb-8">Register your land on the blockchain</p>

      {/* Progress */}
      <div className="flex items-center mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center flex-1">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
              i <= step ? 'bg-primary text-white' : 'bg-gray-200 text-text-secondary'
            }`}>
              {i < step ? <HiOutlineCheck /> : i + 1}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-1 mx-2 rounded ${i < step ? 'bg-primary' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <div className="card">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.form key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={step1Form.handleSubmit(handleStep1)} className="space-y-4">
              <Input label="Property ID (optional)" placeholder="Auto-generated if empty" {...step1Form.register('propertyId')} />
              <Input label="Survey Number" error={step1Form.formState.errors.surveyNumber?.message} {...step1Form.register('surveyNumber')} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="District" error={step1Form.formState.errors.district?.message} {...step1Form.register('district')} />
                <Select label="State" options={INDIAN_STATES} error={step1Form.formState.errors.state?.message} {...step1Form.register('state')} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Pincode" error={step1Form.formState.errors.pincode?.message} {...step1Form.register('pincode')} />
                <Input label="Land Area (sq.ft)" type="number" error={step1Form.formState.errors.area?.message} {...step1Form.register('area')} />
              </div>
              <Select label="Land Type" options={LAND_TYPES} error={step1Form.formState.errors.landType?.message} {...step1Form.register('landType')} />
              <Button type="submit" className="w-full">Continue</Button>
            </motion.form>
          )}

          {step === 1 && (
            <motion.form key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              onSubmit={step2Form.handleSubmit(handleStep2)} className="space-y-4">
              <Input label="Owner Name" error={step2Form.formState.errors.ownerName?.message} {...step2Form.register('ownerName')} />
              <Input label="Owner Aadhaar" placeholder="XXXX-XXXX-XXXX"
                value={step2Form.watch('ownerAadhaar') || ''}
                onChange={(e) => step2Form.setValue('ownerAadhaar', formatAadhaarInput(e.target.value), { shouldValidate: true })}
                error={step2Form.formState.errors.ownerAadhaar?.message}
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="rounded text-primary" {...step2Form.register('hasCoOwner')} />
                <span className="text-sm">Has Co-owner</span>
              </label>
              {step2Form.watch('hasCoOwner') && (
                <>
                  <Input label="Co-owner Name" {...step2Form.register('coOwnerName')} />
                  <Input label="Co-owner Aadhaar" placeholder="XXXX-XXXX-XXXX"
                    onChange={(e) => step2Form.setValue('coOwnerAadhaar', formatAadhaarInput(e.target.value))}
                  />
                </>
              )}
              <div className="flex gap-3">
                <Button variant="outline" type="button" onClick={() => setStep(0)} className="flex-1">Back</Button>
                <Button type="submit" className="flex-1">Continue</Button>
              </div>
            </motion.form>
          )}

          {step === 2 && (
            <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {['landDeed', 'ownershipProof'].map((key) => (
                <label key={key} className="block border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-primary transition-colors">
                  <HiOutlineUpload className="mx-auto text-primary mb-2" size={32} />
                  <p className="font-medium">{key === 'landDeed' ? 'Land Deed (PDF)' : 'Ownership Proof (Image)'}</p>
                  <p className="text-sm text-text-secondary mt-1">{files[key]?.name || 'Click to upload'}</p>
                  <input type="file" className="hidden" accept={key === 'landDeed' ? '.pdf' : 'image/*'}
                    onChange={(e) => setFiles((p) => ({ ...p, [key]: e.target.files[0] }))} />
                </label>
              ))}
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">Back</Button>
                <Button onClick={() => setStep(3)} className="flex-1">Review</Button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
              <h3 className="font-semibold text-primary text-lg">Review Details</h3>
              <div className="bg-accent rounded-xl p-4 space-y-2 text-sm">
                {Object.entries(formData).map(([k, v]) => (
                  <div key={k} className="flex justify-between">
                    <span className="text-text-secondary capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                    <span className="font-medium">{String(v)}</span>
                  </div>
                ))}
                <div className="flex justify-between">
                  <span className="text-text-secondary">Documents</span>
                  <span className="font-medium">{[files.landDeed, files.ownershipProof].filter(Boolean).length} files</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">Back</Button>
                <Button onClick={handleSubmit} loading={loading} className="flex-1">Submit Registration</Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default RegisterPropertyPage;
