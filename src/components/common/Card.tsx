import React from 'react';
import { cn } from '../../utils/cn';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends HTMLMotionProps<"div"> {
  className?: string;
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className, children, ...props }) => {
  return (
    <motion.div 
      initial={{ opacity: 0.9, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={cn(
        "bg-white/90 dark:bg-dark-100/40 backdrop-blur-sm rounded-xl", 
        "shadow-sm hover:shadow-md transition-shadow duration-200", 
        "border border-gray-200/50 dark:border-white/5", 
        className
      )} 
      {...props}
    >
      {children}
    </motion.div>
  );
};

interface CardHeaderProps {
  className?: string;
  children: React.ReactNode;
}

export const CardHeader: React.FC<CardHeaderProps> = ({ className, children }) => {
  return (
    <div className={cn(
      "px-5 py-4 border-b border-gray-200/30 dark:border-white/5",
      "rounded-t-xl bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-dark-100/30 dark:to-dark-200/30",
      className
    )}>
      {children}
    </div>
  );
};

interface CardTitleProps {
  className?: string;
  children: React.ReactNode;
}

export const CardTitle: React.FC<CardTitleProps> = ({ className, children }) => {
  return (
    <h3 className={cn(
      "font-semibold text-lg text-gray-800 dark:text-dark-500",
      "flex items-center space-x-2",
      className
    )}>
      {children}
    </h3>
  );
};

interface CardContentProps {
  className?: string;
  children: React.ReactNode;
}

export const CardContent: React.FC<CardContentProps> = ({ className, children }) => {
  return (
    <div className={cn("px-5 py-4 h-full", className)}>
      {children}
    </div>
  );
};

interface CardFooterProps {
  className?: string;
  children: React.ReactNode;
}

export const CardFooter: React.FC<CardFooterProps> = ({ className, children }) => {
  return (
    <div className={cn(
      "px-5 py-3 border-t border-gray-200/30 dark:border-white/5 rounded-b-xl",
      "bg-gradient-to-r from-gray-50/50 to-white/50 dark:from-dark-100/30 dark:to-dark-200/30",
      className
    )}>
      {children}
    </div>
  );
};