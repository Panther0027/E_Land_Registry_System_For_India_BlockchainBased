import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
  HiOutlineShieldCheck, HiOutlineGlobe, HiOutlineDocumentText,
  HiOutlineSwitchHorizontal, HiOutlineLockClosed, HiOutlineX,
} from 'react-icons/hi';
import PublicLayout from '../layouts/PublicLayout';
import Button from '../components/ui/Button';
import api from '../services/api';

const FEATURE_DETAILS = [
  {
    id: 'blockchain',
    icon: HiOutlineGlobe,
    title: 'Blockchain Registry',
    desc: 'Immutable land records on Ethereum Sepolia testnet',
    detail: 'Every property is hashed and written to the LandRegistry smart contract on Sepolia. Records cannot be altered after verification — ideal for tamper-proof land titles.',
    cta: { label: 'Verify a Property', to: '/verify' },
  },
  {
    id: 'government',
    icon: HiOutlineShieldCheck,
    title: 'Government Verification',
    desc: 'Official approval workflow with on-chain verification',
    detail: 'Government officials review submitted deeds, approve or reject registrations, and trigger on-chain verification. Status flows: pending → verified → certificate issued.',
    cta: { label: 'See How It Works', to: '/how-it-works' },
  },
  {
    id: 'ipfs',
    icon: HiOutlineDocumentText,
    title: 'IPFS Documents',
    desc: 'Deeds and proofs stored permanently on IPFS',
    detail: 'Land deeds, survey maps, and ownership proofs are uploaded to IPFS via Pinata. Document hashes are linked to each property record for permanent retrieval.',
    cta: { label: 'Learn More', to: '/about' },
  },
  {
    id: 'transfer',
    icon: HiOutlineSwitchHorizontal,
    title: 'Instant Transfer',
    desc: 'Secure ownership transfer with OTP verification',
    detail: 'Owners initiate transfers with the new owner\'s Aadhaar. OTP verification and blockchain transaction ensure only authorized parties can change ownership.',
    cta: { label: 'Get Started', to: '/register' },
  },
  {
    id: 'aadhaar',
    icon: HiOutlineLockClosed,
    title: 'Aadhaar Security',
    desc: 'Sensitive data hashed — never stored in plain text',
    detail: 'Aadhaar numbers are validated with the Verhoeff checksum, then hashed with HMAC-SHA256 before storage. Only the last 4 digits are shown in the UI.',
    cta: { label: 'Create Account', to: '/register' },
  },
];

const HomePage = () => {
  const { t } = useTranslation();
  const [activeFeature, setActiveFeature] = useState(null);

  const { data: stats } = useQuery({
    queryKey: ['public-stats'],
    queryFn: () => api.get('/property/stats/public').then((r) => r.data.data),
  });

  const statItems = [
    { key: 'totalProperties', label: t('public.statsProperties'), value: stats?.totalProperties ?? '—' },
    { key: 'verifiedCount', label: t('public.statsVerified'), value: stats?.verifiedCount ?? '—' },
    { key: 'statesCovered', label: t('public.statsStates'), value: stats?.statesCovered ?? '—' },
    { key: 'totalTransactions', label: t('public.statsTransactions'), value: stats?.totalTransactions ?? '—' },
  ];

  const selected = FEATURE_DETAILS.find((f) => f.id === activeFeature);

  return (
    <PublicLayout hero>
      <section className="relative bg-primary text-white overflow-hidden">
        <div className="absolute inset-0 bg-earth-texture opacity-30" />
        <div className="max-w-6xl mx-auto px-4 py-24 relative">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <span className="inline-block bg-secondary/20 text-secondary px-4 py-1 rounded-full text-sm font-medium mb-6">
              🇮🇳 Digital India Initiative
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-6">
              {t('public.heroTitle')}
            </h1>
            <p className="text-white/70 text-lg mb-8 leading-relaxed">
              {t('public.heroSubtitle')}
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/verify"><Button variant="secondary" size="lg">{t('public.verifyNow')}</Button></Link>
              <Link to="/how-it-works"><Button variant="outline" size="lg" className="border-white text-white hover:bg-white hover:text-primary">{t('public.learnMore')}</Button></Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 -mt-12 relative z-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {statItems.map((s, i) => (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="card text-center"
            >
              <p className="text-3xl font-bold text-primary">{s.value}</p>
              <p className="text-sm text-text-secondary mt-1">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="font-display text-3xl font-bold text-primary text-center mb-4">{t('public.featuresTitle')}</h2>
        <p className="text-center text-text-secondary text-sm mb-12">Click any feature to learn more</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURE_DETAILS.map(({ icon: Icon, title, desc, id }, i) => (
            <motion.button
              key={id}
              type="button"
              onClick={() => setActiveFeature(id)}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="card hover:shadow-card-hover transition-shadow text-left cursor-pointer ring-2 ring-transparent hover:ring-primary/20 focus:outline-none focus:ring-primary/40"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
                <Icon size={24} className="text-primary" />
              </div>
              <h3 className="font-semibold text-primary mb-2">{title}</h3>
              <p className="text-text-secondary text-sm">{desc}</p>
              <p className="text-primary text-xs font-medium mt-3">Tap to explore →</p>
            </motion.button>
          ))}
        </div>
      </section>

      <section className="bg-primary/5 py-16">
        <div className="max-w-2xl mx-auto text-center px-4">
          <h2 className="font-display text-3xl font-bold text-primary mb-4">Ready to secure your land?</h2>
          <p className="text-text-secondary mb-8">Join thousands of property owners on India&apos;s most trusted blockchain land registry.</p>
          <Link to="/register"><Button size="lg">{t('nav.getStarted')}</Button></Link>
        </div>
      </section>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={() => setActiveFeature(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 relative"
            >
              <button
                type="button"
                onClick={() => setActiveFeature(null)}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent text-text-secondary"
                aria-label="Close"
              >
                <HiOutlineX size={20} />
              </button>
              <div className="w-14 h-14 rounded-2xl bg-primary/5 flex items-center justify-center mb-4">
                {(() => { const Icon = selected.icon; return <Icon size={28} className="text-primary" />; })()}
              </div>
              <h3 className="font-display text-xl font-bold text-primary mb-2">{selected.title}</h3>
              <p className="text-text-secondary text-sm leading-relaxed mb-6">{selected.detail}</p>
              <Link to={selected.cta.to} onClick={() => setActiveFeature(null)}>
                <Button className="w-full">{selected.cta.label}</Button>
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PublicLayout>
  );
};

export default HomePage;
