import { useState, useEffect } from 'react';
import api from '../services/clinicianApi';

export function useDifferential(symptoms: string, patientId: string | null) {
  const [diagnoses, setDiagnoses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!symptoms || symptoms.length < 10 || !patientId) {
      setDiagnoses([]);
      return;
    }

    // Debounce the API call by 1.5 seconds to avoid excessive Groq calls
    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const data = await api.getDifferential(symptoms, patientId);
        setDiagnoses(data.diagnoses || []);
      } catch (err) {
        console.error("Differential fetch error:", err);
      } finally {
        setIsLoading(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [symptoms, patientId]);

  return { diagnoses, isLoading };
}
