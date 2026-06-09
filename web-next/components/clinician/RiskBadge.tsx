const styles = {
  urgent: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'URGENT' },
  watch:  { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'WATCH' },
  low:    { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'LOW' },
};

export default function RiskBadge({ risk }: { risk: 'urgent' | 'watch' | 'low' }) {
  const s = styles[risk] || styles.low;
  return (
    <div className={`${s.bg} ${s.text} flex items-center gap-2 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider`}>
      <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </div>
  );
}
