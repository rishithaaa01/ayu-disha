import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import { Config } from '../constants/Config';

const API_URL = Config.API_URL;

const ashaApi = axios.create({
  baseURL: `${API_URL}/asha`,
  timeout: 30000, // 30 seconds timeout
});

ashaApi.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const getHouseholds = async () => {
  const res = await ashaApi.get('/households');
  return res.data;
};

export const getHouseholdDetails = async (id: string) => {
  const res = await ashaApi.get(`/households/${id}`);
  return res.data;
};

export const classifyRisk = async (data: any) => {
  const res = await ashaApi.post('/visits/classify-risk', data);
  return res.data;
};

export const submitVisit = async (data: any) => {
  // In a real offline app, this would be routed through WatermelonDB and syncService instead of direct API
  const res = await ashaApi.post('/visits', data);
  return res.data;
};

export const registerHousehold = async (data: any) => {
  const res = await ashaApi.post('/households', data);
  return res.data;
}

export const getMyStats = async () => {
  const res = await ashaApi.get('/my-stats');
  return res.data;
}

export const getReferrals = async () => {
  const res = await ashaApi.get('/referrals');
  return res.data;
}

export default {
  getHouseholds,
  getHouseholdDetails,
  classifyRisk,
  submitVisit,
  registerHousehold,
  getMyStats,
  getReferrals
};
