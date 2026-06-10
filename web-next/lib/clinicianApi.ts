import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ayu-disha.onrender.com/api';

const clinicianApi = axios.create({ baseURL: `${API_URL}/clinician` });

clinicianApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const api = {
  getQueue: () => clinicianApi.get('/queue').then(r => r.data),
  getPatientRecord: (id: string) => clinicianApi.get(`/patients/${id}`).then(r => r.data),
  getPatientSummary: (id: string) => clinicianApi.get(`/patients/${id}/summary`).then(r => r.data),
  startVisit: (data: any) => clinicianApi.post('/visits', data).then(r => r.data),
  updateVisit: (id: string, data: any) => clinicianApi.patch(`/visits/${id}`, data).then(r => r.data),
  completeVisit: (id: string) => clinicianApi.post(`/visits/${id}/complete`).then(r => r.data),
  checkInteraction: (data: any) => clinicianApi.post('/prescriptions/check-interaction', data).then(r => r.data),
  savePrescription: (data: any) => clinicianApi.post('/prescriptions', data).then(r => r.data),
  getDifferential: (symptoms: string, patientId: string) =>
    clinicianApi.get('/differential', { params: { symptoms, patient_id: patientId } }).then(r => r.data),
  processVoiceNote: (visitId: string, audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice_note.webm');
    return clinicianApi.post(`/voice-note?visit_id=${visitId}`, formData).then(r => r.data);
  },
  orderLabs: (data: any) => clinicianApi.post('/lab-orders', data).then(r => r.data),
  sendReferral: (data: any) => clinicianApi.post('/referrals', data).then(r => r.data),
};

export default api;
