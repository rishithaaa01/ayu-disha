import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Mic, Square, RotateCcw, Send, AlertTriangle, CheckCircle, Activity, X } from 'lucide-react';
import { useVoiceRecorder } from '../../../hooks/useVoiceRecorder';
import api from '../../../services/api';
import toast from 'react-hot-toast';

export default function VoiceSymptomLogger({ onClose, onLogSuccess }) {
  const { isRecording, duration, audioBlob, startRecording, stopRecording, clearRecording } = useVoiceRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [preferredHospital, setPreferredHospital] = useState("");

  // Fetch all registered hospitals from the database
  const { data: hospitals = [] } = useQuery({
    queryKey: ['hospitals'],
    queryFn: () => api.get('/auth/hospitals').then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // Set default selection once hospitals load
  useEffect(() => {
    if (hospitals.length > 0 && !preferredHospital) {
      setPreferredHospital(hospitals[0].name);
    }
  }, [hospitals]);

  // Load offline data if exists and try to sync
  useEffect(() => {
    const checkAndSyncOfflineData = async () => {
      const offlineAudio = localStorage.getItem(`offline_symptom_audio_temp`);
      if (!offlineAudio) return;

      // Check if user is online
      if (!navigator.onLine) {
        toast('You have an offline voice note waiting to sync when online.', { icon: '🔄' });
        return;
      }

      // Try to sync the offline data
      try {
        toast.loading('Syncing offline voice note...');
        const base64Data = offlineAudio;
        
        // Convert base64 to blob
        const arr = base64Data.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        const n = bstr.length;
        const u8arr = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          u8arr[i] = bstr.charCodeAt(i);
        }
        const audioBlob = new Blob([u8arr], { type: mime });

        // Re-submit to server
        const formData = new FormData();
        formData.append('file', audioBlob, 'symptom.wav');
        await api.post('/voice/transcribe', formData);
        
        localStorage.removeItem(`offline_symptom_audio_temp`);
        toast.success('Offline voice note synced successfully!');
      } catch (err) {
        console.error('Failed to sync offline audio:', err);
        // Don't show error toast - just keep it offline for later
      }
    };

    checkAndSyncOfflineData();

    // Also listen for online event
    window.addEventListener('online', checkAndSyncOfflineData);
    return () => window.removeEventListener('online', checkAndSyncOfflineData);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProcess = async () => {
    if (!audioBlob) return;
    setIsProcessing(true);
    
    try {
      // 1. Transcribe voice note
      const formData = new FormData();
      formData.append('file', audioBlob, 'symptom.wav');
      const voiceRes = await api.post('/voice/transcribe', formData);
      const transcript = voiceRes.data.transcript;
      
      // 2. Classify Risk and Auto-Refer if severe
      const symptomRes = await api.post('/patients/me/symptoms', {
        transcript,
        preferred_hospital_id: preferredHospital
      });
      
      setResult(symptomRes.data);
      localStorage.removeItem(`offline_symptom_audio_temp`); // clear any offline cache
      if(onLogSuccess) onLogSuccess(symptomRes.data);
    } catch (err) {
      console.warn("Offline! Storing symptom voice note locally.", err);
      // Fallback: Save as Base64 in local storage
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = () => {
        localStorage.setItem(`offline_symptom_audio_temp`, reader.result);
        setResult({
          risk_level: 'WATCH',
          reasoning: 'Offline mode active. Symptom voice note saved locally. Will sync when online.',
          refer_to_doctor: false,
          offline_saved: true
        });
        toast.success("Saved offline. Will process when connection returns.");
      };
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[28px] w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-[#FDFEFE]">
          <div className="flex items-center gap-2">
            <Activity className="text-[#1B6CA8]" size={24} />
            <h3 className="text-xl font-bold text-gray-800">Log Symptoms</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {!result ? (
            <div className="flex flex-col items-center py-6">
              <div className="mb-6 w-full">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Clinic</label>
                <select 
                  className="w-full bg-gray-50 border border-gray-200 text-gray-800 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#1B6CA8]"
                  value={preferredHospital}
                  onChange={(e) => setPreferredHospital(e.target.value)}
                >
                  {hospitals.length === 0 ? (
                    <option value="">Loading hospitals...</option>
                  ) : (
                    hospitals.map(h => (
                      <option key={h.id} value={h.name}>{h.name}</option>
                    ))
                  )}
                </select>
              </div>

              <div className="relative mb-6">
                {isRecording && (
                  <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-25" />
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`
                    w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl
                    ${isRecording ? 'bg-red-500 hover:bg-red-600 scale-110' : 'bg-[#1B6CA8] hover:bg-[#1557A0]'}
                  `}
                >
                  {isRecording ? <Square size={28} fill="white" className="text-white" /> : <Mic size={32} className="text-white" />}
                </button>
              </div>

              <div className="text-center">
                <p className="text-2xl font-mono font-bold text-gray-800 mb-1">{formatTime(duration)}</p>
                <p className="text-gray-500 text-sm font-medium">
                  {isRecording ? 'Recording... tap to stop' : 'Tap to describe your symptoms'}
                </p>
              </div>

              {audioBlob && !isRecording && (
                <div className="flex gap-3 mt-8 w-full">
                  <button
                    onClick={clearRecording}
                    className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                  >
                    <RotateCcw size={18} />
                    <span>Retry</span>
                  </button>
                  <button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="flex-1 py-3 bg-[#2C8C68] text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-900/10 hover:bg-[#236A4F] transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <Send size={18} />
                    )}
                    <span>Analyze</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="py-4">
              <div className="flex flex-col items-center justify-center text-center mb-6">
                {result.risk_level === 'URGENT' || result.risk_level === 'SEVERE' ? (
                  <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4">
                    <AlertTriangle size={32} />
                  </div>
                ) : (
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle size={32} />
                  </div>
                )}
                <h4 className="text-xl font-bold text-gray-800">
                  {result.risk_level === 'URGENT' || result.risk_level === 'SEVERE' ? 'High Risk Detected' : 'Symptoms Logged'}
                </h4>
                <p className="text-gray-500 text-sm mt-2">{result.reasoning}</p>
              </div>

              {result.refer_to_doctor && !result.offline_saved && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
                  <p className="text-blue-800 font-semibold text-sm mb-1">Automatic Referral Created</p>
                  <p className="text-blue-600 text-xs">We have forwarded your symptoms to {preferredHospital}. A doctor will review your case shortly.</p>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
