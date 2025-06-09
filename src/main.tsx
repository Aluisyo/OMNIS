import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ToastProvider } from './contexts/ToastContext';
import { DataProvider } from './contexts/DataContext';
import { setupFocusVisible } from './utils/focusVisible';

// Clean expired cache on app startup
import { cleanExpiredCache } from './services/cacheService';
import { getLatestRegistrations } from './services/arnsService';
import { initializeDB } from './services/initService';
cleanExpiredCache();
// Seed IndexedDB from Arweave manifest
initializeDB().catch(console.error);

// Setup focus-visible for accessibility
setupFocusVisible();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </ToastProvider>
  </StrictMode>
);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    const reg = await navigator.serviceWorker.register('/service-worker.js');
    // Request notification permission
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      // Type guard for periodicSync
      const hasPeriodicSync = 'periodicSync' in reg;
      const poll = async () => {
        try {
          const data = await getLatestRegistrations(1);
          if (data && data.length > 0) {
            const latest = data[0];
            const lastNotified = localStorage.getItem('lastArNS');
            if (!lastNotified || lastNotified !== latest.id) {
              new Notification('New ArNS Registration', {
                body: `${latest.name} was just registered by ${latest.owner?.slice(0, 5)}...${latest.owner?.slice(-5)}`,
                icon: '/favicon.svg',
                tag: `registration-${latest.name}`,
              });
              localStorage.setItem('lastArNS', latest.id);
            }
          }
        } catch (e) {
          // Ignore errors
        }
      };
      if (hasPeriodicSync) {
        try {
          // @ts-ignore: periodicSync is experimental
          await reg.periodicSync.register('arns-sync', {
            minInterval: 60 * 60 * 1000, // 1 hour
          });
        } catch (e) {
          setInterval(poll, 60 * 60 * 1000);
        }
      } else {
        setInterval(poll, 60 * 60 * 1000);
      }
    }
  });
}