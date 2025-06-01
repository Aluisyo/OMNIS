import React from 'react';
import { ArNSRecord } from '../../types';
import { Calendar, Users, Tag, ExternalLink, Activity } from 'lucide-react';
import { formatIO } from './ArNSTable';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

interface DirectoryTimelineProps {
  records: ArNSRecord[];
  onNameClick?: (name: string) => void;
  ascending?: boolean;
}

const DirectoryTimeline: React.FC<DirectoryTimelineProps> = ({ 
  records,
  onNameClick,
  ascending = false
}) => {
  if (!records || records.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-center py-8 text-gray-500 dark:text-gray-400 backdrop-blur-md bg-white/60 dark:bg-gray-900/60 rounded-lg border border-gray-200/50 dark:border-gray-800/50 shadow-lg"
      >
        No records to display in timeline view.
      </motion.div>
    );
  }
  
  // Format date for display
  const formatDate = (timestamp?: number | null): string => {
    if (typeof timestamp !== 'number' || isNaN(timestamp)) return 'Unknown date';
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Truncate address for display
  const truncateAddress = (address?: string): string => {
    if (!address) return 'Unknown';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };
  
  // Get a color based on name (for visual variety)
  const getNameColor = (name: string): string => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-purple-500', 
      'bg-indigo-500', 'bg-pink-500', 'bg-yellow-500'
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Animation variants for staggered timeline items
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
    animate: { 
      opacity: 1, 
      x: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 20
      }
    }
  };

  return (
    <motion.div 
      initial="initial"
      animate="animate"
      variants={containerVariants}
      className="timeline-container mt-6 mb-8 pb-4"
    >
      <motion.h3 
        variants={itemVariants} 
        className="text-lg font-medium mb-6 bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 text-transparent tracking-tight"
      >
        <Activity className="inline-block h-5 w-5 mr-2 text-blue-500" />
        Registration Timeline
      </motion.h3>
      
      <motion.div 
        className="relative pl-6 border-l-2 border-gradient-to-b from-blue-500 to-purple-500 dark:from-blue-600 dark:to-purple-600 ml-16 md:ml-20"
        variants={containerVariants}
      >
        {[...records]
          .sort((a, b) => {
            const aTime = a.registeredAt ?? a.startTimestamp ?? 0;
            const bTime = b.registeredAt ?? b.startTimestamp ?? 0;
            if (ascending) {
              return aTime - bTime;
            } else {
              return bTime - aTime;
            }
          })
          .map((record, index) => {
            // Calculate time difference for recent registrations
            const now = new Date().getTime();
            const regTime = record.registeredAt || 0;
            const diffHours = (now - regTime) / (1000 * 60 * 60);
            const isRecent = diffHours < 24;
            
            return (
              <motion.div 
                key={record.id || index} 
                variants={itemVariants}
                className={`mb-5 relative ${
                  index === 0 ? 'pt-0' : 'pt-1'
                }`}
              >
                {/* Timeline dot with glow effect */}
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.2 }}
                  transition={{ delay: index * 0.05 + 0.2, type: "spring", stiffness: 400, damping: 10 }}
                  className={`absolute -left-[20px] w-5 h-5 rounded-full border-2 shadow-md z-10 ${getNameColor(record.name)}`}
                ></motion.div>
                
                {/* Time indicator - increased width and moved further left */}
                <motion.div 
                  className="absolute -left-[125px] top-0 w-24 text-right"
                  variants={itemVariants}
                >
                  <span className="inline-block text-xs font-medium text-gray-500 dark:text-gray-400 bg-white/70 dark:bg-gray-800/70 px-1.5 py-0.5 rounded-md backdrop-blur-sm shadow-sm whitespace-normal">
                    {typeof record.registeredAt === 'number' && !isNaN(record.registeredAt)
                      ? new Date(record.registeredAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                      : typeof record.startTimestamp === 'number' && !isNaN(record.startTimestamp)
                        ? new Date(record.startTimestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : 'Unknown'
                    }
                  </span>
                </motion.div>
                
                {/* Content card with glass morphism */}
                <motion.div 
                  className="backdrop-blur-md bg-white/80 dark:bg-gray-800/80 rounded-lg shadow hover:shadow-md border border-gray-200/50 dark:border-gray-700/50 p-3 ml-4 transition-all duration-300 group"
                  whileHover={{ y: -1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <Link 
                      to={`/name/${record.name}`}
                      className="text-base font-semibold text-blue-600 dark:text-blue-400 hover:underline transition-all duration-200 hover:text-blue-700 dark:hover:text-blue-300 flex items-center group-hover:translate-x-0.5"
                      onClick={(e) => {
                        if (onNameClick) {
                          e.preventDefault();
                          onNameClick(record.name);
                        }
                      }}
                    >
                      {record.name}
                      <ExternalLink className="h-3.5 w-3.5 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    </Link>
                    <span className={`text-xs rounded-full px-2.5 py-1 shadow-sm backdrop-blur-sm flex items-center ${
                      isRecent ? 'bg-green-100/80 text-green-800 dark:bg-green-900/40 dark:text-green-400' : 'bg-blue-100/70 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400'
                    }`}>
                      <Calendar className="h-3 w-3 mr-1" />
                      {typeof record.registeredAt === 'number' && !isNaN(record.registeredAt)
                        ? formatDate(record.registeredAt)
                        : typeof record.startTimestamp === 'number' && !isNaN(record.startTimestamp)
                          ? formatDate(record.startTimestamp)
                          : 'Unknown date'
                      }
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded p-1 -mx-1 transition-colors">
                      <Users className="h-3.5 w-3.5 mr-1.5 text-blue-500 group-hover:scale-110 transition-transform" />
                      <span className="mr-1.5">Owner:</span>
                      <span className="font-mono text-xs">{truncateAddress(record.owner)}</span>
                    </div>
                  
                    {(typeof record.purchasePrice === 'string' || typeof record.purchasePrice === 'number') && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded p-1 -mx-1 transition-colors">
                        <Calendar className="h-3.5 w-3.5 mr-1.5 text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="mr-1.5">Price:</span>
                        <span className="font-mono text-xs">{formatIO(record.purchasePrice)}</span>
                      </div>
                    )}
                    
                    {record.expiresAt && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded p-1 -mx-1 transition-colors">
                        <Calendar className="h-3.5 w-3.5 mr-1.5 text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="mr-1.5">Expires:</span>
                        <span className="font-mono text-xs">{new Date(record.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                      </div>
                    )}
                    
                    {Array.isArray(record.tags) && record.tags.length > 0 && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 group hover:bg-gray-50/50 dark:hover:bg-gray-800/30 rounded p-1 -mx-1 transition-colors">
                        <Tag className="h-4 w-4 mr-2 text-blue-500 group-hover:scale-110 transition-transform" />
                        <span className="mr-2">Tags:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {record.tags.slice(0, 3).map((tag, i) => (
                            <span key={i} className="bg-blue-100/70 text-blue-800 dark:bg-blue-900/40 dark:text-blue-400 text-xs px-2 py-0.5 rounded-full backdrop-blur-sm">
                              {tag}
                            </span>
                          ))}
                          {record.tags.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 px-1">+{record.tags.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
      </motion.div>
    </motion.div>
  );
};

export default DirectoryTimeline;
