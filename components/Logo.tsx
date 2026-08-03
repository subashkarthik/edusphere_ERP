import React from 'react';

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
  return (
    <div className={`flex items-center gap-4 ${className} select-none`}>
      <div 
        className="relative flex items-center justify-center shrink-0" 
        style={{ width: size, height: size }}
      >
        {/* Glow effect for high-end look */}
        <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <img 
          src="/EduSphere_Logo.png" 
          alt="EduSphere" 
          loading="eager"
          decoding="async"
          className={`
            w-full h-full object-contain transition-all duration-700
            ${theme === 'glass' ? 'brightness-125 contrast-125 saturate-50' : ''}
            drop-shadow-[0_4px_12px_rgba(0,0,0,0.3)]
          `}
          style={{
            filter: theme === 'glass' ? 'drop-shadow(0 0 10px rgba(99, 102, 241, 0.3)) brightness(1.2)' : 'none'
          }}
        />
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