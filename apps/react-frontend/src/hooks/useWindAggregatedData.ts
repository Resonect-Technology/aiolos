import { useState, useEffect, useCallback } from 'react';

import type {
  WindAggregatedResponse,
  WindAggregated1Min,
  WindAggregated10Min,
} from '../types/wind-aggregated';
import { useTransmitSubscription } from './use-transmit-subscription';

type WindAggregateInterval = '1min' | '10min';

interface UseWindAggregatedDataProps {
  stationId: string;
  date?: string;
  interval?: WindAggregateInterval;
  limit?: number;
}

interface UseWindAggregatedDataReturn<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Fetch aggregated wind data (1-minute or 10-minute intervals). Data comes in
 * m/s from the backend; unit conversion happens in the components.
 */
export function useWindAggregatedData<T extends WindAggregated1Min | WindAggregated10Min>({
  stationId,
  date,
  interval = '1min',
  limit = 10,
}: UseWindAggregatedDataProps): UseWindAggregatedDataReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        interval,
        limit: limit.toString(),
        ...(date && { date }),
      });

      const response = await fetch(`/api/stations/${stationId}/wind/aggregated?${queryParams}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: WindAggregatedResponse = await response.json();
      setData(result.data as T[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch aggregated wind data');
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [stationId, date, interval, limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

interface UseWindAggregatedSSEProps<T> {
  stationId: string;
  interval?: WindAggregateInterval;
  onNewAggregate: (data: T) => void;
}

/**
 * Live updates for aggregated wind data. The broadcast payload carries the
 * aggregate fields plus stationId; gustSpeed is normalized to null when the
 * backend omits it.
 */
export function useWindAggregatedSSE<T extends WindAggregated1Min | WindAggregated10Min>({
  stationId,
  interval = '1min',
  onNewAggregate,
}: UseWindAggregatedSSEProps<T>) {
  return useTransmitSubscription<T & { stationId?: string }>(
    `wind/aggregated/${interval}/${stationId}`,
    (data) => {
      if (data && data.stationId === stationId) {
        onNewAggregate({ ...data, gustSpeed: data.gustSpeed ?? null });
      }
    },
  );
}
