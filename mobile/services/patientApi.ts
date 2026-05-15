import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
// Assuming localhost or typical Expo LAN setup, change inside app
import { Config } from '../constants/Config';

// Hardcoded to your Wi-Fi IP for physical phone testing
const API_URL = Config.API_URL;

const patientApi = axios.create({
  baseURL: `${API_URL}/patients`,
});

// Add interceptor to automatically add JWT
patientApi.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getMyProfile = async () => {
  const response = await patientApi.get('/me');
  return response.data;
};

export const getMyVisits = async () => {
  const response = await patientApi.get('/me/visits');
  return response.data;
};

export const getMyPrescriptions = async () => {
  const response = await patientApi.get('/me/prescriptions');
  return response.data;
};

export const getMyLabResults = async () => {
  const response = await patientApi.get('/me/lab-results');
  return response.data;
};

export const getHealthSummary = async () => {
  const response = await patientApi.get('/me/health-summary');
  return response.data;
};

export const getMyConsents = async () => {
  const response = await patientApi.get('/me/consents');
  return response.data;
};

export const grantConsent = async (data: any) => {
  const response = await patientApi.post('/me/consents', data);
  return response.data;
};

export const revokeConsent = async (consentId: string) => {
  const response = await patientApi.delete(`/me/consents/${consentId}`);
  return response.data;
};

export const registerPatient = async (data: any) => {
  const response = await patientApi.post('/register', data);
  return response.data;
};

export default {
  getMyProfile,
  getMyVisits,
  getMyPrescriptions,
  getMyLabResults,
  getHealthSummary,
  getMyConsents,
  grantConsent,
  revokeConsent,
  registerPatient,
};
