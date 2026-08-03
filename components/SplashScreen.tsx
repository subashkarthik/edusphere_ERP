
import React, { useEffect, useState } from 'react';
import Logo from './Logo';

const SplashScreen: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => (prev < 100 ? prev + 1 : 100));
    }, 20);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[80%] bg-indigo-600/10 rounded-full blur-[160px] animate-pulse" />
      <div className="absolute bottom-[-20%] left-[-20%] w-[80%] h-[80%] bg-violet-600/5 rounded-full blur-[160px] animate-pulse delay-1000" />
      
      <div className="relative flex flex-col items-center animate-in fade-in zoom-in duration-1000">
        <div className="relative mb-12 flex flex-col items-center">
          <div className="absolute inset-0 bg-indigo-500/5 rounded-full blur-[80px] animate-pulse" />
          <Logo size={180} variant="full" className="relative scale-110 md:scale-125" />
        </div>
      </div>

      {/* Progress Section */}
      <div className="absolute bottom-24 w-full max-w-[320px] px-8 flex flex-col items-center gap-6">
        <div className="w-full h-[3px] bg-slate-900 rounded-full overflow-hidden border border-white/5">
          <div 
            className="h-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-300 ease-out shadow-[0_0_15px_#6366f1]"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></div>
          <p className="text-slate-500 text-[10px] font-black tracking-[0.4em] uppercase">
            Initializing LMS Gateway
          </p>
        </div>
      </div>

      {/* Footer Branding */}
      <div className="absolute bottom-8 safe-bottom">
        <p className="text-slate-700 text-[10px] font-black tracking-[0.5em] uppercase opacity-40">
          Enterprise LMS Suite v4.0
        </p>
      </div>
    </div>
  );
};

export default SplashScreen;