import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { HiOutlineGlobe, HiOutlineShieldCheck, HiOutlineSwitchHorizontal } from 'react-icons/hi';
import Logo from '../components/Logo';
import Button from '../components/ui/Button';
import { ONBOARDING_SLIDES } from '../constants';

const icons = {
  land: HiOutlineGlobe,
  shield: HiOutlineShieldCheck,
  handshake: HiOutlineSwitchHorizontal,
};

const LandingPage = () => {
  const [current, setCurrent] = useState(0);
  const navigate = useNavigate();
  const slide = ONBOARDING_SLIDES[current];
  const Icon = icons[slide.icon];

  const next = () => setCurrent((c) => Math.min(c + 1, ONBOARDING_SLIDES.length - 1));
  const prev = () => setCurrent((c) => Math.max(c - 1, 0));

  return (
    <div className="min-h-screen bg-accent bg-earth-texture flex flex-col">
      <header className="p-6 flex justify-between items-center">
        <Logo />
        <button onClick={() => navigate('/login')} className="text-primary font-medium hover:underline">
          Login
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-md"
          >
            <div className="w-32 h-32 mx-auto mb-8 rounded-3xl bg-primary/5 flex items-center justify-center">
              <Icon size={64} className="text-primary" />
            </div>
            <h1 className="font-display text-3xl font-bold text-primary mb-4">{slide.title}</h1>
            <p className="text-text-secondary text-lg leading-relaxed">{slide.description}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2 mt-10">
          {ONBOARDING_SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? 'w-8 bg-secondary' : 'w-2 bg-primary/20'
              }`}
            />
          ))}
        </div>

        <div className="flex gap-4 mt-10 w-full max-w-md">
          {current > 0 && (
            <Button variant="outline" onClick={prev} className="flex-1">Back</Button>
          )}
          {current < ONBOARDING_SLIDES.length - 1 ? (
            <Button onClick={next} className="flex-1">Next</Button>
          ) : (
            <Button onClick={() => navigate('/register')} className="flex-1">Get Started</Button>
          )}
        </div>

        <button
          onClick={() => navigate('/register')}
          className="mt-6 text-text-secondary text-sm hover:text-primary transition-colors"
        >
          Skip onboarding
        </button>
      </main>
    </div>
  );
};

export default LandingPage;
