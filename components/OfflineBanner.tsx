import React from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export const OfflineBanner: React.FC = () => {
  const { isOnline, wasOffline } = useOnlineStatus();

  if (isOnline && !wasOffline) {
    return null;
  }

  if (isOnline && wasOffline) {
    return (
      <div className="sticky top-0 z-[100] w-full bg-emerald-500/90 text-white backdrop-blur-md px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-lg border-b border-emerald-400/30 transition-all duration-300 animate-in slide-in-from-top">
        <Wifi size={16} className="animate-pulse" />
        <span>Connected to network. All LMS services and real-time syncing restored.</span>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-[100] w-full bg-amber-500/90 text-slate-950 backdrop-blur-md px-4 py-2.5 text-xs font-semibold flex flex-wrap items-center justify-between gap-2 shadow-xl border-b border-amber-400/40 transition-all duration-300 animate-in slide-in-from-top">
      <div className="flex items-center gap-2.5">
        <div className="p-1 rounded-full bg-amber-950/20 text-slate-950">
          <WifiOff size={15} className="animate-pulse" />
        </div>
        <div>
          <span className="font-black uppercase tracking-wider text-[10px] bg-amber-950/20 px-1.5 py-0.5 rounded mr-1.5">Offline Mode</span>
          <span>You are currently working offline. Cached course notes & app shell remain available.</span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => window.location.reload()}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-950/20 hover:bg-slate-950/30 text-slate-950 font-bold text-[11px] transition-all"
        >
          <RefreshCw size={12} />
          <span>Retry Connection</span>
        </button>
      </div>
    </div>
  );
};

export default OfflineBanner;
