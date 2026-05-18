import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineMail, HiOutlinePhone, HiOutlineLockClosed, HiOutlineUser } from 'react-icons/hi';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { registerSchema } from '../utils/validation';
import { formatAadhaarInput } from '../utils';
import { DEMO_AADHAAR, DEMO_LOGIN } from '../constants';
import { authAPI } from '../services';
import { useAuthStore } from '../store';

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'owner' },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data, aadhaar: data.aadhaar.replace(/\D/g, '') };
      const res = await authAPI.register(payload);
      setAuth(res.data.data.user, res.data.data.token);
      toast.success('Welcome to Bhumi!');
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      toast.error(msg);
      if (!err.response) {
        toast.error('Cannot reach server — start backend: cd bhumi/server && npm run dev', { duration: 6000 });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-accent bg-earth-texture flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <Logo className="justify-center mb-4" />
          <h1 className="font-display text-2xl font-bold text-primary">Create Account</h1>
          <p className="text-text-secondary mt-1">Join India&apos;s trusted land registry</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          <Input label="Full Name" icon={HiOutlineUser} error={errors.fullName?.message} {...register('fullName')} />
          <Input label="Email" type="email" icon={HiOutlineMail} error={errors.email?.message} {...register('email')} />
          <Input label="Phone Number" icon={HiOutlinePhone} placeholder="10-digit mobile" error={errors.phone?.message} {...register('phone')} />

          <Controller
            name="aadhaar"
            control={control}
            render={({ field }) => (
              <Input
                label="Aadhaar Number"
                placeholder="XXXX-XXXX-XXXX"
                hint={`New account demo Aadhaar: ${DEMO_AADHAAR} · Password example: Owner@123`}
                error={errors.aadhaar?.message}
                value={field.value || ''}
                onChange={(e) => field.onChange(formatAadhaarInput(e.target.value))}
              />
            )}
          />

          <button
            type="button"
            onClick={() => {
              setValue('aadhaar', DEMO_AADHAAR, { shouldValidate: true });
              setValue('password', 'Owner@123');
              setValue('confirmPassword', 'Owner@123');
            }}
            className="text-sm text-primary font-medium hover:underline"
          >
            Fill demo Aadhaar &amp; password
          </button>

          <Select
            label="Role"
            error={errors.role?.message}
            options={[
              { value: 'owner', label: 'Property Owner' },
              { value: 'government_official', label: 'Government Official' },
              { value: 'verifier', label: 'Verifier' },
            ]}
            {...register('role')}
          />

          <Input label="Password" type="password" icon={HiOutlineLockClosed} error={errors.password?.message} {...register('password')} />
          <Input label="Confirm Password" type="password" icon={HiOutlineLockClosed} error={errors.confirmPassword?.message} {...register('confirmPassword')} />

          <Button type="submit" loading={loading} className="w-full">Create Account</Button>
        </form>

        <p className="text-center mt-6 text-text-secondary text-sm">
          Already have a seed account?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">Login</Link>
          {' '}(e.g. {DEMO_LOGIN.owner.email} / Owner@123)
        </p>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
