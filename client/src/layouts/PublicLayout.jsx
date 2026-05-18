import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HiOutlineGlobeAlt } from 'react-icons/hi';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import { LANGUAGES } from '../constants';
import i18n from '../i18n';

const PublicLayout = ({ children, hero = false }) => {
  const { t } = useTranslation();

  const changeLanguage = (lang) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('bhumi-lang', lang);
  };

  return (
    <div className="min-h-screen bg-accent bg-earth-texture flex flex-col">
      <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/landing"><Logo /></Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-text-secondary">
            <Link to="/about" className="hover:text-primary transition-colors">{t('nav.about')}</Link>
            <Link to="/how-it-works" className="hover:text-primary transition-colors">{t('nav.howItWorks')}</Link>
            <Link to="/verify" className="hover:text-primary transition-colors">{t('nav.verify')}</Link>
          </nav>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <button className="p-2 rounded-lg hover:bg-primary/5 text-text-secondary">
                <HiOutlineGlobeAlt size={20} />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-surface rounded-xl shadow-card border py-1 hidden group-hover:block min-w-[140px] z-50">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => changeLanguage(lang.value)}
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-accent ${i18n.language === lang.value ? 'text-primary font-semibold' : 'text-text-secondary'}`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>
            <Link to="/login" className="text-sm font-medium text-primary hover:underline hidden sm:block">{t('nav.login')}</Link>
            <Link to="/register"><Button size="sm">{t('nav.getStarted')}</Button></Link>
          </div>
        </div>
      </header>

      <main className={`flex-1 ${hero ? '' : 'py-12'}`}>
        {children}
      </main>

      <footer className="bg-primary text-white py-12">
        <div className="max-w-6xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <Logo className="[&_span]:text-white mb-4" />
              <p className="text-white/60 text-sm">{t('app.tagline')}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-secondary">Platform</h4>
              <div className="space-y-2 text-sm text-white/70">
                <Link to="/verify" className="block hover:text-white">{t('nav.verify')}</Link>
                <Link to="/how-it-works" className="block hover:text-white">{t('nav.howItWorks')}</Link>
                <Link to="/register" className="block hover:text-white">{t('nav.register')}</Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-secondary">Company</h4>
              <div className="space-y-2 text-sm text-white/70">
                <Link to="/about" className="block hover:text-white">{t('nav.about')}</Link>
                <a href="#" className="block hover:text-white">Privacy Policy</a>
                <a href="#" className="block hover:text-white">Terms of Service</a>
              </div>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-secondary">{t('public.trustTitle')}</h4>
              <div className="flex flex-wrap gap-2">
                {['Blockchain Verified', 'IPFS Storage', 'Aadhaar Secured', 'Gov Grade'].map((badge) => (
                  <span key={badge} className="text-xs bg-white/10 px-3 py-1 rounded-full">{badge}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 text-center text-sm text-white/50">
            © {new Date().getFullYear()} Bhumi Land Registry. Built for Digital India.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
