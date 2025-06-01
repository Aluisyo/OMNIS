import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate, useLocation } from 'react-router-dom';
import { Sun, Moon, Search, Menu, X, Activity, List, BarChart2, Users } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import OmnisLogo from '../common/OmnisLogo';
import { getAllArnsFromDB } from '../../services/arnsService';
import { useDebounce } from '../../hooks/useDebounce';
import { motion } from 'framer-motion';

// GlobalSearch component with modern UI
const GlobalSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300); // Slightly increased debounce for better UX
  const [isFocused, setIsFocused] = useState(false);
  const location = useLocation();
  const [mobileSearchVisible, setMobileSearchVisible] = useState(false);

  // Reset search when location changes or mobile search is closed
  useEffect(() => {
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    if (!mobileSearchVisible) {
      setIsFocused(false); // Reset focus only if mobile search is not active
    }
  }, [location.pathname, mobileSearchVisible]);

  // Listen for custom events to trigger search from outside
  useEffect(() => {
    const searchHandler = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setQuery(customEvent.detail);
      setShowDropdown(false); // Hide dropdown initially
      setMobileSearchVisible(false); // Ensure mobile overlay is closed if triggered from desktop context
      setTimeout(() => {
        if (inputRef.current && !mobileSearchVisible) { // Focus desktop input
          inputRef.current.focus();
        }
        handleSearch({ preventDefault: () => {} } as React.FormEvent);
      }, 50);
    };

    const mobileSearchHandler = () => {
      setMobileSearchVisible(true);
      setQuery(''); // Clear previous query
      setResults([]); // Clear previous results
      setTimeout(() => {
        if (inputRef.current) { // Focus input within mobile overlay
          inputRef.current.focus();
        }
      }, 50);
    };

    window.addEventListener('trigger-global-search', searchHandler);
    window.addEventListener('trigger-mobile-search', mobileSearchHandler);

    return () => {
      window.removeEventListener('trigger-global-search', searchHandler);
      window.removeEventListener('trigger-mobile-search', mobileSearchHandler);
    };
  }, []); // Removed mobileSearchVisible from deps to avoid re-adding listeners multiple times

  // Live suggestion logic (debounced)
  useEffect(() => {
    let active = true;
    if (debouncedQuery.length > 1 && isFocused) {
      setLoading(true);
      getAllArnsFromDB().then(allRecords => {
        if (!active) return;
        const q = debouncedQuery.toLowerCase();
        const matches = allRecords.filter(
          (r: any) =>
            r.name?.toLowerCase().includes(q) ||
            r.owner?.toLowerCase().includes(q) ||
            (Array.isArray(r.tags) && r.tags.some((tag: string) => tag.toLowerCase().includes(q)))
        ).slice(0, mobileSearchVisible ? 15 : 8); // Show more results in mobile overlay
        setResults(matches);
        setShowDropdown(matches.length > 0);
        setLoading(false);
      }).catch(() => {
        if (!active) return;
        setLoading(false);
        setResults([]);
        setShowDropdown(false);
      });
    } else {
      setResults([]);
      setShowDropdown(false);
      setLoading(false); // Ensure loading is false if query is short
    }
    return () => { active = false; };
  }, [debouncedQuery, isFocused, mobileSearchVisible]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    setLoading(true);
    try {
      const allRecords = await getAllArnsFromDB();
      const q = query.toLowerCase();
      const filtered = allRecords.filter((record: any) => {
        return (
          record.name?.toLowerCase().includes(q) ||
          record.owner?.toLowerCase().includes(q) ||
          (Array.isArray(record.tags) && record.tags.some((tag: string) => tag.toLowerCase().includes(q)))
        );
      });
      setResults(filtered.slice(0, mobileSearchVisible ? 20 : 8)); 
      setShowDropdown(true);
    } catch (error) {
      console.error("Error fetching search results:", error);
      setResults([]);
      setShowDropdown(false);
    }
    setLoading(false);
  };

  const handleSelect = (name: string) => {
    setQuery('');
    setShowDropdown(false);
    setMobileSearchVisible(false); // Close mobile search on selection
    navigate(`/name/${encodeURIComponent(name)}`);
  };

  const handleBlur = () => {
    setTimeout(() => {
      // Only hide dropdown on blur if not in mobile search overlay and not clicking on a result
      if (!mobileSearchVisible && document.activeElement !== inputRef.current) {
         setShowDropdown(false);
         setIsFocused(false);
      }
    }, 150); 
  };
  
  const renderResultsList = () => (
    <>
      {results.map((record, idx) => (
        <motion.div
          key={record.name + idx}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: idx * 0.05 }}
          whileHover={{ 
            backgroundColor: mobileSearchVisible ? 'rgba(128, 128, 128, 0.08)' : 'rgba(255, 255, 255, 0.15)', 
            scale: 1.01,
            transition: { duration: 0.1 }
          }}
          onMouseDown={() => handleSelect(record.name)} // Use onMouseDown to fire before onBlur
          className={`cursor-pointer px-4 py-3 flex flex-col ${mobileSearchVisible ? 'border-b border-gray-200/30 dark:border-white/10' : ''}`}
        >
          <span className="font-medium text-gray-900 dark:text-white">{record.name}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Owner: {record.owner ? record.owner.slice(0, 10) + '...' : '-'}
          </span>
          {record.tags && record.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {record.tags.slice(0, 3).map((tag: string, i: number) => (
                <span key={i} className="text-xs px-1.5 py-0.5 rounded-full bg-primary-100/60 text-primary-700 
                  dark:bg-accent-blue/15 dark:text-accent-blue truncate max-w-[100px]"
                >
                  {tag}
                </span>
              ))}
              {record.tags.length > 3 && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 
                  dark:bg-dark-200 dark:text-dark-600"
                >
                  +{record.tags.length - 3} more
                </span>
              )}
            </div>
          )}
        </motion.div>
      ))}
    </>
  );

  return (
    <>
      {/* Desktop Search Bar */}
      <div className="relative w-64 hidden md:block">
        <form 
          autoComplete="off"
          onSubmit={e => { e.preventDefault(); if (results.length > 0 && query.trim()) handleSelect(results[0].name); }}
          className="group"
        >
          <motion.div 
            initial={{ opacity: 0.8 }}
            whileHover={{ opacity: 1, scale: 1.02 }}
            className="relative"
          >
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-accent-lavender opacity-70 group-hover:opacity-100 transition-opacity" />
            <input
              ref={inputRef} // Ref for desktop input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={handleBlur}
              placeholder="Search names, address, tags..."
              className="h-10 w-full rounded-lg border-0 bg-white/20 backdrop-blur-sm pl-10 pr-10 text-sm text-gray-900 placeholder-gray-700 ring-1 ring-white/30 focus:outline-none focus:ring-2 focus:ring-primary-400 dark:bg-dark-200/40 dark:text-white dark:placeholder-gray-400 dark:ring-white/10 dark:focus:ring-accent-blue transition-all duration-200 ease-in-out"
            />
            {query && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full bg-white/30 dark:bg-dark-300/50 backdrop-blur-sm hover:bg-white/50 dark:hover:bg-dark-300/70 transition-all duration-200"
                onClick={() => {
                  setQuery('');
                  setResults([]);
                  setShowDropdown(false);
                  if (inputRef.current) inputRef.current.focus();
                }}
              >
                <X className="h-3.5 w-3.5 text-gray-600 dark:text-dark-500" />
              </motion.button>
            )}
          </motion.div>
        </form>
        {showDropdown && results.length > 0 && isFocused && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 z-50 mt-2 w-full rounded-lg bg-white/90 dark:bg-dark-100/95 backdrop-blur-md shadow-glass 
              border border-white/30 dark:border-white/10 max-h-80 overflow-auto divide-y divide-gray-100/30 dark:divide-white/5"
          >
            {renderResultsList()}
          </motion.div>
        )}
        {showDropdown && !loading && results.length === 0 && query.length > 1 && isFocused && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-0 z-50 mt-2 w-full rounded-lg bg-white/90 dark:bg-dark-100/95 backdrop-blur-md 
              shadow-glass border border-white/30 dark:border-white/10 
              px-4 py-3 text-sm text-gray-500 dark:text-dark-600"
          >
            No results found for "{query}".
          </motion.div>
        )}
        {loading && isFocused && (
          <motion.div 
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute left-0 z-50 mt-2 w-full rounded-lg bg-white/90 dark:bg-dark-100/95 backdrop-blur-md 
              shadow-glass border border-white/30 dark:border-white/10 
              px-4 py-3 text-sm flex items-center gap-2"
          >
            <div className="h-3 w-3 rounded-full border-2 border-transparent border-t-primary-500 dark:border-t-accent-blue animate-spin"></div>
            <span className="text-gray-500 dark:text-dark-600">Searching...</span>
          </motion.div>
        )}
      </div>

      {/* Mobile Search Overlay */}
      {mobileSearchVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] bg-white/95 dark:bg-dark-200/95 backdrop-blur-lg p-4 pt-5 md:hidden flex flex-col"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-lg font-semibold text-gray-800 dark:text-dark-300">Search ArNS</span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setMobileSearchVisible(false)}
              className="p-2 rounded-lg bg-gray-100/80 dark:bg-dark-100/50 text-gray-700 dark:text-dark-400"
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>
          
          <form
            autoComplete="off"
            onSubmit={handleSearch} 
            className="w-full mb-4"
          >
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-accent-lavender opacity-80" />
              <input
                ref={inputRef} // Re-use inputRef for mobile search input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)} 
                placeholder="Search names, addresses, tags..."
                className="h-12 w-full rounded-xl border-0 bg-gray-100 dark:bg-dark-100 pl-12 pr-10 text-base text-gray-900 placeholder-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-accent-blue dark:text-white dark:placeholder-gray-400 transition-all duration-200 ease-in-out"
              />
              {query && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 flex items-center justify-center rounded-full bg-gray-200/70 dark:bg-dark-300/50 backdrop-blur-sm hover:bg-gray-300/70 dark:hover:bg-dark-300/70 transition-all duration-200"
                  onClick={() => {
                    setQuery('');
                    setResults([]);
                    if (inputRef.current) inputRef.current.focus();
                  }}
                >
                  <X className="h-4 w-4 text-gray-600 dark:text-dark-500" />
                </motion.button>
              )}
            </div>
          </form>

          <div className="flex-grow overflow-y-auto -mx-4">
            {loading && (
              <div className="flex justify-center items-center h-full pt-10">
                 <div className="h-6 w-6 rounded-full border-2 border-transparent border-t-primary-500 dark:border-t-accent-blue animate-spin"></div>
              </div>
            )}
            {!loading && results.length > 0 && (
              <div className="divide-y divide-gray-100/50 dark:divide-white/5">
                {renderResultsList()}
              </div>
            )}
            {!loading && results.length === 0 && query.length > 1 && (
              <div className="text-center py-10 text-gray-500 dark:text-dark-600">
                No results found for "{query}".
              </div>
            )}
             {!loading && results.length === 0 && query.length <= 1 && (
              <div className="text-center py-10 text-gray-400 dark:text-dark-700">
                Start typing to search...
              </div>
            )}
          </div>
        </motion.div>
      )}
    </>
  );
};

