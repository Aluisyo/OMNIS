import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import { getArNSRecords } from '../services/arnsService';
import { 
  requestNotificationPermission, 
  notificationsSupported, 
  showRegistrationNotification 
} from '../services/notificationService';
import { ARIO } from '@ar.io/sdk';
import { ArNSNameResolutionData } from '../types/ArNSNameResolutionData';

// Initialize ARIO client for ArNS functionality
const ario = ARIO.mainnet();

interface NotificationContextType {
  notificationsEnabled: boolean;
  autoRefreshEnabled: boolean;
  isLoading: boolean;
  lastRefreshed: Date | null;
  toggleNotifications: () => Promise<void>;
  toggleAutoRefresh: () => void;
  manualRefresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Notification and refresh states
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(false);
  // Track if permission has been requested
  const [permissionChecked, setPermissionChecked] = useState<boolean>(false);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('autoRefreshEnabled');
    return stored === null ? true : stored === 'true';
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [latestRegistrationTimestamp, setLatestRegistrationTimestamp] = useState<number>(0);

  // Toggle notifications
  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      setNotificationsEnabled(false);
      toast.success('Notifications disabled');
      return;
    }
    if (notificationsSupported()) {
      if (Notification.permission === 'granted') {
        setNotificationsEnabled(true);
        toast.success('Notifications enabled');
        return;
      }
      const permission = await requestNotificationPermission();
      if (permission) {
        setNotificationsEnabled(true);
        toast.success('Notifications enabled');
      } else {
        setNotificationsEnabled(false);
        toast.error('Notification permission denied. Please allow notifications in your browser settings.');
      }
    } else {
      toast.error('Notifications not supported in this browser');
    }
  };

  // On mount: auto-enable if permission is already granted
  useEffect(() => {
    if (notificationsSupported() && Notification.permission === 'granted') {
      setNotificationsEnabled(true);
    }
    setPermissionChecked(true);
  }, []);

  // Toggle auto-refresh
  const toggleAutoRefresh = () => {
    setAutoRefreshEnabled(prev => {
      localStorage.setItem('autoRefreshEnabled', String(!prev));
      toast.success(`Auto-refresh ${!prev ? 'enabled' : 'disabled'}`);
      return !prev;
    });
  };


  // Fetch records and update state
  const fetchLatestRegistrations = useCallback(async (isManual: boolean = false) => {
    if (isLoading) return;
    
    try {
      setIsLoading(true);
      
      const result = await getArNSRecords({
        cursor: undefined, // Always fetch the latest
        limit: 30,
        sortBy: 'startTimestamp',
        sortOrder: 'desc',
      });
      
      // Map SDK records to ArNSRecord, fetching full record via ARIO
      const mappedItems = await Promise.all(result.items.map(async (item: any) => {
        let record: ArNSNameResolutionData | undefined;
        try {
          const resolved = await ario.resolveArNSName({ name: item.name });
          record = resolved as ArNSNameResolutionData;
        } catch (e) {
          console.warn(`Failed to resolve ArNS name for ${item.name}:`, e);
          record = undefined;
        }
        
        return {
          id: item.name || '',
          name: item.name || '',
          processId: record?.processId ?? item.processId ?? '',
          purchasePrice: record?.purchasePrice ?? item.purchasePrice,
          startTimestamp: record?.startTimestamp ?? item.startTimestamp,
          type: record?.type ?? item.type,
          undernames: record?.undernames ?? item.undernames,
          expiresAt: (record?.type === 'lease' ? record?.endTimestamp : undefined) ?? (item.type === 'lease' ? item.endTimestamp : null),
          price: (record?.purchasePrice !== undefined ? record.purchasePrice?.toString() : undefined) ?? (item.purchasePrice !== undefined ? item.purchasePrice?.toString() : ''),
          contractTxId: record?.processId ?? item.processId,
          title: record?.title ?? item.title,
          description: record?.description ?? item.description,
          category: record?.category ?? item.category,
          tags: record?.tags ?? item.tags,
          owner: record?.owner ?? item.owner ?? '',
        };
      }));

      // Check for new registrations and trigger notifications if enabled
      if (mappedItems.length > 0) {
        // Get the latest timestamp from the current data
        const currentLatestTimestamp = Math.max(
          ...mappedItems
            .filter(item => item.startTimestamp)
            .map(item => item.startTimestamp || 0)
        );

        // If we have a previous timestamp and the new one is more recent
        if (latestRegistrationTimestamp > 0 && currentLatestTimestamp > latestRegistrationTimestamp) {
          // Find new registrations (those with timestamp newer than our previous latest)
          const newRegistrations = mappedItems.filter(
            item => item.startTimestamp && item.startTimestamp > latestRegistrationTimestamp
          );

          // Show notification for each new registration if enabled
          if (notificationsEnabled && newRegistrations.length > 0) {
            newRegistrations.forEach(registration => {
              showRegistrationNotification(registration.name, registration.owner || 'Unknown');
            });
            console.log(`Found ${newRegistrations.length} new registrations, notifications sent.`);
          }
        }

        // Update our latest timestamp
        if (currentLatestTimestamp > latestRegistrationTimestamp) {
          setLatestRegistrationTimestamp(currentLatestTimestamp);
        }
      }

      // Set initial timestamp if it's the first fetch
      if (latestRegistrationTimestamp === 0 && mappedItems.length > 0) {
        const initialLatestTimestamp = Math.max(
          ...mappedItems
            .filter(item => item.startTimestamp)
            .map(item => item.startTimestamp || 0)
        );
        setLatestRegistrationTimestamp(initialLatestTimestamp);
      }

      // Update last refreshed timestamp
      setLastRefreshed(new Date());
      
      if (isManual) {
        toast.success('Data refreshed successfully');
      }
    } catch (err) {
      console.error('Error fetching latest registrations:', err);
      if (isManual) {
        toast.error('Failed to refresh data');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, latestRegistrationTimestamp, notificationsEnabled]);

  // Warn user if notifications are not enabled after permission check
  useEffect(() => {
    if (permissionChecked && notificationsSupported() && Notification.permission !== 'granted' && !notificationsEnabled) {
      toast('Enable browser notifications to get alerts for new ARNS registrations.');
    }
  }, [permissionChecked, notificationsEnabled]);

  // Manual refresh handler
  const manualRefresh = async () => {
    await fetchLatestRegistrations(true);
  };

  // Initial data fetch
  useEffect(() => {
    fetchLatestRegistrations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-refresh timer
  useEffect(() => {
    let refreshInterval: ReturnType<typeof setInterval> | null = null;
    
    if (autoRefreshEnabled) {
      // Refresh every 5 minutes if auto-refresh is enabled
      refreshInterval = setInterval(() => {
        console.log('Auto-refreshing data...');
        manualRefresh();
      }, 5 * 60 * 1000); // 5 minutes
    }
    
    // Clean up interval on unmount or when autoRefresh changes
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [autoRefreshEnabled, fetchLatestRegistrations]);

  return (
    <NotificationContext.Provider 
      value={{ 
        notificationsEnabled,
        autoRefreshEnabled,
        isLoading,
        lastRefreshed,
        toggleNotifications,
        toggleAutoRefresh,
        manualRefresh
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  
  return context;
};
