import { useState, useEffect, useRef } from 'react';
import { Transmit } from '@adonisjs/transmit-client';
import { formatLastUpdated, getTimestampClasses } from '../lib/time-utils';

interface TemperatureData {
  temperature: number;
  timestamp: string;
}

interface TemperatureDisplayProps {
  stationId: string;
}

export function TemperatureDisplay({ stationId }: TemperatureDisplayProps) {
  const [temperatureData, setTemperatureData] = useState<TemperatureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const transmitInstanceRef = useRef<Transmit | null>(null);
  const subscriptionRef = useRef<any | null>(null);

  useEffect(() => {
    // Clear any previous connection state
    setError(null);
    setLoading(true);

    // Initialize Transmit instance if it doesn't exist
    if (!transmitInstanceRef.current) {
      console.log('Creating new Transmit instance for temperature');
      transmitInstanceRef.current = new Transmit({
        baseUrl: window.location.origin,
      });
    }

    const transmit = transmitInstanceRef.current;
    const channelName = `temperature/live/${stationId}`;

    const newSubscription = transmit.subscription(channelName);
    subscriptionRef.current = newSubscription;

    newSubscription.create()
      .then(() => {
        setLoading(false);
        setError(null);
        console.log(`Connected to temperature channel: ${channelName}`);

        newSubscription.onMessage((data: TemperatureData) => {
          console.log('Temperature data received:', data);
          if (data && typeof data.temperature === 'number') {
            setTemperatureData(data);
          } else {
            // Handle wrapped message format
            const messagePayload = (data as any).data;
            if (messagePayload && typeof messagePayload.temperature === 'number') {
              setTemperatureData(messagePayload);
            } else {
              console.warn('Received temperature message in unexpected format:', data);
            }
          }
        });
      })
      .catch(err => {
        console.error('Failed to connect to temperature channel:', err);
        setError(`Failed to connect: ${err.message || 'Unknown error'}`);
        setLoading(false);
        
        // Fallback to API polling if SSE fails
        fetchTemperatureFromAPI();
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
  const fetchTemperatureFromAPI = async () => {
    try {
      console.log(`Fetching temperature from API for station: ${stationId}`);
      const url = `/api/stations/${stationId}/temperature/latest`;
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log(`API Error (${response.status}): Could not fetch temperature data`);
        return;
      }
      
      const data = await response.json();
      console.log('Temperature data from API:', data);
      
      // Convert API response to expected format
      if (data.temperature !== undefined) {
        setTemperatureData({
          temperature: data.temperature,
          timestamp: data.lastUpdated || data.createdAt || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error fetching temperature from API:', err);
    }
  };

  return (
    <div className="text-center">
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
        Temperature
      </h3>
      
      <div className="flex justify-center items-center min-h-[60px]">
        {loading ? (
          <div className="animate-pulse text-slate-400 dark:text-slate-500 text-sm">Loading...</div>
        ) : error ? (
          <div className="text-red-500 dark:text-red-400 text-sm">Error</div>
        ) : (
          <div className="text-3xl font-bold text-center">
            {temperatureData?.temperature !== null && temperatureData?.temperature !== undefined ? (
              <>
                {temperatureData.temperature.toFixed(1)}
                <span className="text-xl ml-1">°C</span>
              </>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">N/A</span>
            )}
          </div>
        )}
      </div>
      
      {temperatureData?.timestamp && (
        <div className="text-center mt-2">
          <span className={`text-xs ${getTimestampClasses(temperatureData.timestamp)}`}>
            {formatLastUpdated(temperatureData.timestamp)}
          </span>
        </div>
      )}
    </div>
  );
}
