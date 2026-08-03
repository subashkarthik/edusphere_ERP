
import React from 'react';

export const SkeletonPulse: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-white/[0.06] rounded-2xl ${className}`} />
);

export const MetricCardSkeleton: React.FC = () => (
  <div className="glass p-6 rounded-2xl flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <SkeletonPulse className="w-12 h-12 rounded-xl" />
      <SkeletonPulse className="w-14 h-5" />
    </div>
    <div>
      <SkeletonPulse className="w-20 h-3 mb-2" />
      <SkeletonPulse className="w-28 h-7" />
    </div>
  </div>
);

export const TableRowSkeleton: React.FC<{ cols?: number }> = ({ cols = 3 }) => (
  <tr>
    {Array.from({ length: cols }).map((_, i) => (
      <td key={i} className="px-8 py-6">
        <SkeletonPulse className="w-full h-4" />
      </td>
    ))}
  </tr>
);

export const CardSkeleton: React.FC = () => (
  <div className="glass p-8 rounded-[2rem]">
    <div className="flex justify-between items-start mb-10">
      <SkeletonPulse className="w-14 h-14 rounded-2xl" />
      <SkeletonPulse className="w-16 h-5" />
    </div>
    <SkeletonPulse className="w-3/4 h-5 mb-2" />
    <SkeletonPulse className="w-1/2 h-3 mb-10" />
    <SkeletonPulse className="w-full h-3 rounded-full" />
  </div>
);

export const ActivitySkeleton: React.FC = () => (
  <div className="flex gap-6">
    <SkeletonPulse className="w-12 h-12 rounded-2xl shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="flex justify-between">
        <SkeletonPulse className="w-32 h-4" />
        <SkeletonPulse className="w-16 h-3" />
      </div>
      <SkeletonPulse className="w-full h-3" />
    </div>
  </div>
);

export const FullPageLoader: React.FC = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-4 border-white/[0.08] border-t-indigo-400 rounded-full animate-spin" />
      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Loading data...</p>
    </div>
  </div>
);
