import React from 'react';

interface NannyGoldTextProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl';
  showIcon?: boolean;
}

const sizeClasses = {
  sm: 'text-lg',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
  '2xl': 'text-4xl',
  '3xl': 'text-5xl',
  '4xl': 'text-6xl'
};

export const NannyGoldText: React.FC<NannyGoldTextProps> = ({ 
  className = '', 
  size = 'md',
  showIcon = false
}) => {
  return (
    <span className={`nanny-gold-text ${sizeClasses[size]} ${className}`}>
      {showIcon && <span className="mr-1">💎</span>}
      <span className="nanny-part">Nanny</span>
      <span className="gold-part">Gold</span>
    </span>
  );
};
