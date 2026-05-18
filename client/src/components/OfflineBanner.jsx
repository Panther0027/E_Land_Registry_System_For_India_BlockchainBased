import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { HiOutlineWifi } from 'react-icons/hi';
import { useUIStore } from '../store';

const OfflineBanner = () => {
  const { isOnline, setOnline } = useUIStore();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline]);

  if (isOnline) return null;

  return (
    <motion.div
      initial={{ y: -50 }}
      animate={{ y: 0 }}
      className="fixed top-0 left-0 right-0 z-[100] bg-error text-white py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium"
    >
      <HiOutlineWifi size={18} />
      No Connection — Please check your internet connection
    </motion.div>
  );
};

export default OfflineBanner;
