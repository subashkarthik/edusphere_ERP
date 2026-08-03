
import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

const ErrorState: React.FC<ErrorStateProps> = ({ 
  message = 'Failed to load data. Please try again.',
  onRetry 
}) => (
  <div className="flex flex-col items-center justify-center p-10 md:p-20 text-center glass glass-edge rounded-3xl">
    <div className="w-16 h-16 md:w-20 md:h-20 bg-rose-500/15 rounded-full flex items-center justify-center mb-6">
      <AlertTriangle className="text-rose-400" size={28} />
    </div>
    <h2 className="text-xl md:text-2xl font-black text-slate-100 uppercase tracking-tight">Connection Error</h2>
    <p className="text-slate-400 mt-2 max-w-md font-medium text-sm md:text-base">{message}</p>
    {onRetry && (
      <button 
        onClick={onRetry}
        className="mt-6 px-8 py-3 glass-btn-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 active:scale-95 transition-all"
      >
        <RefreshCw size={16} /> Retry
      </button>
    )}
  </div>
);

export default ErrorState;
