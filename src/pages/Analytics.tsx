import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
  LabelList,
  ReferenceLine,
  PieChart,
  Pie
} from 'recharts';
import { Activity, TrendingUp, Calendar, DollarSign, Users, Lock, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardContent, CardTitle } from '../components/common/Card';
import Button from '../components/common/Button';
import { getAllArnsFromDB } from '../services/arnsService';
import { calculateAnalyticsStatsInWorker, onResolutionProgress } from '../services/arnsWorkerClient';

// Simple loading component
const PageLoading = () => (
  <div className="flex items-center justify-center h-full py-20">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-600"></div>
  </div>
);

// Simple error message component
const ErrorMessage = ({ message }: { message: string }) => (
  <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-md border border-red-200 dark:border-red-800 mt-4">
    <p>{message}</p>
  </div>
);

// Format number helper
const formatNumber = (num: number) => {
  return new Intl.NumberFormat().format(num);
};

// Sample ArNS stats type
interface ArNSStats {
  totalRegistrations: number;
  dailyRegistrations: number;
  weeklyRegistrations: number;
  monthlyRegistrations: number;
  activePermabuys: number;
  activeLeases: number;
  uniqueOwners: number;
  averagePrice: number;
  growthRate: number;
}

// Registration trend type
interface RegistrationTrend {
  date: string;
  count: number;
}

// Growth rate data type
interface GrowthRateItem {
  month: string;
  growth: number;
}

// Price history item type
interface PriceHistoryItem {
  month: string;
  average: number;
}

// Unique owners trend item type
interface UniqueOwnersTrendItem {
  month: string;
  count: number;
}

// Type breakdown item type
interface TypeBreakdownItem {
  month: string;
  leases: number;
  permabuys: number;
}

// Name length bucket item type
interface NameLengthBucketItem {
  bucket: string;
  count: number;
}

