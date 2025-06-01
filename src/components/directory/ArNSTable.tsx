import React from 'react';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { ArNSRecord } from '../../types';
import { formatAddress } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import Button from '../common/Button';
import { motion } from 'framer-motion';

interface ArNSTableProps {
  data: ArNSRecord[];
  total: number;
  page: number;
  perPage: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  onSortChange: (field: string) => void;
  isLoading?: boolean;
}

export function formatIO(winston: string | number | undefined) {
  if (!winston) return '-';
  const io = typeof winston === 'string' ? parseFloat(winston) / 1e12 : winston / 1e12;
  if (!io) return '-';
  if (io < 1) {
    const ario = (io * 100000000) / 100;
    return ario.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' ARIO';
  }
  return io.toLocaleString(undefined, { minimumFractionDigits: 8, maximumFractionDigits: 8 }) + ' ARIO';
}

const ArNSTable: React.FC<ArNSTableProps> = ({
  data,
  total,
  page,
  perPage,
  sortBy,
  sortDirection,
  onPageChange,
  onPerPageChange,
  onSortChange,
  isLoading = false
}) => {
  const totalPages = Math.ceil(total / perPage);
  const navigate = useNavigate();
  
  // Function to handle sort
  const handleSort = (field: string) => {
    onSortChange(field);
  };
  
  // Animation variants for sort indicators
  const sortIconVariants = {
    initial: { opacity: 0, y: -5 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.2 } }
  };
  
  // Function to render sort indicator
  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) return null;
    return (
      <motion.span 
        initial="initial" 
        animate="animate" 
        variants={sortIconVariants} 
        className="ml-1 inline-flex items-center"
      >
        {sortDirection === 'asc' ? 
          <ArrowUp className="h-3 w-3 text-primary-500 dark:text-accent-blue" /> : 
          <ArrowDown className="h-3 w-3 text-primary-500 dark:text-accent-blue" />}
      </motion.span>
    );
  };

  // Animation variants
  const tableVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.05 
      }
    }
  };
  
  const rowVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 },
    hover: { scale: 1.005 }
  };
  
  return (
    <div className="w-full overflow-hidden rounded-lg border border-gray-200/50 dark:border-gray-700/30 bg-white/80 dark:bg-gray-900/40 backdrop-blur-sm shadow-sm max-w-full">
      {isLoading ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-16 text-center"
        >
          <div className="relative">
            <div className="h-12 w-12 rounded-full border-t-2 border-b-2 border-primary-500 dark:border-accent-blue animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-6 w-6 rounded-full bg-white dark:bg-gray-900"></div>
            </div>
          </div>
          <span className="mt-4 text-sm font-medium text-gray-700 dark:text-gray-300">Loading records...</span>
        </motion.div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block w-full overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700 scrollbar-track-transparent">
            <table className="w-full table-fixed divide-y divide-gray-200/70 dark:divide-gray-700/30">
              <thead className="bg-gray-50/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <tr>
                  <th className="px-3 py-3 text-left cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100/50 dark:hover:bg-gray-700/50 w-[15%]" 
                      onClick={() => handleSort('name')}>
                    <div className="flex items-center">ArNS {renderSortIndicator('name')}</div>
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-[8%]">Type</th>
                  <th className="px-3 py-3 text-left cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100/50 dark:hover:bg-gray-700/50 w-[16%]" 
                      onClick={() => handleSort('owner')}>
                    <div className="flex items-center">Owner {renderSortIndicator('owner')}</div>
                  </th>

                  <th className="px-3 py-3 text-left cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100/50 dark:hover:bg-gray-700/50 w-[15%]" 
                      onClick={() => handleSort('registeredAt')}>
                    <div className="flex items-center">Registered {renderSortIndicator('registeredAt')}</div>
                  </th>
                  <th className="px-3 py-3 text-left cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100/50 dark:hover:bg-gray-700/50 w-[15%]" 
                      onClick={() => handleSort('expiresAt')}>
                    <div className="flex items-center">Expires {renderSortIndicator('expiresAt')}</div>
                  </th>
                  <th className="px-2 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300 w-[7%]">ANT</th>
                  <th className="px-3 py-3 text-left cursor-pointer text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors hover:bg-gray-100/50 dark:hover:bg-gray-700/50 w-[15%]" 
                      onClick={() => handleSort('price')}>
                    <div className="flex items-center">Price {renderSortIndicator('price')}</div>
                  </th>
                </tr>
              </thead>
              <motion.tbody 
                variants={tableVariants}
                initial="hidden"
                animate="visible"
                className="divide-y divide-gray-200/70 dark:divide-gray-700/30 bg-white/60 dark:bg-gray-800/40 backdrop-blur-sm">
                {data.length > 0 ? (
                  data.map(record => (
                    <motion.tr
                      key={record.id ?? record.name}
                      variants={rowVariants}
                      whileHover="hover"
                      transition={{ duration: 0.2 }}
                      className="transition-all duration-200 cursor-pointer hover:bg-primary-50 dark:hover:bg-accent-blue/10 backdrop-blur-sm"

                    >
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className="text-blue-600 dark:text-blue-400 font-medium transition-all duration-200 hover:text-blue-700 dark:hover:text-blue-300 hover:underline" 
                              onClick={() => navigate(`/name/${record.name}`)}>
                          {record.name}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-sm">
                        {record.type === 'lease' ? (
                          <span className="inline-block rounded-full bg-blue-500/90 dark:bg-blue-600/90 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-white shadow-sm">Lease</span>
                        ) : record.type === 'permabuy' ? (
                          <span className="inline-block rounded-full bg-green-500/90 dark:bg-green-600/90 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-white shadow-sm">Permabuy</span>
                        ) : (
                          <span className="inline-block rounded-full bg-gray-400/90 dark:bg-gray-500/90 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-white shadow-sm">{record.type}</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                        <span
                          className="font-mono text-blue-700 dark:text-blue-400 cursor-pointer transition-all duration-200 hover:text-blue-800 dark:hover:text-blue-300 hover:underline"
                          onClick={() => {
                            if (record.owner) {
                              navigate(`/directory?search=${encodeURIComponent(record.owner)}`);
                            }
                          }}
                        >
                          {formatAddress(record.owner ?? '')}
                        </span>
                      </td>

                      <td className="font-mono px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {record.startTimestamp ? new Date(record.startTimestamp).toLocaleDateString() : '-'}
                      </td>
                      <td className="font-mono px-3 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {record.expiresAt ? 
                          new Date(record.expiresAt).toLocaleDateString() : 
                          <span className="inline-block bg-yellow-100/90 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm">Never</span>
                        }
                      </td>
                      <td className="whitespace-nowrap px-2 py-3 text-sm font-mono text-blue-600 dark:text-blue-400">
                        {record.contractTxId || record.processId ? (
                          <a 
                            href={`https://ao.link/#/token/${record.contractTxId || record.processId}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="transition-all duration-200 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
                          >
                            {(record.contractTxId || record.processId)?.slice(0, 6)}...
                          </a>
                        ) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                        {formatIO(record.purchasePrice)}
                      </td>
                    </motion.tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium">No records found matching your search criteria.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </motion.tbody>
            </table>
          </div>
          
          {/* Mobile Card View */}
          <div className="md:hidden w-full mb-4">
            <motion.div 
              variants={tableVariants}
              initial="hidden"
              animate="visible"
              className="divide-y divide-gray-200/70 dark:divide-gray-700/30 bg-white/60 dark:bg-gray-800/40 backdrop-blur-sm rounded-lg overflow-hidden"
            >
              {data.length > 0 ? (
                data.map(record => (
                  <motion.div
                    key={record.id ?? record.name}
                    variants={rowVariants}
                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(243, 244, 246, 0.7)' }}
                    transition={{ duration: 0.2 }}
                    className="p-4 transition-all duration-200 cursor-pointer hover:bg-gray-50/80 dark:hover:bg-gray-700/50 backdrop-blur-sm"
                    onClick={() => navigate(`/name/${record.name}`)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="text-blue-600 dark:text-blue-400 font-medium">{record.name}</h3>
                      {record.type === 'lease' ? (
                        <span className="inline-block rounded-full bg-blue-500/90 dark:bg-blue-600/90 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-white shadow-sm">Lease</span>
                      ) : record.type === 'permabuy' ? (
                        <span className="inline-block rounded-full bg-green-500/90 dark:bg-green-600/90 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-white shadow-sm">Permabuy</span>
                      ) : (
                        <span className="inline-block rounded-full bg-gray-400/90 dark:bg-gray-500/90 backdrop-blur-sm px-2 py-0.5 text-xs font-medium text-white shadow-sm">{record.type}</span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 text-sm mt-2">
                      <div className="text-gray-600 dark:text-gray-400">
                        <span className="text-gray-500 dark:text-gray-500">Owner:</span>{' '}
                        <span className="font-mono text-blue-700 dark:text-blue-400 truncate">
                          {formatAddress(record.owner ?? '')}
                        </span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        <span className="text-gray-500 dark:text-gray-500">Price:</span>{' '}
                        <span>{formatIO(record.purchasePrice)}</span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        <span className="text-gray-500 dark:text-gray-500">Registered:</span>{' '}
                        <span className="font-mono">{record.startTimestamp ? new Date(record.startTimestamp).toLocaleDateString() : '-'}</span>
                      </div>
                      <div className="text-gray-600 dark:text-gray-400">
                        <span className="text-gray-500 dark:text-gray-500">Expires:</span>{' '}
                        {record.expiresAt ? 
                          <span className="font-mono">{new Date(record.expiresAt).toLocaleDateString()}</span> : 
                          <span className="inline-block bg-yellow-100/90 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 px-2 py-0.5 rounded-full text-xs font-medium backdrop-blur-sm shadow-sm">Never</span>
                        }
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">No records found matching your search criteria.</span>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between border-t border-gray-200/50 dark:border-gray-700/30 bg-white/70 dark:bg-gray-800/50 backdrop-blur-sm px-6 py-4 rounded-b-lg"
          >
            {/* Mobile Pagination */}
            <div className="flex flex-1 items-center justify-between sm:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page - 1)}
                disabled={page <= 1}
                className="bg-white/80 dark:bg-gray-800/80 border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm transition-all duration-200 hover:bg-white/90 dark:hover:bg-gray-700/80 disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(page + 1)}
                disabled={page >= totalPages}
                className="bg-white/80 dark:bg-gray-800/80 border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm transition-all duration-200 hover:bg-white/90 dark:hover:bg-gray-700/80 disabled:opacity-50"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Desktop Pagination */}
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Showing
                </span>
                <select
                  value={perPage}
                  onChange={(e) => onPerPageChange(Number(e.target.value))}
                  className="rounded-md border border-gray-200/70 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/60 py-1 pl-2 pr-8 text-sm backdrop-blur-sm transition-all duration-200 focus:border-primary-400 dark:focus:border-accent-blue focus:outline-none focus:ring-2 focus:ring-primary-400/20 dark:focus:ring-accent-blue/20 dark:text-white shadow-sm"
                >
                  {[10, 25, 50, 100].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  of <span className="font-medium">{total}</span> results
                </span>
              </div>

              <div>
                <nav className="isolate inline-flex space-x-1 rounded-md" aria-label="Pagination">
                  <Button
                    variant="outline"
                    className="rounded-md bg-white/80 dark:bg-gray-800/80 border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm transition-all duration-200 hover:bg-white/90 dark:hover:bg-gray-700/80 disabled:opacity-50"
                    onClick={() => onPageChange(page - 1)}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    // Logic to show pages around current page
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={page === pageNum ? 'primary' : 'outline'}
                        onClick={() => onPageChange(pageNum)}
                        className={`aspect-square shadow-sm transition-all duration-200 ${page === pageNum ? 'bg-primary-500 dark:bg-accent-blue hover:bg-primary-600 dark:hover:bg-accent-blue/90 shadow-md' : 'bg-white/80 dark:bg-gray-800/80 border-gray-200/60 dark:border-gray-700/60 hover:bg-white/90 dark:hover:bg-gray-700/80'}`}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                  
                  <Button
                    variant="outline"
                    className="rounded-md bg-white/80 dark:bg-gray-800/80 border-gray-200/60 dark:border-gray-700/60 backdrop-blur-sm transition-all duration-200 hover:bg-white/90 dark:hover:bg-gray-700/80 disabled:opacity-50"
                    onClick={() => onPageChange(page + 1)}
                    disabled={page >= totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </nav>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default ArNSTable;