const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close menu on navigation
  const handleNav = () => setMenuOpen(false);

  // Custom NavLink style function
  const navLinkStyles = ({ isActive }: { isActive: boolean }) => {
    return `relative flex items-center py-2 px-3 text-sm font-medium transition-all duration-200 ease-in-out rounded-lg
      ${isActive 
        ? 'text-primary-600 dark:text-accent-blue bg-primary-50/50 dark:bg-accent-blue/10' 
        : 'text-gray-600 dark:text-dark-500 hover:text-primary-600 dark:hover:text-accent-blue hover:bg-gray-100/50 dark:hover:bg-white/5'}`;
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-40 w-full backdrop-blur-sm bg-white/80 dark:bg-dark-200/80 border-b border-gray-200/50 dark:border-white/5 shadow-sm">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Left Side: Logo and Desktop Nav */}
          <div className="flex items-center gap-2 lg:gap-8">
            <Link to="/" className="flex items-center group">
              <motion.div
                whileHover={{ rotate: [0, -10, 10, -5, 0], transition: { duration: 0.5 } }}
                className="relative"
              >
                <OmnisLogo className="h-9 w-9" />
                <div className="absolute inset-0 bg-gradient-to-br from-primary-400/30 to-accent-blue/30 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </motion.div>
              <motion.span 
                initial={{ x: -5, opacity: 0.8 }}
                animate={{ x: 0, opacity: 1 }}
                className="ml-2 text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-blue bg-clip-text text-transparent dark:from-accent-blue dark:to-accent-lavender"
              >
                OMNIS
              </motion.span>
            </Link>
            <nav className="hidden md:flex md:space-x-2">
              <motion.div
                className="flex items-center gap-1 bg-gray-50/80 dark:bg-dark-100/50 backdrop-blur-sm px-1.5 py-1.5 rounded-xl border border-gray-200/50 dark:border-white/5"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.3 }}
              >
                <NavLink to="/" end className={navLinkStyles}><Activity className="h-4 w-4 mr-1.5" /><span>Live Feed</span></NavLink>
                <NavLink to="/directory" className={navLinkStyles}><List className="h-4 w-4 mr-1.5" /><span>Directory</span></NavLink>
                <NavLink to="/analytics" className={navLinkStyles}><BarChart2 className="h-4 w-4 mr-1.5" /><span>Analytics</span></NavLink>
                <NavLink to="/holders" className={navLinkStyles}><Users className="h-4 w-4 mr-1.5" /><span>Top Holders</span></NavLink>
              </motion.div>
            </nav>
          </div>

          {/* Right Side: Desktop Search, Theme Toggle (Desktop), Mobile Icons (Search, Burger) */}
          <div className="flex items-center space-x-3">
            <GlobalSearch /> {/* GlobalSearch handles its own desktop/mobile visibility logic */}
            
            {/* Theme Toggle for Desktop - hidden on mobile */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="hidden md:flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100/80 dark:bg-dark-100/50 backdrop-blur-sm
                border border-gray-200/50 dark:border-white/5 text-gray-600 dark:text-dark-500 
                hover:text-primary-600 dark:hover:text-accent-blue transition-colors duration-200"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </motion.button>

            {/* Mobile Search Button - part of mobile controls group */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-lg bg-gray-100/80 dark:bg-dark-100/50 backdrop-blur-sm
                border border-gray-200/50 dark:border-white/5 text-gray-600 dark:text-dark-500 
                hover:text-primary-600 dark:hover:text-accent-blue transition-colors duration-200"
              onClick={() => window.dispatchEvent(new CustomEvent('trigger-mobile-search'))}
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </motion.button>

            {/* Mobile Burger Button - moved to the right */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-500 bg-gray-100/80 dark:bg-dark-100/50 dark:text-dark-500 
                backdrop-blur-sm border border-gray-200/50 dark:border-white/5 md:hidden 
                focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-accent-blue"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? 
                <X className="h-5 w-5" /> : 
                <Menu className="h-5 w-5" />
              }
            </motion.button>
          </div>
        </div>
      </div>
      
      {/* Mobile Menu Overlay */}
      {menuOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Mobile Slide Down Menu */}
      <motion.nav
        initial={{ y: '-100%', opacity: 0 }}
        animate={{ y: menuOpen ? 0 : '-100%', opacity: menuOpen ? 1 : 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-dark-100/95 backdrop-blur-md 
          border-b border-gray-200/50 dark:border-white/5 shadow-lg md:hidden"
        aria-label="Mobile navigation"
      >
        <div className="container mx-auto px-4 py-5 flex flex-col space-y-1">
          <div className="flex items-center justify-between mb-5">
            <Link to="/" className="flex items-center" onClick={handleNav}>
              <OmnisLogo className="h-8 w-8" />
              <span className="ml-2 text-xl font-bold bg-gradient-to-r from-primary-600 to-accent-blue bg-clip-text text-transparent dark:from-accent-blue dark:to-accent-lavender">
                OMNIS
              </span>
            </Link>
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="inline-flex items-center justify-center rounded-lg p-1.5 text-gray-500 bg-gray-100/80 dark:bg-dark-100/80 dark:text-dark-500"
              onClick={() => setMenuOpen(false)}
            >
              <X className="h-5 w-5" />
            </motion.button>
          </div>
          
          <NavLink to="/" end onClick={handleNav} className={({ isActive }) =>
            `flex items-center p-3 text-base font-medium rounded-lg transition-all duration-200 ease-in-out ${
              isActive 
                ? 'bg-primary-50 text-primary-600 dark:bg-accent-blue/10 dark:text-accent-blue' 
                : 'text-gray-700 dark:text-dark-500 hover:bg-gray-100 dark:hover:bg-white/5'
            }`
          }>
            <Activity className="h-5 w-5 mr-3" /> Live Feed
          </NavLink>
          
          <NavLink to="/directory" onClick={handleNav} className={({ isActive }) =>
            `flex items-center p-3 text-base font-medium rounded-lg transition-all duration-200 ease-in-out ${
              isActive 
                ? 'bg-primary-50 text-primary-600 dark:bg-accent-blue/10 dark:text-accent-blue' 
                : 'text-gray-700 dark:text-dark-500 hover:bg-gray-100 dark:hover:bg-white/5'
            }`
          }>
            <List className="h-5 w-5 mr-3" /> Directory
          </NavLink>
          
          <NavLink to="/analytics" onClick={handleNav} className={({ isActive }) =>
            `flex items-center p-3 text-base font-medium rounded-lg transition-all duration-200 ease-in-out ${
              isActive 
                ? 'bg-primary-50 text-primary-600 dark:bg-accent-blue/10 dark:text-accent-blue' 
                : 'text-gray-700 dark:text-dark-500 hover:bg-gray-100 dark:hover:bg-white/5'
            }`
          }>
            <BarChart2 className="h-5 w-5 mr-3" /> Analytics
          </NavLink>
          
          <NavLink to="/holders" onClick={handleNav} className={({ isActive }) =>
            `flex items-center p-3 text-base font-medium rounded-lg transition-all duration-200 ease-in-out ${
              isActive 
                ? 'bg-primary-50 text-primary-600 dark:bg-accent-blue/10 dark:text-accent-blue' 
                : 'text-gray-700 dark:text-dark-500 hover:bg-gray-100 dark:hover:bg-white/5'
            }`
          }>
            <Users className="h-5 w-5 mr-3" /> Top Holders
          </NavLink>
          
          <div className="pt-2 mt-2 border-t border-gray-200/50 dark:border-white/5 flex justify-center">
            <button
              onClick={() => {
                toggleTheme();
                setTimeout(() => setMenuOpen(false), 300);
              }}
              className="flex items-center p-3 text-base font-medium text-gray-700 dark:text-dark-500 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors duration-200 w-full justify-center"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-5 w-5 mr-3" /> Switch to Light Mode
                </>
              ) : (
                <>
                  <Moon className="h-5 w-5 mr-3" /> Switch to Dark Mode
                </>
              )}
            </button>
          </div>
        </div>
      </motion.nav>
    </header>
  );
};

export default Header;