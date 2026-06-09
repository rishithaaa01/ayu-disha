import api from './api';

export const ashaApi = {
  getHouseholds: () => api.get('/asha/households').then(r => r.data),
  getHouseholdDetails: (id: string) => api.get(`/asha/households/${id}`).then(r => r.data),
  getMyStats: () => api.get('/asha/my-stats').then(r => r.data),
  getReferrals: () => api.get('/asha/referrals').then(r => r.data),
  registerHousehold: (data: any) => api.post('/asha/households', data).then(r => r.data),
  submitVisit: (data: any) => api.post('/asha/visits', data).then(r => r.data),
  classifyRisk: (data: any) => api.post('/asha/visits/classify-risk', data).then(r => r.data),
  sendReferral: (data: any) => api.post('/asha/referrals', data).then(r => r.data),
};

export default ashaApi;
