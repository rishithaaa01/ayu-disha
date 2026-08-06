import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  isHydrated: boolean;
  login: (user: User, token: string, refreshToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  isHydrated: false,
  
  login: async (user, token, refreshToken) => {
    const normalizedUser = {
      ...user,
      name: user.name || user.email || user.mobile || 'User',
      role: user.role ? String(user.role).toLowerCase() : 'doctor'
    };
    await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
    await AsyncStorage.setItem('token', token);
    if (refreshToken) await AsyncStorage.setItem('refresh_token', refreshToken);
    set({ user: normalizedUser, token, isAuthenticated: true });
  },
  
  logout: async () => {
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('refresh_token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  updateUser: async (user) => {
    const normalizedUser = {
      ...user,
      name: user.name || user.email || user.mobile || 'User',
      role: user.role ? String(user.role).toLowerCase() : 'doctor'
    };
    await AsyncStorage.setItem('user', JSON.stringify(normalizedUser));
    set({ user: normalizedUser });
  },

  hydrate: async () => {
    try {
      const storedUser = await AsyncStorage.getItem('user');
      const token = await AsyncStorage.getItem('token');
      
      let user = null;
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed.id && parsed.role) {
          user = parsed;
        }
      }
      
      set({ user, token, isAuthenticated: !!token, isHydrated: true });
    } catch (e) {
      console.error('Failed to hydrate auth store:', e);
      set({ isHydrated: true });
    }
  }
}));
