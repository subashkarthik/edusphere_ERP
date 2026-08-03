import React, { useState } from 'react';
import { GraduationCap } from 'lucide-react';

interface LogoProps {
  className?: string;
  size?: number;
  variant?: 'full' | 'minimal' | 'icon-only';
  theme?: 'light' | 'dark' | 'glass';
}

const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  size = 32, 
  variant = 'full',
  theme = 'glass'
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`flex items-center gap-4 ${className} select-none`}>
      <div 
        className="relative flex items-center justify-center shrink-0" 
        style={{ width: size, height: size }}
      >
        {/* Glow effect for high-end look */}
        <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-lg opacity-80 transition-opacity" />
        
        {!imgError ? (
          <img 
            src="/EduSphere_Logo.png" 
            alt="EduSphere" 
            loading="eager"
            decoding="async"
            onError={() => setImgError(true)}
            className={`
              w-full h-full object-contain transition-all duration-500 relative z-10
              ${theme === 'glass' ? 'brightness-125 contrast-125' : ''}
              drop-shadow-[0_4px_12px_rgba(99,102,241,0.4)]
            `}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl border border-indigo-400/40 flex items-center justify-center shadow-lg relative z-10">
            <GraduationCap size={size * 0.55} className="text-white drop-shadow-md" />
          </div>
        )}
      </div>

      {variant !== 'icon-only' && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-xl md:text-2xl font-black tracking-[0.25em] text-white leading-none uppercase translate-y-[2px]">
              Edu<span className="text-indigo-400">Sphere</span>
            </span>
          </div>
          {variant === 'full' && (
            <div className="flex items-center gap-2 mt-2">
              <div className="h-[1px] w-4 bg-white/10"></div>
              <span className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-500 whitespace-nowrap">
                Universal LMS
              </span>
              <div className="h-[1px] w-4 bg-white/10"></div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;