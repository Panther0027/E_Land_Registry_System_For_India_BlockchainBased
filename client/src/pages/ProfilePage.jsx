import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { HiOutlineClipboardCopy, HiOutlinePencil } from 'react-icons/hi';
import { FaEthereum } from 'react-icons/fa';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useAuthStore } from '../store';
import { authAPI } from '../services';
import { ROLE_LABELS, LANGUAGES } from '../constants';
import { copyToClipboard, maskAadhaar } from '../utils';
import { useMetaMask } from '../hooks/useMetaMask';
import i18n from '../i18n';

const ProfilePage = () => {
  const { t } = useTranslation();
  const { user, logout, updateUser } = useAuthStore();
  const { connectWallet, connecting, connectedAddress, isInstalled } = useMetaMask();
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { register, handleSubmit } = useForm({
    defaultValues: {
      fullName: user?.fullName,
      phone: user?.phone,
      language: user?.language || i18n.language || 'en',
    },
  });

  const handleCopyWallet = async () => {
    const ok = await copyToClipboard(connectedAddress || user?.walletAddress);
    toast[ok ? 'success' : 'error'](ok ? 'Wallet address copied!' : 'Failed to copy');
  };

  const onSave = async (data) => {
    setLoading(true);
    try {
      await authAPI.updateProfile(data);
      updateUser(data);
      if (data.language) {
        i18n.changeLanguage(data.language);
        localStorage.setItem('bhumi-lang', data.language);
      }
      setEditing(false);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="font-display text-3xl font-bold text-primary">{t('nav.profile')}</h1>

      <div className="card text-center">
        <div className="w-24 h-24 mx-auto rounded-full bg-secondary flex items-center justify-center text-primary text-3xl font-bold mb-4">
          {user?.avatarInitials}
        </div>
        <h2 className="text-xl font-semibold">{user?.fullName}</h2>
        <p className="text-text-secondary">{ROLE_LABELS[user?.role]}</p>
      </div>

      <div className="card space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="font-semibold text-primary">Personal Information</h3>
          <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)}>
            <HiOutlinePencil /> {editing ? t('common.cancel') : 'Edit'}
          </Button>
        </div>

        {editing ? (
          <form onSubmit={handleSubmit(onSave)} className="space-y-4">
            <Input label="Full Name" {...register('fullName')} />
            <Input label="Phone" {...register('phone')} />
            <Select label="Language" options={LANGUAGES} {...register('language')} />
            <Button type="submit" loading={loading}>{t('common.save')}</Button>
          </form>
        ) : (
          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b"><span className="text-text-secondary">Email</span><span>{user?.email}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-text-secondary">Phone</span><span>{user?.phone}</span></div>
            <div className="flex justify-between py-2 border-b"><span className="text-text-secondary">Aadhaar</span><span>{user?.aadhaarMasked || maskAadhaar('0000')}</span></div>
            <div className="flex justify-between py-2"><span className="text-text-secondary">Role</span><span>{ROLE_LABELS[user?.role]}</span></div>
          </div>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-primary mb-4">Wallet</h3>
        <div className="flex items-center gap-3 bg-accent rounded-xl p-4 mb-4">
          <FaEthereum className="text-primary shrink-0" size={20} />
          <code className="text-xs flex-1 break-all">{connectedAddress || user?.walletAddress || 'Not connected'}</code>
          {(connectedAddress || user?.walletAddress) && (
            <Button variant="ghost" size="sm" onClick={handleCopyWallet}>
              <HiOutlineClipboardCopy />
            </Button>
          )}
        </div>
        {isInstalled ? (
          <Button onClick={() => connectWallet()} loading={connecting} variant="outline" className="w-full">
            <FaEthereum /> {connectedAddress ? t('common.walletConnected') : t('common.connectWallet')}
          </Button>
        ) : (
          <p className="text-sm text-text-secondary">Install MetaMask to connect your Ethereum wallet for blockchain transactions.</p>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-primary mb-4">Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Email Notifications</span>
            <input type="checkbox" defaultChecked={user?.notificationPreferences?.email !== false} className="rounded text-primary" />
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm">Push Notifications</span>
            <input type="checkbox" defaultChecked={user?.notificationPreferences?.push !== false} className="rounded text-primary" />
          </label>
        </div>
      </div>

      <Button variant="danger" onClick={handleLogout} className="w-full">{t('nav.logout')}</Button>
    </div>
  );
};

export default ProfilePage;
