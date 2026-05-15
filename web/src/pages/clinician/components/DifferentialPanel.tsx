import React from 'react';
import { Sparkles, Activity, FileSearch, ArrowRight } from 'lucide-react';

interface DifferentialPanelProps {
  diagnoses: any[];
  isLoading: boolean;
  symptoms: string;
}

export default function DifferentialPanel({ diagnoses, isLoading, symptoms }: DifferentialPanelProps) {
  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] p-8">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-[#1B6CA8] mb-2">
          <Sparkles size={18} fill="#1B6CA8" />
          <h3 className="font-bold text-lg uppercase tracking-wider font-mukta">AI Differential Diagnosis</h3>
        </div>
        <p className="text-sm text-[#888]">
          Suggestions based on symptoms: <span className="text-[#333] font-medium italic">{symptoms || 'None entered'}</span>
        </p>
      </div>

      <div className="flex-1 space-y-4">
        {isLoading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="bg-white border border-[#E2DDD8] rounded-2xl p-5 animate-pulse">
               <div className="h-5 bg-gray-100 rounded w-1/2 mb-3" />
               <div className="h-4 bg-gray-50 rounded w-full mb-2" />
               <div className="h-4 bg-gray-50 rounded w-2/3" />
            </div>
          ))
        ) : diagnoses.length > 0 ? (
          diagnoses.map((diag, idx) => (
            <div key={idx} className="bg-white border border-[#E2DDD8] rounded-2xl p-5 shadow-sm hover:border-[#1B6CA8] transition-all group">
              <div className="flex justify-between items-start mb-3">
                 <h4 className="font-bold text-[#333] text-lg">{diag.name}</h4>
                 <span className={`
                   px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                   ${diag.confidence === 'High' ? 'bg-green-100 text-green-700' : diag.confidence === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'}
                 `}>
                   {diag.confidence} Confidence
                 </span>
              </div>
              
              <p className="text-sm text-[#666] leading-relaxed mb-4">
                {diag.reasoning}
              </p>

              <div className="space-y-3">
                 <p className="text-[10px] font-bold text-[#888] uppercase tracking-wide">Suggested Investigations</p>
                 <div className="flex flex-wrap gap-2">
                    {diag.suggested_tests?.map((test: string) => (
                      <span key={test} className="bg-[#F7F3EE] text-[#666] px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-[#E2DDD8]/50">
                        <FileSearch size={12} className="text-[#1B6CA8]" />
                        {test}
                      </span>
                    ))}
                 </div>
              </div>

              <button className="w-full mt-6 py-3 bg-transparent border-2 border-[#F7F3EE] text-[#1B6CA8] rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#EBF5FB] hover:border-[#AED6F1] transition-all">
                <span>View Treatment Guidelines</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ))
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center border-2 border-dashed border-[#E2DDD8] rounded-[32px] bg-white">
            <div className="w-16 h-16 bg-[#F7F3EE] rounded-full flex items-center justify-center mb-4 text-[#888]">
              <Activity size={32} />
            </div>
            <p className="text-[#666] font-medium">Type symptoms in the left panel to see AI diagnostic suggestions.</p>
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-amber-50 rounded-xl border border-amber-100 flex gap-3">
        <AlertTriangle size={18} className="text-amber-600 shrink-0" />
        <p className="text-[10px] text-amber-700 italic leading-normal">
          AI suggests possibilities based on data patterns. Always exercise your clinical judgment for final diagnosis and treatment.
        </p>
      </div>
    </div>
  );
}

// Just to avoid TypeScript error on AlertTriangle
import { AlertTriangle as AlertTriangleIcon } from 'lucide-react';
const AlertTriangle = AlertTriangleIcon;
