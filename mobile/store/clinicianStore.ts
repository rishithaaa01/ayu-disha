import { create } from 'zustand';

interface ClinicianState {
  activePatient: any | null;
  activeVisitId: string | null;
  queue: any[];
  isRefreshing: boolean;
  
  // Actions
  setActivePatient: (patient: any | null) => void;
  setActiveVisitId: (id: string | null) => void;
  setQueue: (queue: any[]) => void;
  setRefreshing: (status: boolean) => void;
  reset: () => void;
}

export const useClinicianStore = create<ClinicianState>((set) => ({
  activePatient: null,
  activeVisitId: null,
  queue: [],
  isRefreshing: false,

  setActivePatient: (activePatient) => set({ activePatient }),
  setActiveVisitId: (activeVisitId) => set({ activeVisitId }),
  setQueue: (queue) => set({ queue }),
  setRefreshing: (isRefreshing) => set({ isRefreshing }),
  
  reset: () => set({ activePatient: null, activeVisitId: null, queue: [], isRefreshing: false })
}));
