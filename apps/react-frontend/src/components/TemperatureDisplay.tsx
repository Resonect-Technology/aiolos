import { useState, useEffect, useCallback } from 'react';

interface TemperatureDisplayProps {
  stationId: string;
}

export function TemperatureDisplay({ stationId }: TemperatureDisplayProps) {
  const [temperature, setTemperature] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchTemperature = useCallback(async () => {
    try {
      setLoading(true);
      console.log(`Fetching temperature for station: ${stationId}`);
      const url = `/api/stations/${stationId}/temperature/latest`;
      console.log(`Request URL: ${url}`);
      
      const response = await fetch(url);
      
      if (!response.ok) {
        console.log(`API Error (${response.status}): Could not fetch temperature data`);
        setTemperature(null);
        return;
      }
      
      const data = await response.json();
      console.log('Temperature data received:', data);
      setTemperature(data.temperature);
    } catch (err) {
      console.error('Error fetching temperature:', err);
      setTemperature(null);
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  useEffect(() => {
    fetchTemperature();
    
    // Refresh temperature data every 60 seconds
    const intervalId = setInterval(fetchTemperature, 60000);
    
    return () => clearInterval(intervalId);
  }, [fetchTemperature]);

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-center">
        Current Temperature
      </h2>
      
      <div className="flex justify-center items-center h-24">
        {loading ? (
          <div className="animate-pulse text-slate-400 dark:text-slate-500">Loading...</div>
        ) : (
          <div className="text-5xl font-bold text-center">
            {temperature !== null ? (
              <>
                {temperature.toFixed(1)}
                <span className="text-3xl ml-1">°C</span>
              </>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">N/A</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
