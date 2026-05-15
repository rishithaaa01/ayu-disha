import api from './api';

export const clinicianApi = {
  // Queue & Patients
  getQueue: () => api.get('/clinician/queue').then(res => res.data),
  getPatientRecord: (id: string) => api.get(`/clinician/patients/${id}`).then(res => res.data),
  getPatientSummary: (id: string) => api.get(`/clinician/patients/${id}/summary`).then(res => res.data),
  
  // Consultations
  startVisit: (data: { patient_id: string; chief_complaint: string; referral_id?: string }) => 
    api.post('/clinician/visits', data).then(res => res.data),
  updateVisit: (id: string, data: any) => 
    api.patch(`/clinician/visits/${id}`, data).then(res => res.data),
  completeVisit: (id: string) => 
    api.post(`/clinician/visits/${id}/complete`).then(res => res.data),
  
  // Clinical Tools
  checkInteraction: (data: { new_medicine: string; current_medicines: string[]; patient_allergies: string[] }) => 
    api.post('/clinician/prescriptions/check-interaction', data).then(res => res.data),
  savePrescription: (data: any) => 
    api.post('/clinician/prescriptions', data).then(res => res.data),
  getDifferential: (symptoms: string, patientId: string) => 
    api.get('/clinician/differential', { params: { symptoms, patient_id: patientId } }).then(res => res.data),
  
  // Voice & Referral
  processVoiceNote: (visitId: string, audioUri: string) => {
    const formData = new FormData();
    // In React Native, we append the file URI
    formData.append('file', {
      uri: audioUri,
      name: 'voice_note.m4a',
      type: 'audio/m4a',
    } as any);
    return api.post(`/clinician/voice-note?visit_id=${visitId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }).then(res => res.data);
  },
  orderLabs: (data: any) => api.post('/clinician/lab-orders', data).then(res => res.data),
  sendReferral: (data: any) => api.post('/clinician/referrals', data).then(res => res.data),
};

export default clinicianApi;
