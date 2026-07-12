import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer } from 'lucide-react';
import { useState } from 'react';

import { useTransmitSubscription } from '../../../hooks/use-transmit-subscription';
import { formatLastUpdated } from '../../../lib/time-utils';

interface TemperatureData {
  temperature: number;
  timestamp: string;
}

interface TemperatureDisplayProps {
  stationId: string;
}

export function TemperatureDisplay({ stationId }: TemperatureDisplayProps) {
  const [temperatureData, setTemperatureData] = useState<TemperatureData | null>(null);

  // Fallback for when SSE fails
  const fetchTemperatureFromAPI = async () => {
    try {
      const response = await fetch(`/api/stations/${stationId}/temperature/latest`);
      if (!response.ok) {
        return;
      }

      const data = await response.json();
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

  const { connected, error } = useTransmitSubscription<
    TemperatureData | { data?: TemperatureData }
  >(
    `temperature/live/${stationId}`,
    (message) => {
      // Messages arrive either as the payload itself or wrapped in { data }
      const payload =
        message && typeof (message as TemperatureData).temperature === 'number'
          ? (message as TemperatureData)
          : (message as { data?: TemperatureData }).data;

      if (payload && typeof payload.temperature === 'number') {
        setTemperatureData(payload);
      } else {
        console.warn('Received temperature message in unexpected format:', message);
      }
    },
    fetchTemperatureFromAPI,
  );

  const loading = !connected && !error;

  return (
    <div className="space-y-2 text-center">
      <div className="flex items-center justify-center gap-2">
        <Thermometer className="card-foreground h-4 w-4" />
        <h3 className="card-foreground text-2xl font-bold">Current Temperature</h3>
      </div>

      <div className="flex min-h-[60px] items-center justify-center">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ) : error ? (
          <Badge variant="destructive">Error</Badge>
        ) : (
          <div className="text-primary text-center text-5xl font-bold">
            {temperatureData?.temperature !== null && temperatureData?.temperature !== undefined ? (
              <>
                {temperatureData.temperature.toFixed(1)}
                <span> °C</span>
              </>
            ) : (
              <span className="text-primary">N/A</span>
            )}
          </div>
        )}
      </div>

      {temperatureData?.timestamp && (
        <div className="text-center">
          <Badge variant="outline" className="text-xs">
            {formatLastUpdated(temperatureData.timestamp)}
          </Badge>
        </div>
      )}
    </div>
  );
}
