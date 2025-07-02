import { useState, useEffect } from 'react';

interface DiagnosticsData {
  id?: number;
  stationId: string;
  batteryVoltage: number;
  solarVoltage: number;
  internalTemperature: number | null;
  signalQuality: number;
  uptime: number;
  createdAt?: string;
  updatedAt?: string;
}

interface DiagnosticsPanelProps {
  stationId: string;
}

export function DiagnosticsPanel({ stationId }: DiagnosticsPanelProps) {
  const [diagnosticsData, setDiagnosticsData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDiagnostics = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const url = `/api/stations/${stationId}/diagnostics`;
        console.log(`Fetching diagnostics from: ${url}`);
        const response = await fetch(url);
        
        console.log('Response status:', response.status);
        console.log('Response headers:', [...response.headers.entries()]);
        
        if (!response.ok) {
          if (response.status === 404) {
            // Handle 404 specially - it's not really an error, just no data
            console.log('No diagnostics data found for this station');
            setDiagnosticsData(null);
            setLoading(false);
            return;
          }
          
          // Try to get the error message from the response
          let errorText = `Failed to fetch diagnostics: ${response.status} ${response.statusText}`;
          try {
            const errorData = await response.text();
            console.log('Error response body:', errorData);
            errorText += ` - ${errorData}`;
          } catch (e) {
            // Ignore errors reading the response body
          }
          
          throw new Error(errorText);
        }
        
        const data = await response.json();
        console.log('Received diagnostics data:', data);
        setDiagnosticsData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch diagnostics');
        console.error('Error fetching diagnostics:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDiagnostics();

    // Set up a refresh interval (every 2 minutes)
    const intervalId = setInterval(fetchDiagnostics, 2 * 60 * 1000);
    
    return () => clearInterval(intervalId);
  }, [stationId]);

  // Format uptime from seconds to a human-readable format
  const formatUptime = (seconds: number) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return 'N/A';
    
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    return `${days}d ${hours}h ${minutes}m`;
  };

  // Format timestamp to local date and time
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  };

  // Convert signal quality from dBm to a human-readable format
  const formatSignalQuality = (dbm: number) => {
    if (dbm === undefined || dbm === null) return 'N/A';
    
    // Convert dBm to signal bars (1-5)
    const bars = getSignalBars(dbm);
    
    // Return a descriptive string based on signal quality
    if (bars <= 1) return `${dbm} dBm (Poor)`;
    if (bars <= 2) return `${dbm} dBm (Fair)`;
    if (bars <= 3) return `${dbm} dBm (Good)`;
    if (bars <= 4) return `${dbm} dBm (Very Good)`;
    return `${dbm} dBm (Excellent)`;
  };

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
        Station Diagnostics
      </h2>
      
      {loading && !diagnosticsData && (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded relative mb-4">
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      
      {diagnosticsData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Battery Status */}
          <div className="bg-white dark:bg-slate-700 rounded-xl shadow p-4">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Power Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Battery Voltage:</span>
                <span className="font-medium">
                  {diagnosticsData.batteryVoltage !== null && diagnosticsData.batteryVoltage !== undefined 
                    ? `${diagnosticsData.batteryVoltage.toFixed(2)}V` 
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Solar Voltage:</span>
                <span className="font-medium">
                  {diagnosticsData.solarVoltage !== null && diagnosticsData.solarVoltage !== undefined 
                    ? `${diagnosticsData.solarVoltage.toFixed(2)}V` 
                    : 'N/A'}
                </span>
              </div>
              
              {/* Battery Level Visual Indicator */}
              <div className="mt-2">
                <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">Battery Level</div>
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${getBatteryColorClass(diagnosticsData.batteryVoltage)}`} 
                    style={{ width: `${getBatteryPercentage(diagnosticsData.batteryVoltage || 0)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          
          {/* System Status */}
          <div className="bg-white dark:bg-slate-700 rounded-xl shadow p-4">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">System Status</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Internal Temp:</span>
                <span className="font-medium">
                  {diagnosticsData.internalTemperature !== null && diagnosticsData.internalTemperature !== undefined 
                    ? `${diagnosticsData.internalTemperature.toFixed(1)}°C` 
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Uptime:</span>
                <span className="font-medium">
                  {diagnosticsData.uptime !== null && diagnosticsData.uptime !== undefined 
                    ? formatUptime(diagnosticsData.uptime) 
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Last Update:</span>
                <span className="font-medium">{formatTimestamp(diagnosticsData.createdAt || '')}</span>
              </div>
            </div>
          </div>
          
          {/* Connectivity */}
          <div className="bg-white dark:bg-slate-700 rounded-xl shadow p-4">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Connectivity</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600 dark:text-slate-300">Signal Quality:</span>
                <span className="font-medium">
                  {diagnosticsData.signalQuality !== null && diagnosticsData.signalQuality !== undefined 
                    ? formatSignalQuality(diagnosticsData.signalQuality) 
                    : 'N/A'}
                </span>
              </div>
              
              {/* Signal Strength Visual Indicator */}
              <div className="mt-2">
                <div className="text-sm text-slate-600 dark:text-slate-300 mb-1">Signal Strength</div>
                <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-2.5">
                  <div 
                    className={`h-2.5 rounded-full ${getSignalColorClass(diagnosticsData.signalQuality)}`} 
                    style={{ width: `${getSignalPercentage(diagnosticsData.signalQuality || -120)}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Signal Bars Visualization */}
              <div className="flex space-x-1 mt-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div 
                    key={index}
                    className={`w-2 rounded-sm ${
                      index < getSignalBars(diagnosticsData.signalQuality || -120) 
                        ? getSignalColorClass(diagnosticsData.signalQuality || -120) 
                        : 'bg-slate-200 dark:bg-slate-600'
                    }`}
                    style={{ height: `${6 + (index * 3)}px` }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {!loading && !error && !diagnosticsData && (
        <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200 px-4 py-3 rounded relative">
          <span className="block sm:inline">No diagnostics data available for this station. Diagnostics data will appear here once the station has sent its first diagnostics report.</span>
        </div>
      )}
    </div>
  );
}

// Helper functions for styling
function getBatteryPercentage(voltage: number): number {
  if (voltage === undefined || voltage === null) return 0;
  // Assuming battery range is approximately 3.0V (empty) to 4.2V (full)
  const minVoltage = 3.0;
  const maxVoltage = 4.2;
  const percentage = Math.min(100, Math.max(0, ((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100));
  return Math.round(percentage);
}

function getBatteryColorClass(voltage: number): string {
  if (voltage === undefined || voltage === null) return 'bg-gray-500';
  const percentage = getBatteryPercentage(voltage);
  if (percentage < 20) return 'bg-red-500';
  if (percentage < 50) return 'bg-yellow-500';
  return 'bg-green-500';
}

// Convert dBm signal strength to a percentage
// Typical cellular dBm ranges from -50 (excellent) to -120 (very poor)
function getSignalPercentage(dbm: number): number {
  if (dbm === undefined || dbm === null) return 0;
  
  // Note: Higher dBm values are better (less negative)
  // -50 dBm is excellent (~100%), -120 dBm is very poor (~0%)
  const minDbm = -120; // Very poor signal
  const maxDbm = -50;  // Excellent signal
  
  // Handle edge cases where reported signal might be outside expected range
  if (dbm > maxDbm) return 100;
  if (dbm < minDbm) return 0;
  
  // Convert to percentage (0-100)
  const percentage = ((dbm - minDbm) / (maxDbm - minDbm)) * 100;
  return Math.round(percentage);
}

// Convert dBm to signal bars (1-5)
function getSignalBars(dbm: number): number {
  if (dbm === undefined || dbm === null) return 0;
  
  // Map dBm ranges to signal bars
  if (dbm >= -70) return 5;  // Excellent: -70 to -50 dBm
  if (dbm >= -85) return 4;  // Very good: -85 to -71 dBm
  if (dbm >= -95) return 3;  // Good: -95 to -86 dBm
  if (dbm >= -105) return 2; // Fair: -105 to -96 dBm
  if (dbm >= -120) return 1; // Poor: -120 to -106 dBm
  return 0; // No signal or extremely poor
}

function getSignalColorClass(dbm: number): string {
  if (dbm === undefined || dbm === null) return 'bg-gray-500';
  
  const bars = getSignalBars(dbm);
  if (bars <= 1) return 'bg-red-500';
  if (bars <= 2) return 'bg-orange-500';
  if (bars <= 3) return 'bg-yellow-500';
  if (bars <= 4) return 'bg-green-500';
  return 'bg-green-500';
}
