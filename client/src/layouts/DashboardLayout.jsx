import { NavLink, useNavigate, Outlet } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HiOutlineHome, HiOutlineDocumentAdd, HiOutlineSwitchHorizontal,
  HiOutlineSearch, HiOutlineDocumentText, HiOutlineBell, HiOutlineUser,
  HiOutlineLogout, HiOutlineMenu, HiOutlineX, HiOutlineClipboardList,
  HiOutlineShieldCheck,
} from 'react-icons/hi';
import Logo from '../components/Logo';
import { useAuthStore, useUIStore } from '../store';
import { ROLE_LABELS } from '../constants';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', icon: HiOutlineHome },
  { path: '/properties', label: 'My Properties', icon: HiOutlineClipboardList },
  { path: '/register-property', label: 'Register Property', icon: HiOutlineDocumentAdd },
  { path: '/transfer', label: 'Transfer Ownership', icon: HiOutlineSwitchHorizontal },
  { path: '/search', label: 'Search & Verify', icon: HiOutlineSearch },
  { path: '/documents', label: 'Documents', icon: HiOutlineDocumentText },
  { path: '/notifications', label: 'Notifications', icon: HiOutlineBell },
  { path: '/profile', label: 'Profile', icon: HiOutlineUser },
];

const officialNav = {
  path: '/government', label: 'Official Panel', icon: HiOutlineShieldCheck,
};

const Sidebar = () => {
  const { user, logout, hasRole } = useAuthStore();
  const { sidebarOpen, mobileMenuOpen, setMobileMenuOpen } = useUIStore();
  const navigate = useNavigate();

  const items = hasRole('government_official', 'verifier')
    ? [...navItems.slice(0, 1), officialNav, ...navItems.slice(1)]
    : navItems;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const NavContent = () => (
    <>
      <div className="p-6 border-b border-white/10">
        <Logo className="text-white [&_span]:text-white [&_circle]:fill-white/20" />
        {user && (
          <div className="mt-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-primary font-bold text-sm">
              {user.avatarInitials}
            </div>
            <div className="min-w-0">
              <p className="text-white font-medium text-sm truncate">{user.fullName}</p>
              <p className="text-white/60 text-xs">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {items.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            onClick={() => setMobileMenuOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-secondary text-primary'
                  : 'text-white/70 hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={20} />
            {sidebarOpen && label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/70 hover:bg-red-500/20 hover:text-red-300 w-full transition-all"
        >
          <HiOutlineLogout size={20} />
          {sidebarOpen && 'Logout'}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-primary fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'}`}>
        <NavContent />
      </aside>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary text-white rounded-xl shadow-lg"
      >
        <HiOutlineMenu size={24} />
      </button>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-primary z-50 flex flex-col"
            >
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 text-white p-1"
              >
                <HiOutlineX size={24} />
              </button>
              <NavContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

const DashboardLayout = () => {
  const { sidebarOpen } = useUIStore();

  return (
    <div className="min-h-screen bg-accent bg-earth-texture">
      <Sidebar />
      <main className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-20'} min-h-screen`}>
        <div className="p-4 lg:p-8 pt-16 lg:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
