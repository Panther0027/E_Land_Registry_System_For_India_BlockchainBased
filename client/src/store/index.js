import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      rememberMe: false,

      setAuth: (user, token, rememberMe = false) =>
        set({ user, token, isAuthenticated: true, rememberMe }),

      logout: () =>
        set({ user: null, token: null, isAuthenticated: false, rememberMe: false }),

      updateUser: (updates) =>
        set({ user: { ...get().user, ...updates } }),

      hasRole: (...roles) => roles.includes(get().user?.role),
    }),
    {
      name: 'bhumi-auth',
      partialize: (state) =>
        state.rememberMe
          ? { user: state.user, token: state.token, isAuthenticated: state.isAuthenticated, rememberMe: state.rememberMe }
          : { rememberMe: false },
    }
  )
);

export const useUIStore = create((set) => ({
  sidebarOpen: true,
  mobileMenuOpen: false,
  isOnline: navigator.onLine,
  language: 'en',

  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),
  setOnline: (online) => set({ isOnline: online }),
  setLanguage: (language) => set({ language }),
}));
