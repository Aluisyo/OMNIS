// src/contexts/DataContext.tsx
import { createContext, useContext, useState, useEffect, useRef, FC, ReactNode } from 'react';
import type { ArNSRecord } from '../types';
import { getAllArnsFromDB } from '../services/arnsService';
import { initializeDB } from '../services/initService';
import { showRegistrationNotification } from '../services/notificationService';

interface DataContextValue {
  records: ArNSRecord[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: FC<DataProviderProps> = ({ children }: DataProviderProps) => {
  const [records, setRecords] = useState<ArNSRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Ref to track previous record count for notifications
  const prevCountRef = useRef<number>(0);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      await initializeDB();
      const recs = await getAllArnsFromDB();
      // Notify user if new registrations arrived
      if (prevCountRef.current > 0 && recs.length > prevCountRef.current) {
        if (Notification.permission === 'granted') {
          const newRecords = recs.filter(r => !records.some(p => p.name === r.name && p.startTimestamp === r.startTimestamp));
          newRecords.forEach(r => showRegistrationNotification(r.name, r.owner || ''));
        }
      }
      setRecords(recs);
      prevCountRef.current = recs.length;
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window) {
      Notification.requestPermission();
    }
    // Initial load and then periodic refresh every 5 minutes
    refresh();
    const intervalId = setInterval(refresh, 5 * 60 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <DataContext.Provider value={{ records, loading, error, refresh }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextValue => {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error('useData must be used within DataProvider');
  }
  return ctx;
};
