import { motion } from 'framer-motion';

const Logo = ({ size = 'md', showText = true, className = '' }) => {
  const sizes = {
    sm: { icon: 32, text: 'text-lg' },
    md: { icon: 40, text: 'text-xl' },
    lg: { icon: 56, text: 'text-3xl' },
    xl: { icon: 80, text: 'text-4xl' },
  };

  const s = sizes[size] || sizes.md;

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg width={s.icon} height={s.icon} viewBox="0 0 64 64" fill="none">
        <circle cx="32" cy="32" r="30" fill="#1B4332" />
        <path
          d="M32 8C24 8 18 16 18 26c0 14 14 28 14 28s14-14 14-28C46 16 40 8 32 8z"
          fill="#D4A017"
        />
        <path
          d="M32 18c-3 0-6 3-6 7 0 5 6 12 6 12s6-7 6-12c0-4-3-7-6-7z"
          fill="#1B4332"
        />
        <ellipse cx="32" cy="22" rx="3" ry="4" fill="#2D6A4F" />
      </svg>
      {showText && (
        <span className={`font-display font-bold text-primary ${s.text}`}>
          Bhumi
        </span>
      )}
    </div>
  );
};

export const SplashLogo = () => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.8, ease: 'easeOut' }}
    className="flex flex-col items-center"
  >
    <Logo size="xl" showText={false} />
    <motion.h1
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.6 }}
      className="font-display text-5xl font-bold text-white mt-6"
    >
      Bhumi
    </motion.h1>
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.8, duration: 0.6 }}
      className="text-secondary text-lg mt-3 font-medium tracking-wide"
    >
      Your Land. Your Truth. On Chain.
    </motion.p>
  </motion.div>
);

export default Logo;
