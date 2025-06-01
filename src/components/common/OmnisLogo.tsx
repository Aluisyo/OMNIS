import React from 'react';

interface OmnisLogoProps {
  className?: string;
}

const OmnisLogo: React.FC<OmnisLogoProps> = ({ className = 'h-6 w-6' }) => {
  return (
    <svg 
      width="100%" 
      height="100%" 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <circle cx="50" cy="50" r="45" fill="url(#gradient)" />
      <circle cx="50" cy="50" r="35" fill="#141834" fillOpacity="0.8" />
      <path 
        d="M50 26C37.2975 26 27 36.2975 27 49C27 61.7025 37.2975 72 50 72C62.7025 72 73 61.7025 73 49C73 36.2975 62.7025 26 50 26ZM50 65C41.1634 65 34 57.8366 34 49C34 40.1634 41.1634 33 50 33C58.8366 33 66 40.1634 66 49C66 57.8366 58.8366 65 50 65Z" 
        fill="white" 
      />
      <defs>
        <linearGradient id="gradient" x1="15" y1="15" x2="85" y2="85" gradientUnits="userSpaceOnUse">
          <stop stopColor="#3B82F6" />
          <stop offset="1" stopColor="#10B981" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default OmnisLogo;