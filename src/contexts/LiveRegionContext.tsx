import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';

interface LiveRegionContextType {
  announce: (message: string) => void;
}

const LiveRegionContext = createContext<LiveRegionContextType | undefined>(undefined);

export const LiveRegionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [message, setMessage] = useState('');

  const announce = useCallback((msg: string) => {
    setMessage(''); // Clear first to retrigger for same message
    setTimeout(() => setMessage(msg), 10);
  }, []);

  return (
    <LiveRegionContext.Provider value={{ announce }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{ position: 'absolute', width: 1, height: 1, margin: -1, padding: 0, overflow: 'hidden', clip: 'rect(0 0 0 0)', border: 0 }}
      >
        {message}
      </div>
    </LiveRegionContext.Provider>
  );
};

export const useLiveRegion = (): LiveRegionContextType => {
  const context = useContext(LiveRegionContext);
  if (!context) {
    throw new Error('useLiveRegion must be used within a LiveRegionProvider');
  }
  return context;
}; 