import React from 'react';
import { Bell, BellOff, RefreshCw } from 'lucide-react';
import { useNotifications } from '../../contexts/NotificationContext';
import Button from '../common/Button';
import { formatTimeAgo } from '../../utils/formatters';

const NotificationControls: React.FC = () => {
  const { 
    notificationsEnabled, 
    autoRefreshEnabled, 
    isLoading, 
    lastRefreshed,
    toggleNotifications,
    toggleAutoRefresh,
    manualRefresh
  } = useNotifications();

  return (
    <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
      <Button
        variant="outline"
        size="sm"
        onClick={toggleAutoRefresh}
        className={`w-full sm:w-auto ${autoRefreshEnabled ? "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:border-green-700 dark:text-green-400" : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
      >
        {autoRefreshEnabled ? 'Auto-refresh on' : 'Auto-refresh off'}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={toggleNotifications}
        className={`w-full sm:w-auto ${notificationsEnabled ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-400" : "border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"}`}
      >
        {notificationsEnabled ? (
          <>
            <Bell className="mr-1 h-4 w-4" />
            Notifications on
          </>
        ) : (
          <>
            <BellOff className="mr-1 h-4 w-4" />
            Notifications off
          </>
        )}
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={manualRefresh}
        isLoading={isLoading}
        disabled={isLoading}
        className="w-full sm:w-auto border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <RefreshCw className="mr-1 h-4 w-4" />
        Refresh
      </Button>
      
      {lastRefreshed && (
        <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
          Last updated: {formatTimeAgo(Math.floor(lastRefreshed.getTime() / 1000))}
        </span>
      )}
    </div>
  );
};

export default NotificationControls;
