import { create } from 'zustand';

interface ClinicianState {
  doctor: any | null;
  activePatient: any | null;
  activeVisitId: string | null;
  queue: any[];
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
    if (typeof window !== 'undefined') localStorage.removeItem('token');
    set({ doctor: null, activePatient: null, activeVisitId: null, queue: [] });
  },
}));
