import { useState, useEffect, useRef } from 'react';
import { Transmit } from '@adonisjs/transmit-client'; // Re-add Transmit import
import GaugeComponent from 'react-gauge-component';

interface WindData {
  wind_speed: number;
  wind_direction: number;
  timestamp: string;
}

interface WindSpeedGaugeProps {
  stationId: string;
}

export function WindSpeedGauge({ stationId }: WindSpeedGaugeProps) {
  const [windData, setWindData] = useState<WindData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for Transmit instance and current subscription
  const transmitInstanceRef = useRef<Transmit | null>(null);
  const subscriptionRef = useRef<any | null>(null); // Using 'any' for subscription type for now

  // Format timestamp to a readable format
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

  // Start mock data for this station
  const startMockData = async () => {
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
  };

  // Stop mock data for this station
  const stopMockData = async () => {
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
  };

  // Send a single mock wind data event
  const sendSingleMockData = async () => {
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
  };

  // Connect to SSE using @adonisjs/transmit-client
  useEffect(() => {
    // Clear any previous connection state
    setIsConnected(false);
    setError(null);

    console.log('Initializing Transmit client and subscription...');

    // Initialize Transmit instance if it doesn't exist
    if (!transmitInstanceRef.current) {
      console.log('Creating new Transmit instance');
      transmitInstanceRef.current = new Transmit({
        baseUrl: window.location.origin, // As per docs
        // uidGenerator: () => crypto.randomUUID(), // Default is fine
        // maxReconnectAttempts: 5, // Default is fine
      });
    }

    const transmit = transmitInstanceRef.current;
    const channelName = `wind/live/${stationId}`; 
    console.log(`Attempting to subscribe to channel: ${channelName}`);

    // Create a new subscription
    const newSubscription = transmit.subscription(channelName);
    subscriptionRef.current = newSubscription;

    // Register the subscription on the server and listen for messages
    newSubscription.create()
      .then(() => {
        console.log(`Successfully subscribed to channel: ${channelName}`);
        setIsConnected(true);
        setError(null);

        // Listen for messages on this subscription
        newSubscription.onMessage((data: WindData) => { // Assuming data is directly WindData
          console.log('Received wind data via Transmit:', data);
          // The client docs say onMessage receives the data directly.
          // Adonis Transmit server broadcasts { channel, data }, but client might process this.
          // Let's assume for now `data` is the actual payload.
          if (data && typeof data.wind_speed === 'number') {
             setWindData(data);
          } else {
            // If data is { channel: string, data: WindData }, then use data.data
            // This was the previous assumption, let's keep a check for it.
            const messagePayload = (data as any).data;
            if (messagePayload && typeof messagePayload.wind_speed === 'number') {
              console.log('Received wrapped wind data, using .data property:', messagePayload);
              setWindData(messagePayload);
            } else {
               console.warn('Received message in unexpected format:', data);
            }
          }
        });
      })
      .catch(err => {
        console.error(`Failed to subscribe to channel ${channelName}:`, err);
        setError(`Failed to connect: ${err.message || 'Unknown error'}`);
        setIsConnected(false);
      });

    // Cleanup function: delete the subscription when component unmounts or stationId changes
    return () => {
      if (subscriptionRef.current) {
        console.log(`Unsubscribing from channel: ${channelName}`);
        subscriptionRef.current.delete()
          .then(() => console.log(`Successfully unsubscribed from ${channelName}`))
          .catch((err: Error) => console.error(`Failed to unsubscribe from ${channelName}:`, err));
        subscriptionRef.current = null;
      }
    };
  }, [stationId]); // Re-run effect if stationId changes

  return (
    <div className="flex flex-col space-y-6 p-6 max-w-2xl mx-auto bg-card rounded-lg shadow-md">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Live Wind Data for Station: {stationId}</h2>
        <div className={`px-4 py-2 rounded-md ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          {error && <div className="text-red-600 text-sm mt-1">Error: {error}</div>}
        </div>
      </div>

      {/* Wind Speed Gauge */}
      <div className="flex flex-col items-center bg-background p-4 rounded-lg">
        <h3 className="text-lg font-medium mb-2">Wind Speed</h3>
        <div className="w-full h-64">
          <GaugeComponent
            id="wind-speed-gauge"
            type="semicircle"
            arc={{
              width: 0.2,
              padding: 0.005,
              subArcs: [
                { limit: 5, color: '#5BE12C', showTick: true },
                { limit: 10, color: '#F5CD19', showTick: true },
                { limit: 15, color: '#F58B19', showTick: true },
                { limit: 20, color: '#EA4228', showTick: true },
                { color: '#8B0000' }
              ]
            }}
            pointer={{ elastic: true }}
            labels={{
              valueLabel: { formatTextValue: (value) => `${value} m/s` },
              tickLabels: {
                type: 'outer',
                ticks: [
                  { value: 0 },
                  { value: 5 },
                  { value: 10 },
                  { value: 15 },
                  { value: 20 },
                  { value: 25 }
                ]
              }
            }}
            value={windData?.wind_speed || 0}
            minValue={0}
            maxValue={25}
          />
        </div>
        {windData && (
          <div className="text-center mt-2">
            <span className="text-2xl font-bold">{windData.wind_speed.toFixed(1)}</span>
            <span className="text-sm ml-1">m/s</span>
          </div>
        )}
      </div>

      {/* Last Updated and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 p-4 bg-background rounded-lg">
        {windData ? (
          <div className="text-muted-foreground">
            Last Updated: <span className="font-medium">{formatTimestamp(windData.timestamp)}</span>
          </div>
        ) : (
          <div className="text-muted-foreground">Waiting for wind data...</div>
        )}
        
        <div className="flex flex-wrap gap-2">
          <button onClick={startMockData} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
            Start Mock Data
          </button>
          <button onClick={stopMockData} className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md hover:bg-destructive/90">
            Stop Mock Data
          </button>
          <button onClick={sendSingleMockData} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90">
            Send Single Event
          </button>
        </div>
      </div>
    </div>
  );
}
