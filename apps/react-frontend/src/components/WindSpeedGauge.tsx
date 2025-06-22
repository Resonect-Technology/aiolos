import { useState, useEffect, useRef, useMemo } from 'react'; // Added useMemo
import { Transmit } from '@adonisjs/transmit-client';
import GaugeComponent from 'react-gauge-component';

import { WindDirectionCompass } from './WindDirectionCompass';
import './WindDirectionCompass.css';

interface WindData {
  wind_speed: number;
  wind_direction: number;
  timestamp: string;
}

interface WindSpeedGaugeProps {
  stationId: string;
}

// Local type definitions based on usage for react-gauge-component props
interface GaugeTooltip {
  text: string;
}

interface GaugeArc {
  limit?: number;
  color: string;
  tooltip?: GaugeTooltip;
  showTick?: boolean; // Kept from original, used in user's example for subArcs
}

interface GaugeTick {
  value: number;
  // label?: string; // react-gauge-component can format this via defaultTickValueConfig
}

// Helper function to convert speed
const convertSpeed = (speed: number, unit: string): number => {
  switch (unit) {
    case "km/h":
      return speed * 3.6;
    case "knots":
      return speed * 1.94384;
    case "beaufort":
      if (speed < 0.3) return 0;
      if (speed < 1.6) return 1;
      if (speed < 3.4) return 2;
      if (speed < 5.5) return 3;
      if (speed < 8.0) return 4;
      if (speed < 10.8) return 5;
      if (speed < 13.9) return 6;
      if (speed < 17.2) return 7;
      if (speed < 20.8) return 8;
      if (speed < 24.5) return 9;
      if (speed < 28.5) return 10;
      if (speed < 32.7) return 11;
      return 12;
    default: // m/s
      return speed;
  }
};

