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
    defaultValues: { rememberMe: true },
  });

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const res = await authAPI.login({ email: data.email, password: data.password });
      const { user, token } = res.data.data;
      setAuth(user, token, data.rememberMe);
      toast.success(`Welcome back, ${user.fullName}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid email or password');
      if (!err.response) {
        toast.error('Cannot reach server. Start the backend: cd bhumi/server && npm run dev');
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
      <motion.div className="w-full max-w-md">
        <motion.div className="text-center mb-8">
          <Logo className="justify-center mb-4" />
          <h1 className="font-display text-2xl font-bold text-primary">Welcome back</h1>
          <p className="text-text-secondary mt-1">Sign in with the email and password you registered</p>
        </motion.div>

        <form onSubmit={handleSubmit(onSubmit)} className="card space-y-4">
          <Input
            label="Email"
            type="email"
            icon={HiOutlineMail}
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Password"
            type="password"
            icon={HiOutlineLockClosed}
            error={errors.password?.message}
            {...register('password')}
          />

          <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
            <input
              type="checkbox"
              className="rounded border-gray-300 text-primary focus:ring-primary"
              {...register('rememberMe')}
            />
            Keep me signed in
          </label>

          <Button type="submit" loading={loading} className="w-full">
            Sign in
          </Button>
        </form>

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
