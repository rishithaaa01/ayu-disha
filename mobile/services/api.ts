import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { Config } from '../constants/Config';

const api = axios.create({
  // Use http://10.0.2.2:8000/api if running on Android Emulator locally
  baseURL: Config.API_URL,
  timeout: 30000, // Increased from 15s to 30s
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Setup primitive interceptor to handle 401s globally (optional refinement later)
api.interceptors.response.use((response) => response, async (error) => {
  if (error.response && error.response.status === 401) {
    await SecureStore.deleteItemAsync('token');
    // Can hook into router to navigate to welcome here later
  }
  return Promise.reject(error);
});

export default api;
