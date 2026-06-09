import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  role: string;
  mobile: string;
  language: string;
  hospital?: string;
  speciality?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  hydrate: () => void;
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
    // Also set cookie for middleware
    document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}`;
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    document.cookie = 'auth_token=; path=/; max-age=0';
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
