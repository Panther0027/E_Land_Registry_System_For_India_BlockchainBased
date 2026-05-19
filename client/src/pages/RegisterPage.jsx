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
import { authAPI } from '../services';
import { useAuthStore } from '../store';

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'owner' },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const payload = { ...data, aadhaar: data.aadhaar.replace(/\D/g, '') };
      const res = await authAPI.register(payload);
      const { user, token } = res.data.data;
      setAuth(user, token, true);
      toast.success(`Welcome, ${user.fullName}! You are now signed in.`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      toast.error(msg);
      if (!err.response) {
        toast.error('Cannot reach server. Start the backend: cd bhumi/server && npm run dev', {
          duration: 6000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="min-h-screen bg-accent bg-earth-texture flex items-center justify-center p-4"
    >
      <div className="w-full max-w-lg">
        <motion.div className="text-center mb-8">
          <Logo className="justify-center mb-4" />
          <h1 className="font-display text-2xl font-bold text-primary">Create your account</h1>
          <p className="text-text-secondary mt-1">
            Use your own email, Aadhaar, and password — you will be logged in automatically.
          </p>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          <Input
            label="Full Name"
            icon={HiOutlineUser}
            placeholder="As on your Aadhaar"
            error={errors.fullName?.message}
            {...register('fullName')}
          />
          <Input
            label="Email"
            type="email"
            icon={HiOutlineMail}
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Phone Number"
            icon={HiOutlinePhone}
            placeholder="10-digit mobile (starts with 6–9)"
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Controller
            name="aadhaar"
            control={control}
            render={({ field }) => (
              <Input
                label="Aadhaar Number"
                placeholder="XXXX-XXXX-XXXX"
                hint="Any 12-digit Aadhaar number"
                error={errors.aadhaar?.message}
                value={field.value || ''}
                onChange={(e) => field.onChange(formatAadhaarInput(e.target.value))}
              />
            )}
          />

          <Select
            label="I am a"
            error={errors.role?.message}
            options={[
              { value: 'owner', label: 'Property Owner' },
              { value: 'government_official', label: 'Government Official' },
              { value: 'verifier', label: 'Verifier' },
            ]}
            {...register('role')}
          />

          <Input
            label="Password"
            type="password"
            icon={HiOutlineLockClosed}
            placeholder="Min 8 chars, upper, lower, number, symbol"
            error={errors.password?.message}
            {...register('password')}
          />
          <Input
            label="Confirm Password"
            type="password"
            icon={HiOutlineLockClosed}
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button type="submit" loading={loading} className="w-full">
            Create account &amp; continue
          </Button>
        </form>

        <p className="text-center mt-6 text-text-secondary text-sm">
          Already registered?{' '}
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
};

export default RegisterPage;
