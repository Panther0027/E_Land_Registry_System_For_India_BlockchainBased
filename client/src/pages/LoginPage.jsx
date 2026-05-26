import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineLockClosed, HiOutlineMail } from 'react-icons/hi';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import supabase from '../services/supabase';
import api from '../services/api';
import { useAuthStore } from '../store';

const OTP_REQUEST_COOLDOWN = 120;

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('request');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);

  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  useEffect(() => {
    if (resendCooldown <= 0) return undefined;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  const sendLoginOtp = async () => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    let data;
    let error;
    const trimmedEmail = email.trim();
    if (!isValidEmail(trimmedEmail)) {
      throw new Error('Enter a valid email address.');
    }
    ({ data, error } = await supabase.auth.signInWithOtp({ email: trimmedEmail }));

    if (error) {
      const isRateLimit = error.status === 429 || /rate limit/i.test(error.message || '');
      const message =
        isRateLimit
          ? 'Too many requests. Please wait a moment before requesting another OTP.'
          : error.error_description || error.message || 'Failed to send OTP.';
      if (isRateLimit) {
        setResendCooldown(OTP_REQUEST_COOLDOWN);
      }
      throw new Error(message);
    }

    setResendCooldown(OTP_REQUEST_COOLDOWN);
    return data;
  };

  const startLogin = async () => {
    if (resendCooldown > 0) {
      toast.error(`Please wait ${resendCooldown}s before requesting another OTP.`);
      return;
    }

    setLoading(true);
    setMessage('');

    if (!supabase) {
      toast.error('Supabase is not configured.');
      setLoading(false);
      return;
    }

    try {
      await sendLoginOtp();
      setStep('verify');
      setMessage(`OTP sent to ${email.trim()}. Check your inbox and spam folder, then enter the code below.`);
    } catch (err) {
      toast.error(err.message || 'Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };

  const verifyLogin = async () => {
    setLoading(true);
    setMessage('');

    if (!supabase) {
      toast.error('Supabase is not configured.');
      setLoading(false);
      return;
    }

    try {
      let data;
      let error;
      const trimmedEmail = email.trim();
      if (!isValidEmail(trimmedEmail)) {
        toast.error('Enter a valid email address.');
        setLoading(false);
        return;
      }

      ({ data, error } = await supabase.auth.verifyOtp({
        type: 'email',
        token: otp,
        email: trimmedEmail,
      }));

      if (error) {
        const message =
          error.status === 429 || /rate limit/i.test(error.message || '')
            ? 'Too many verification attempts. Please wait a minute and try again.'
            : error.error_description || error.message || 'OTP verification failed.';
        throw new Error(message);
      }

      if (!data?.session?.access_token) {
        toast.error('OTP verified, but login session was not created. Please try again.');
        setLoading(false);
        return;
      }

      const token = data.session.access_token;
      let user = data.user;

      try {
        const profileResponse = await api.get('/auth/profile', {
          headers: { Authorization: `Bearer ${token}` },
        });
        user = profileResponse.data.data || user;
      } catch (profileError) {
        if (profileError.response?.status !== 404) {
          throw profileError;
        }
        toast.success('OTP verified. Logged in, but backend profile is unavailable; continuing with your account details.');
      }

      setAuth(user, token, rememberMe);
      toast.success(`Welcome back, ${user?.fullName || user?.email || 'Bhumi user'}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'OTP verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const resendLoginOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setMessage('');

    try {
      await sendLoginOtp();
      setMessage(`OTP resent to ${email.trim()}. Check your inbox and spam folder.`);
      toast.success('OTP resent successfully.');
    } catch (err) {
      toast.error(err.message || 'Unable to resend OTP.');
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
      <motion.div className="w-full max-w-md">
        <motion.div className="text-center mb-8">
          <Logo className="justify-center mb-4" />
          <h1 className="font-display text-2xl font-bold text-primary">Sign in with OTP</h1>
          <p className="text-text-secondary mt-1">
            Enter your email to receive a one-time passcode for login.
          </p>
        </motion.div>

        <div className="card space-y-4">

          <div className="space-y-3">
            <Input
              label="Email Address"
              type="email"
              icon={HiOutlineMail}
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {step === 'verify' ? (
              <Input
                label="One-time passcode"
                type="text"
                icon={HiOutlineLockClosed}
                placeholder="Enter the email OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
              />
            ) : null}
          </div>

          {message ? <p className="text-sm text-text-secondary">{message}</p> : null}

          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary focus:ring-primary"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Keep me signed in
          </label>

          {step === 'verify' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" loading={loading} className="w-full" onClick={verifyLogin}>
                Verify OTP
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={resendLoginOtp}
                disabled={resendCooldown > 0}
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              loading={loading}
              className="w-full"
              onClick={startLogin}
              disabled={resendCooldown > 0}
            >
              {resendCooldown > 0 ? `Send OTP in ${resendCooldown}s` : 'Send OTP'}
            </Button>
          )}
        </div>

        <p className="text-center mt-6 text-text-secondary">
          New to Bhumi?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">
            Create an account
          </Link>
        </p>
      </motion.div>
    </motion.div>
  );
};

export default LoginPage;
