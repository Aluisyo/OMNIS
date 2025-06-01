import React, { useState } from 'react';
import { cn } from '../../utils/cn';

interface MagicCardProps {
  className?: string;
  children: React.ReactNode;
  glowColor?: string;
  hoverEffect?: 'glow' | 'lift' | 'border' | 'none';
}

export const MagicCard: React.FC<MagicCardProps> = ({
  className,
  children,
  glowColor = 'rgba(59, 130, 246, 0.5)', // Default blue glow
  hoverEffect = 'glow',
}) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hoverEffect === 'none') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-white dark:bg-gray-900 transition-all duration-200',
        {
          'shadow-lg': hoverEffect === 'lift' && isHovering,
          'transform hover:-translate-y-1': hoverEffect === 'lift',
          'border border-transparent hover:border-blue-500': hoverEffect === 'border',
        },
        className
      )}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {hoverEffect === 'glow' && isHovering && (
        <div
          className="absolute pointer-events-none transition-opacity duration-300"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: '250px',
            height: '250px',
            transform: 'translate(-50%, -50%)',
            background: `radial-gradient(circle, ${glowColor} 0%, rgba(255,255,255,0) 70%)`,
            opacity: 0.15,
          }}
        />
      )}
      <div className="relative z-10">{children}</div>
    </div>
  );
};
