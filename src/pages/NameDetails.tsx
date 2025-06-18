import { FC, useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Globe, Clock, ExternalLink, ChevronRight, User, Calendar, Hash, Tag, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/common/Card';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import { formatAddress } from '../utils/formatters';
import { decodeName } from '../utils/punycode';
import NameDetailsTimeline from '../components/nameDetails/NameDetailsTimeline';
import { motion } from 'framer-motion';
import { useData } from '../contexts/DataContext';
import PageLoading from '../components/common/PageLoading';
import ErrorMessage from '../components/common/ErrorMessage';
import { ArNSRecord } from '../types';
import { fetchHtmlWithFallback } from '../services/wayfinderService';

const NameDetails: FC = () => {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [ownerArns, setOwnerArns] = useState<ArNSRecord[]>([]);
  const [viewMode, setViewMode] = useState<'details' | 'timeline'>('details');
  const [showUndernamesModal, setShowUndernamesModal] = useState(false);
  const { records, loading, error } = useData();
  const record = records.find(r => r.name === name) || null;

  // Clear modal states when navigating to a new record
  useEffect(() => {
    setShowOwnerModal(false);
    setOwnerArns([]);
    setShowUndernamesModal(false);
  }, [name]);

  // Preview URL via Wayfinder
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    // Reset preview URL when navigating to a new record
    setPreviewUrl(null);
    if (record?.name) {
      fetchHtmlWithFallback(`ar://${record.name}`, 3)
        .then(u => setPreviewUrl(u))
        .catch(console.error);
    }
  }, [record?.name]);

  if (loading) return <PageLoading />;

  if (error) return <ErrorMessage message={error} />;

  if (!record) return <ErrorMessage message={`No record found for ${name}`} />;

  // Helper to preview content using ar.io URL
  const renderPreview = () => {
    if (!record || !record.name) return null;
    if (!previewUrl) return null;
    const arioUrl = previewUrl;
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
    <>
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
            {decodeName(record.name)}
            {typeInfo && (
              <Badge variant={typeInfo.variant as any} className="ml-2 transition-all duration-300">{typeInfo.label}</Badge>
            )}
            {record.primaryName && (
              <Link
                to={`/name/${record.primaryName}`}
                className="ml-2 inline-block transition-all duration-300 hover:underline"
              >
                <Badge variant="secondary">PrimaryName</Badge>
              </Link>
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
                  <span className="font-mono">{decodeName(record.name)}</span>
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
                  <motion.div variants={contentVariants} className="divide-y divide-gray-100 dark:divide-gray-800">
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
                              onClick={() => {
                                setShowOwnerModal(true);
                                if (ownerArns.length === 0 && record.owner) {
                                  setOwnerArns(records.filter(r => r.owner === record.owner && r.name !== record.name));
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
                    <motion.div variants={detailItemVariants} className="flex items-center justify-between py-3 text-sm group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-md px-2 -mx-2 transition-all">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center">
                        <Hash className="h-4 w-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                        Undernames:
                      </span>
                      <span className="text-xs font-mono text-blue-600 dark:text-blue-400">
                        {(record.underNames?.length ?? record.undernames ?? 0) > 0 ? (
                          <div className="flex items-center space-x-2">
                            {record.underNames?.length ?? record.undernames}
                            <button className="text-xs flex items-center text-blue-500 hover:text-blue-700 dark:hover:text-blue-300 hover:underline transition-colors" onClick={() => setShowUndernamesModal(true)}>
                              <ChevronRight className="h-3 w-3 mr-1" />
                              View all
                            </button>
                          </div>
                        ) : (
                          '-'
                        )}
                      </span>
                    </motion.div>
                    <motion.div variants={detailItemVariants} className="flex items-center justify-between py-3 text-sm group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded-md px-2 -mx-2 transition-all">
                      <span className="text-gray-600 dark:text-gray-400 flex items-center">
                        <Tag className="h-4 w-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                        PrimaryName:
                      </span>
                      <span
                        className="font-mono text-primary-600 dark:text-accent-blue cursor-pointer hover:underline"
                        onClick={() => navigate('/directory', { state: { owner: record.primaryName } })}
                      >
                        {record.primaryName ? decodeName(record.primaryName) : '-'}
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
      {showUndernamesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-8 z-50" onClick={() => setShowUndernamesModal(false)}>
          <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl max-w-lg w-full max-h-[70vh] overflow-y-auto p-6 relative border border-gray-200/50 dark:border-gray-800/50" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-all" onClick={() => setShowUndernamesModal(false)}>
              ×
            </button>
            <h2 className="text-lg font-semibold mb-4 bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-transparent">
              Undernames for {decodeName(record.name)}
            </h2>
            {(record.underNames?.length ?? record.undernames ?? 0) === 0 ? (
              <div className="text-gray-600 dark:text-gray-400 p-4 text-center">
                No undernames found for {decodeName(record.name)}.
              </div>
            ) : (
              <ul className="space-y-2 divide-y divide-gray-100 dark:divide-gray-800">
                {record.underNames?.map((u, i) => (
                  <motion.li
                    key={i}
                    className="py-2 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded transition-all px-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link
                      to={`/undername/${u.name}`}
                      state={{ parentName: record.name }}
                      className="font-mono text-blue-700 dark:text-blue-300 hover:underline flex items-center"
                      onClick={() => setShowUndernamesModal(false)}
                    >
                      <Hash className="h-4 w-4 mr-2 text-blue-500" />
                      {decodeName(u.name)}
                    </Link>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
      {showOwnerModal && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center pt-8 bg-black/40 backdrop-blur-sm"
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
                      {decodeName(r.name)}
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
    </>
  );
}

export default NameDetails;
