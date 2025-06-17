import { useEffect, useState, ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Portal renders its children into document.body, escaping any CSS overrides
 * like transforms on ancestor elements.
 */
const Portal: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [el] = useState(() => document.createElement('div'));

  useEffect(() => {
    document.body.appendChild(el);
    return () => {
      document.body.removeChild(el);
    };
  }, [el]);

  return createPortal(children, el);
};

export default Portal;
