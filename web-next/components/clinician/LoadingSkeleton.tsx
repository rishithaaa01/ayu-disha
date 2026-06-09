export default function LoadingSkeleton({ type, count = 1 }: { type: 'card' | 'text' | 'profile'; count?: number }) {
  if (type === 'profile') return (
    <div className="animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-7 bg-gray-200 rounded w-48" />
          <div className="h-4 bg-gray-100 rounded w-64" />
        </div>
        <div className="h-10 bg-gray-200 rounded-xl w-36" />
      </div>
    </div>
  );

  if (type === 'card') return (
    <div className="space-y-4">
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-[#E2DDD8] p-4 h-32 animate-pulse">
          <div className="flex justify-between mb-4">
            <div className="flex gap-2"><div className="w-6 h-6 bg-gray-200 rounded-full" /><div className="w-24 h-5 bg-gray-200 rounded" /></div>
            <div className="w-16 h-5 bg-gray-200 rounded-full" />
          </div>
          <div className="w-3/4 h-4 bg-gray-100 rounded mb-4" />
          <div className="flex justify-between"><div className="w-20 h-4 bg-gray-100 rounded" /><div className="w-20 h-4 bg-gray-100 rounded" /></div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="animate-pulse space-y-2">
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-5/6" />
      <div className="h-4 bg-gray-200 rounded w-4/6" />
    </div>
  );
}
