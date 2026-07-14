import React, { createContext, useContext, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

interface RealTimeUpdateContextType {
  updatePatientCounts: () => void;
  updateReferralCounts: () => void;
  updateAllCounts: () => void;
  notifyConsultationStarted: () => void;
  notifyReferralAccepted: () => void;
}

const RealTimeUpdateContext = createContext<RealTimeUpdateContextType | undefined>(undefined);

export function RealTimeUpdateProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();

  const updatePatientCounts = useCallback(() => {
    console.log('[REALTIME] Updating patient counts...');
    queryClient.invalidateQueries({ queryKey: ['doctorPatients'] });
    toast.success('Patient data refreshed', { duration: 2000 });
  }, [queryClient]);

  const updateReferralCounts = useCallback(() => {
    console.log('[REALTIME] Updating referral counts...');
    queryClient.invalidateQueries({ queryKey: ['doctorReferrals'] });
    toast.success('Referral data refreshed', { duration: 2000 });
  }, [queryClient]);

  const updateAllCounts = useCallback(() => {
    console.log('[REALTIME] Updating all counts...');
    queryClient.invalidateQueries({ queryKey: ['doctorPatients'] });
    queryClient.invalidateQueries({ queryKey: ['doctorReferrals'] });
    queryClient.invalidateQueries({ queryKey: ['queue'] });
    toast.success('Dashboard data refreshed', { duration: 2000 });
  }, [queryClient]);

  const notifyConsultationStarted = useCallback(() => {
    console.log('[REALTIME] Consultation started - updating counts');
    updateAllCounts();
    toast.success('Consultation started! Updating patient counts...', { duration: 3000 });
  }, [updateAllCounts]);

  const notifyReferralAccepted = useCallback(() => {
    console.log('[REALTIME] Referral accepted - updating counts');
    updateAllCounts();
    toast.success('Referral accepted! Updating counts...', { duration: 3000 });
  }, [updateAllCounts]);

  return (
    <RealTimeUpdateContext.Provider
      value={{
        updatePatientCounts,
        updateReferralCounts,
        updateAllCounts,
        notifyConsultationStarted,
        notifyReferralAccepted,
      }}
    >
      {children}
    </RealTimeUpdateContext.Provider>
  );
}

export function useRealTimeUpdates() {
  const context = useContext(RealTimeUpdateContext);
  if (context === undefined) {
    throw new Error('useRealTimeUpdates must be used within a RealTimeUpdateProvider');
  }
  return context;
}