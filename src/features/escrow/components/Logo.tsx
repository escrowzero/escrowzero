import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

export const Logo: React.FC<LogoProps> = ({ className = '', size = 36 }) => {
  return (
    <img
      src="/zero-logo.png"
      alt="ZERO ESCROW"
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
    />
  );
};
