import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import PublicLayout from '../layouts/PublicLayout';
import Button from '../components/ui/Button';

const STEPS = [
  { num: '01', title: 'Register Your Account', desc: 'Sign up with your Aadhaar-verified identity. Choose your role — property owner, government official, or verifier.' },
  { num: '02', title: 'Register Your Property', desc: 'Submit property details, upload land deed and ownership proof. Documents are stored on IPFS, records go on blockchain.' },
  { num: '03', title: 'Government Verification', desc: 'A government official reviews your registration, verifies documents, and approves the record on the blockchain.' },
  { num: '04', title: 'Download Certificate', desc: 'Once verified, download your official Bhumi land ownership certificate with blockchain transaction proof.' },
  { num: '05', title: 'Transfer or Verify', desc: 'Transfer ownership securely with OTP verification, or let anyone verify your property via QR code or public search.' },
];

const HowItWorksPage = () => {
  const { t } = useTranslation();

  return (
    <PublicLayout>
      <div className="max-w-3xl mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-4xl font-bold text-primary mb-4">{t('nav.howItWorks')}</h1>
          <p className="text-text-secondary text-lg mb-12">
            From registration to verification — here's how Bhumi secures your land records in 5 simple steps.
          </p>

          <div className="space-y-8">
            {STEPS.map(({ num, title, desc }, i) => (
              <motion.div
                key={num}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-6"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shrink-0">
                  <span className="text-secondary font-display font-bold">{num}</span>
                </div>
                <div>
                  <h3 className="font-semibold text-primary text-lg mb-1">{title}</h3>
                  <p className="text-text-secondary">{desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <Link to="/register"><Button size="lg">{t('nav.getStarted')}</Button></Link>
          </div>
        </motion.div>
      </div>
    </PublicLayout>
  );
};

export default HowItWorksPage;
