import React, { useState } from 'react';
import { Mic, X, Square, RotateCcw, Check, Sparkles, AlertCircle } from 'lucide-react';
import { useVoiceRecorder } from '../../../hooks/useVoiceRecorder';
import api from '../../../services/clinicianApi';

interface VoiceNoteRecorderProps {
  visitId: string;
  onExtractionComplete: (data: any) => void;
  onClose: () => void;
}

export default function VoiceNoteRecorder({ visitId, onExtractionComplete, onClose }: VoiceNoteRecorderProps) {
  const { isRecording, duration, audioBlob, startRecording, stopRecording, clearRecording } = useVoiceRecorder();
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionData, setTranscriptionData] = useState<any>(null);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProcess = async () => {
    if (!audioBlob) return;
    setIsProcessing(true);
    try {
      const data = await api.processVoiceNote(visitId, audioBlob);
      setTranscriptionData(data);
    } catch (err) {
      alert("Failed to process voice note. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    onExtractionComplete(transcriptionData);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <div className="bg-white rounded-[28px] w-full max-w-2xl overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-8 py-6 border-b border-[#E2DDD8] flex justify-between items-center bg-[#FDFEFE]">
          <div>
            <h3 className="text-xl font-bold font-mukta text-[#333]">Clinical Voice Dictation</h3>
            <p className="text-sm text-[#666]">Powered by Ayu Disha AI</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#F7F3EE] rounded-full transition-colors">
            <X size={24} className="text-[#888]" />
          </button>
        </div>

        <div className="p-8">
          {!transcriptionData ? (
            <div className="flex flex-col items-center py-10">
              <div className="relative mb-8">
                {isRecording && (
                  <div className="absolute inset-0 bg-red-100 rounded-full animate-ping opacity-25" />
                )}
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`
                    w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl
                    ${isRecording ? 'bg-red-500 hover:bg-red-600 scale-110' : 'bg-[#D35400] hover:bg-[#A04000]'}
                  `}
                >
                  {isRecording ? <Square size={32} fill="white" className="text-white" /> : <Mic size={36} className="text-white" />}
                </button>
              </div>

              <div className="text-center">
                <p className="text-2xl font-mono font-bold text-[#333] mb-2">{formatTime(duration)}</p>
                <p className="text-[#666] font-medium">
                  {isRecording ? 'Recording... click to stop' : 'Click to start dictating'}
                </p>
                <p className="text-xs text-[#888] mt-4 max-w-xs mx-auto">
                  Speak naturally about symptoms, your findings, and the treatment plan.
                </p>
              </div>

              {audioBlob && !isRecording && (
                <div className="flex gap-4 mt-12 w-full">
                  <button
                    onClick={clearRecording}
                    className="flex-1 py-4 border-2 border-[#E2DDD8] text-[#666] font-bold rounded-2xl flex items-center justify-center gap-2 hover:bg-[#F7F3EE] transition-colors"
                  >
                    <RotateCcw size={20} />
                    <span>Re-record</span>
                  </button>
                  <button
                    onClick={handleProcess}
                    disabled={isProcessing}
                    className="flex-1 py-4 bg-[#1B6CA8] text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/10 hover:bg-[#154360] transition-colors disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                    ) : (
                      <Sparkles size={20} />
                    )}
                    <span>{isProcessing ? 'Analyzing...' : 'Analyze with AI'}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#888] uppercase tracking-wider">Raw Transcription</h4>
                  <div className="bg-[#F7F3EE] rounded-2xl p-4 h-[300px] overflow-y-auto text-sm text-[#333] leading-relaxed italic border border-[#E2DDD8]">
                    {transcriptionData.raw_transcription}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-xs font-bold text-[#888] uppercase tracking-wider">AI Extracted Data</h4>
                  <div className="space-y-3 overflow-y-auto h-[300px] pr-2 custom-scrollbar">
                    {Object.entries({
                      'Chief Complaint': transcriptionData.chief_complaint,
                      'Examination': transcriptionData.examination_findings,
                      'Diagnoses': transcriptionData.diagnosis?.join(', '),
                      'Plan': transcriptionData.plan,
                      'Follow-up': transcriptionData.follow_up
                    }).map(([label, value]) => (
                      <div key={label} className="bg-white border border-[#E2DDD8] rounded-xl p-3">
                         <p className="text-[10px] font-bold text-[#1B6CA8] uppercase mb-1">{label}</p>
                         <p className="text-xs text-[#333] font-medium">{value || 'Not mentioned'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-[#E2DDD8]">
                <button
                  onClick={() => setTranscriptionData(null)}
                  className="px-6 py-4 border-2 border-[#E2DDD8] text-[#666] font-bold rounded-2xl flex-1 hover:bg-[#F7F3EE] transition-colors"
                >
                  Discard & Retry
                </button>
                <button
                  onClick={handleApply}
                  className="px-6 py-4 bg-green-600 text-white font-bold rounded-2xl flex-1 flex items-center justify-center gap-2 shadow-lg shadow-green-900/10 hover:bg-green-700 transition-colors"
                >
                  <Check size={20} />
                  <span>Use This Data</span>
                </button>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-[#F7F3EE] p-4 flex items-center justify-center gap-2 text-[#888]">
          <AlertCircle size={14} />
          <span className="text-[10px] italic">Always review AI-extracted information before saving.</span>
        </div>
      </div>
    </div>
  );
}
