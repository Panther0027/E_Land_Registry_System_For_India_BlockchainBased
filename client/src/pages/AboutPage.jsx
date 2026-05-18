import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { HiOutlineShieldCheck, HiOutlineGlobe, HiOutlineUser } from 'react-icons/hi';
import PublicLayout from '../layouts/PublicLayout';

const AboutPage = () => {
  const { t } = useTranslation();

  const values = [
    { icon: HiOutlineShieldCheck, title: 'Transparency', desc: 'Every land transaction is recorded on a public blockchain, ensuring complete transparency and accountability.' },
    { icon: HiOutlineGlobe, title: 'Accessibility', desc: 'Available in English, Hindi, and Odia — designed for every citizen across India.' },
    { icon: HiOutlineUser, title: 'Trust', desc: 'Government officials verify records before they are immutably stored on the blockchain.' },
  ];

  return (
    <PublicLayout>
      <div className="max-w-4xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl font-bold text-primary mb-4">{t('nav.about')} Bhumi</h1>
          <p className="text-text-secondary text-lg leading-relaxed mb-8">
            Bhumi (भूमि — meaning "Land/Earth" in Sanskrit) is India's next-generation blockchain-based land registry platform.
            Built to eliminate land fraud, reduce disputes, and bring transparency to property ownership records.
          </p>

          <div className="card mb-8">
            <h2 className="font-display text-xl font-semibold text-primary mb-4">Our Mission</h2>
            <p className="text-text-secondary leading-relaxed">
              To create a tamper-proof, digitally accessible land registry that empowers every Indian citizen
              to register, verify, and transfer property ownership with confidence — backed by blockchain technology
              and government verification.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {values.map(({ icon: Icon, title, desc }, i) => (
              <motion.div key={title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="card text-center">
                <Icon size={36} className="text-secondary mx-auto mb-4" />
                <h3 className="font-semibold text-primary mb-2">{title}</h3>
                <p className="text-sm text-text-secondary">{desc}</p>
              </motion.div>
            ))}
          </div>

          <div className="card bg-primary/5 border-primary/10">
            <h2 className="font-display text-xl font-semibold text-primary mb-4">Technology Stack</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {['Ethereum Blockchain', 'IPFS Storage', 'MongoDB Database', 'JWT Authentication', 'Aadhaar Hashing', 'MetaMask Integration', 'React + Node.js', 'Solidity Smart Contracts'].map((tech) => (
                <span key={tech} className="bg-surface px-3 py-2 rounded-lg text-text-secondary text-center">{tech}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </PublicLayout>
  );
};

export default AboutPage;
