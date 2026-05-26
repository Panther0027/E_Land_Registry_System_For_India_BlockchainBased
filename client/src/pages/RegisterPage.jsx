import { useEffect, useState } from 'react';
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
import supabase from '../services/supabase';
import { useAuthStore } from '../store';

const RegisterPage = () => {
  const [loading, setLoading] = useState(false);
  const [verificationStep, setVerificationStep] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [message, setMessage] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, control, formState: { errors } } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'owner' },
  });

  const sendVerificationOtp = async (email) => {
    if (!supabase) {
      throw new Error('Supabase OTP is not configured. Contact the administrator.');
    }

    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) {
      const message =
        error.status === 429 || /rate limit/i.test(error.message || '')
          ? 'Too many OTP requests. Please wait a minute before trying again.'
          : error.error_description || error.message || 'Unable to send email OTP.';
      throw new Error(message);
    }

    setResendCooldown(60);
  };

  const onSubmit = async (data) => {
    setLoading(true);
    setMessage('');

    try {
      const payload = { ...data, aadhaar: data.aadhaar.replace(/\D/g, '') };
      const normalizedEmail = payload.email.trim().toLowerCase();
      await authAPI.register(payload);
      await sendVerificationOtp(normalizedEmail);

      setVerificationEmail(normalizedEmail);
      setVerificationStep(true);
      setMessage(`An OTP has been sent to ${normalizedEmail}. Check your inbox and enter it below to verify your account.`);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      toast.error(msg);
      if (!err.response && err.message.includes('Cannot reach')) {
        toast.error('Cannot reach server. Start the backend: cd bhumi/server && npm run dev', {
          duration: 6000,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyAccount = async () => {
    if (!otp.trim()) {
      toast.error('Enter the OTP sent to your email.');
      return;
    }

    setLoading(true);
    setMessage('');

    try {
      const res = await authAPI.verifyRegistration({ email: verificationEmail, otp: otp.trim() });
      const { token, user } = res.data.data;
      setAuth(user, token, true);
      toast.success('Your account is verified and you are now signed in.');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Verification failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (!verificationEmail || resendCooldown > 0) return;
    setLoading(true);
    setMessage('');

    try {
      await sendVerificationOtp(verificationEmail);
      setMessage(`OTP resent to ${verificationEmail}. Check your inbox and spam folder.`);
      toast.success('OTP resent successfully.');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Unable to resend OTP';
      toast.error(msg);
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
          <h1 className="font-display text-2xl font-bold text-primary">
            {verificationStep ? 'Verify your account' : 'Create your account'}
          </h1>
          <p className="text-text-secondary mt-1">
            {verificationStep
              ? 'Enter the code sent to your email to finish creating your account.'
              : 'Use your email, Aadhaar, and password to create a secure account.'}
          </p>
        </motion.div>

        <div className="card space-y-4">
          {!verificationStep ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
          ) : (
            <div className="space-y-4">
              <Input
                label="Email"
                type="email"
                icon={HiOutlineMail}
                placeholder="you@example.com"
                value={verificationEmail}
                disabled
              />
              <Input
                label="Email OTP"
                type="text"
                icon={HiOutlineLockClosed}
                placeholder="Enter the 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
              {message ? <p className="text-sm text-text-secondary">{message}</p> : null}
              <div className="grid gap-3 sm:grid-cols-2">
                <Button type="button" loading={loading} className="w-full" onClick={verifyAccount}>
                  Verify account
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={resendOtp}
                  disabled={resendCooldown > 0}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </Button>
              </div>
            </div>
          )}
        </div>

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
