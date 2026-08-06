import api from './api';

export const clinicianApi = {
  // Generic HTTP methods
  get: (url: string) => api.get(`/clinician${url}`).then(res => res.data),
  post: (url: string, data?: any) => api.post(`/clinician${url}`, data).then(res => res.data),
  put: (url: string, data?: any) => api.put(`/clinician${url}`, data).then(res => res.data),
  delete: (url: string) => api.delete(`/clinician${url}`).then(res => res.data),
  patch: (url: string, data?: any) => api.patch(`/clinician${url}`, data).then(res => res.data),

  // Queue & Patients
  getQueue: () => api.get('/clinician/queue').then(res => res.data),
  getMyPatients: () => api.get('/clinician/my-patients').then(res => res.data).catch(() => []),
  getPatientRecord: (id: string) => api.get(`/clinician/patients/${id}`).then(res => res.data),
  getPatientSummary: (id: string) => api.get(`/clinician/patients/${id}/summary`).then(res => res.data),

  // Consultations
  startVisit: (data: any) => api.post('/clinician/visits', data).then(res => res.data),
  updateVisit: (id: string, data: any) => api.patch(`/clinician/visits/${id}`, data).then(res => res.data),
  completeVisit: (id: string) => api.post(`/clinician/visits/${id}/complete`).then(res => res.data),

  // Referrals
  getReferrals: () => api.get('/clinician/referrals').then(res => res.data).catch(() => []),
  acceptReferral: (id: string) => api.post(`/clinician/referrals/${id}/accept`).then(res => res.data),
  rejectReferral: (id: string, reason: string) => api.post(`/clinician/referrals/${id}/reject`, { reason }).then(res => res.data),
  sendReferral: (data: any) => api.post('/clinician/referrals', data).then(res => res.data),

  // Clinical Tools
  checkInteraction: (data: any) => api.post('/clinician/prescriptions/check-interaction', data).then(res => res.data),
  savePrescription: (data: any) => api.post('/clinician/prescriptions', data).then(res => res.data),
  
  // NOTE: Differential connects to backend which still uses Groq
  getDifferential: (symptoms: string, patientId: string) =>
    api.get('/clinician/differential', { params: { symptoms, patient_id: patientId } }).then(res => res.data),

  // Voice & Lab Orders
  processVoiceNote: async (visitId: string, audioUri: string, mimeType: string, fileName: string) => {
    const formData = new FormData();
    // React Native FormData requires a specific format for files
    formData.append('file', {
      uri: audioUri,
      name: fileName,
      type: mimeType
    } as any);
    
    return api.post(`/clinician/voice-note?visit_id=${visitId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then(res => res.data);
  },
  
  orderLabs: (data: any) => api.post('/clinician/lab-orders', data).then(res => res.data),

  // Lab Results
  getMyLabResults: () => api.get('/lab/results').then(res => res.data),
};

export default clinicianApi;
