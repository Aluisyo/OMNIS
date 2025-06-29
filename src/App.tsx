import { Suspense } from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import LiveFeed from './pages/LiveFeed';
import Directory from './pages/Directory';
import Analytics from './pages/Analytics';
import TopHolders from './pages/TopHolders';
import NameDetails from './pages/NameDetails';
import UndernameDetails from './pages/UndernameDetails';
import { ThemeProvider } from './contexts/ThemeContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { OfflineProvider } from './contexts/OfflineContext';
import Layout from './components/layout/Layout';
import ScrollToTop from './components/ScrollToTop';

// Lazy load pages for code splitting







// Fallback loader
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <OfflineProvider>
          {/* Skip to content link for accessibility */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only absolute top-2 left-2 z-50 bg-blue-600 text-white px-4 py-2 rounded shadow focus:outline-none focus:ring-2 focus:ring-blue-400"
          >Skip to content</a>
          <Router>
            <ScrollToTop />
            <Routes>
              <Route path="/" element={<Layout />}>
                <Route index element={
                  <Suspense fallback={<PageLoader />}>
                    <LiveFeed />
                  </Suspense>
                } />
                <Route path="directory" element={
                  <Suspense fallback={<PageLoader />}>
                    <Directory />
                  </Suspense>
                } />
                <Route path="analytics" element={
                  <Suspense fallback={<PageLoader />}>
                    <Analytics />
                  </Suspense>
                } />
                <Route path="holders" element={
                  <Suspense fallback={<PageLoader />}>
                    <TopHolders />
                  </Suspense>
                } />
                <Route path="name/:name" element={
                  <Suspense fallback={<PageLoader />}>
                    <NameDetails />
                  </Suspense>
                } />
                <Route path="undername/:name" element={
                  <Suspense fallback={<PageLoader />}>
                    <UndernameDetails />
                  </Suspense>
                } />
              </Route>
            </Routes>
          </Router>
        </OfflineProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
}

export default App;