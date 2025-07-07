import { memo } from 'react';

interface ConnectionStatusProps {
  isConnected: boolean;
  error: string | null;
}

export const ConnectionStatus = memo(function ConnectionStatus({
  isConnected,
  error
}: ConnectionStatusProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
          Aiolos Wind Monitoring
        </h1>
        <p className="text-slate-600 dark:text-slate-400">
          Real-time wind data from Vasiliki
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-300">
          Station: Vasiliki Weather Station
        </div>
        <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
          isConnected 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' 
            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200'
        }`}>
          <span className="mr-2">
            {isConnected ? '🟢' : '🔴'}
          </span>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-start">
            <span className="text-red-500 mr-2 mt-0.5">⚠️</span>
            <p className="text-red-700 dark:text-red-300 text-sm">
              {error}
            </p>
          </div>
        </div>
      )}
    </div>
  );
});
