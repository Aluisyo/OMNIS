import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { ArNSRecord } from '../../types';
import { formatAddress } from '../../utils/formatters';
import { useNavigate } from 'react-router-dom';

interface VirtualizedArNSTableProps {
  data: ArNSRecord[];
  isLoading?: boolean;
}

const ROW_HEIGHT = 64;

const VirtualizedArNSTable: React.FC<VirtualizedArNSTableProps> = ({ data, isLoading = false }) => {
  const navigate = useNavigate();

  const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
    const record = data[index];
    return (
      <div
        style={style}
        className="flex border-b border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
      >
        <div className="flex-1 p-4">
          <span
            className="text-blue-600 hover:underline dark:text-blue-400 cursor-pointer"
            onClick={() => navigate(`/name/${record.name}`)}
          >
            {record.name}
          </span>
        </div>
        <div className="flex-1 p-4">
          {record.type === 'lease' ? (
            <span className="inline-block rounded-full bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">Lease</span>
          ) : record.type === 'permabuy' ? (
            <span className="inline-block rounded-full bg-green-500 px-2 py-0.5 text-xs font-medium text-white">Permabuy</span>
          ) : (
            <span className="inline-block rounded-full bg-gray-400 px-2 py-0.5 text-xs font-medium text-white">{record.type}</span>
          )}
        </div>
        <div className="flex-1 p-4">
          <span
            className="font-mono text-blue-700 dark:text-blue-400 cursor-pointer hover:underline"
            onClick={() => {
              if (record.owner) {
                navigate(`/directory?search=${encodeURIComponent(record.owner)}`);
              }
            }}
          >
            {formatAddress(record.owner ?? '')}
          </span>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">Loading...</span>
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full border border-gray-200 dark:border-gray-800 rounded-lg">
      <List
        height={600}
        itemCount={data.length}
        itemSize={ROW_HEIGHT}
        width={"100%"}
      >
        {Row}
      </List>
    </div>
  );
};

export default VirtualizedArNSTable; 