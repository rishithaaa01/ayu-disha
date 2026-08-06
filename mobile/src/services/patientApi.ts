import api from './api';

export const patientApi = {
  getMyProfile: () => api.get('/patients/me').then(r => r.data),
  getMyVisits: () => api.get('/patients/me/visits').then(r => r.data),
  getMyPrescriptions: () => api.get('/patients/me/prescriptions').then(r => r.data),
  getMyLabResults: () => api.get('/lab/results').then(r => r.data),
  getLabResult: (labOrderId: string) => api.get(`/lab/results/${labOrderId}`).then(r => r.data),
  getHealthSummary: () => api.get('/patients/me/health-summary').then(r => r.data),
  getMyConsents: () => api.get('/patients/me/consents').then(r => r.data),
  grantConsent: (data: any) => api.post('/patients/me/consents', data).then(r => r.data),
  revokeConsent: (id: string) => api.delete(`/patients/me/consents/${id}`).then(r => r.data),
};

export default patientApi;
