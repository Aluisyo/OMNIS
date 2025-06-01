import React, { useEffect, useState } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 5000,
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Allow time for exit animation
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    warning: <AlertTriangle className="h-5 w-5" />,
    info: <Info className="h-5 w-5" />,
  };

  const colors = {
    success: 'bg-green-100 text-green-800 dark:bg-green-800/20 dark:text-green-300',
    error: 'bg-red-100 text-red-800 dark:bg-red-800/20 dark:text-red-300',
    warning: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800/20 dark:text-yellow-300',
    info: 'bg-blue-100 text-blue-800 dark:bg-blue-800/20 dark:text-blue-300',
  };

  return (
    <div
      className={cn(
        'fixed bottom-4 right-4 flex items-center p-4 rounded-lg shadow-lg transition-all duration-300',
        colors[type],
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      <div className="mr-3">{icons[type]}</div>
      <div className="mr-3">{message}</div>
      <button
        onClick={() => {
          setIsVisible(false);
          setTimeout(onClose, 300);
        }}
        className="ml-auto p-1 rounded-full hover:bg-black/10"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}; 