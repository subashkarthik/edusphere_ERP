
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="flex flex-col items-center justify-center p-12 md:p-20 text-center glass glass-edge rounded-3xl animate-in fade-in duration-500 min-h-[400px]">
          <div className="w-20 h-20 bg-rose-500/15 rounded-full flex items-center justify-center mb-8">
            <AlertTriangle size={36} className="text-rose-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-100 uppercase tracking-tight mb-3">
            Module Error
          </h2>
          <p className="text-slate-400 max-w-md font-medium text-sm leading-relaxed mb-2">
            An unexpected error occurred while rendering this module.
          </p>
          {this.state.error && (
            <p className="text-[10px] text-slate-500 font-mono glass px-4 py-2 rounded-xl mb-8 max-w-lg truncate">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleRetry}
            className="flex items-center gap-3 px-8 py-4 glass-btn-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95"
          >
            <RefreshCw size={16} />
            Retry Module
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
