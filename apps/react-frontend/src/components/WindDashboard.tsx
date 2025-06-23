import { useState, useEffect, useRef, useCallback } from 'react';
import { Transmit } from '@adonisjs/transmit-client';

import { WindDirectionCompass } from './WindDirectionCompass';
import { WindRoseChart } from './WindRoseChart';
import { UnitSelector } from './UnitSelector';
import { WindSpeedDisplay } from './WindSpeedDisplay';
import { ControlPanel } from './ControlPanel';
import { ConnectionStatus } from './ConnectionStatus';
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
    <div className="flex flex-col space-y-6 p-6 max-w-2xl mx-auto bg-card rounded-lg shadow-md">
      <ConnectionStatus 
        stationId={stationId}
        isConnected={isConnected}
        error={error}
      />

      <UnitSelector 
        selectedUnit={selectedUnit} 
        onUnitChange={handleUnitChange} 
      />

      <WindSpeedDisplay 
        windData={windData} 
        selectedUnit={selectedUnit} 
      />

      <WindDirectionCompass 
        windDirection={windData?.wind_direction} 
      />

      <WindRoseChart 
        windHistory={windHistory} 
        selectedUnit={selectedUnit} 
      />

      <ControlPanel 
        windData={windData}
        formatTimestamp={formatTimestamp}
        startMockData={startMockData}
        stopMockData={stopMockData}
        sendSingleMockData={sendSingleMockData}
        clearWindHistory={clearWindHistory}
      />
    </div>
  );
}
