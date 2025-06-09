import React, { useState, useEffect } from 'react';
import { Award, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../components/common/Card';
import Button from '../components/common/Button';
import { useData } from '../contexts/DataContext';
import { TopHolder } from '../types';
import { calculateTopHoldersInWorker, onResolutionProgress } from '../services/arnsWorkerClient';
import { formatAddress, formatNumber } from '../utils/formatters';
import { motion } from 'framer-motion';
import { cn } from '../utils/cn';
import PageLoading from '../components/common/PageLoading';
import ErrorMessage from '../components/common/ErrorMessage';

// Add a formatter for IO (assuming 1 IO = 10^12 Winston)
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

import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';

const TopHolders: React.FC = () => {
  const navigate = useNavigate();
  const { records, loading: dbLoading, error: dbError, refresh } = useData();
  const [holders, setHolders] = useState<TopHolder[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState<boolean>(true);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [limit, setLimit] = useState<number | 'big'>(10);
  // Number of big buyers to display when 'Big Buyers' tab is selected
  const BIG_BUYER_COUNT = 10;
  // Compute displayed holders based on selected tab
  const displayedHolders = limit === 'big'
    ? [...holders].sort((a, b) => b.value - a.value).slice(0, BIG_BUYER_COUNT)
    : holders.slice(0, limit as number);

  useEffect(() => {
    let unsubProgress: (() => void);
    if (!dbLoading && !dbError) {
      setAnalyticsLoading(true);
      unsubProgress = onResolutionProgress((current: number, total: number) => setProgress({ current, total }));
      calculateTopHoldersInWorker(records)
        .then(result => setHolders(result))
        .catch(err => setAnalyticsError(err.message || String(err)))
        .finally(() => { setAnalyticsLoading(false); unsubProgress(); });
    }
  }, [dbLoading, dbError, records]);

  const showProgress = (dbLoading || analyticsLoading) && progress.total > 0;

  if (dbLoading) return <PageLoading />;
  if (dbError) return <ErrorMessage message={dbError} />;
  if (analyticsLoading) return <PageLoading />;
  if (analyticsError) return <ErrorMessage message={analyticsError} />;

  // Animation variants for staggered animations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className="relative">
        {/* Decorative gradient blur */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary-200/10 dark:bg-accent-blue/5 rounded-full blur-3xl z-0" />
        
        <div className="relative z-10">
          <motion.h1 
            variants={itemVariants}
            className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent tracking-tight"
          >
            Top ArNS Holders
          </motion.h1>
          <motion.p 
            variants={itemVariants}
            className="mt-2 text-base text-gray-600 dark:text-dark-600"
          >
            The most active participants in the Arweave Name Service ecosystem
          </motion.p>
        </div>
      </div>

      {showProgress && (
        <motion.div 
          className="w-full py-4"
          variants={itemVariants}
        >
          <div className="h-3 w-full bg-gray-200/60 dark:bg-gray-700/60 backdrop-blur-sm rounded-full overflow-hidden">
            <motion.div
              className="h-3 bg-gradient-to-r from-accent-blue to-accent-lavender rounded-full"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${(progress.current / progress.total) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Processing {progress.current} / {progress.total} records...
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants}>
        <Card className="bg-white/70 dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 shadow-sm overflow-hidden">
          <CardHeader className="border-b border-gray-100 dark:border-gray-800/30">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-semibold bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent">Top {limit === 'big' ? 'Big Buyers' : limit} Holders</CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={refresh}
                isLoading={dbLoading}
                className="flex items-center gap-1 hover:bg-gray-100/80 dark:hover:bg-dark-300/30 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </Button>
            </div>
            {/* Tabs for Top 10/20/50/100 and Big Buyers */}
            <div className="flex space-x-2 mt-4">
              {([10, 20, 50, 100, 'big'] as const).map(n => (
                <button
                  key={n}
                  className={cn(
                    'px-3 py-1 rounded-full text-sm',
                    limit === n ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-700'
                  )}
                  onClick={() => setLimit(n)}
                >
                  {n === 'big' ? 'Big Buyers' : `Top ${n}`}
                </button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            {holders.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-400">No holders data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-800">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Rank
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Address
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Names
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                        Value
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayedHolders.map((holder, idx) => (
                      <motion.tr 
                        key={holder.address} 
                        className={`${idx !== displayedHolders.length - 1 ? 'border-b border-gray-100 dark:border-gray-800' : ''} hover:bg-gray-50 dark:hover:bg-gray-800/30`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05, duration: 0.2 }}
                      >
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center mr-2">
                              <Award className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <span className="font-semibold text-gray-900 dark:text-white">#{idx + 1}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100 font-mono">
                            <button 
                              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                              onClick={() => navigate(`/directory?search=${holder.address}`, { state: { owner: holder.address } })}
                            >
                              {formatAddress(holder.address)}
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{formatNumber(holder.count)}</div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-gray-100">{formatIO(holder.value)}</div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            
            {/* Holders Distribution Chart */}
            {holders.length > 0 && (
              <motion.div 
                className="mt-8"
                variants={itemVariants}
              >
                <h3 className="text-lg font-semibold mb-4 bg-gradient-to-r from-primary-600 to-primary-400 dark:from-accent-blue dark:to-accent-lavender bg-clip-text text-transparent">Holder Distribution</h3>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={displayedHolders.map(holder => ({
                        address: formatAddress(holder.address),
                        count: holder.count
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis 
                        dataKey="address" 
                        angle={-45} 
                        textAnchor="end" 
                        height={70} 
                        tick={{ fontSize: 12 }}
                        stroke="#888888"
                      />
                      <YAxis stroke="#888888" />
                      <Tooltip 
                        formatter={(value: any) => [formatNumber(value), 'Names']}
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          borderRadius: '8px',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
                          borderColor: 'rgba(0, 0, 0, 0.1)',
                        }}
                        itemStyle={{ color: '#000000', fontSize: '14px' }}
                        labelStyle={{ color: '#333333', fontSize: '12px' }}
                      />
                      <Legend />
                      <Bar dataKey="count" fill="#6366F1" name="Names Owned" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>
            )}
          </CardContent>
          <CardFooter className="text-center text-sm text-gray-600 dark:text-gray-400">
            Data updated every 30 minutes
          </CardFooter>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default TopHolders;