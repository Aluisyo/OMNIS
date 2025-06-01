import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Calendar, Search, Filter, X, List, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import Button from '../components/common/Button';
import ArNSTable from '../components/directory/ArNSTable';
import DirectoryTimeline from '../components/directory/DirectoryTimeline';
import { getAllArnsFromDB, fetchAndStoreAllArNS } from '../services/arnsService'; // owner is always trusted from DB
import { sortAndPaginateRecordsInWorker } from '../services/arnsWorkerClient';
import { ArNSRecord, FilterOptions } from '../types';
import { useDebounce } from '../hooks/useDebounce';
import { motion } from 'framer-motion';
import { formatIO } from '../components/directory/ArNSTable';

function getQueryParams(filters: FilterOptions) {
  const params = new URLSearchParams();
  if (filters.searchTerm) params.set('search', filters.searchTerm);
  if (filters.page && filters.page > 1) params.set('page', String(filters.page));
  if (filters.sortBy && filters.sortBy !== 'registeredAt') params.set('sortBy', filters.sortBy);
  if (filters.sortDirection && filters.sortDirection !== 'desc') params.set('sortDir', filters.sortDirection);
  return params.toString();
}

const Directory: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [allRecords, setAllRecords] = useState<ArNSRecord[]>([]);
  const [records, setRecords] = useState<ArNSRecord[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // View mode toggle (table or timeline)
  const [viewMode, setViewMode] = useState<'table' | 'timeline'>('table');
  
  // Filter and pagination state
  const [filters, setFilters] = useState<FilterOptions>({
    searchTerm: '',
    startDate: null,
    endDate: null,
    sortBy: 'registeredAt', // Always sort by registration date by default
    sortDirection: 'desc',  // Descending = latest first
    page: 1,
    perPage: 25
  });
  
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [searchInput, setSearchInput] = useState<string>('');
  const debouncedSearchInput = useDebounce(searchInput, 200);

  const [exportMenuOpen, setExportMenuOpen] = useState<boolean>(false);
  const [exportPageCount, setExportPageCount] = useState<number>(1);
  const totalPages = Math.ceil(total / filters.perPage);

  const listRef = useRef<HTMLDivElement>(null);
  const isSyncingFromUrl = useRef(false);

  const exportCsv = async (mode: 'current' | 'pages' | 'all', pagesCount = 1) => {
    let exportRecords: ArNSRecord[] = [];
    if (mode === 'current') {
      exportRecords = records;
    } else if (mode === 'pages') {
      const perPageLarge = filters.perPage * pagesCount;
      const result = await sortAndPaginateRecordsInWorker(
        allRecords,
        filters.searchTerm,
        filters.sortBy,
        filters.sortDirection,
        1,
        perPageLarge
      );
      exportRecords = result.records;
    } else {
      const result = await sortAndPaginateRecordsInWorker(
        allRecords,
        filters.searchTerm,
        filters.sortBy,
        filters.sortDirection,
        1,
        total
      );
      exportRecords = result.records;
    }
    const headers = ['Name','Type','Owner','Registered','Expires','Contract','Price'];
    const rows = exportRecords.map(r => [
      r.name,
      r.type,
      r.owner || '',
      r.startTimestamp ? new Date(r.startTimestamp).toLocaleDateString() : '',
      r.expiresAt ? new Date(r.expiresAt).toLocaleDateString() : '',
      r.contractTxId || r.processId || '',
      formatIO(r.purchasePrice)
    ]);
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `arns_export_${mode}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // On mount, initialize filters from URL only once
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const searchParam = params.get('search') || '';
    const pageParam = parseInt(params.get('page') || '1', 10);
    const sortByParam = params.get('sortBy') || 'registeredAt';
    const sortDirParam = params.get('sortDir') || 'desc';

    // Only update state if params differ from current filters
    if (
      filters.searchTerm !== searchParam ||
      filters.page !== (isNaN(pageParam) ? 1 : pageParam) ||
      filters.sortBy !== sortByParam ||
      filters.sortDirection !== (sortDirParam === 'asc' ? 'asc' : 'desc')
    ) {
      isSyncingFromUrl.current = true;
      setSearchInput(searchParam);
      setFilters(f => ({
        ...f,
        searchTerm: searchParam,
        page: isNaN(pageParam) ? 1 : pageParam,
        sortBy: sortByParam,
        sortDirection: sortDirParam === 'asc' ? 'asc' : 'desc',
      }));
    }
  }, [location.search]);

  // If navigated with state.owner, set search bar and trigger search
  useEffect(() => {
    if (location.state && (location.state as any).owner) {
      const owner = (location.state as any).owner;
      setSearchInput(owner);
      setFilters(f => ({ ...f, searchTerm: owner, page: 1 }));
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }, 0);
    }
  }, [location.state]);

  // Load all records from browser DB on mount
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const loadData = async () => {
      try {
        // First try to get from DB
        let dbRecords = await getAllArnsFromDB();
        // Map endTimestamp to expiresAt if needed
        dbRecords = dbRecords.map(r => ({
          ...r,
          expiresAt: r.expiresAt ?? r.endTimestamp ?? null
        }));
        
        if (dbRecords.length === 0) {
          // If DB is empty, fetch from network
          const networkRecords = await fetchAndStoreAllArNS();
          
          // Use the network records directly instead of fetching from DB again
          if (networkRecords && networkRecords.length > 0) {
            // Map endTimestamp to expiresAt if needed
            const mappedNetworkRecords = networkRecords.map(r => ({
              ...r,
              expiresAt: r.expiresAt ?? r.endTimestamp ?? null
            }));
            setAllRecords(mappedNetworkRecords);
          } else {
            // If no network records either, try DB one more time
            const freshDbRecords = await getAllArnsFromDB();
            setAllRecords(freshDbRecords);
            
            if (freshDbRecords.length === 0) {
              setError('No ArNS records found after fetching from the network.');
            }
          }
        } else {
          // We have records in DB
          setAllRecords(dbRecords);
        }
      } catch (err) {
        setError('Failed to load ArNS records: ' + (err instanceof Error ? err.message : String(err)));
      } finally {
        setLoading(false);
      }
    };
    
    loadData();

    // Poll for updates every 3 seconds
    const interval = setInterval(async () => {
      try {
        let dbRecords = await getAllArnsFromDB();
        dbRecords = dbRecords.map(r => ({
          ...r,
          expiresAt: r.expiresAt ?? r.endTimestamp ?? null
        }));
        // Only update if changed (length or shallow compare)
        if (dbRecords.length !== allRecords.length || dbRecords.some((r, i) => r.name !== allRecords[i]?.name || r.owner !== allRecords[i]?.owner)) {
          setAllRecords(dbRecords);
        }
      } catch (err) {
        // Optionally handle polling error
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Offload filtering, sorting, and pagination to worker
  useEffect(() => {
    let active = true;
    
    // Only run filtering if we actually have records to filter
    // This prevents the "No records found" message from appearing during loading
    if (allRecords.length > 0) {
      // Set a small timeout to ensure UI is responsive during loading
      const timer = setTimeout(async () => {
        try {
          const result = await sortAndPaginateRecordsInWorker(
            allRecords,
            filters.searchTerm,
            filters.sortBy,
            filters.sortDirection,
            filters.page,
            filters.perPage
          );
          
          if (!active) return;
          const { records: paged, total } = result;
          setRecords(paged);
          setTotal(total);
        } catch (err) {
          console.error('Failed to filter/paginate records:', err);
        }
      }, 0);
      
      return () => {
        active = false;
        clearTimeout(timer);
      };
    } else {
      // If no records yet, reset the records and total to empty/zero
      // but don't call the worker as it would just return empty results
      setRecords([]);
      setTotal(0);
    }
  }, [allRecords, filters]);

  // Handle filter changes
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setFilters(f => ({ ...f, searchTerm: searchInput, page: 1 }));
  };

  // Handle sort change
  const handleSortChange = (field: string) => {
    setFilters(f => {
      const direction = f.sortBy === field && f.sortDirection === 'asc' ? 'desc' : 'asc';
      return { ...f, sortBy: field, sortDirection: direction, page: 1 };
    });
  };

  // Handle page change
  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= Math.ceil(total / filters.perPage)) {
      setFilters(f => ({ ...f, page }));
    }
  };

  // Handle entries per page change
  const handlePerPageChange = (perPage: number) => {
    setFilters(f => ({ ...f, perPage, page: 1 }));
    // Scroll back to top when changing entries per page
    listRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Reset all filters
  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      startDate: null,
      endDate: null,
      sortBy: 'registeredAt',
      sortDirection: 'desc',
      page: 1,
      perPage: 25
    });
    setSearchInput('');
    // Clear search input field
    if (searchInputRef.current) {
      searchInputRef.current.value = '';
    }
  };

  // Update URL when filters change, but skip if syncing from URL
  useEffect(() => {
    if (isSyncingFromUrl.current) {
      isSyncingFromUrl.current = false;
      return;
    }
    const params = getQueryParams(filters);
    const url = params ? `/directory?${params}` : '/directory';
    if (location.pathname + location.search !== url) {
      navigate(url, { replace: true });
    }
  }, [filters.page, filters.searchTerm, filters.sortBy, filters.sortDirection]);

  /* Animation variants for staggered animations */
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { 
        duration: 0.5, 
        ease: 'easeInOut', 
        staggerChildren: 0.1 
      }
    },
    exit: { 
      opacity: 0,
      transition: { duration: 0.3 }
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2 
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: "spring",
        stiffness: 260,
        damping: 20
      }
    }
  };
  
  return (
    <motion.div 
      className="space-y-8 relative overflow-visible p-2 md:p-4"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      {/* Decorative elements */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary-200/10 dark:bg-accent-blue/10 rounded-full blur-3xl z-0" />
      <div className="absolute top-1/4 -right-32 w-80 h-80 bg-accent-lavender/5 dark:bg-accent-lavender/5 rounded-full blur-3xl z-0" />
      <div className="absolute bottom-0 left-1/4 w-60 h-60 bg-primary-400/5 dark:bg-primary-600/5 rounded-full blur-3xl z-0" />
      
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"
      >
        <div className="relative backdrop-blur-md bg-white/20 dark:bg-gray-900/20 rounded-xl p-6 border border-gray-200/30 dark:border-gray-700/30 shadow-lg mb-6">
          <motion.h1 
            variants={itemVariants}
            className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-500 dark:to-purple-500 bg-clip-text text-transparent tracking-tight"
          >
            ArNS Directory
          </motion.h1>
          <motion.p 
            variants={itemVariants}
            className="mt-3 text-base text-gray-700 dark:text-gray-300 max-w-2xl"
          >
            Browse, search, and explore the complete list of registered Arweave names
          </motion.p>
        </div>

        {/* Search Bar */}
        <motion.div 
          className="mt-8 w-full max-w-3xl mx-auto" 
          ref={listRef} 
          variants={itemVariants}
        >
          <form onSubmit={handleSearch} autoComplete="off" className="relative">
            <div className="relative group">
              <input
                ref={searchInputRef}
                type="text"
                value={searchInput}
                onChange={e => {
                  setSearchInput(e.target.value);
                  setFilters(f => ({ ...f, searchTerm: e.target.value, page: 1 }));
                }}
                placeholder="Search names or owners..."
                className="h-14 w-full rounded-xl border-2 border-gray-200/80 dark:border-gray-700/80 bg-white/80 dark:bg-gray-900/50 backdrop-blur-md px-5 pr-12 text-base shadow-lg transition-all duration-200 focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20 dark:text-white dark:placeholder-gray-400 group-hover:shadow-xl"
              />
              {searchInput ? (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  type="button"
                  className="absolute right-12 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-full bg-gray-200/70 dark:bg-gray-700/70 backdrop-blur-sm hover:bg-gray-300/90 dark:hover:bg-gray-600/90 transition-all duration-200"
                  onClick={() => {
                    setSearchInput('');
                    if (searchInputRef.current) {
                      searchInputRef.current.focus();
                    }
                  }}
                >
                  <X className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                </motion.button>
              ) : null}
              <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            </div>
          </form>
        </motion.div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="w-full"
      >
        <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-gray-700/30 shadow-sm hover:shadow-md transition-all duration-200">
        <CardHeader className="p-4 border-b border-gray-100/50 dark:border-gray-800/50">
          <div className="flex flex-col space-y-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
            <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent tracking-tight"
            >
              All Names
            </CardTitle>
            <div className="flex space-x-2">
              {/* View toggle */}
              <div className="border border-gray-200/70 dark:border-gray-700/70 rounded-md overflow-hidden flex mr-2 backdrop-blur-sm shadow-sm">
                <Button
                  variant={viewMode === 'table' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-r-none px-3 transition-all duration-200"
                >
                  <List className="h-4 w-4 mr-1" />
                  Table
                </Button>
                <Button
                  variant={viewMode === 'timeline' ? 'primary' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('timeline')}
                  className="rounded-l-none px-3 transition-all duration-200"
                >
                  <Clock className="h-4 w-4 mr-1" />
                  Timeline
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center bg-white/50 dark:bg-gray-800/50 border-gray-200/70 dark:border-gray-700/70 hover:bg-white/70 dark:hover:bg-gray-700/50 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filters
                {showFilters ? (
                  <X className="ml-2 h-4 w-4" />
                ) : null}
              </Button>
              <Button
                variant="outline"
                size="sm"
                aria-label="Refresh Directory"
                onClick={async () => {
                  setLoading(true);
                  try {
                    const dbRecords = await getAllArnsFromDB();
                    setAllRecords(dbRecords);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="flex items-center bg-white/50 dark:bg-gray-800/50 border-gray-200/70 dark:border-gray-700/70 hover:bg-white/70 dark:hover:bg-gray-700/50 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow"
              >
                <Search className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExportMenuOpen(o => !o)}
                  className="flex items-center bg-white/50 dark:bg-gray-800/50 border-gray-200/70 dark:border-gray-700/70 hover:bg-white/70 dark:hover:bg-gray-700/50 backdrop-blur-sm transition-all duration-200 shadow-sm hover:shadow"
                >
                  Export
                </Button>
                {exportMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-200/40 backdrop-blur-sm border border-white/30 dark:border-white/10 shadow-lg rounded-md z-10 divide-y divide-gray-200/60 dark:divide-gray-700">
                    <button onClick={() => exportCsv('current')} className="block w-full px-4 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600">Current Page</button>
                    <div className="px-4 py-2">
                      <label className="text-xs text-gray-600 dark:text-gray-400">Pages (1-{totalPages}):</label>
                      <input
                        type="number"
                        min={1}
                        max={totalPages}
                        value={exportPageCount}
                        onChange={e => setExportPageCount(Number(e.target.value))}
                        className="mt-1 w-full p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-dark-200/40 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400 dark:focus:ring-accent-blue"
                      />
                      <button onClick={() => exportCsv('pages', exportPageCount)} className="mt-2 w-full px-2 py-1 text-sm bg-primary-500 dark:bg-accent-blue text-white rounded hover:bg-primary-600 dark:hover:bg-accent-blue/90">Export Pages</button>
                    </div>
                    <button onClick={() => exportCsv('all')} className="block w-full px-4 py-2 text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600">Export All</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          {showFilters && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="mb-6 p-5 border border-gray-200/50 dark:border-gray-700/30 rounded-lg bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm shadow-sm"
            >
              <div className="flex justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">Filter Records</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                  className="hover:bg-gray-100/80 dark:hover:bg-gray-700/50"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Registration Date From
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <div className="relative flex w-full items-stretch">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="date"
                        className="block w-full rounded-md border border-gray-200/80 bg-white/80 dark:bg-gray-800/80 pl-10 sm:text-sm dark:border-gray-700/80 dark:text-white backdrop-blur-sm transition-all duration-200 focus:border-primary-400 dark:focus:border-accent-blue focus:ring-2 focus:ring-primary-400/20 dark:focus:ring-accent-blue/20"
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          setFilters(f => ({ ...f, startDate: date, page: 1 }));
                        }}
                        value={filters.startDate ? new Date(filters.startDate).toISOString().split('T')[0] : ''}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Registration Date To
                  </label>
                  <div className="mt-1 flex rounded-md shadow-sm">
                    <div className="relative flex w-full items-stretch">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                        <Calendar className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="date"
                        className="block w-full rounded-md border border-gray-200/80 bg-white/80 dark:bg-gray-800/80 pl-10 sm:text-sm dark:border-gray-700/80 dark:text-white backdrop-blur-sm transition-all duration-200 focus:border-primary-400 dark:focus:border-accent-blue focus:ring-2 focus:ring-primary-400/20 dark:focus:ring-accent-blue/20"
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : null;
                          setFilters(f => ({ ...f, endDate: date, page: 1 }));
                        }}
                        value={filters.endDate ? new Date(filters.endDate).toISOString().split('T')[0] : ''}
                      />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                    Owner Address
                  </label>
                  <input
                    type="text"
                    placeholder="Enter owner address"
                    className="mt-1 block w-full rounded-md border border-gray-200/80 bg-white/80 dark:bg-gray-800/80 px-3 py-2 text-sm dark:border-gray-700/80 dark:text-white dark:placeholder-gray-400 backdrop-blur-sm transition-all duration-200 focus:border-primary-400 dark:focus:border-accent-blue focus:ring-2 focus:ring-primary-400/20 dark:focus:ring-accent-blue/20"
                  />
                </div>
                
                <div className="flex items-end space-x-2">
                  <Button 
                    variant="secondary" 
                    className="flex-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm transition-all duration-200 hover:bg-white/90 dark:hover:bg-gray-700/80 border-gray-200/60 dark:border-gray-700/60"
                    onClick={resetFilters}
                  >
                    Reset
                  </Button>
                  <Button 
                    variant="primary" 
                    className="flex-1 shadow-sm hover:shadow transition-all duration-200"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            </motion.div>
          )}



          {/* Content Area */}
          {error ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
              className="rounded-lg bg-red-50/80 dark:bg-red-900/20 p-5 border border-red-100 dark:border-red-900/30 backdrop-blur-sm shadow-sm"
            >
              <div className="flex">
                <div className="flex-shrink-0 bg-red-100 dark:bg-red-900/40 p-2 rounded-full">
                  <svg className="h-5 w-5 text-red-500 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-4 flex-1">
                  <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">Error Loading Data</h3>
                  <p className="text-sm text-red-700 dark:text-red-200">{error}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3 bg-white/80 dark:bg-red-900/30 backdrop-blur-sm border-red-200 dark:border-red-900/50 hover:bg-white/90 dark:hover:bg-red-900/40 text-red-700 dark:text-red-200" 
                    onClick={() => fetchAndStoreAllArNS().then(records => setAllRecords(records)).catch(err => setError(err.message))}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </motion.div>
          ) : loading ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col justify-center items-center py-12 text-center"
            >
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-t-2 border-b-2 border-primary-500 dark:border-accent-blue animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full bg-white dark:bg-gray-900"></div>
                </div>
              </div>
              <span className="mt-4 text-gray-600 dark:text-gray-300 font-medium">Loading ARN records...</span>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mt-2">This may take a moment as we fetch the latest data from the network.</p>
            </motion.div>
          ) : allRecords.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="py-12 text-center bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-100 dark:border-gray-700/50 shadow-sm"
            >
              <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-medium">No ARN records found</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2 mb-4">Looks like we need to fetch the latest ArNS data from the network.</p>
              <Button 
                variant="primary" 
                size="sm" 
                className="mt-4 shadow-sm hover:shadow transition-all duration-200" 
                onClick={() => fetchAndStoreAllArNS().then(records => setAllRecords(records))}
              >
                Refresh Data
              </Button>
            </motion.div>
          ) : records.length === 0 && total === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="py-10 text-center bg-white/50 dark:bg-gray-800/30 backdrop-blur-sm rounded-lg border border-gray-100 dark:border-gray-700/50 shadow-sm"
            >
              <div className="mx-auto h-16 w-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                <svg className="h-8 w-8 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-gray-700 dark:text-gray-300 font-medium">No matching records found</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto mt-2 mb-4">Try adjusting your search criteria or reset filters to see more results.</p>
              <Button variant="primary" size="sm" className="mt-4 shadow-sm hover:shadow transition-all duration-200" onClick={resetFilters}>Reset Filters</Button>
            </motion.div>
          ) : (
            <div>
              {/* Table View */}
              {viewMode === 'table' && (
                <>
                  <ArNSTable
                    data={records}
                    total={total}
                    page={filters.page}
                    perPage={filters.perPage}
                    sortBy={filters.sortBy}
                    sortDirection={filters.sortDirection}
                    onPageChange={handlePageChange}
                    onPerPageChange={handlePerPageChange}
                    onSortChange={handleSortChange}
                    isLoading={false}
                  />
                </>
              )}
              
              {/* Timeline View */}
              {viewMode === 'timeline' && (
                <DirectoryTimeline 
                  records={records}
                  onNameClick={(name) => navigate(`/name/${name}`)}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  );
};

export default Directory;
