import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ClinicianState {
  doctor: any | null;
  activePatient: any | null;
  activeVisitId: string | null;
  queue: any[];
  
  // Actions
  setDoctor: (doctor: any) => void;
  setActivePatient: (patient: any) => void;
  setActiveVisitId: (id: string | null) => void;
  setQueue: (queue: any[]) => void;
  logout: () => void;
}

export const useClinicianStore = create<ClinicianState>((set) => ({
  doctor: null,
  activePatient: null,
  activeVisitId: null,
  queue: [],

  setDoctor: (doctor) => set({ doctor }),
  setActivePatient: (activePatient) => set({ activePatient }),
  setActiveVisitId: (activeVisitId) => set({ activeVisitId }),
  setQueue: (queue) => set({ queue }),
  
  logout: () => {
    // Relying on authStore for full logout logic, but we can clear local state here
    set({ doctor: null, activePatient: null, activeVisitId: null, queue: [] });
  }
}));
