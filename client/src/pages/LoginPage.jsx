import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineMail, HiOutlineLockClosed, HiOutlinePhone } from 'react-icons/hi';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import supabase from '../services/supabase';
import api from '../services/api';
import { useAuthStore } from '../store';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('email');
  const [step, setStep] = useState('request');
  const [message, setMessage] = useState('');
  const [contactValue, setContactValue] = useState('');
  const [otp, setOtp] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const normalizePhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (!cleaned) return '';
    if (cleaned.length === 10) return `+91${cleaned}`;
    if (cleaned.startsWith('91') && cleaned.length === 12) return `+${cleaned}`;
    return value;
  };

  const startLogin = async () => {
    setLoading(true);
    setMessage('');

    if (!supabase) {
      toast.error('Supabase is not configured.');
      setLoading(false);
      return;
    }

    try {
      const options =
        mode === 'email'
          ? { email: contactValue, type: 'otp' }
          : { phone: normalizePhoneNumber(contactValue) };

      const request = {
        ...options,
      };

      if (mode === 'email') {
        request.options = { emailRedirectTo: window.location.origin };
      }

      const { error } = await supabase.auth.signInWithOtp(request);

      if (error) {
        throw error;
      }

      setStep('verify');
      setMessage(`OTP sent to your ${mode}. Enter it below to continue.`);
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
      const payload = {
        type: mode === 'email' ? 'email' : 'sms',
        token: otp,
        [mode]: mode === 'email' ? contactValue : normalizePhoneNumber(contactValue),
      };

      const { data, error } = await supabase.auth.verifyOtp(payload);

      if (error) {
        throw error;
      }

      if (!data?.session?.access_token) {
        toast.success('OTP verified. Please wait for the session to be established.');
        setMessage('OTP verified. If you do not see a session, try refreshing the page.');
        setLoading(false);
        return;
      }

      const token = data.session.access_token;
      const profileResponse = await api.get('/auth/profile', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const user = profileResponse.data.data;
      setAuth(user, token, rememberMe);
      toast.success(`Welcome back, ${user.fullName}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.error_description || err.message || 'OTP verification failed.');
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
            Use email or phone OTP to sign in to your Bhumi account.
          </p>
        </motion.div>

        <div className="card space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              onClick={() => {
                setMode('email');
                setStep('request');
                setMessage('');
              }}
              className={`w-full ${mode === 'email' ? 'bg-primary text-white' : 'bg-white text-primary'}`}
            >
              Email OTP
            </Button>
            <Button
              type="button"
              onClick={() => {
                setMode('phone');
                setStep('request');
                setMessage('');
              }}
              className={`w-full ${mode === 'phone' ? 'bg-primary text-white' : 'bg-white text-primary'}`}
            >
              Phone OTP
            </Button>
          </div>

          <div className="space-y-3">
            <Input
              label={mode === 'email' ? 'Email' : 'Phone Number'}
              type={mode === 'email' ? 'email' : 'tel'}
              icon={mode === 'email' ? HiOutlineMail : HiOutlinePhone}
              placeholder={mode === 'email' ? 'you@example.com' : '9876543210'}
              value={contactValue}
              onChange={(e) => setContactValue(e.target.value)}
            />

            {step === 'verify' ? (
              <Input
                label="One-time passcode"
                type="text"
                icon={HiOutlineLockClosed}
                placeholder="Enter OTP"
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

          <Button type="button" loading={loading} className="w-full" onClick={step === 'request' ? startLogin : verifyLogin}>
            {step === 'request' ? 'Send OTP' : 'Verify OTP'}
          </Button>
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
