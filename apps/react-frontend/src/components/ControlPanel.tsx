import { memo } from 'react';

interface WindData {
  windSpeed: number;
  windDirection: number;
  timestamp: string;
}

interface ControlPanelProps {
  windData: WindData | null;
  formatTimestamp: (timestamp: string) => string;
  startMockData: () => void;
  stopMockData: () => void;
  sendSingleMockData: () => void;
  clearWindHistory: () => void;
}

export const ControlPanel = memo(function ControlPanel({
  windData,
  formatTimestamp,
  startMockData,
  stopMockData,
  sendSingleMockData,
  clearWindHistory
}: ControlPanelProps) {
  return (
    <div className="p-6">
      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">
        Dashboard Controls
      </h3>
      
      <div className="flex flex-col lg:flex-row justify-between items-center space-y-6 lg:space-y-0 lg:space-x-6">
        {/* Status Information */}
        <div className="flex-1 text-center lg:text-left">
          {windData ? (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                Last Data Received
              </p>
              <p className="text-lg font-bold text-green-900 dark:text-green-100">
                {formatTimestamp(windData.timestamp)}
              </p>
            </div>
          ) : (
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <p className="text-amber-800 dark:text-amber-200 font-medium">
                Waiting for wind data...
              </p>
            </div>
          )}
        </div>
        
        {/* Control Buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          <button 
            onClick={startMockData} 
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Start Mock Data
          </button>
          <button 
            onClick={stopMockData} 
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Stop Mock Data
          </button>
          <button 
            onClick={sendSingleMockData} 
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Send Single Event
          </button>
          <button 
            onClick={clearWindHistory} 
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg shadow-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Clear History
          </button>
        </div>
      </div>
    </div>
  );
});
