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
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string, refreshToken?: string) => void;
  logout: () => void;
  updateUser: (user: User) => void;
}

// Initialize from localStorage with validation
const initUser = (): User | null => {
  try {
    const stored = localStorage.getItem('user');
    if (stored) {
      const user = JSON.parse(stored);
      // Validate that user has required fields
      if (user.id && user.name && user.role) {
        return user;
      }
    }
  } catch (e) {
    console.error('Failed to parse stored user:', e);
  }
  return null;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: initUser(),
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  
  login: (user, token, refreshToken) => {
    console.log('AuthStore.login - storing user:', { id: user.id, name: user.name, role: user.role });
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    set({ user, token, isAuthenticated: true });
  },
  
  logout: () => {
    console.log('AuthStore.logout - clearing all auth data');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  updateUser: (user) => {
    console.log('AuthStore.updateUser - updating user:', { id: user.id, name: user.name });
    localStorage.setItem('user', JSON.stringify(user));
    set({ user });
  },
}));
