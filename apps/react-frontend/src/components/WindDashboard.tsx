import { useState, useEffect, useRef, useCallback } from 'react';
import { Transmit } from '@adonisjs/transmit-client';

import { WindDirectionCompass } from './WindDirectionCompass';
import { WindRoseChart } from './WindRoseChart';
import { UnitSelector } from './UnitSelector';
import { WindSpeedDisplay } from './WindSpeedDisplay';
import { ConnectionStatus } from './ConnectionStatus';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { TemperatureDisplay } from './TemperatureDisplay';
import './WindDirectionCompass.css';

interface WindData {
  windSpeed: number;
  windDirection: number;
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
          if (data && typeof data.windSpeed === 'number') {
             setWindData(data);
             setWindHistory(prev => [...prev.slice(-99), data]); // Keep last 100 readings
          } else {
            const messagePayload = (data as any).data;
            if (messagePayload && typeof messagePayload.windSpeed === 'number') {
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <div className="container mx-auto px-4 py-6 max-w-[1600px]">
        
        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          
          {/* Header Row - Connection Status + Temperature + Unit Selector */}
          <div className="col-span-full">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Connection Status */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <ConnectionStatus 
                  isConnected={isConnected}
                  error={error}
                />
              </div>
              
              {/* Temperature + Unit Selector */}
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-4">
                <div className="flex flex-col h-full">
                  <div className="flex-1">
                    <TemperatureDisplay stationId={stationId} />
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                    <UnitSelector 
                      selectedUnit={selectedUnit} 
                      onUnitChange={handleUnitChange} 
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Wind Speed Card */}
          <div className="md:col-span-1 lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <WindSpeedDisplay 
                windData={windData} 
                selectedUnit={selectedUnit} 
              />
            </div>
          </div>

          {/* Wind Direction Card */}
          <div className="md:col-span-1 lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <WindDirectionCompass 
                windDirection={windData?.windDirection} 
              />
            </div>
          </div>

          {/* Wind Rose Chart - Spans full width */}
          <div className="col-span-full bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">
                Wind Rose Analysis
              </h2>
              <WindRoseChart 
                windHistory={windHistory} 
                selectedUnit={selectedUnit} 
              />
            </div>
          </div>

          {/* Diagnostics Panel - Full width */}
          <div className="col-span-full bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border border-slate-200 dark:border-slate-700">
            <DiagnosticsPanel stationId={stationId} />
          </div>
          
        </div>
      </div>
    </div>
  );
}
