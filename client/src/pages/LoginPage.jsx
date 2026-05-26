import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineLockClosed, HiOutlineMail, HiOutlinePhone } from 'react-icons/hi';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import supabase from '../services/supabase';
import api from '../services/api';
import { useAuthStore } from '../store';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('request');
  const [message, setMessage] = useState('');
  const [authMethod, setAuthMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const normalizePhoneNumber = (value) => {
    const cleaned = value.replace(/\D/g, '');
    if (cleaned.length === 10) return `+91${cleaned}`;
    if (cleaned.length === 12 && cleaned.startsWith('91')) return `+${cleaned}`;
    if (cleaned.length === 13 && cleaned.startsWith('+91')) return `+${cleaned.slice(1)}`;
    return null;
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
      let result;
      if (authMethod === 'email') {
        const trimmedEmail = email.trim();
        if (!isValidEmail(trimmedEmail)) {
          toast.error('Enter a valid email address.');
          setLoading(false);
          return;
        }

        result = await supabase.auth.signInWithOtp({ email: trimmedEmail });
      } else {
        const normalizedPhone = normalizePhoneNumber(phone);
        if (!normalizedPhone) {
          toast.error('Enter your 10-digit mobile number in the correct format (e.g. 9876543210 or +919876543210).');
          setLoading(false);
          return;
        }

        result = await supabase.auth.signInWithOtp({ phone: normalizedPhone });
      }

      if (result.error) {
        throw result.error;
      }

      setStep('verify');
      setMessage(
        authMethod === 'email'
          ? `OTP sent to ${email.trim()}. Check your inbox and enter the code below.`
          : `OTP sent to ${normalizePhoneNumber(phone)}. Enter it below to continue.`
      );
    } catch (err) {
      toast.error(err.error_description || err.message || 'Failed to send OTP.');
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
      let result;
      if (authMethod === 'email') {
        const trimmedEmail = email.trim();
        if (!isValidEmail(trimmedEmail)) {
          toast.error('Enter a valid email address.');
          setLoading(false);
          return;
        }

        result = await supabase.auth.verifyOtp({
          type: 'email',
          token: otp,
          email: trimmedEmail,
        });
      } else {
        const normalizedPhone = normalizePhoneNumber(phone);
        if (!normalizedPhone) {
          toast.error('Enter your mobile number again in the correct format.');
          setLoading(false);
          return;
        }

        result = await supabase.auth.verifyOtp({
          type: 'sms',
          token: otp,
          phone: normalizedPhone,
        });
      }

      if (result.error) {
        throw result.error;
      }

      const data = result.data;
      if (!data?.session?.access_token) {
        toast.error('OTP verified, but login session was not created. Please try again.');
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
            Choose email or phone and receive a one-time passcode.
          </p>
        </motion.div>

        <div className="card space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${authMethod === 'email' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-white text-text-secondary'}`}
              onClick={() => setAuthMethod('email')}
            >
              Email OTP
            </button>
            <button
              type="button"
              className={`rounded-lg border px-4 py-2 text-sm font-semibold ${authMethod === 'phone' ? 'border-primary bg-primary/10 text-primary' : 'border-gray-200 bg-white text-text-secondary'}`}
              onClick={() => setAuthMethod('phone')}
            >
              Phone OTP
            </button>
          </div>

          <div className="space-y-3">
            <Input
              label={authMethod === 'email' ? 'Email Address' : 'Phone Number'}
              type={authMethod === 'email' ? 'email' : 'tel'}
              icon={authMethod === 'email' ? HiOutlineMail : HiOutlinePhone}
              placeholder={authMethod === 'email' ? 'you@example.com' : '9876543210 or +919876543210'}
              value={authMethod === 'email' ? email : phone}
              onChange={(e) => (authMethod === 'email' ? setEmail(e.target.value) : setPhone(e.target.value))}
            />

            {step === 'verify' ? (
              <Input
                label="One-time passcode"
                type="text"
                icon={HiOutlineLockClosed}
                placeholder={authMethod === 'email' ? 'Enter the email OTP' : 'Enter the SMS OTP'}
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
