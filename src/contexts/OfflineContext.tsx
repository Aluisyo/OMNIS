import { createContext, useContext, useState, useEffect, FC, ReactNode } from 'react';
import { processOutbox } from '../services/offlineService';

interface OfflineContextValue {
  isOnline: boolean;
}

const OfflineContext = createContext<OfflineContextValue>({ isOnline: true });

export const OfflineProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      processOutbox();
    };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return <OfflineContext.Provider value={{ isOnline }}>{children}</OfflineContext.Provider>;
};

export const useOffline = (): OfflineContextValue => useContext(OfflineContext);
