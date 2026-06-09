import { Sparkles, AlertCircle, RefreshCcw } from 'lucide-react';

export default function AISummaryCard({ summary, timestamp, isLoading, onRefresh }: {
  summary: string | null; timestamp: string | null; isLoading: boolean; onRefresh: () => void;
}) {
  return (
    <div className="bg-[#EBF5FB] border border-[#AED6F1] rounded-2xl p-6 mx-8 mb-8">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2 text-[#1B6CA8]">
          <Sparkles size={18} fill="#1B6CA8" />
          <h4 className="font-bold text-sm uppercase tracking-wider">AI Pre-Consultation Summary</h4>
        </div>
        <div className="flex items-center gap-4">
          {timestamp && <span className="text-[10px] text-[#5DADE2] font-medium uppercase">Generated {timestamp}</span>}
          <button onClick={onRefresh} disabled={isLoading} className="p-1.5 hover:bg-white/50 rounded-lg transition-colors text-[#1B6CA8]">
            <RefreshCcw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>
      {isLoading ? (
        <div className="space-y-2 py-2">
          {[100, 90, 95, 70].map((w, i) => <div key={i} className={`h-4 bg-white/50 rounded animate-pulse`} style={{ width: `${w}%` }} />)}
        </div>
      ) : summary ? (
        <p className="text-[#2C2C2C] text-sm leading-relaxed font-medium">{summary}</p>
      ) : (
        <p className="text-[#666] text-sm italic py-2">Could not generate summary. Please try again.</p>
      )}
      <div className="mt-4 flex items-center gap-2 text-[#5DADE2]">
        <AlertCircle size={12} />
        <span className="text-[10px] italic font-medium">Clinical AI suggestion only. Always verify findings clinically before acting.</span>
      </div>
    </div>
  );
}
