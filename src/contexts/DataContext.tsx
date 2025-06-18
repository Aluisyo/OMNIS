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
  refresh: (options?: { showLoading?: boolean }) => Promise<void>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

interface DataProviderProps {
  children: ReactNode;
}

export const DataProvider: FC<DataProviderProps> = ({ children }: DataProviderProps) => {
  const [records, setRecords] = useState<ArNSRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Ref to track previous records for notifications
  const prevRecordsRef = useRef<ArNSRecord[]>([]);
  const fetchingRef = useRef(false);

  const refresh = async ({ showLoading = false }: { showLoading?: boolean } = {}) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (showLoading) setLoading(true);
    setError(null);
    try {
      await initializeDB();
      const recs = await getAllArnsFromDB();
      // Notify user for new registrations based on previous records
      const oldRecs = prevRecordsRef.current;
      const newRecords = oldRecs.length > 0
        ? recs.filter(r => !oldRecs.some(p => p.name === r.name && p.startTimestamp === r.startTimestamp))
        : [];
      if (newRecords.length > 0 && Notification.permission === 'granted') {
        newRecords.forEach(r => showRegistrationNotification(r.name, r.owner || ''));
      }
      // Only update state if records have changed
      const unchanged = oldRecs.length > 0
        && recs.length === oldRecs.length
        && recs.every((r, i) => r.name === oldRecs[i].name && r.startTimestamp === oldRecs[i].startTimestamp);
      if (!unchanged) {
        setRecords(recs);
        prevRecordsRef.current = recs;
      }
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      if (showLoading) setLoading(false);
      fetchingRef.current = false;
    }
  };

  useEffect(() => {
    // Request notification permission
    if ('Notification' in window) {
      Notification.requestPermission();
    }
    // Initial load, periodic refresh every 5 minutes, and refresh on window focus
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    // initial load with loader
    refresh({ showLoading: true });
    const intervalId = setInterval(() => refresh(), 5 * 60 * 1000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(intervalId);
    };
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