const Analytics: React.FC = () => {
  const [stats, setStats] = useState<ArNSStats | null>(null);
  const [trends, setTrends] = useState<RegistrationTrend[]>([]);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'year'>('month');
  const [maximizedChart, setMaximizedChart] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [registrationDistribution, setRegistrationDistribution] = useState<{ name: string; value: number }[]>([]);
  const [dailyCounts, setDailyCounts] = useState<{ date: string; count: number }[]>([]);
  const [uniqueOwnersTrend, setUniqueOwnersTrend] = useState<UniqueOwnersTrendItem[]>([]);
  const [typeBreakdown, setTypeBreakdown] = useState<TypeBreakdownItem[]>([]);
  const [nameLengthBuckets, setNameLengthBuckets] = useState<NameLengthBucketItem[]>([]);
  // Add formatIO from LiveFeed
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

  // Loading progress state
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  // eslint-disable-next-line consistent-return
  useEffect(() => {
    let isMounted = true;
    let unsubProgress: (() => void) | undefined;
    let interval: NodeJS.Timeout | undefined;

    const fetchData = async () => {
      try {
        // Setup progress tracking
        unsubProgress = onResolutionProgress((current, total) => {
          if (isMounted) setProgress({ current, total });
        });

        console.log('Fetching ArNS records from IndexedDB...');
        const allRecords = await getAllArnsFromDB();
        console.log(`Loaded ${allRecords.length} records from IndexedDB`);
        // Process data in web worker
        console.log('Calculating analytics stats in worker...');
        const { stats: statsResult, trends: trendsResult, priceHistory: priceHistoryResult, uniqueOwnersTrend: uot, dailyCounts: dc, typeBreakdown: tbd, nameLengthBuckets: nlb } = await calculateAnalyticsStatsInWorker(allRecords);
        // Calculate registration type distribution using the same logic as arnsWorker.ts
        const now = new Date().getTime();
        const tenYearsFromNow = now + (10 * 365 * 24 * 60 * 60 * 1000);
        // Count active leases and permabuys using the exact same logic as the worker
        let activeLeases = 0;
        let activePermabuys = 0;
        // Log a few records for debugging
        if (allRecords.length > 0) {
          console.log('Sample record:', allRecords[0]);
        }
        allRecords.forEach(record => {
          // First normalize the type field for case-insensitive comparison
          const normalizedType = record.type ? String(record.type).toLowerCase() : '';
          // Check for permabuy variations in the type field
          if (normalizedType.includes('perma') || normalizedType === 'permanent') {
            activePermabuys += 1;
          } else if (normalizedType.includes('lease') || normalizedType === 'temporary') {
            // For leases, only count if not expired
            if (!record.expiresAt || record.expiresAt > now) {
              activeLeases += 1;
            }
          } else {
            // If type doesn't help, use expiration date as fallback
            // If endTimestamp exists, it's likely a lease
            if (record.endTimestamp && record.endTimestamp > 0 && record.endTimestamp > now) {
              activeLeases += 1;
            }
            // No expiration date typically means permabuy
            else if (record.expiresAt === null || record.expiresAt === undefined) {
              activePermabuys += 1;
            } else if (record.expiresAt <= tenYearsFromNow) {
              if (record.expiresAt > now) {
                activeLeases += 1;
              }
            } else {
              activePermabuys += 1;
            }
          }
        });
        console.log(`Active leases: ${activeLeases}, Active permabuys: ${activePermabuys}`);
        const distribution = [
          { name: 'Active Leases', value: activeLeases },
          { name: 'Permabuys', value: activePermabuys }
        ];

        if (isMounted) {
          console.log('Setting analytics data to state...');
          setStats(statsResult);
          setTrends(trendsResult.filter(trend => trend.date !== '2024-12-26' && trend.date !== '2025-02-20'));
          setPriceHistory(priceHistoryResult.filter(item => item.month !== '2024-12' && item.month !== '2025-02'));
          setRegistrationDistribution(distribution);
          setDailyCounts(dc.filter(d => d.date !== '2024-12-26' && d.date !== '2025-02-20'));
          setUniqueOwnersTrend(uot.filter(item => item.month !== '2024-12' && item.month !== '2025-02'));
          setTypeBreakdown(tbd.filter(item => item.month !== '2024-12' && item.month !== '2025-02'));
          setNameLengthBuckets(nlb);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('Error fetching analytics data:', err);
          setError('Failed to load analytics data. Please try again later.');
          setLoading(false);
        }
      } finally {
        if (unsubProgress) unsubProgress();
      }
    };

    fetchData();
    interval = setInterval(fetchData, 10000); // Poll every 10 seconds
    return () => {
      isMounted = false;
      if (unsubProgress) unsubProgress();
      if (interval) clearInterval(interval);
    };
  }, []);

  // Calculate filtered trends based on time range
  const filteredTrends = () => {
    if (!trends || trends.length === 0) return [];
    const today = new Date();
    let cutoff = new Date(today);
    switch (timeRange) {
      case 'week':
        cutoff.setDate(today.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(today.getMonth() - 1);
        break;
      case 'year':
        cutoff.setFullYear(today.getFullYear() - 1);
        break;
      default:
        cutoff.setMonth(today.getMonth() - 1); // Default to month
    }
    return trends.filter(t => new Date(t.date) >= cutoff && t.date !== '2024-12-26' && t.date !== '2025-02-20');
  };

  // Calculate growth rate using worker data
  const calculateGrowth = () => {
    if (!stats) return { growth: 0, growthStr: '0%' };
    const growth = stats.growthRate !== undefined ? stats.growthRate : 0;
    const growthStr = growth.toFixed(1) + '%';
    return { growth, growthStr };
  };

  // Generate real monthly growth rate data for the chart
  const generateMonthlyGrowthData = (): GrowthRateItem[] => {
    if (!trends || trends.length === 0) return [];
    const monthlyData = new Map<string, number>();
    trends.filter(trend => trend.date !== '2024-12-26' && trend.date !== '2025-02-20').forEach(trend => {
      const month = trend.date.substring(0, 7); // Get YYYY-MM format
      const count = trend.count || 0;
      if (monthlyData.has(month)) {
        monthlyData.set(month, monthlyData.get(month)! + count);
      } else {
        monthlyData.set(month, count);
      }
    });
    const sortedMonths = Array.from(monthlyData.entries())
      .sort((a, b) => a[0].localeCompare(b[0]));
    const growthData: GrowthRateItem[] = [];
    for (let i = 1; i < sortedMonths.length; i++) {
      const prevMonth = sortedMonths[i-1];
      const currMonth = sortedMonths[i];
      const prevCount = prevMonth[1];
      const currCount = currMonth[1];
      let growth = 0;
      if (prevCount > 0) {
        growth = ((currCount - prevCount) / prevCount) * 100;
      } else if (currCount > 0) {
        growth = 100; // If previous month was 0, but current month has registrations
      }
      const monthDate = new Date(currMonth[0] + '-01');
      const monthName = monthDate.toLocaleString('default', { month: 'short' });
      growthData.push({
        month: monthName,
        growth: Number(growth.toFixed(1))
      });
    }
    return growthData.length > 0 ? growthData : [{ month: 'Current', growth: stats?.growthRate || 0 }];
  };
  const growthRateData = generateMonthlyGrowthData();

  // Data for monthly registration distribution bar chart
  const registrationBarData = React.useMemo(() => {
    const map: { [key: string]: number } = {};
    trends.filter(trend => trend.date !== '2024-12-26' && trend.date !== '2025-02-20').forEach(({ date, count }) => {
      const month = date.slice(0, 7);
      map[month] = (map[month] || 0) + count;
    });
    return Object.entries(map).map(([month, count]) => ({ month, count }));
  }, [trends]);

  // Filter and sort daily counts for the past year
  const filteredDailyCounts = useMemo(() => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return dailyCounts
      .filter(d => new Date(d.date).getTime() >= oneYearAgo.getTime() && d.date !== '2024-12-26' && d.date !== '2025-02-20')
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [dailyCounts]);

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
    exit: { opacity: 0 }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
  };

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
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
            <div>
              <motion.h1 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
                className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent tracking-tight"
              >
                Analytics Dashboard
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.2 }}
                className="mt-2 text-base text-gray-600 dark:text-dark-600"
              >
                Insights and statistics for ArNS registrations
              </motion.p>
            </div>
          </div>
        </div>
      </div>

      {/* Conditional rendering based on loading/error state */}
      {loading ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5"
        >
          {Array.from({ length: 5 }).map((_, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05, duration: 0.3 }}
            >
              <Card className="h-36 bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm">
                <CardHeader className="p-4">
                  <div className="h-6 w-24 bg-gray-200/80 dark:bg-dark-300/80 rounded-md"></div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-9 w-full bg-gray-200/80 dark:bg-dark-300/80 rounded-md"></div>
                  <div className="h-4 w-16 mt-2 bg-gray-200/80 dark:bg-dark-300/80 rounded-md"></div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-5"
          >
            <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm">
              <CardHeader className="p-4">
                <div className="h-6 w-32 bg-gray-200/80 dark:bg-dark-300/80 rounded-md"></div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="h-64 bg-gray-200/80 dark:bg-dark-300/80 rounded-md"></div>
              </CardContent>
            </Card>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="col-span-1 md:col-span-2 lg:col-span-3 xl:col-span-5"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {Array.from({ length: 2 }).map((_, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1, duration: 0.3 }}
                >
                  <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm">
                    <CardHeader className="p-4">
                      <div className="h-6 w-32 bg-gray-200/80 dark:bg-dark-300/80 rounded-md"></div>
                    </CardHeader>
                    <CardContent className="p-4">
                      <div className="h-64 bg-gray-200/80 dark:bg-dark-300/80 rounded-md"></div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : error ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-center">
                <div className="bg-accent-red/10 p-4 rounded-xl border border-accent-red/20 dark:border-accent-red/10">
                  <p className="text-accent-red">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div>
          {/* Progress bar during processing */}
          {progress.total > 0 && progress.current < progress.total && (
            <div className="mb-4">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Analyzing records: {progress.current} of {progress.total}
              </p>
            </div>
          )}
          
          {/* Charts View */}
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -5 }} 
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Registrations</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-primary-100/80 dark:bg-primary-900/30 flex items-center justify-center">
                      <Activity className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent">
                      {formatNumber(stats?.totalRegistrations || 0)}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      total ArNS
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              
              {/* Daily Registration Card */}
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -5 }} 
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Daily Registrations</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-green-100/80 dark:bg-green-900/30 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-400 dark:from-green-400 dark:to-emerald-300 bg-clip-text text-transparent">
                      {formatNumber(stats?.dailyRegistrations || 0)}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      in last 24 hours
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              
              {/* Weekly Registration Card */}
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -5 }} 
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Weekly Registrations</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-purple-100/80 dark:bg-purple-900/30 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-400 dark:from-purple-400 dark:to-violet-300 bg-clip-text text-transparent">
                      {formatNumber(stats?.weeklyRegistrations || 0)}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      in last 7 days
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              
              {/* Monthly Registration Card */}
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -5 }} 
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Monthly Registrations</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-amber-100/80 dark:bg-amber-900/30 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold bg-gradient-to-r from-amber-600 to-amber-400 dark:from-amber-400 dark:to-yellow-300 bg-clip-text text-transparent">
                      {formatNumber(stats?.monthlyRegistrations || 0)}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      in last 30 days
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              
              {/* Active Permabuys Card */}
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -5 }} 
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Permabuys</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-indigo-100/80 dark:bg-indigo-900/30 flex items-center justify-center">
                      <Lock className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-400 dark:from-indigo-400 dark:to-violet-300 bg-clip-text text-transparent">
                      {formatNumber(stats?.activePermabuys || 0)}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      permanent registrations
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              
              {/* Active Leases Card */}
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -5 }} 
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-orange-100/80 dark:bg-orange-900/30 flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-400 dark:from-orange-400 dark:to-yellow-300 bg-clip-text text-transparent">
                      {formatNumber(stats?.activeLeases || 0)}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      temporary active registrations
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              
              {/* Unique Owners Card */}
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -5 }} 
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                    <div className="flex items-center space-x-2">
                      <CardTitle className="text-sm font-medium">Unique Owners</CardTitle>
                      {progress.total > 0 && progress.current < progress.total && (
                        <span className="flex items-center space-x-1 text-xs text-cyan-600 dark:text-cyan-400">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Syncing...</span>
                        </span>
                      )}
                    </div>
                    <div className="h-8 w-8 rounded-full bg-cyan-100/80 dark:bg-cyan-900/30 flex items-center justify-center">
                      <Users className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-cyan-400 dark:from-cyan-400 dark:to-blue-300 bg-clip-text text-transparent">
                      {formatNumber(stats?.uniqueOwners || 0)}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      distinct addresses
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -5 }} 
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Average Price</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-emerald-100/80 dark:bg-emerald-900/30 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 dark:from-emerald-400 dark:to-green-300 bg-clip-text text-transparent">
                      {formatIO(stats?.averagePrice || 0)}
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      average purchase price
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div 
                variants={itemVariants} 
                whileHover={{ y: -5 }} 
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader className="p-4 flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                    <div className="h-8 w-8 rounded-full bg-pink-100/80 dark:bg-pink-900/30 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    {(() => {
                      const growth = calculateGrowth();
                      const value = parseFloat(growth.growthStr);
                      const gradientClass = value > 0 
                        ? 'bg-gradient-to-r from-green-600 to-green-400 dark:from-green-400 dark:to-emerald-300' 
                        : value < 0 
                          ? 'bg-gradient-to-r from-red-600 to-red-400 dark:from-red-400 dark:to-rose-300' 
                          : 'bg-gradient-to-r from-gray-600 to-gray-400 dark:from-gray-400 dark:to-gray-300';
                      const arrow = value > 0 ? '↑' : value < 0 ? '↓' : '';
                      return (
                        <div className={`text-2xl font-bold ${gradientClass} bg-clip-text text-transparent`}>
                          {arrow} {growth.growthStr}
                        </div>
                      );
                    })()} 
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      monthly registrations trend
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
            
            {/* Trend Chart */}
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="mt-6"
            >
              <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-gray-100/50 dark:border-gray-800/50">
                  <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent">Registration Trends</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="border border-gray-200/50 dark:border-gray-700/50 rounded-md overflow-hidden flex bg-white/30 dark:bg-dark-200/30 backdrop-blur-sm">
                      <Button
                        variant={timeRange === 'week' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setTimeRange('week');
                        }}
                        className="rounded-r-none px-3"
                      >
                        Week
                      </Button>
                      <Button
                        variant={timeRange === 'month' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setTimeRange('month');
                        }}
                        className="rounded-none px-3"
                      >
                        Month
                      </Button>
                      <Button
                        variant={timeRange === 'year' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setTimeRange('year');
                        }}
                        className="rounded-l-none px-3"
                      >
                        Year
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0 pt-4">
                  <div className="h-[300px] md:h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={filteredTrends()}
                        margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                          }}
                          minTickGap={30}
                        />
                        <YAxis />
                        <Tooltip 
                          labelFormatter={(value) => {
                            const date = new Date(value);
                            return date.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric' 
                            });
                          }}
                          formatter={(value) => [formatNumber(value as number), 'Registrations']}
                          contentStyle={{
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            color: '#000'
                          }}
                          labelStyle={{ color: '#333' }}
                          itemStyle={{ color: '#000' }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Registrations"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Growth Rate Chart */}
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="mt-6"
            >
              <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-gray-100/50 dark:border-gray-800/50">
                  <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent">Monthly Growth Rate</CardTitle>
                </CardHeader>
                <CardContent className="p-0 pt-4">
                  <div className="h-[300px] md:h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={growthRateData}
                        margin={{ top: 10, right: 30, left: 10, bottom: 30 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <ReferenceLine y={0} stroke="#666" strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="month" 
                          minTickGap={30}
                        />
                        <YAxis 
                          tickFormatter={(val) => `${val}%`} 
                          label={{ value: 'Growth %', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip 
                          formatter={(value) => [`${value}%`, 'Growth Rate']}
                          contentStyle={{
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            color: '#000'
                          }}
                          labelStyle={{ color: '#333' }}
                          itemStyle={{ color: '#000' }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Bar 
                          dataKey="growth" 
                          name="Monthly Growth Rate" 
                          radius={[5, 5, 0, 0]}
                        >
                          {growthRateData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.growth >= 0 ? '#10b981' : '#ef4444'} 
                            />
                          ))}
                          <LabelList dataKey="growth" position="top" formatter={(val: number) => `${val}%`} style={{ fill: '#333', fontSize: 12 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Daily Registrations Chart */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible" className="mt-6">
              <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="flex justify-between items-center p-4 border-b border-gray-100/50 dark:border-gray-800/50">
                  <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent">
                    Daily Registrations
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={filteredDailyCounts} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={date => new Date(date).toLocaleDateString('default', { month: 'short', day: 'numeric' })}
                          interval={Math.floor(filteredDailyCounts.length / 7)}
                          minTickGap={10}
                          tick={{ fontSize: 12 }}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [formatNumber(value as number), 'Registrations']}
                          contentStyle={{
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            color: '#000'
                          }}
                          labelStyle={{ color: '#333' }}
                          itemStyle={{ color: '#000' }}
                        />
                        <Bar dataKey="count" fill="#3b82f6" name="Registrations" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Monthly Registration Distribution Bar Chart */}
            <motion.div
              variants={itemVariants}
              initial="hidden"
              animate="visible"
              className="mt-6"
            >
              <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="flex justify-between items-center p-4 border-b border-gray-100/50 dark:border-gray-800/50">
                  <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent">
                    Registration distribution
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-6">
                  <div className="h-[300px] md:h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={registrationBarData} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [formatNumber(value as number), 'Registrations']}
                          contentStyle={{
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            color: '#000'
                          }}
                          labelStyle={{ color: '#333' }}
                          itemStyle={{ color: '#000' }}
                        />
                        <Legend verticalAlign="top" height={36} />
                        <Bar dataKey="count" name="Registrations" fill="#3b82f6" radius={[5,5,0,0]}>
                          {registrationBarData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill="#3b82f6" />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Registration Distribution & Price History Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
              {/* Registration Distribution Pie Chart */}
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className={maximizedChart === 'distribution' ? 'col-span-1 lg:col-span-2' : ''}
              >
                <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-gray-100/50 dark:border-gray-800/50">
                    <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent">Leases and Permabuys</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMaximizedChart(maximizedChart === 'distribution' ? null : 'distribution')}
                      className="text-xs"
                    >
                      <span>{maximizedChart === 'distribution' ? 'Minimize' : 'Maximize'}</span>
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 pt-6">
                    <div className="h-64 w-full opacity-90 dark:opacity-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={registrationDistribution}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {registrationDistribution.map((entry, index) => {
                              let fillColor;
                              if (entry.name === 'Active Leases') {
                                fillColor = '#f97316'; // Orange for leases (matches Active Leases card)
                              } else {
                                fillColor = '#6366f1'; // Indigo for permabuys (matches Active Permabuys card)
                              }
                              return (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={fillColor}
                                  className="hover:opacity-80 transition-opacity duration-300"
                                />
                              );
                            })}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => [formatNumber(value as number), 'Registrations']}
                            contentStyle={{
                              backgroundColor: 'rgba(255,255,255,0.95)',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              padding: '8px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              color: '#000'
                            }}
                            labelStyle={{ color: '#333' }}
                            itemStyle={{ color: '#000' }}
                          />
                          <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Price History Chart */}
              <motion.div
                variants={itemVariants}
                initial="hidden"
                animate="visible"
                className={maximizedChart === 'priceHistory' ? 'col-span-1 lg:col-span-2' : ''}
              >
                <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                  <CardHeader className="flex flex-row items-center justify-between p-4 border-b border-gray-100/50 dark:border-gray-800/50">
                    <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent">Price History</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setMaximizedChart(maximizedChart === 'priceHistory' ? null : 'priceHistory')}
                      className="text-xs"
                    >
                      <span>{maximizedChart === 'priceHistory' ? 'Minimize' : 'Maximize'}</span>
                    </Button>
                  </CardHeader>
                  <CardContent className="p-4 pt-6">
                    <div className="h-64 w-full opacity-90 dark:opacity-100">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={priceHistory.filter(item => item.month !== '2024-12' && item.month !== '2025-02')}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis 
                            domain={['dataMin - 0.05', 'dataMax + 0.05']}
                            tickFormatter={(value) => formatIO(value)}
                          />
                          <Tooltip 
                            formatter={(value) => [formatIO(value as number), 'Average Price']}
                            contentStyle={{
                              backgroundColor: 'rgba(255,255,255,0.95)',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              padding: '8px',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                              color: '#000'
                            }}
                            labelStyle={{ color: '#333' }}
                            itemStyle={{ color: '#000' }}
                          />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="average"
                            name="Average Price"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
            {/* Unique Owners Trend (full width) */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible" className="mt-6 col-span-1 lg:col-span-2">
              <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="flex justify-between items-center p-4 border-b border-gray-100/50 dark:border-gray-800/50">
                  <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent">
                    Unique Owners Trend
                  </CardTitle>
                  {progress.total > 0 && progress.current < progress.total && (
                    <span className="ml-2 flex items-center space-x-1 text-sm text-primary-600 dark:text-primary-400">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Syncing...</span>
                    </span>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[300px] md:h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={uniqueOwnersTrend.filter(item => item.month !== '2024-12' && item.month !== '2025-02')}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            color: '#000'
                          }}
                          labelStyle={{ color: '#333' }}
                          itemStyle={{ color: '#000' }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="count" name="Unique Owners" stroke="#6366f1" strokeWidth={2} dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            {/* Combined Charts: Type Breakdown */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible" className="mt-6 col-span-1 lg:col-span-2">
              <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="flex justify-between items-center p-4 border-b border-gray-100/50 dark:border-gray-800/50">
                  <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent">
                    Type Breakdown Over Time
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[300px] md:h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={typeBreakdown.filter(item => item.month !== '2024-12' && item.month !== '2025-02')} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            color: '#000'
                          }}
                          labelStyle={{ color: '#333' }}
                          itemStyle={{ color: '#000' }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="leases" stackId="1" name="Leases" stroke="#f97316" fill="#f97316" />
                        <Area type="monotone" dataKey="permabuys" stackId="1" name="Permabuys" stroke="#6366f1" fill="#6366f1" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            {/* Name Length Buckets */}
            <motion.div variants={itemVariants} initial="hidden" animate="visible" className="mt-6">
              <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="flex justify-between items-center p-4 border-b border-gray-100/50 dark:border-gray-800/50">
                  <CardTitle className="text-lg font-semibold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent">
                    Name Length Buckets
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="h-[300px] md:h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={nameLengthBuckets} margin={{ top: 10, right: 30, left: 10, bottom: 30 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="bucket" />
                        <YAxis />
                        <Tooltip 
                          contentStyle={{
                            backgroundColor: 'rgba(255,255,255,0.95)',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            padding: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            color: '#000'
                          }}
                          labelStyle={{ color: '#333' }}
                          itemStyle={{ color: '#000' }}
                        />
                        <Bar dataKey="count" fill="#8b5cf6" name="Count" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Analytics;
