import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ToastProvider } from './contexts/ToastContext';
import { DataProvider } from './contexts/DataContext';
import { setupFocusVisible } from './utils/focusVisible';

// Clean expired cache on app startup
import { cleanExpiredCache } from './services/cacheService';
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