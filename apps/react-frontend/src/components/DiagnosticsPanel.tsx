import { useState, useEffect, useRef } from 'react';
import { Transmit } from '@adonisjs/transmit-client';
import { formatLastUpdated, getTimestampClasses } from '../lib/time-utils';

interface DiagnosticsData {
  id?: number;
  stationId: string;
  batteryVoltage: number;
  solarVoltage: number;
  internalTemperature: number | null;
  signalQuality: number;
  uptime: number;
  timestamp: string;
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

  const transmitInstanceRef = useRef<Transmit | null>(null);
  const subscriptionRef = useRef<any | null>(null);

  useEffect(() => {
    // Clear any previous connection state
    setError(null);
    setLoading(true);

    // Initialize Transmit instance if it doesn't exist
    if (!transmitInstanceRef.current) {
      console.log('Creating new Transmit instance for diagnostics');
      transmitInstanceRef.current = new Transmit({
        baseUrl: window.location.origin,
      });
    }

    const transmit = transmitInstanceRef.current;
    const channelName = `station/diagnostics/${stationId}`;

    const newSubscription = transmit.subscription(channelName);
    subscriptionRef.current = newSubscription;

    newSubscription.create()
      .then(() => {
        setLoading(false);
        setError(null);
        console.log(`Connected to diagnostics channel: ${channelName}`);

        newSubscription.onMessage((data: DiagnosticsData) => {
          console.log('Diagnostics data received:', data);
          if (data && typeof data.batteryVoltage === 'number') {
            setDiagnosticsData(data);
          } else {
            // Handle wrapped message format
            const messagePayload = (data as any).data;
            if (messagePayload && typeof messagePayload.batteryVoltage === 'number') {
              setDiagnosticsData(messagePayload);
            } else {
              console.warn('Received diagnostics message in unexpected format:', data);
            }
          }
        });
      })
      .catch(err => {
        console.error('Failed to connect to diagnostics channel:', err);
        setError(`Failed to connect: ${err.message || 'Unknown error'}`);
        setLoading(false);
        
        // Fallback to API polling if SSE fails
        fetchDiagnosticsFromAPI();
      });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.delete()
          .catch((err: Error) => console.error(`Failed to unsubscribe from ${channelName}:`, err));
        subscriptionRef.current = null;
      }
    };
  }, [stationId]);

  // Fallback function for API polling
  const fetchDiagnosticsFromAPI = async () => {
    try {
      console.log(`Fetching diagnostics from API for station: ${stationId}`);
      const url = `/api/stations/${stationId}/diagnostics`;
      const response = await fetch(url);
      
      if (!response.ok) {
        if (response.status === 404) {
          console.log('No diagnostics data found for this station');
          setDiagnosticsData(null);
          return;
        }
        console.log(`API Error (${response.status}): Could not fetch diagnostics data`);
        return;
      }
      
      const data = await response.json();
      console.log('Diagnostics data from API:', data);
      
      // Convert API response to expected format
      if (data.batteryVoltage !== undefined) {
        setDiagnosticsData({
          ...data,
          timestamp: data.createdAt || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error fetching diagnostics from API:', err);
    }
  };

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

  // Convert CSQ signal quality to a human-readable format for 2G/GPRS
  const formatSignalQuality = (csq: number) => {
    if (csq === undefined || csq === null) return 'N/A';
    
    // CSQ values are typically 0-31 for 2G/GPRS modems
    let quality = '';
    if (csq >= 20) {
      quality = 'Excellent';
    } else if (csq >= 15) {
      quality = 'Good';
    } else if (csq >= 10) {
      quality = 'Fair';
    } else if (csq >= 5) {
      quality = 'Poor';
    } else {
      quality = 'Very Poor';
    }
    
    return `CSQ: ${csq} (${quality})`;
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
          {/* Timestamp */}
          {diagnosticsData.timestamp && (
            <div className="md:col-span-3 text-center mb-4">
              <span className={`text-sm ${getTimestampClasses(diagnosticsData.timestamp)}`}>
                Last updated: {formatLastUpdated(diagnosticsData.timestamp)}
              </span>
            </div>
          )}
          
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
