import axios from 'axios';

// Force cache busting by adding timestamp
const CACHE_BUST = `?v=${Date.now()}`;

// This matches your backend URL. 
const API_URL = `${import.meta.env.VITE_API_URL || 'https://ayu-disha.onrender.com/api'}/clinician`;

const clinicianApi = axios.create({
  baseURL: API_URL,
  timeout: 15000,
});

// Interceptor: This automatically grabs the JWT token from storage 
// and adds it to the 'Authorization' header of every request.
clinicianApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// EMERGENCY FIX: Create completely new API object that doesn't rely on cached imports
const emergencyApi = {
  get: async (endpoint: string) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`https://ayu-disha.onrender.com/api/clinician${endpoint}${CACHE_BUST}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  },
  
  post: async (endpoint: string, data?: any) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`https://ayu-disha.onrender.com/api/clinician${endpoint}${CACHE_BUST}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return response.json();
  }
};

export const api = {
  // EMERGENCY: Use direct fetch calls to bypass caching
  get: emergencyApi.get,
  post: emergencyApi.post,
  
  // Queue & Patients
  getQueue: () => clinicianApi.get('/queue').then(res => res.data),
  getMyPatients: () => clinicianApi.get('/my-patients').then(res => res.data),
  getPatientRecord: (id: string) => clinicianApi.get(`/patients/${id}`).then(res => res.data),
  getPatientSummary: (id: string) => clinicianApi.get(`/patients/${id}/summary`).then(res => res.data),
  
  // Consultations
  startVisit: (data: any) => clinicianApi.post('/visits', data).then(res => res.data),
  updateVisit: (id: string, data: any) => clinicianApi.patch(`/visits/${id}`, data).then(res => res.data),
  completeVisit: (id: string) => clinicianApi.post(`/visits/${id}/complete`).then(res => res.data),
  
  // Clinical Tools
  checkInteraction: (data: any) => clinicianApi.post('/prescriptions/check-interaction', data).then(res => res.data),
  savePrescription: (data: any) => clinicianApi.post('/prescriptions', data).then(res => res.data),
  getDifferential: (symptoms: string, patientId: string) => 
    clinicianApi.get('/differential', { params: { symptoms, patient_id: patientId } }).then(res => res.data),
  
  // Voice & Referral
  processVoiceNote: (visitId: string, audioBlob: Blob) => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'voice_note.webm');
    return clinicianApi.post(`/voice-note?visit_id=${visitId}`, formData).then(res => res.data);
  },
  orderLabs: (data: any) => clinicianApi.post('/lab-orders', data).then(res => res.data),
  sendReferral: (data: any) => clinicianApi.post('/referrals', data).then(res => res.data),
  
  // Lab Results (secure - doctor can only see their assigned patients' results)
  getMyLabResults: () => {
    // Route to /lab/results which checks doctor's permission
    const labApi = axios.create({
      baseURL: import.meta.env.VITE_API_URL || 'https://ayu-disha.onrender.com/api',
      timeout: 15000,
    });
    const token = localStorage.getItem('token');
    if (token) {
      labApi.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
    return labApi.get('/lab/results').then(res => res.data);
  },
};

export default api;
