import React from 'react';
import { ArNSRecord } from '../../types';
import { Users, Clock, ExternalLink, Info, Award, Zap, ArrowRight, DollarSign, User, Activity } from 'lucide-react';
import { formatAddress } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

// Format ARIO price as used elsewhere in the app
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

// Truncate address for display
function truncateAddress(address?: string): string {
  if (!address) return 'Unknown';
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

interface TimelineEvent {
  id: string;
  timestamp: number;
  type: 'registration' | 'renewal' | 'transfer' | 'update' | 'expiry';
  data?: any;
}

interface NameDetailsTimelineProps {
  record: ArNSRecord | null;
}

const NameDetailsTimeline: React.FC<NameDetailsTimelineProps> = ({ record }) => {
  const navigate = useNavigate();
  if (!record) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        No timeline data available.
      </div>
    );
  }
  
  // Format date for display
  const formatDate = (timestamp?: number): string => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Generate events for the timeline
  const generateEvents = (record: ArNSRecord): TimelineEvent[] => {
    const events: TimelineEvent[] = [];
    
    // Registration or Permabuy Start
    const regTimestamp = record.registeredAt || record.startTimestamp;
    if (regTimestamp) {
      events.push({
        id: `reg-${record.id}`,
        timestamp: regTimestamp,
        type: 'registration',
        data: {
          owner: record.owner,
          price: record.purchasePrice,
          txId: record.contractTxId,
          label: record.type === 'permabuy' ? 'Permabuy' : (record.type === 'lease' ? 'Lease Start' : 'Registration')
        }
      });
    }
    // Only add expiry and update events for leases
    if (record.type === 'lease') {
      // Lease Expiration
      if (record.expiresAt) {
        events.push({
          id: `exp-${record.id}`,
          timestamp: record.expiresAt,
          type: 'expiry',
          data: { label: 'Lease Expiration' }
        });
      }
      // Data Change (simulate)
      if (regTimestamp) {
        const now = Date.now();
        const endTime = record.expiresAt ? Math.min(record.expiresAt, now) : now;
        const midPoint = regTimestamp + Math.floor((endTime - regTimestamp) * 0.5);
        if (midPoint > regTimestamp + (24 * 60 * 60 * 1000)) {
          events.push({
            id: `upd-${record.id}`,
            timestamp: midPoint,
            type: 'update',
            data: {
              target: 'Data changed',
              label: 'Data Change'
            }
          });
        }
      }
    }
    return events.sort((a, b) => a.timestamp - b.timestamp);
  };
  
  const events = generateEvents(record);
  
  // Get icon for event type
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'registration':
        return <Award className="h-5 w-5 text-green-500" />;
      case 'renewal':
        return <Activity className="h-5 w-5 text-blue-500" />;
      case 'transfer':
        return <Users className="h-5 w-5 text-purple-500" />;
      case 'update':
        return <Zap className="h-5 w-5 text-yellow-500" />;
      case 'expiry':
        return <Clock className="h-5 w-5 text-red-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
    }
  };
  
  // Get background color for event type
  const getEventColor = (type: string): string => {
    switch (type) {
      case 'registration':
        return 'bg-green-500';
      case 'renewal':
        return 'bg-blue-500';
      case 'transfer':
        return 'bg-purple-500';
      case 'update':
        return 'bg-yellow-500';
      case 'expiry':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Get title for event type
  const getEventTitle = (type: string, data?: any): string => {
    switch (type) {
      case 'registration':
        return data?.label || 'Registration';
      case 'expiry':
        return data?.label || 'Expiry';
      case 'update':
        return data?.label || 'Update';
      default:
        return 'Event';
    }
  };
  
  // Generate event description based on type and data
  const getEventDescription = (event: TimelineEvent): string => {
    switch (event.type) {
      case 'registration':
        return event.data?.label === 'Lease Start'
          ? `Lease started${event.data?.owner ? ` by ${formatAddress(event.data.owner)}` : ''}.`
          : `Name registered${event.data?.owner ? ` by ${formatAddress(event.data.owner)}` : ''}.`;
      case 'expiry':
        return 'Lease expired.';
      case 'update':
        return 'Name data was changed.';
      default:
        return '';
    }
  };

  // Determine if an event is in the future
  const isEventInFuture = (timestamp: number): boolean => {
    return timestamp > Date.now();
  };

  // Animation variants for timeline elements
  const containerVariants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    initial: { opacity: 0, x: -10 },
    animate: { opacity: 1, x: 0 }
  };

  return (
    <motion.div 
      className="name-timeline-container mt-8 mb-6"
      initial="initial"
      animate="animate"
      variants={containerVariants}
    >
      <motion.h3 
        variants={itemVariants}
        className="text-lg font-medium mb-4 bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-transparent"
      >
        <Activity className="h-5 w-5 inline-block mr-2 text-blue-500" />
        Name Timeline
      </motion.h3>
      
      {events.length === 0 ? (
        <motion.div 
          variants={itemVariants}
          className="text-center py-8 text-gray-500 dark:text-gray-400 backdrop-blur-md bg-white/60 dark:bg-gray-900/60 rounded-lg border border-gray-200/50 dark:border-gray-800/50 shadow-lg"
        >
          No timeline events available.
        </motion.div>
      ) : (
        <motion.div 
          className="relative pl-8 border-l-2 border-gradient-to-b from-blue-500 to-purple-500 dark:from-blue-600 dark:to-purple-600"
          variants={containerVariants}
        >
          {events.map((event, index) => {
            const isFuture = isEventInFuture(event.timestamp);
            
            return (
              <motion.div 
                key={event.id} 
                className={`mb-8 relative ${
                  index === 0 ? 'pt-0' : 'pt-2'
                }`}
                variants={itemVariants}
                initial="initial"
                animate="animate"
                transition={{ delay: index * 0.05 }}
              >
                {/* Timeline dot with glow effect */}
                <motion.div 
                  className={`absolute -left-[25px] w-6 h-6 rounded-full flex items-center justify-center shadow-md
                    ${isFuture 
                      ? 'border-2 border-dashed border-gray-300 dark:border-gray-600 animate-pulse' 
                      : `border-2 ${getEventColor(event.type)} shadow-${event.type === 'registration' ? 'green' : event.type === 'expiry' ? 'red' : 'blue'}-glow`
                    }`}
                  whileHover={{ scale: 1.2 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  {isFuture && <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-500 animate-ping"></div>}
                </motion.div>
                
                {/* Content card with glass morphism */}
                <motion.div 
                  className={`backdrop-blur-md ${isFuture 
                    ? 'bg-white/40 dark:bg-gray-800/40 border-dashed border-gray-300 dark:border-gray-600 opacity-70' 
                    : 'bg-white/80 dark:bg-gray-800/80 border-gray-200/50 dark:border-gray-700/50'
                  } rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 border p-4`}
                  whileHover={{ y: -2 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <div className="p-1.5 rounded-full bg-gray-100/80 dark:bg-gray-700/80 mr-2">
                        {getEventIcon(event.type)}
                      </div>
                      <span className="font-medium bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-transparent">
                        {getEventTitle(event.type, event.data)}
                      </span>
                    </div>
                    <span className={`text-xs rounded-full px-3 py-1 flex items-center ${
                      isFuture 
                        ? 'bg-gray-100/70 text-gray-600 dark:bg-gray-700/70 dark:text-gray-300 animate-pulse' 
                        : 'bg-blue-100/70 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400'
                    }`}>
                      <Clock className="h-3 w-3 mr-1" />
                      {formatDate(event.timestamp)}
                      {isFuture && ' (Scheduled)'}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                    {getEventDescription(event)}
                  </p>
                  
                  <div className="space-y-2 mt-3 pt-2 border-t border-gray-100 dark:border-gray-800/50">
                    {event.type === 'registration' && event.data?.price && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded p-1 -mx-1 transition-colors">
                        <DollarSign className="h-4 w-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="mr-2">Price:</span>
                        <span className="font-mono">{formatIO(event.data.price)}</span>
                      </div>
                    )}
                    
                    {event.type === 'registration' && event.data?.owner && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded p-1 -mx-1 transition-colors">
                        <User className="h-4 w-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="mr-2">Owner:</span>
                        <button
                          className="font-mono text-blue-600 dark:text-blue-400 hover:underline focus:outline-none flex items-center"
                          onClick={() => navigate('/directory', { state: { owner: event.data.owner } })}
                        >
                          {truncateAddress(event.data.owner)}
                          <ArrowRight className="h-3 w-3 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                      </div>
                    )}
                    
                    {event.data?.txId && (
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400 group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded p-1 -mx-1 transition-colors">
                        <ExternalLink className="h-3 w-3 mr-1 text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="mr-1">Transaction:</span>
                        <a 
                          href={`https://www.ao.link/#/token/${event.data.txId}`} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:underline font-mono flex items-center"
                        >
                          {event.data.txId.slice(0, 8)}...{event.data.txId.slice(-6)}
                        </a>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
};

export default NameDetailsTimeline;
