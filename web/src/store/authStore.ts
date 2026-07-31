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
    console.log('🔍 [RUNTIME DEBUG] initUser raw stored user:', stored);
    if (stored) {
      const user = JSON.parse(stored);
      console.log('🔍 [RUNTIME DEBUG] initUser parsed fields:', { id: user?.id, name: user?.name, role: user?.role, nameType: typeof user?.name });
      // Validate that user has required id and role
      if (user.id && user.role) {
        user.name = user.name || user.email || user.mobile || 'User';
        user.role = String(user.role).toLowerCase();
        console.log('✅ [RUNTIME DEBUG] initUser validation PASSED:', user);
        return user;
      } else {
        console.warn('❌ [RUNTIME DEBUG] initUser validation FAILED! Discarding user because id/role missing:', { id: user?.id, name: user?.name, role: user?.role });
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
    const normalizedUser = {
      ...user,
      name: user.name || user.email || user.mobile || 'User',
      role: user.role ? String(user.role).toLowerCase() : 'doctor'
    };
    console.log('🔐 [RUNTIME DEBUG] AuthStore.login called with user:', normalizedUser, 'token:', token ? 'PRESENT' : 'NULL');
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    localStorage.setItem('token', token);
    if (refreshToken) localStorage.setItem('refresh_token', refreshToken);
    set({ user: normalizedUser, token, isAuthenticated: true });
  },
  
  logout: () => {
    console.log('AuthStore.logout - clearing all auth data');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('refresh_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  updateUser: (user) => {
    const normalizedUser = {
      ...user,
      name: user.name || user.email || user.mobile || 'User',
      role: user.role ? String(user.role).toLowerCase() : 'doctor'
    };
    console.log('AuthStore.updateUser - updating user:', { id: normalizedUser.id, name: normalizedUser.name });
    localStorage.setItem('user', JSON.stringify(normalizedUser));
    set({ user: normalizedUser });
  },
}));
