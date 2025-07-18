import React from 'react';
import Image from 'next/image';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Logo({ size = 'md', className = '' }: LogoProps) {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14'
  };

  const sizePixels = {
    sm: 32,
    md: 40,
    lg: 56
  };

  return (
    <div 
      className={`${sizeClasses[size]} ${className} bg-blue-900 rounded-lg flex items-center justify-center`}
      style={{ minWidth: sizePixels[size], minHeight: sizePixels[size] }}
    >
      <Image
        src="/pen.png"
        alt="Pipedriven"
        width={sizePixels[size] - 8}
        height={sizePixels[size] - 8}
        className="object-contain"
        priority
        onError={(e) => {
          console.error('Logo failed to load:', e);
          // Fallback to text if image fails
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) {
            parent.innerHTML = '<span class="text-white font-bold text-xs">PD</span>';
          }
        }}
      />
    </div>
  );
} 