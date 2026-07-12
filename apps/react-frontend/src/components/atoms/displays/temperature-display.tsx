import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod';

import { temperatureLivePayloadSchema, type TemperatureLivePayload } from '@repo/schemas';

import { useTransmitSubscription } from '../../../hooks/use-transmit-subscription';
import { formatLastUpdated } from '../../../lib/time-utils';

// GET /temperature/latest response (legacy SensorReading shape)
const latestTemperatureResponseSchema = z.looseObject({
  temperature: z.number(),
  lastUpdated: z.string().optional(),
  createdAt: z.string().optional(),
});

interface TemperatureDisplayProps {
  stationId: string;
}

export function TemperatureDisplay({ stationId }: TemperatureDisplayProps) {
  const [temperatureData, setTemperatureData] = useState<TemperatureLivePayload | null>(null);

  // Fallback for when SSE fails
  const fetchTemperatureFromAPI = async () => {
    try {
      const response = await fetch(`/api/stations/${stationId}/temperature/latest`);
      if (!response.ok) {
        return;
      }

      const parsed = latestTemperatureResponseSchema.safeParse(await response.json());
      if (parsed.success) {
        setTemperatureData({
          temperature: parsed.data.temperature,
          timestamp: parsed.data.lastUpdated || parsed.data.createdAt || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error fetching temperature from API:', err);
    }
  };

  const { connected, error } = useTransmitSubscription(
    `temperature/live/${stationId}`,
    temperatureLivePayloadSchema,
    setTemperatureData,
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