export function WindSpeedGauge({ stationId }: WindSpeedGaugeProps) {
  const [windData, setWindData] = useState<WindData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>("m/s");

  const transmitInstanceRef = useRef<Transmit | null>(null);
  const subscriptionRef = useRef<any | null>(null);

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString();
  };

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

  // --- Unit Conversion and Gauge Configuration Logic from user's example ---
  const handleUnitChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedUnit(event.target.value);
  };

  const currentUnitLabel = useMemo((): string => {
    switch (selectedUnit) {
      case "km/h": return "km/h";
      case "knots": return "knots";
      case "beaufort": return "Bft";
      default: return "m/s";
    }
  }, [selectedUnit]);

  const convertedValue = useMemo(
    () => convertSpeed(windData?.wind_speed || 0, selectedUnit),
    [windData, selectedUnit]
  );

  const formatGaugeValueLabel = (value: number): string => {
    if (selectedUnit === "beaufort") {
      return `${Math.round(value)} ${currentUnitLabel}`;
    } else {
      return `${value.toFixed(1)} ${currentUnitLabel}`;
    }
  };

  const gaugeSubArcs = useMemo((): GaugeArc[] => {
    const arcs: GaugeArc[] = [];
    switch (selectedUnit) {
      case "m/s":
        arcs.push(
          { limit: 5, color: "#EA4228", tooltip: { text: "Too slow" }, showTick: true },
          { limit: 10, color: "#F5CD19", tooltip: { text: "Barely..." }, showTick: true },
          { limit: 20, color: "#5BE12C", tooltip: { text: "Let's gooo!" }, showTick: true },
          { limit: 25, color: "#F5CD19", tooltip: { text: "Pls stop" }, showTick: true },
          { color: "#EA4228", tooltip: { text: "Jesus" } }
        );
        break;
      case "km/h":
        arcs.push(
          { limit: 20, color: "#EA4228", tooltip: { text: "Too slow" } , showTick: true},
          { limit: 40, color: "#F5CD19", tooltip: { text: "Barely..." } , showTick: true},
          { limit: 80, color: "#5BE12C", tooltip: { text: "Let's gooo!" } , showTick: true},
          { limit: 100, color: "#F5CD19", tooltip: { text: "Pls stop" } , showTick: true},
          { color: "#EA4228", tooltip: { text: "Jesus" } }
        );
        break;
      case "knots":
        arcs.push(
          { limit: 10, color: "#EA4228", tooltip: { text: "Too slow" } , showTick: true},
          { limit: 20, color: "#F5CD19", tooltip: { text: "Barely..." } , showTick: true},
          { limit: 40, color: "#5BE12C", tooltip: { text: "Let's gooo!" } , showTick: true},
          { limit: 50, color: "#F5CD19", tooltip: { text: "Pls stop" } , showTick: true},
          { color: "#EA4228", tooltip: { text: "Jesus" } }
        );
        break;
      case "beaufort":
        arcs.push(
          { limit: 1, color: "#EA4228", tooltip: { text: "Calm" } , showTick: true},
          { limit: 2, color: "#EA4228", tooltip: { text: "Light air" } , showTick: true},
          { limit: 3, color: "#F5CD19", tooltip: { text: "Light breeze" } , showTick: true},
          { limit: 4, color: "#F5CD19", tooltip: { text: "Gentle breeze" } , showTick: true},
          { limit: 5, color: "#5BE12C", tooltip: { text: "Moderate breeze" } , showTick: true},
          { limit: 6, color: "#5BE12C", tooltip: { text: "Strong breeze" } , showTick: true},
          { limit: 7, color: "#5BE12C", tooltip: { text: "High wind, near gale" }, showTick: true },
          { limit: 8, color: "#5BE12C", tooltip: { text: "Gale" } , showTick: true},
          { limit: 9, color: "#F5CD19", tooltip: { text: "Strong gale" } , showTick: true},
          { limit: 10, color: "#F5CD19", tooltip: { text: "Storm" } , showTick: true},
          { limit: 11, color: "#EA4228", tooltip: { text: "Violent storm" } , showTick: true},
          { color: "#EA4228", tooltip: { text: "Hurricane" } } // Last one doesn't need a limit
        );
        break;
      default:
        arcs.push(
          { limit: 5, color: "#EA4228", tooltip: { text: "Too slow" } , showTick: true},
          { limit: 10, color: "#F5CD19", tooltip: { text: "Barely..." } , showTick: true},
          { limit: 20, color: "#5BE12C", tooltip: { text: "Let's gooo!" } , showTick: true},
          { color: "#EA4228", tooltip: { text: "Jesus" } }
        );
    }
    return arcs;
  }, [selectedUnit]);

  const gaugeMinValue = useMemo(() => 0, []);

  const gaugeMaxValue = useMemo(() => {
    switch (selectedUnit) {
      case "m/s": return 30;
      case "km/h": return 120;
      case "knots": return 60;
      case "beaufort": return 12;
      default: return 30;
    }
  }, [selectedUnit]);

  const gaugeTicks = useMemo((): GaugeTick[] => {
    let values: number[] = [];
    switch (selectedUnit) {
      case "m/s": values = [0, 5, 10, 15, 20, 25, 30]; break;
      case "km/h": values = [0, 20, 40, 60, 80, 100, 120]; break;
      case "knots": values = [0, 10, 20, 30, 40, 50, 60]; break;
      case "beaufort": values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; break;
      default: values = [0, 5, 10, 15, 20, 25, 30];
    }
    return values.map(v => ({ value: v }));
  }, [selectedUnit]);

  // --- End of Unit Conversion and Gauge Configuration Logic ---

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
      });
    }

    const transmit = transmitInstanceRef.current;
    const channelName = `wind/live/${stationId}`;
    console.log(`Attempting to subscribe to channel: ${channelName}`);

    const newSubscription = transmit.subscription(channelName);
    subscriptionRef.current = newSubscription;

    newSubscription.create()
      .then(() => {
        console.log(`Successfully subscribed to channel: ${channelName}`);
        setIsConnected(true);
        setError(null);

        newSubscription.onMessage((data: WindData) => {
          console.log('Received wind data via Transmit:', data);
          if (data && typeof data.wind_speed === 'number') {
             setWindData(data);
          } else {
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

    return () => {
      if (subscriptionRef.current) {
        console.log(`Unsubscribing from channel: ${channelName}`);
        subscriptionRef.current.delete()
          .then(() => console.log(`Successfully unsubscribed from ${channelName}`))
          .catch((err: Error) => console.error(`Failed to unsubscribe from ${channelName}:`, err));
        subscriptionRef.current = null;
      }
    };
  }, [stationId]);

  console.log('WindSpeedGauge rendering. Current windData:', windData, 'Selected Unit:', selectedUnit);

  return (
    <div className="flex flex-col space-y-6 p-6 max-w-2xl mx-auto bg-card rounded-lg shadow-md">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Live Wind Data for Station: {stationId}</h2>
        <div className={`px-4 py-2 rounded-md ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
          {error && <div className="text-red-600 text-sm mt-1">Error: {error}</div>}
        </div>
      </div>

      {/* Unit Selector Dropdown */}
      <div className="flex flex-col items-center p-4 rounded-lg">
        <label htmlFor="unit-select" className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-300">
          Select Units:
        </label>
        <select
          id="unit-select"
          value={selectedUnit}
          onChange={handleUnitChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md shadow-sm bg-white dark:bg-slate-700 dark:border-slate-600 dark:text-white"
        >
          <option value="m/s">m/s</option>
          <option value="km/h">km/h</option>
          <option value="knots">knots</option>
          <option value="beaufort">Beaufort</option>
        </select>
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
              cornerRadius: 1, // From user's example
              subArcs: gaugeSubArcs,
            }}
            pointer={{
              color: "#345243", // From user's example
              length: 0.8,    // From user's example
              width: 15,      // From user's example
              elastic: true
            }}
            labels={{
              valueLabel: {
                formatTextValue: formatGaugeValueLabel,
                style: { // From user's example
                  fontSize: "30px", // Adjusted from 40px to fit better potentially
                  fill: "#03a1fc",
                  textShadow: "white 1px 1px 0px", // Adjusted shadow slightly
                },
              },
              tickLabels: {
                type: "outer",
                ticks: gaugeTicks,
                defaultTickValueConfig: { // To format tick labels like the main value
                    formatTextValue: formatGaugeValueLabel
                }
              }
            }}
            value={convertedValue}
            minValue={gaugeMinValue}
            maxValue={gaugeMaxValue}
          />
        </div>
        {windData && (
          <div className="text-center mt-2">
            <span className="text-2xl font-bold">{convertedValue.toFixed(selectedUnit === 'beaufort' ? 0 : 1)}</span>
            <span className="text-sm ml-1">{currentUnitLabel}</span>
          </div>
        )}
      </div>

      {/* Wind Direction Compass */}
      <div className="mt-6">
        <WindDirectionCompass windDirection={windData?.wind_direction} />
      </div>

      {/* Last Updated and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 p-4 bg-background rounded-lg mt-6">
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
