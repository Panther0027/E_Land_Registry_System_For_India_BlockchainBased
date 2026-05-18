import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { SplashLogo } from '../components/Logo';

const SplashScreen = () => {
  const navigate = useNavigate();
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 2500);
    const navTimer = setTimeout(() => navigate('/home'), 3200);
    return () => { clearTimeout(timer); clearTimeout(navTimer); };
  }, [navigate]);

  return (
    <motion.div
      animate={{ opacity: fadeOut ? 0 : 1 }}
      transition={{ duration: 0.7 }}
      className={`fixed inset-0 bg-primary flex items-center justify-center z-50 ${fadeOut ? 'pointer-events-none' : ''}`}
    >
      <SplashLogo />
    </motion.div>
  );
};

export default SplashScreen;
