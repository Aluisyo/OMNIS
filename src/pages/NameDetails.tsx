import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Globe, Clock, ExternalLink, ChevronRight, User, Calendar, Hash, Tag, DollarSign, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import Button from '../components/common/Button';
import { getArNSDetails, getArnsByOwner } from '../services/arnsService';
import { ArNSRecord } from '../types';
import { formatAddress } from '../utils/formatters';
import NameDetailsTimeline from '../components/nameDetails/NameDetailsTimeline';
import Badge from '../components/common/Badge';
import { motion } from 'framer-motion';

const NameDetails: React.FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<ArNSRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerArns, setOwnerArns] = useState<ArNSRecord[]>([]);
  const [viewMode, setViewMode] = useState<'details' | 'timeline'>('details');

  useEffect(() => {
    const fetchData = async () => {
      console.log('NameDetails fetchData called');
      console.log('Name param:', name);
      if (!name) return;
      setLoading(true);
      setError(null);
      try {
        // 1. Try IndexedDB first
        const { getRecord } = await import('../utils/db');
        const dbRecord = await getRecord(name);
        console.log('IndexedDB record fetched in NameDetails:', dbRecord);
        if (dbRecord) {
          // Map endTimestamp to expiresAt for backward compatibility
          if (dbRecord.endTimestamp && !dbRecord.expiresAt) {
            dbRecord.expiresAt = dbRecord.endTimestamp;
          }
          // Instantly use IndexedDB record if owner is present
          if (dbRecord.owner) {
            setRecord(dbRecord);
            setLoading(false);
            return;
          }
          // Fallback: fetch from network ONLY if owner is missing
          const netRecord = await getArNSDetails(name);
          if (netRecord && netRecord.owner) {
            const updatedRecord = {
              ...dbRecord,
              owner: netRecord.owner,
              // Optionally merge other critical fields if needed
              expiresAt: netRecord.expiresAt || dbRecord.expiresAt,
              purchasePrice: netRecord.purchasePrice || dbRecord.purchasePrice,
              contractTxId: netRecord.contractTxId || dbRecord.contractTxId,
              type: netRecord.type || dbRecord.type,
            };
            setRecord(updatedRecord);
            // Save to IndexedDB so the worker can use the updated info
            const { saveRecordsSmart } = await import('../utils/db');
            await saveRecordsSmart([updatedRecord]);
          } else {
            setRecord(dbRecord);
          }
          setLoading(false);
        } else {
          // 2. Fallback to network fetch
          const data = await getArNSDetails(name);
          setRecord(data);
          if (data && data.error) {
            setError(data.error);
          } else {
            setError(null);
          }
          setLoading(false);
        }
      } catch (err) {
        setError(`Failed to fetch details for ${name}. Please try again later.`);
        setLoading(false);
      }
    };
    fetchData();
  }, [name]);

  // Helper to preview content using ar.io URL
  const renderPreview = () => {
    if (!record || !record.name) return null;
    const arioUrl = `https://${record.name}.ar.io`;
    return (
      <motion.div 
        className="mt-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-2 text-sm text-gray-500 dark:text-gray-400">
          <Globe className="h-4 w-4 text-blue-500" /> 
          <span className="bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent font-medium">Website Preview</span>
        </div>
        <div 
          className="relative w-full rounded-lg overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-800/50" 
          style={{ minHeight: '240px', height: 'auto' }}
        >
          <iframe
            src={arioUrl}
            title="ar.io Preview"
            className="w-full h-[400px] min-h-[240px] sm:h-[400px] border-0 rounded-lg"
            style={{ display: 'block' }}
            allowFullScreen
          />
        </div>
      </motion.div>
    );
  };

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

  // Animation variants
  const pageVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
    exit: { opacity: 0 }
  };

  const itemVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    exit: { opacity: 0, y: -20 }
  };

  if (loading) {
    return (
      <motion.div 
        className="space-y-6"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
      >
        <motion.div variants={itemVariants} className="animate-pulse">
          <div className="h-8 w-64 rounded bg-gray-200 dark:bg-gray-700"></div>
          <div className="mt-2 h-4 w-48 rounded bg-gray-200 dark:bg-gray-700"></div>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Card className="animate-pulse backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-800/50 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardHeader>
              <div className="h-6 w-32 rounded bg-gray-200 dark:bg-gray-700"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              {viewMode === 'timeline' ? (
                <div className="h-40 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
              ) : (
                <>
                  <div className="h-5 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-5 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-5 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-5 w-full rounded bg-gray-200 dark:bg-gray-700"></div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div 
        className="space-y-6"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
      >
        <motion.div variants={itemVariants}>
          <Button variant="ghost" className="inline-flex items-center text-blue-600 hover:underline dark:text-blue-400 px-0 transition-all duration-300" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Directory
          </Button>
          <h1 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-transparent">
            Name Details
          </h1>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-800/50 shadow-xl transition-all duration-300">
            <CardContent className="py-12 text-center">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="rounded-md bg-red-50/80 p-4 dark:bg-red-900/30 backdrop-blur-sm"
              >
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Shield className="h-5 w-5 text-red-500 dark:text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200">{error}</p>
                  </div>
                </div>
              </motion.div>
              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-6"
              >
                <Button
                  variant="primary"
                  className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  if (!record) {
    return (
      <motion.div 
        className="space-y-6"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
      >
        <motion.div variants={itemVariants}>
          <Button variant="ghost" className="inline-flex items-center text-blue-600 hover:underline dark:text-blue-400 px-0 transition-all duration-300" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back to Directory
          </Button>
          <h1 className="mt-2 text-2xl font-bold bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-transparent">
            Name Details
          </h1>
        </motion.div>
        
        <motion.div variants={itemVariants}>
          <Card className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-800/50 shadow-xl hover:shadow-2xl transition-all duration-300">
            <CardContent className="py-12 text-center">
              <motion.p 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-gray-600 dark:text-gray-400"
              >
                No record found for the specified name.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  variant="primary"
                  className="mt-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                  onClick={() => window.location.reload()}
                >
                  Retry
                </Button>
              </motion.div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    );
  }

  // Animation for main content
  const contentVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1, 
      transition: { 
        staggerChildren: 0.05, 
        delayChildren: 0.1,
        duration: 0.4 
      } 
    }
  };

  const detailItemVariants = {
    initial: { opacity: 0, x: -5 },
    animate: { opacity: 1, x: 0 }
  };

  const typeMap: Record<string, { variant: string; label: string }> = {
    lease: { variant: 'default', label: 'Lease' },
    temporary: { variant: 'default', label: 'Lease' },
    permabuy: { variant: 'success', label: 'Permabuy' },
    permanent: { variant: 'success', label: 'Permabuy' }
  };
  
  // Safe access to typeMap with lowercase type
  const normalizedType = record?.type?.toLowerCase() || '';
  const typeInfo = normalizedType ? (typeMap[normalizedType] || null) : null;

  return (
    <motion.div 
      className="space-y-6"
      initial="initial"
      animate="animate"
      exit="exit"
      variants={pageVariants}
    >
      <motion.div variants={itemVariants}>
        <Button 
          variant="ghost" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 px-0 transition-all duration-300" 
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Directory
        </Button>
        <h1 className="mt-2 text-2xl font-bold bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-transparent">
          {record.name}
          {typeInfo && (
            <Badge variant={typeInfo.variant as any} className="ml-2 transition-all duration-300">{typeInfo.label}</Badge>
          )}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          ArNS Name Details
        </p>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card className="overflow-hidden backdrop-blur-md bg-white/80 dark:bg-gray-900/80 border border-gray-200/50 dark:border-gray-800/50 shadow-xl hover:shadow-2xl transition-all duration-300">
          <CardHeader className="flex flex-col space-y-2 p-4 border-b border-gray-200/50 dark:border-gray-800/50">
            <motion.div 
              className="flex flex-col md:flex-row md:items-center md:justify-between gap-2"
              variants={contentVariants}
            >
              <CardTitle className="text-xl font-semibold bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 text-transparent flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                <span className="font-mono">{record.name}</span>
              </CardTitle>
              
              <div className="flex items-center space-x-2">
                {/* View toggle with improved styling */}
                <div className="border border-gray-200/50 dark:border-gray-800/50 rounded-md overflow-hidden flex shadow-sm">
                  <Button
                    variant={viewMode === 'details' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('details')}
                    className={`rounded-r-none px-3 transition-all duration-300 ${viewMode === 'details' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : ''}`}
                  >
                    <Hash className="h-4 w-4 mr-1" />
                    Details
                  </Button>
                  <Button
                    variant={viewMode === 'timeline' ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('timeline')}
                    className={`rounded-l-none px-3 transition-all duration-300 ${viewMode === 'timeline' ? 'bg-gradient-to-r from-blue-600 to-indigo-600' : ''}`}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    Timeline
                  </Button>
                </div>
                
                <div className="flex items-center">
                  {record.active === false && (
                    <Badge variant="warning" className="ml-2 animate-pulse">Inactive</Badge>
                  )}
                </div>
              </div>
            </motion.div>
            {record.category && (
              <motion.div variants={itemVariants} className="mt-1 text-xs inline-block rounded bg-blue-100/80 px-2 py-0.5 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 backdrop-blur-sm transition-all">
                <Tag className="h-3 w-3 inline mr-1" />
                {record.category}
              </motion.div>
            )}
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            {viewMode === 'timeline' ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                {record && <NameDetailsTimeline record={record} />}
              </motion.div>
            ) : (
              <>
                <motion.div variants={contentVariants} className="divide-y divide-gray-100 dark:divide-gray-800/50">
                  <motion.div variants={detailItemVariants} className="flex items-center justify-between py-3 text-sm group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-md px-2 -mx-2 transition-all">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <DollarSign className="h-4 w-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                      Purchase Price:
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {record.purchasePrice ? formatIO(record.purchasePrice) : '-'}
                    </span>
                  </motion.div>
                  <motion.div variants={detailItemVariants} className="flex items-center justify-between py-3 text-sm group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-md px-2 -mx-2 transition-all">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <User className="h-4 w-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                      Owner:
                    </span>
                    <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                      {record.owner ? (
                        <div className="flex items-center space-x-2">
                          <a href={`https://www.ao.link/#/entity/${record.owner}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center">
                            {formatAddress(record.owner)}
                            <ExternalLink className="h-3 w-3 ml-1 inline" />
                          </a>
                          <button 
                            className="text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors flex items-center"
                            onClick={async () => {
                              setShowOwnerModal(true);
                              if (ownerArns.length === 0 && record.owner) {
                                const grouped = await getArnsByOwner();
                                setOwnerArns(grouped?.[record.owner] || []);
                              }
                            }}
                          >
                            <ChevronRight className="h-3 w-3 mr-1" />
                            View all
                          </button>
                        </div>
                      ) : (
                        '-'
                      )}
                    </span>
                  </motion.div>
                  {/* Modal for owner's ArNS list */}
                  {showOwnerModal && (
                    <div
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                      onClick={() => setShowOwnerModal(false)}
                    >
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl max-w-lg w-full max-h-[70vh] overflow-y-auto p-6 relative border border-gray-200/50 dark:border-gray-800/50"
                        onClick={e => e.stopPropagation()}
                      >
                        <button
                          className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                          onClick={() => setShowOwnerModal(false)}
                        >
                          ×
                        </button>
                        <h2 className="text-lg font-semibold mb-4 bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-transparent">Other ArNS owned by {record.owner && formatAddress(record.owner)}</h2>
                        {ownerArns.length === 0 ? (
                          <div className="text-gray-600 dark:text-gray-400 p-4 text-center">No other ArNS records found for this owner.</div>
                        ) : (
                          <ul className="space-y-2 divide-y divide-gray-100 dark:divide-gray-800">
                            {ownerArns.map((r, idx) => (
                              <motion.li 
                                key={idx} 
                                className="py-2 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded transition-all px-2"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                              >
                                <Link
                                  to={`/name/${r.name}`}
                                  className={`font-mono text-blue-700 dark:text-blue-300 hover:underline flex items-center ${r.name === record.name ? 'pointer-events-none opacity-60' : ''}`}
                                  onClick={() => setShowOwnerModal(false)}
                                >
                                  <Globe className="h-4 w-4 mr-2 text-blue-500" />
                                  {r.name}
                                  {r.name === record.name && (
                                    <span className="ml-2 bg-blue-200/80 dark:bg-blue-800/80 text-blue-800 dark:text-blue-200 px-2 rounded text-xs backdrop-blur-sm">(current)</span>
                                  )}
                                </Link>
                              </motion.li>
                            ))}
                          </ul>
                        )}
                      </motion.div>
                    </div>
                  )}
                  <motion.div variants={detailItemVariants} className="flex items-center justify-between py-3 text-sm group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-md px-2 -mx-2 transition-all">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <Hash className="h-4 w-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                      Undernames:
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {typeof record.undernames === 'number' ? record.undernames : '-'}
                    </span>
                  </motion.div>
                  <motion.div variants={detailItemVariants} className="flex items-center justify-between py-3 text-sm group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-md px-2 -mx-2 transition-all">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                      Lease Duration:
                    </span>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {record.startTimestamp && record.expiresAt
                        ? (() => {
                            const years = Math.min((record.expiresAt - record.startTimestamp) / (1000 * 60 * 60 * 24 * 365), 5);
                            return years > 0 ? years.toFixed(2) + ' years' : '-';
                          })()
                        : '-'}
                    </span>
                  </motion.div>
                  <motion.div variants={detailItemVariants} className="flex items-center justify-between py-3 text-sm group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-md px-2 -mx-2 transition-all">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                      Lease Start:
                    </span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {record.startTimestamp ? new Date(record.startTimestamp).toLocaleString('en-GB', { hour12: false }) : '-'}
                    </span>
                  </motion.div>
                  <motion.div variants={detailItemVariants} className="flex items-center justify-between py-3 text-sm group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-md px-2 -mx-2 transition-all">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                      Expires:
                    </span>
                    <span className="text-gray-800 dark:text-gray-200">
                      {typeof record.expiresAt === 'number' && record.expiresAt > 0
                        ? new Date(record.expiresAt).toLocaleString('en-GB', { hour12: false })
                        : <Badge variant="warning" className="animate-pulse">Never</Badge>}
                    </span>
                  </motion.div>
                  <motion.div variants={detailItemVariants} className="flex items-center justify-between py-3 text-sm group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-md px-2 -mx-2 transition-all">
                    <span className="text-gray-600 dark:text-gray-400 flex items-center">
                      <Tag className="h-4 w-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                      ANT:
                    </span>
                    <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                      {record.processId ? (
                        <a href={`https://www.ao.link/#/token/${record.processId}`} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center">
                          {record.processId.slice(0, 8)}...{record.processId.slice(-6)}
                          <ExternalLink className="h-3 w-3 ml-1 inline" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </span>
                  </motion.div>
                </motion.div>
                {renderPreview()}
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

export default NameDetails;
