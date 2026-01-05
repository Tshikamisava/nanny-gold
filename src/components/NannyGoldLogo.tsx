import React from 'react';

interface NannyGoldLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const NannyGoldLogo: React.FC<NannyGoldLogoProps> = ({ 
  className = '', 
  size = 'md',
  showText = true 
}) => {
  const sizeClasses = {
    sm: 'w-32 h-32',
    md: 'w-40 h-40',
    lg: 'w-56 h-56'
  };

  const textSizeClasses = {
    sm: 'text-2xl',
    md: 'text-3xl sm:text-4xl',
    lg: 'text-4xl sm:text-5xl'
  };

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Logo Graphic */}
      <svg
        className={sizeClasses[size]}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* House Structure - Light Orange */}
        <path
          d="M100 40 L60 70 L60 140 L140 140 L140 70 Z"
          fill="none"
          stroke="#FFB84D"
          strokeWidth="3"
        />
        
        {/* Roof - Light Orange Triangle */}
        <path
          d="M100 40 L60 70 L140 70 Z"
          fill="none"
          stroke="#FFB84D"
          strokeWidth="3"
        />
        
        {/* Three Orange Stars */}
        <g fill="#FF8C00">
          {/* Left Star */}
          <path
            d="M70 50 L72 56 L78 56 L73 60 L75 66 L70 62 L65 66 L67 60 L62 56 L68 56 Z"
          />
          {/* Center Star (larger) */}
          <path
            d="M100 45 L102 52 L109 52 L103 58 L105 65 L100 59 L95 65 L97 58 L91 52 L98 52 Z"
          />
          {/* Right Star */}
          <path
            d="M130 50 L132 56 L138 56 L133 60 L135 66 L130 62 L125 66 L127 60 L122 56 L128 56 Z"
          />
        </g>
        
        {/* Pink Figure (Left) - Simplified */}
        <circle cx="80" cy="100" r="10" fill="#FFB6C1" />
        <rect x="75" y="110" width="10" height="18" rx="2" fill="#FFB6C1" />
        <path d="M75 118 L70 113" stroke="#FFB6C1" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M85 118 L90 113" stroke="#FFB6C1" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M80 110 L80 103" stroke="#FFB6C1" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Light Blue Figure (Right) - Simplified */}
        <circle cx="120" cy="100" r="10" fill="#ADD8E6" />
        <rect x="115" y="110" width="10" height="18" rx="2" fill="#ADD8E6" />
        <path d="M115 118 L110 113" stroke="#ADD8E6" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M125 118 L130 113" stroke="#ADD8E6" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M120 110 L120 103" stroke="#ADD8E6" strokeWidth="2.5" strokeLinecap="round" />
        
        {/* Green Grass */}
        <path
          d="M60 140 Q70 135 80 140 T100 140 T120 140 T140 140"
          stroke="#90EE90"
          strokeWidth="4"
          fill="none"
        />
      </svg>

      {/* Text Logo - Script Font */}
      {showText && (
        <div className={`${textSizeClasses[size]} font-script mt-2`}>
          <span className="text-primary">Nanny</span>
          <span className="gold-shimmer">Gold</span>
        </div>
      )}
    </div>
  );
};

