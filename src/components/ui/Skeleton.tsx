import React from 'react';
import { cn } from '../../utils/cn';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  rounded?: string;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ width = '100%', height = 16, rounded = 'md', className }) => {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700',
        `rounded-${rounded}`,
        className
      )}
      style={{ width, height }}
    />
  );
}; 