import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ToastProvider } from './contexts/ToastContext';
import { DataProvider } from './contexts/DataContext';
import { setupFocusVisible } from './utils/focusVisible';

// Clean expired cache on app startup
import { cleanExpiredCache } from './services/cacheService';
cleanExpiredCache();
// Setup focus-visible for accessibility
setupFocusVisible();

// Register service worker for notifications
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(console.error);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <DataProvider>
        <App />
      </DataProvider>
    </ToastProvider>
  </StrictMode>
);