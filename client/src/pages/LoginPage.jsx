import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { HiOutlineMail, HiOutlineLockClosed } from 'react-icons/hi';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { loginSchema } from '../utils/validation';
import { authAPI } from '../services';
import { useAuthStore } from '../store';

const LoginPage = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authAPI.login(data);
      setAuth(res.data.data.user, res.data.data.token, data.rememberMe);
      toast.success(`Namaste, ${res.data.data.user.fullName}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-accent bg-earth-texture flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Logo className="justify-center mb-4" />
          <h1 className="font-display text-2xl font-bold text-primary">Welcome Back</h1>
          <p className="text-text-secondary mt-1">Sign in to your Bhumi account</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          <Input label="Email" type="email" icon={HiOutlineMail} error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" icon={HiOutlineLockClosed} error={errors.password?.message} {...register('password')} />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input type="checkbox" className="rounded border-gray-300 text-primary focus:ring-primary" {...register('rememberMe')} />
              Remember me
            </label>
            <Link to="#" className="text-sm text-primary hover:underline">Forgot Password?</Link>
          </div>

          <Button type="submit" loading={loading} className="w-full">Sign In</Button>
        </form>

        <p className="text-center mt-6 text-text-secondary">
          Don't have an account?{' '}
          <Link to="/register" className="text-primary font-semibold hover:underline">Register</Link>
        </p>

        <div className="mt-8 card bg-primary/5 border-primary/10">
          <p className="text-xs text-text-secondary font-medium mb-2">Demo Accounts:</p>
          <div className="text-xs text-text-secondary space-y-1">
            <p>Owner: rajesh@example.com / Owner@123</p>
            <p>Official: official@bhumi.gov.in / Official@123</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
