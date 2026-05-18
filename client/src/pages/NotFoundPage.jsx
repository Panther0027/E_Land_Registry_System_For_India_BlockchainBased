import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';

const NotFoundPage = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-accent bg-earth-texture flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center max-w-md"
      >
        <Logo className="justify-center mb-8" />
        <h1 className="font-display text-8xl font-bold text-primary/20 mb-4">404</h1>
        <h2 className="font-display text-2xl font-bold text-primary mb-2">{t('common.notFound')}</h2>
        <p className="text-text-secondary mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/landing"><Button>{t('common.goHome')}</Button></Link>
          <Link to="/verify"><Button variant="outline">{t('nav.verify')}</Button></Link>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFoundPage;
