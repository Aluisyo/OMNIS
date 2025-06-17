import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop automates scrolling to the top of the page on route changes.
 */
const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

export default ScrollToTop;
