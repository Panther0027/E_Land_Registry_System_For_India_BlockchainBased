import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './routes/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import OfflineBanner from './components/OfflineBanner';

import SplashScreen from './pages/SplashScreen';
import HomePage from './pages/HomePage';
import LandingPage from './pages/LandingPage';
import AboutPage from './pages/AboutPage';
import HowItWorksPage from './pages/HowItWorksPage';
import PublicVerifyPage from './pages/PublicVerifyPage';
import RegisterPage from './pages/RegisterPage';
import LoginPage from './pages/LoginPage';
import NotFoundPage from './pages/NotFoundPage';
import DashboardPage from './pages/DashboardPage';
import RegisterPropertyPage from './pages/RegisterPropertyPage';
import MyPropertiesPage from './pages/MyPropertiesPage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import TransferOwnershipPage from './pages/TransferOwnershipPage';
import SearchVerifyPage from './pages/SearchVerifyPage';
import DocumentsPage from './pages/DocumentsPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import GovernmentPanelPage from './pages/GovernmentPanelPage';

const App = () => (
  <>
    <OfflineBanner />
    <Routes>
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
  </>
);

export default App;
