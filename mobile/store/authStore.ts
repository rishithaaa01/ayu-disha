import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

export interface User {
  id: string;
  name: string;
  mobile: string;
  role: string;
  language: string;
  district?: string;
  hospital?: string;
  village?: string;
  email?: string;
  is_profile_complete?: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (user: User, token: string) => Promise<void>;
  logout: () => Promise<void>;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,
  
  login: async (user, token) => {
    await SecureStore.setItemAsync('token', token);
    set({ user, token, isAuthenticated: true });
  },
  
  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    set({ user: null, token: null, isAuthenticated: false });
  },
  
  restoreSession: async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      if (token) {
        // Automatically injects token via axios interceptor
        const response = await api.get('/auth/me');
        set({ user: response.data, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      await SecureStore.deleteItemAsync('token');
      set({ user: null, token: null, isAuthenticated: false, isLoading: false });
    }
  }
}));
