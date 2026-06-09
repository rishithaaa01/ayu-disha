import { useState, useEffect } from 'react';
import { api } from '@/lib/clinicianApi';

export function useDifferential(symptoms: string, patientId: string | null) {
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!symptoms || symptoms.length < 10 || !patientId) {
      setDiagnoses([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await api.getDifferential(symptoms, patientId);
        setDiagnoses(data.diagnoses || []);
      } catch {
        // silent
      } finally {
        setIsLoading(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [symptoms, patientId]);

  return { diagnoses, isLoading };
}
