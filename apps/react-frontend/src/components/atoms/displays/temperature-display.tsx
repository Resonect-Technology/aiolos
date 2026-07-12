import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Thermometer } from 'lucide-react';
import { useEffect, useState } from 'react';
import { z } from 'zod';

import { temperatureLivePayloadSchema, type TemperatureLivePayload } from '@repo/schemas';

import { useNow } from '../../../hooks/use-now';
import { useTransmitSubscription } from '../../../hooks/use-transmit-subscription';
import { formatLastUpdated, staleThresholdMs } from '../../../lib/time-utils';

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

  const { connected, error } = useTransmitSubscription(
    `temperature/live/${stationId}`,
    temperatureLivePayloadSchema,
    setTemperatureData,
  );

  // Seed from the REST endpoint so the card isn't empty until the next SSE
  // message (the server's replay cache is in-memory and can be cold), but
  // never clobber a fresher SSE reading
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/stations/${stationId}/temperature/latest`);
        if (!response.ok || cancelled) {
          return;
        }

        const parsed = latestTemperatureResponseSchema.safeParse(await response.json());
        if (parsed.success && !cancelled) {
          const next: TemperatureLivePayload = {
            temperature: parsed.data.temperature,
            timestamp: parsed.data.lastUpdated || parsed.data.createdAt || new Date().toISOString(),
          };
          setTemperatureData((prev) =>
            prev && new Date(prev.timestamp) >= new Date(next.timestamp) ? prev : next,
          );
        }
      } catch (err) {
        console.error('Error fetching temperature from API:', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [stationId]);

  const loading = !connected && !error;

  // Ticks so the "ago" badge and staleness check stay honest when the
  // stream stops delivering messages
  const now = useNow();

  // Stale when older than 3x the station's reported send interval
  // (fallback 15 min — tolerates the 10-minute slow mode)
  const stale =
    temperatureData !== null &&
    now - new Date(temperatureData.timestamp).getTime() >
      staleThresholdMs(temperatureData.intervalMs);

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
          <div
            className={`text-primary text-center text-5xl font-bold ${stale ? 'opacity-50' : ''}`}
          >
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
          <Badge
            variant="outline"
            className={`text-xs ${stale ? 'border-orange-500 text-orange-500 dark:text-orange-400' : ''}`}
          >
            Last updated: {formatLastUpdated(temperatureData.timestamp)}
            {stale && ' (stale)'}
          </Badge>
        </div>
      )}
    </div>
  );
}
