import React, { useState, useEffect, useMemo } from 'react';
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
import { useNavigate, Link } from 'react-router-dom';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { decodeName } from '../utils/punycode';
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

  const primaryNamesMap = useMemo(() => {
    const map: Record<string, string> = {};
    records.forEach(rec => {
      if (rec.owner && rec.primaryName) {
        map[rec.owner] = rec.primaryName;
      }
    });
    return map;
  }, [records]);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedPrimaryName, setSelectedPrimaryName] = useState<string>('');

  // Modal items: ARNS tied to the selected primary name or fallback to owner’s ARNS
  const modalItems = useMemo(() => {
    if (!selectedPrimaryName) return [];
    const primaryMatches = records.filter(rec => rec.primaryName === selectedPrimaryName);
    if (primaryMatches.length > 0) {
      return primaryMatches;
    }
    // Fallback: list ARNS owned by this address
    return records.filter(rec => rec.owner === selectedPrimaryName);
  }, [records, selectedPrimaryName]);

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
                onClick={() => refresh()}
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
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-800">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Rank
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                          Primary Name
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
                            <button
                              className="text-blue-600 dark:text-accent-lavender hover:underline text-sm"
                              onClick={() => {
                                const key = primaryNamesMap[holder.address] ?? holder.address;
                                setSelectedPrimaryName(key);
                                setModalOpen(true);
                              }}
                            >
                              {primaryNamesMap[holder.address] ? decodeName(primaryNamesMap[holder.address]) : '-'}
                            </button>
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
                <div className="md:hidden space-y-4 mt-4">
                  {displayedHolders.map((holder, idx) => (
                    <div key={holder.address} className="bg-white dark:bg-dark-100/40 backdrop-blur-sm border border-gray-200/50 dark:border-white/5 rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Award className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                          <span className="font-semibold">#{idx + 1}</span>
                        </div>
                        <button className="text-blue-600 dark:text-accent-lavender hover:underline text-sm" onClick={() => {
                          const key = primaryNamesMap[holder.address] ?? holder.address;
                          setSelectedPrimaryName(key);
                          setModalOpen(true);
                        }}>
                          {primaryNamesMap[holder.address] ? decodeName(primaryNamesMap[holder.address]) : '-'}
                        </button>
                      </div>
                      <div>
                        <button className="font-mono text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400" onClick={() => navigate(`/directory?search=${holder.address}`, { state: { owner: holder.address } })}>
                          {formatAddress(holder.address)}
                        </button>
                      </div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">Names: {formatNumber(holder.count)}</div>
                      <div className="text-sm text-gray-900 dark:text-gray-100">Value: {formatIO(holder.value)}</div>
                    </div>
                  ))}
                </div>
              </>
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
      {modalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setModalOpen(false)}>
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl max-w-lg w-full max-h-[70vh] overflow-y-auto p-6 relative border border-gray-200/50 dark:border-gray-800/50" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all" onClick={() => setModalOpen(false)}>
              ×
            </button>
            <h2 className="text-lg font-semibold mb-4 bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-transparent">
              ArNS for {decodeName(selectedPrimaryName)}
            </h2>
            {modalItems.length > 0 ? (
              <ul className="space-y-2 divide-y divide-gray-100 dark:divide-gray-800">
                {modalItems.map((item, idx) => (
                  <motion.li key={idx} className="py-2 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded transition-all px-2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}>
                    <Link to={`/name/${item.name}`} className="font-mono text-blue-600 dark:text-accent-lavender hover:underline text-sm" onClick={() => setModalOpen(false)}>
                      {decodeName(item.name)}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            ) : (
              <div className="text-gray-600 dark:text-gray-400 p-4 text-center">No ARNS found for {decodeName(selectedPrimaryName)}.</div>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TopHolders;