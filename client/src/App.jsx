import { useEffect, useRef, Suspense, lazy } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { io } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useAuthStore } from './store';
import { ProtectedRoute, PublicRoute } from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import OfflineBanner from './components/OfflineBanner';

const SplashScreen = lazy(() => import('./pages/SplashScreen'));
const HomePage = lazy(() => import('./pages/HomePage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const PublicVerifyPage = lazy(() => import('./pages/PublicVerifyPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const RegisterPropertyPage = lazy(() => import('./pages/RegisterPropertyPage'));
const MyPropertiesPage = lazy(() => import('./pages/MyPropertiesPage'));
const PropertyDetailPage = lazy(() => import('./pages/PropertyDetailPage'));
const TransferOwnershipPage = lazy(() => import('./pages/TransferOwnershipPage'));
const SearchVerifyPage = lazy(() => import('./pages/SearchVerifyPage'));
const DocumentsPage = lazy(() => import('./pages/DocumentsPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const GovernmentPanelPage = lazy(() => import('./pages/GovernmentPanelPage'));

const App = () => {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const socketRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    if (!user?._id) return undefined;

    const socket = io(undefined, {
      autoConnect: true,
      withCredentials: true,
      query: { userId: user._id },
    });

    socket.on('property_transferred', (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['my-properties-transfer'] });
      queryClient.invalidateQueries({ queryKey: ['my-properties'] });
      toast.success(`Property ${data.propertyId} has been transferred to you.`);
    });

    socket.on('property_transfer_confirmed', (data) => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['my-properties-transfer'] });
      queryClient.invalidateQueries({ queryKey: ['my-properties'] });
      toast.success(`Your transfer for ${data.propertyId} is confirmed.`);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user?._id, queryClient]);

  return (
    <>
      <OfflineBanner />
      <Suspense fallback={<div className="p-6">Loading...</div>}>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
        <Route path="/" element={<SplashScreen />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/verify" element={<PublicVerifyPage />} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />

        <Route element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/register-property" element={<RegisterPropertyPage />} />
          <Route path="/properties" element={<MyPropertiesPage />} />
          <Route path="/properties/:id" element={<PropertyDetailPage />} />
          <Route path="/transfer" element={<TransferOwnershipPage />} />
          <Route path="/search" element={<SearchVerifyPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/government" element={<GovernmentPanelPage />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AnimatePresence>
      </Suspense>
    </>
  );
};

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: 'easeOut' } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease: 'easeIn' } },
};

const PageTransition = ({ children }) => (
  <motion.div initial="initial" animate="animate" exit="exit" variants={pageVariants} style={{ minHeight: '100%' }}>
    {children}
  </motion.div>
);

export default App;
