import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  role: string;
  mobile: string;
  email?: string;
  language: string;
  hospital?: string;
  village?: string;
  district?: string;
  is_profile_complete?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  hydrate: () => void;
  refreshUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  hydrate: () => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    set({ user, token, isAuthenticated: !!token });
  },

  login: (user, token) => {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    document.cookie = 'auth_token=; path=/; max-age=0';
    set({ user: null, token: null, isAuthenticated: false });
  },

  refreshUser: async () => {
    try {
      const { default: api } = await import('@/lib/api');
      const res = await api.get('/auth/me');
      const freshUser = res.data;
      localStorage.setItem('user', JSON.stringify(freshUser));
      set({ user: freshUser });
    } catch (e) {
      console.warn('Failed to refresh user', e);
    }
  },
}));
