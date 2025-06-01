import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card';
import { getArNSRecords, fetchAndStoreAllArNS, getAllArnsFromDB } from '../services/arnsService';
import { calculateAnalyticsStatsInWorker } from '../services/arnsWorkerClient';
import { ArNSRecord } from '../types';
import { formatAddress, formatNumber } from '../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { Activity, TrendingUp, Users, Clock, Award, Search, RefreshCw, Bell, BellOff } from 'lucide-react';
import { ARIO } from '@ar.io/sdk';
import { useNotifications } from '../contexts/NotificationContext';
import { motion, AnimatePresence } from 'framer-motion';

// Initialize ARIO client for ArNS functionality
const ario = ARIO.mainnet();

const LiveFeed: React.FC = () => {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  // Stats state
  const [stats, setStats] = useState<any | null>(null);
  const [statsLoading, setStatsLoading] = useState<boolean>(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  
  // Get notification state from context
  const { 
    notificationsEnabled, 
    autoRefreshEnabled, 
    toggleNotifications,
    toggleAutoRefresh,
  } = useNotifications();

  const [registrations, setRegistrations] = useState<ArNSRecord[]>([]);
  const [dbLoaded, setDbLoaded] = useState(false);
  const [dbCount, setDbCount] = useState<number>(0);
  const [allRecords, setAllRecords] = useState<ArNSRecord[]>([]);
  const latestSeenTimestamp = useRef<number>(0);

  // Properly map endTimestamp to expiresAt for lease records
  function mapExpires(records: ArNSRecord[]): ArNSRecord[] {
    return records.map(record => {
      // For lease records, make sure expiresAt is set from endTimestamp if available
      if (record.type === 'lease') {
        return {
          ...record,
          expiresAt: record.expiresAt || (record as any).endTimestamp || null
        };
      }
      // For permabuy records, expiresAt should be null
      if (record.type === 'permabuy') {
        return {
          ...record,
          expiresAt: null
        };
      }
      // For other records, keep original data
      return record;
    });
  }

  // On first load, read all cached records and initialize pagination
  useEffect(() => {
    let mounted = true;
    (async () => {
      const dbAll = await getAllArnsFromDB();
      const sorted = dbAll.sort((a, b) => (b.startTimestamp||0) - (a.startTimestamp||0));
      const mapped = mapExpires(sorted);
      if (mounted) {
        setAllRecords(mapped);
        setDbCount(mapped.length);
        setRegistrations(mapped.slice(0, page * 30));
        setDbLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Poll only new records (deltas)
  useEffect(() => {
    if (!dbLoaded) return;
    // Initialize last seen timestamp from current data
    latestSeenTimestamp.current = registrations.reduce(
      (max, r) => Math.max(max, r.startTimestamp || 0),
      0
    );
    let mounted = true;
    const fetchDeltas = async () => {
      try {
        const result = await getArNSRecords({
          cursor: undefined,
          limit: 30,
          sortBy: 'startTimestamp',
          sortOrder: 'desc',
        });
        // Only new items
        const newRaw = (result.items as unknown as ArNSRecord[]).filter(
          item => item.startTimestamp && item.startTimestamp > latestSeenTimestamp.current
        );
        if (newRaw.length === 0) return;
        const dbRecords: ArNSRecord[] = await getAllArnsFromDB();
        const dbOwnerMap = new Map(
          dbRecords
            .filter((r: any) => r.name && r.owner != null)
            .map((r: any) => [r.name, r.owner])
        );
        const newWithOwner: ArNSRecord[] = newRaw.map(item => {
          const owner = dbOwnerMap.get(item.name);
          return owner != null ? { ...item, owner } : item;
        });
        let resolved: any[] = [];
        const unresolved: ArNSRecord[] = newWithOwner.filter(item => item.owner == null);
        if (unresolved.length > 0) {
          const promises = unresolved.map(item =>
            ario
              .resolveArNSName({ name: item.name })
              .then(res => ({ name: item.name, owner: res?.owner ?? '' }))
              .catch(() => ({ name: item.name, owner: '' }))
          );
          resolved = await Promise.all(promises);
        }
        const merged: ArNSRecord[] = newWithOwner.map(item => {
          const found = resolved.find(r => r.name === item.name);
          return found ? { ...item, owner: found.owner } : item;
        });
        const mapped = mapExpires(merged);
        if (mounted) {
          setAllRecords(prev => [...mapped, ...prev]);
          setRegistrations(mapped.slice(0, page * 30));
          const { saveRecordsSmart } = await import('../utils/db');
          await saveRecordsSmart(mapped);
        }
        // Update timestamp
        latestSeenTimestamp.current = Math.max(
          latestSeenTimestamp.current,
          ...mapped.map(item => item.startTimestamp || 0)
        );
      } catch (e) {
        if (mounted) {
          setError('Failed to fetch live records');
        }
      }
    };
    fetchDeltas();
    const intervalId = setInterval(fetchDeltas, 60000);
    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [dbLoaded]);

  // Fetch stats on mount and whenever records or cache count change
  useEffect(() => {
    let mounted = true;
    setStatsLoading(true);
    setStatsError(null);
    
    const fetchStats = async () => {
      try {
        // Get all records from the database
        const allRecords = await getAllArnsFromDB();
        
        // Use the worker to calculate all stats (includes active permabuys, active leases, unique owners)
        const { stats } = await calculateAnalyticsStatsInWorker(allRecords);
        
        // The worker has calculated everything we need
        if (mounted) {
          setStats({
            ...stats,
            // Ensure values are present and fallback to defaults if not
            totalRegistrations: stats.totalRegistrations || allRecords.length,
            activePermabuys: stats.activePermabuys || 0,
            activeLeases: stats.activeLeases || 0,
            uniqueOwners: stats.uniqueOwners || 0
          });
        }
      } catch (error) {
        if (mounted) setStatsError('Failed to load stats');
      } finally {
        if (mounted) setStatsLoading(false);
      }
    };
    
    fetchStats();
    return () => { mounted = false; };
  }, [registrations, dbCount]);
  const [error, setError] = useState<string | null>(null);

  function formatIO(winston: string | number | undefined) {
    if (!winston) return '-';
    const io = typeof winston === 'string' ? parseFloat(winston) / 1e12 : winston / 1e12;
    if (!io) return '-';
    if (io < 1) {
      const ario = (io * 100000000) / 100;
      return ario.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ARIO';
    }
    return io.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 }) + ' ARIO';
  }

  // Background seed full DB and update cache count
  useEffect(() => {
    fetchAndStoreAllArNS().then(result => {
      const count = Array.isArray(result) ? result.length : 0;
      setDbCount(count);
      toast.success(`Fetched and saved ${count} ArNS records to browser DB`);
    }).catch(() => {
      toast.error('Failed to fetch and store all ArNS records');
    });
  }, []);

  // Page transition variants
  const pageVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  // Stats card variants for staggered animation
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
  };

  // Icons for stats cards with consistent styling
  const statIcons = useMemo(() => ({
    totalRegistrations: <Activity className="h-5 w-5 text-accent-blue" />,
    activePermabuys: <Award className="h-5 w-5 text-accent-green" />,
    activeLeases: <Clock className="h-5 w-5 text-accent-yellow" />,
    dailyRegistrations: <TrendingUp className="h-5 w-5 text-accent-peach" />,
    uniqueOwners: <Users className="h-5 w-5 text-accent-lavender" />
  }), []);

  // Function to handle refresh
  const handleRefresh = useCallback(() => {
    setStatsLoading(true);
    fetchAndStoreAllArNS().then(result => {
      const count = Array.isArray(result) ? result.length : 0;
      toast.success(`Refreshed ${count} ArNS records`);
    }).catch(() => {
      toast.error('Failed to refresh ArNS records');
    }).finally(() => {
      setStatsLoading(false);
    });
  }, []);

  // Show More: simply increment page to load next slice
  const handleShowMore = useCallback(() => {
    setPage(p => p + 1);
  }, []);

  // When page changes, re-slice registrations from cached allRecords
  useEffect(() => {
    if (!dbLoaded) return;
    setRegistrations(allRecords.slice(0, page * 30));
  }, [page, dbLoaded, allRecords]);

  return (
    <motion.div 
      className="space-y-8"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      {/* Page Header with Animation */}
      <div className="relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="absolute -top-24 -left-24 w-64 h-64 bg-primary-200/10 dark:bg-accent-blue/5 rounded-full blur-3xl z-0"
        />

        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent tracking-tight"
              >
                Live ArNS Feed
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="mt-2 text-base text-gray-600 dark:text-dark-600"
              >
                Latest registrations on the Arweave Name Service
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="w-full flex flex-col space-y-2 items-stretch md:flex-row md:items-center md:space-y-0 md:space-x-3"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={statsLoading}
                className="w-full md:w-auto flex items-center gap-2 px-4 py-2 bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm rounded-lg shadow-sm border border-gray-200/50 dark:border-white/5 text-gray-700 dark:text-dark-500 hover:bg-white/90 dark:hover:bg-dark-100/60 transition-all"
              >
                <RefreshCw className={`h-4 w-4 ${statsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh Data</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleAutoRefresh}
                className={`w-full md:w-auto flex items-center gap-2 px-4 py-2 backdrop-blur-sm rounded-lg shadow-sm border transition-all ${
                  autoRefreshEnabled 
                    ? "bg-accent-green/10 text-accent-green border-accent-green/20 dark:border-accent-green/10" 
                    : "bg-white/70 dark:bg-dark-100/40 border-gray-200/50 dark:border-white/5 text-gray-700 dark:text-dark-500"
                }`}
              >
                <RefreshCw className="h-4 w-4" />
                <span>{autoRefreshEnabled ? 'Auto-refresh on' : 'Auto-refresh off'}</span>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleNotifications}
                className={`w-full md:w-auto flex items-center gap-2 px-4 py-2 backdrop-blur-sm rounded-lg shadow-sm border transition-all ${
                  notificationsEnabled 
                    ? "bg-accent-blue/10 text-accent-blue border-accent-blue/20 dark:border-accent-blue/10" 
                    : "bg-white/70 dark:bg-dark-100/40 border-gray-200/50 dark:border-white/5 text-gray-700 dark:text-dark-500"
                }`}
              >
                {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
                <span>{notificationsEnabled ? 'Notifications on' : 'Notifications off'}</span>
              </motion.button>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Stats Cards with Staggered Animation */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
      >
        {/* Total Registrations */}
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader>
              <CardTitle>
                {statIcons.totalRegistrations}
                <span>Total Registrations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {statsLoading ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-2"
                  >
                    <div className="h-8 w-24 animate-pulse rounded-md bg-gray-200/70 dark:bg-dark-200/50" />
                  </motion.div>
                ) : statsError ? (
                  <motion.span 
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-accent-red"
                  >
                    Error loading data
                  </motion.span>
                ) : (
                  <motion.div
                    key="data"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <span className="text-3xl font-bold bg-gradient-to-r from-primary-600 to-primary-500 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent">
                      {formatNumber(stats?.totalRegistrations || 0)}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-dark-600 mt-1.5 flex items-center gap-1">
                      <Activity className="h-3 w-3" /> Total registrations tracked
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Permabuys */}
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader>
              <CardTitle>
                {statIcons.activePermabuys}
                <span>Active Permabuys</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {statsLoading ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-2"
                  >
                    <div className="h-8 w-24 animate-pulse rounded-md bg-gray-200/70 dark:bg-dark-200/50" />
                  </motion.div>
                ) : statsError ? (
                  <motion.span 
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-accent-red"
                  >
                    Error loading data
                  </motion.span>
                ) : (
                  <motion.div
                    key="data"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <span className="text-3xl font-bold bg-gradient-to-r from-accent-green to-accent-teal bg-clip-text text-transparent">
                      {formatNumber(Number.isFinite(Number(stats?.activePermabuys)) ? Number(stats?.activePermabuys) : 0)}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-dark-600 mt-1.5 flex items-center gap-1">
                      <Award className="h-3 w-3" /> Permanent registrations
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Active Leases */}
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader>
              <CardTitle>
                {statIcons.activeLeases}
                <span>Active Leases</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {statsLoading ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-2"
                  >
                    <div className="h-8 w-24 animate-pulse rounded-md bg-gray-200/70 dark:bg-dark-200/50" />
                  </motion.div>
                ) : statsError ? (
                  <motion.span 
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-accent-red"
                  >
                    Error loading data
                  </motion.span>
                ) : (
                  <motion.div
                    key="data"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <span className="text-3xl font-bold bg-gradient-to-r from-accent-yellow to-accent-peach bg-clip-text text-transparent">
                      {formatNumber(Number.isFinite(Number(stats?.activeLeases)) ? Number(stats?.activeLeases) : 0)}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-dark-600 mt-1.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Time-limited registrations
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>

        {/* Daily Registrations */}
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader>
              <CardTitle>
                {statIcons.dailyRegistrations}
                <span>Daily Registrations</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AnimatePresence mode="wait">
                {statsLoading ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center space-x-2"
                  >
                    <div className="h-8 w-24 animate-pulse rounded-md bg-gray-200/70 dark:bg-dark-200/50" />
                  </motion.div>
                ) : statsError ? (
                  <motion.span 
                    key="error"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-accent-red"
                  >
                    Error loading data
                  </motion.span>
                ) : (
                  <motion.div
                    key="data"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <span className="text-3xl font-bold bg-gradient-to-r from-accent-peach to-accent-red bg-clip-text text-transparent">
                      {formatNumber(Number.isFinite(Number(stats?.dailyRegistrations)) ? Number(stats?.dailyRegistrations) : 0)}
                    </span>
                    <p className="text-xs text-gray-500 dark:text-dark-600 mt-1.5 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Last 24 hours
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
      
      {/* Error message */}
      <AnimatePresence>
        {error && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="rounded-xl bg-accent-red/10 p-4 border border-accent-red/20 dark:border-accent-red/10 backdrop-blur-sm"
          >
            <div className="flex items-center">
              <div className="flex-shrink-0 text-accent-red">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-accent-red">{error}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Registrations Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="overflow-hidden rounded-xl border border-gray-200/50 dark:border-white/5 bg-white/80 dark:bg-dark-100/40 backdrop-blur-sm shadow-sm mt-6"
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50/80 dark:bg-dark-200/50 border-b border-gray-200/50 dark:border-white/5">
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-dark-500">ArNS</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-dark-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-dark-500">Owner</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-dark-500">Registered</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-dark-500">Expires</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-dark-500">ANT</th>
                <th className="px-4 py-3 text-left font-medium text-gray-700 dark:text-dark-500">Purchase Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50 dark:divide-white/5">
              {!dbLoaded ? (
                <>
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <tr key={idx}>
                      {Array.from({ length: 7 }).map((_, col) => (
                        <td key={col} className="px-4 py-3">
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-full" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              ) : registrations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <Search className="h-10 w-10 text-gray-400 dark:text-dark-600" />
                      <p className="text-gray-500 dark:text-dark-600">No registrations found.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                [...registrations]
                  .sort((a, b) => (b.startTimestamp ?? 0) - (a.startTimestamp ?? 0))
                  .slice(0, page * 30)
                  .map((record, index) => (
                    <motion.tr 
                      key={record.id} 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03, duration: 0.2 }}
                      className="hover:bg-gray-50/80 dark:hover:bg-dark-200/30 transition-colors duration-150"
                    >
                      <td className="px-4 py-3">
                        <span
                          onClick={() => navigate(`/name/${record.name}`)}
                          className="font-mono text-primary-600 dark:text-accent-blue cursor-pointer hover:underline font-medium"
                        >
                          {record.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {record.type === 'lease' ? (
                          <span className="inline-flex items-center rounded-full bg-primary-50 dark:bg-accent-blue/10 px-2.5 py-0.5 text-xs font-medium text-primary-600 dark:text-accent-blue">
                            Lease
                          </span>
                        ) : record.type === 'permabuy' ? (
                          <span className="inline-flex items-center rounded-full bg-accent-green/10 px-2.5 py-0.5 text-xs font-medium text-accent-green">
                            Permabuy
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-300">
                            {record.type}
                          </span>
                        )}
                      </td>
                      <td className="truncate px-4 py-3">
                        <span
                          className="font-mono text-primary-600 dark:text-accent-blue cursor-pointer hover:underline"
                          onClick={() => {
                            if (record.owner) {
                              navigate(`/directory?search=${encodeURIComponent(record.owner)}`);
                            }
                          }}
                        >
                          {formatAddress(record.owner || '')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-dark-600">
                        {record.startTimestamp ? new Date(record.startTimestamp).toLocaleString() : '-'}
                      </td>
                      <td className="font-mono px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {record.type === 'lease' ? (
                          record.expiresAt ? (
                            new Date(record.expiresAt).toLocaleString()
                          ) : (record as any).endTimestamp ? (
                            new Date((record as any).endTimestamp).toLocaleString()
                          ) : '-'
                        ) : record.type === 'permabuy' ? (
                          <span className="inline-flex items-center rounded-full bg-accent-green/10 px-2.5 py-0.5 text-xs font-medium text-accent-green">
                            Never
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="font-mono text-xs text-primary-600 dark:text-accent-blue px-4 py-3">
                        {(record.processId || record.contractTxId) ? (
                          <a href={`https://ao.link/#/token/${record.processId || record.contractTxId}`} 
                             target="_blank" 
                             rel="noopener noreferrer" 
                             className="hover:underline hover:text-primary-700 dark:hover:text-accent-blue/80 transition-colors duration-150">
                            {((record.processId || record.contractTxId) || '').slice(0, 8)}...{((record.processId || record.contractTxId) || '').slice(-6)}
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-4 py-3 text-accent-green dark:text-accent-green/90">{formatIO(record.purchasePrice)}</td>
                    </motion.tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Show More Button */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="flex justify-center my-8"
      >
        <button
          className="px-6 py-2.5 bg-gradient-to-r from-primary-500 to-primary-600 dark:from-accent-blue dark:to-accent-blue/90 text-white rounded-lg hover:shadow-md hover:scale-105 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed transition-all duration-200 font-medium"
          onClick={handleShowMore}
          disabled={registrations.length >= dbCount}
        >
          {registrations.length < dbCount ? (
            <span className="flex items-center gap-2">
              Show More
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </span>
          ) : 'No More Records'}
        </button>
      </motion.div>
    </motion.div>
  );
};

export default LiveFeed;