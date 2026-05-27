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

const OTP_REQUEST_COOLDOWN = 30;

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('credentials');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const sendLoginOtp = async (credEmail, credPassword) => {
    if (!supabase) {
      throw new Error('Supabase is not configured.');
    }

    const trimmedEmail = credEmail.trim();
    if (!isValidEmail(trimmedEmail)) {
      throw new Error('Enter a valid email address.');
    }
    
    if (!credPassword || credPassword.length < 6) {
      throw new Error('Enter a valid password.');
    }

    // First, validate credentials with backend
    try {
      const response = await api.post('/auth/login/request-otp', {
        email: trimmedEmail,
        password: credPassword,
      });
      if (!response.data.success) {
        throw new Error(response.data.message || 'Invalid credentials.');
      }
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Invalid email or password.';
      throw new Error(message);
    }

    // Then send OTP via Supabase
    let data;
    let error;
    ({ data, error } = await supabase.auth.signInWithOtp({
      email: trimmedEmail,
      options: {
        shouldCreateUser: false,
      },
    }));

    if (error) {
      const isRateLimit = error.status === 429 || /rate limit/i.test(error.message || '');
      const message =
        isRateLimit
          ? 'Too many requests. Please wait 30 seconds before requesting another OTP.'
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
    if (!email.trim() || !password) {
      toast.error('Enter your email and password.');
      return;
    }

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
      await sendLoginOtp(email, password);
      setStep('otp');
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

    if (!otp.trim()) {
      toast.error('Enter the OTP sent to your email.');
      setLoading(false);
      return;
    }

    try {
      const trimmedEmail = email.trim();
      if (!isValidEmail(trimmedEmail)) {
        toast.error('Enter a valid email address.');
        setLoading(false);
        return;
      }

      // Verify OTP with backend
      const response = await api.post('/auth/login/verify-otp', {
        email: trimmedEmail,
        otp: otp.trim(),
      });

      if (!response.data.success || !response.data.data?.token) {
        throw new Error(response.data.message || 'OTP verification failed.');
      }

      const { token, user } = response.data.data;
      setAuth(user, token, rememberMe);
      toast.success(`Welcome back, ${user?.fullName || user?.email || 'Bhumi user'}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'OTP verification failed.';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const resendLoginOtp = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setMessage('');

    try {
      await sendLoginOtp(email, password);
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
          <h1 className="font-display text-2xl font-bold text-primary">Sign in with Email & OTP</h1>
          <p className="text-text-secondary mt-1">
            {step === 'credentials' 
              ? 'Enter your email and password to receive a one-time passcode.'
              : 'Enter the one-time passcode sent to your email.'}
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
              disabled={step === 'otp'}
            />

            <Input
              label="Password"
              type="password"
              icon={HiOutlineLockClosed}
              placeholder={step === 'credentials' ? 'Enter your password' : 'Password used for login'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={step === 'otp'}
            />

            {step === 'otp' ? (
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

          {step === 'credentials' ? (
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-primary focus:ring-primary"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              Keep me signed in
            </label>
          ) : null}

          {step === 'otp' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" loading={loading} className="w-full" onClick={(e) => { e.preventDefault(); verifyLogin(); }}>
                Verify OTP
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={(e) => { e.preventDefault(); resendLoginOtp(); }}
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
              onClick={(e) => { e.preventDefault(); startLogin(); }}
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
