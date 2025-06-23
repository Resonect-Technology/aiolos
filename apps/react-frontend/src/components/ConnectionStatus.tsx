import { memo } from 'react';

interface ConnectionStatusProps {
  stationId: string;
  isConnected: boolean;
  error: string | null;
}

export const ConnectionStatus = memo(function ConnectionStatus({
  stationId,
  isConnected,
  error
}: ConnectionStatusProps) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8 hover:shadow-2xl transition-shadow duration-300">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Aiolos Wind Monitoring
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-lg">
            Real-time wind data from Vasiliki
          </p>
        </div>
        
        <div className="bg-slate-50 dark:bg-slate-700 rounded-xl p-4">
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Station: {stationId}
          </h2>
          <div className={`inline-flex items-center px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 ${
            isConnected 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 shadow-lg shadow-green-200/50 dark:shadow-green-900/50' 
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 shadow-lg shadow-red-200/50 dark:shadow-red-900/50'
          }`}>
            <span className="mr-2 text-base">
              {isConnected ? '🟢' : '🔴'}
            </span>
            Status: {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
        
        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl shadow-lg">
            <div className="flex items-center justify-center">
              <span className="text-red-500 mr-2">⚠️</span>
              <p className="text-red-700 dark:text-red-300 text-sm font-medium">
                Error: {error}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});
