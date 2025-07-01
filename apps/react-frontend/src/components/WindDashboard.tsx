import { useState, useEffect, useRef, useCallback } from 'react';
import { Transmit } from '@adonisjs/transmit-client';

import { WindDirectionCompass } from './WindDirectionCompass';
import { WindRoseChart } from './WindRoseChart';
import { UnitSelector } from './UnitSelector';
import { WindSpeedDisplay } from './WindSpeedDisplay';
import { ControlPanel } from './ControlPanel';
import { ConnectionStatus } from './ConnectionStatus';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import './WindDirectionCompass.css';

interface WindData {
  wind_speed: number;
  wind_direction: number;
  timestamp: string;
}

interface WindDashboardProps {
  stationId: string;
}

export function WindDashboard({ stationId }: WindDashboardProps) {
  const [windData, setWindData] = useState<WindData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>("m/s");
  const [windHistory, setWindHistory] = useState<WindData[]>([]);

  const transmitInstanceRef = useRef<Transmit | null>(null);
  const subscriptionRef = useRef<any | null>(null);

  const formatTimestamp = useCallback((timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  }, []);

  const startMockData = useCallback(async () => {
    try {
      const response = await fetch(`/api/stations/${stationId}/live/wind/mock/start`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to start mock data');
      }
      
      const data = await response.json();
      console.log('Mock data started:', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start mock data');
    }
  }, [stationId]);

  const stopMockData = useCallback(async () => {
    try {
      const response = await fetch(`/api/stations/${stationId}/live/wind/mock/stop`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to stop mock data');
      }
      
      const data = await response.json();
      console.log('Mock data stopped:', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop mock data');
    }
  }, [stationId]);

  const sendSingleMockData = useCallback(async () => {
    try {
      const response = await fetch(`/api/stations/${stationId}/live/wind/mock`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to send mock data');
      }
      
      const data = await response.json();
      console.log('Mock data sent:', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send mock data');
    }
  }, [stationId]);

  const clearWindHistory = useCallback(() => {
    setWindHistory([]);
  }, []);

  const handleUnitChange = useCallback((unit: string) => {
    setSelectedUnit(unit);
  }, []);

  useEffect(() => {
    // Clear any previous connection state
    setIsConnected(false);
    setError(null);

    // Initialize Transmit instance if it doesn't exist
    if (!transmitInstanceRef.current) {
      console.log('Creating new Transmit instance');
      transmitInstanceRef.current = new Transmit({
        baseUrl: window.location.origin,
      });
    }

    const transmit = transmitInstanceRef.current;
    const channelName = `wind/live/${stationId}`;

    const newSubscription = transmit.subscription(channelName);
    subscriptionRef.current = newSubscription;

    newSubscription.create()
      .then(() => {
        setIsConnected(true);
        setError(null);

        newSubscription.onMessage((data: WindData) => {
          if (data && typeof data.wind_speed === 'number') {
             setWindData(data);
             setWindHistory(prev => [...prev.slice(-99), data]); // Keep last 100 readings
          } else {
            const messagePayload = (data as any).data;
            if (messagePayload && typeof messagePayload.wind_speed === 'number') {
              setWindData(messagePayload);
              setWindHistory(prev => [...prev.slice(-99), messagePayload]); // Keep last 100 readings
            } else {
               console.warn('Received message in unexpected format:', data);
            }
          }
        });
      })
      .catch(err => {
        setError(`Failed to connect: ${err.message || 'Unknown error'}`);
        setIsConnected(false);
      });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.delete()
          .catch((err: Error) => console.error(`Failed to unsubscribe from ${channelName}:`, err));
        subscriptionRef.current = null;
      }
    };
  }, [stationId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header Section */}
        <div className="mb-10">
          <ConnectionStatus 
            stationId={stationId}
            isConnected={isConnected}
            error={error}
          />
        </div>

        {/* Unit Selector */}
        <div className="mb-10 flex justify-center">
          <UnitSelector 
            selectedUnit={selectedUnit} 
            onUnitChange={handleUnitChange} 
            className="w-full max-w-md"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-10">
          {/* Left column with speed gauge and direction compass */}
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <div className="p-8">
                <WindSpeedDisplay 
                  windData={windData} 
                  selectedUnit={selectedUnit} 
                />
              </div>
            </div>
            
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
              <div className="p-8">
                <WindDirectionCompass 
                  windDirection={windData?.wind_direction} 
                />
              </div>
            </div>
          </div>

          {/* Right column with wind rose chart */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
            <div className="p-8 h-full min-h-[700px] flex flex-col">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">
                Wind Rose Analysis
              </h2>
              <div className="flex-1">
                <WindRoseChart 
                  windHistory={windHistory} 
                  selectedUnit={selectedUnit} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Control Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-2xl transition-shadow duration-300 mb-10">
          <ControlPanel 
            windData={windData}
            formatTimestamp={formatTimestamp}
            startMockData={startMockData}
            stopMockData={stopMockData}
            sendSingleMockData={sendSingleMockData}
            clearWindHistory={clearWindHistory}
          />
        </div>

        {/* Diagnostics Panel */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden hover:shadow-2xl transition-shadow duration-300">
          <DiagnosticsPanel stationId={stationId} />
        </div>
      </div>
    </div>
  );
}
