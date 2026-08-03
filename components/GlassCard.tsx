import React, { useRef, useCallback } from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
  onClick?: () => void;
}

export const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  hover = true,
  glow = true,
  onClick,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!ref.current || !glow) return;
    const rect = ref.current.getBoundingClientRect();
    ref.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`);
    ref.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`);
  }, [glow]);

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onClick={onClick}
      className={`glass glass-edge ${hover ? 'glass-hover' : ''} ${glow ? 'glass-glow' : ''} rounded-3xl overflow-hidden ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default GlassCard;
