import * as React from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { Toaster } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { useData } from '../../contexts/DataContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useOffline } from '../../contexts/OfflineContext';

const Layout: React.FC = () => {
  const { loading: dataLoading } = useData();
  const { isLoading: registrationsLoading } = useNotifications();
  const { isOnline } = useOffline();
  const activityActive = dataLoading || registrationsLoading;
  const activityTitle = dataLoading
    ? 'Loading ARNS data...'
    : registrationsLoading
      ? 'Refreshing ARNS data...'
      : '';

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 dark:from-dark-300 dark:to-dark-400 dark:text-dark-500 relative">
      {!isOnline && (
        <div className="bg-red-500 text-white text-center py-2">
          You are offline — displaying cached data.
        </div>
      )}
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-50%] left-[-10%] w-[70%] h-[70%] rounded-full bg-primary-200/10 dark:bg-accent-blue/5 blur-3xl" />
        <div className="absolute bottom-[-30%] right-[-10%] w-[60%] h-[60%] rounded-full bg-secondary-200/10 dark:bg-accent-lavender/5 blur-3xl" />
      </div>
      
      <Header />
      
      <main id="main-content" className="flex-1 container mx-auto px-4 sm:px-6 py-8 relative z-10 mt-16">
        <div className="rounded-xl bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm shadow-glass p-4 sm:p-6 border border-white/20 dark:border-white/5">
          <Outlet />
        </div>
      </main>
      
      <Footer />
      
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: 'rgba(255, 255, 255, 0.9)',
            color: '#1E1E2E',
            borderRadius: '12px',
            padding: '16px',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          },
          className: 'dark:bg-dark-100/90 dark:text-dark-500 dark:border-white/10',
          success: {
            iconTheme: {
              primary: '#94E2D5',
              secondary: '#1E1E2E',
            },
          },
          error: {
            iconTheme: {
              primary: '#F38BA8',
              secondary: '#1E1E2E',
            },
          },
        }}
      />
      {activityActive && (
        <div className="fixed bottom-4 right-6 z-50">
          <div className="relative">
            <motion.div
              className="h-3 w-3 rounded-full cursor-pointer p-1 hover:scale-110"
              animate={{ backgroundColor: '#F59E0B', y: [0, -4, 0, 4, 0] }}
              transition={{
                backgroundColor: { duration: 1.5, repeat: Infinity, repeatType: 'reverse' },
                y: { duration: 2, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' }
              }}
              title={activityTitle}
              aria-label={activityTitle}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;