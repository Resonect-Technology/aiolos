import { useState, useEffect, useCallback } from "react";
import { Transmit } from "@adonisjs/transmit-client";
import type { WindAggregatedResponse, WindAggregated1Min } from "../types/wind-aggregated";

interface UseWindAggregatedDataProps {
  stationId: string;
  date?: string;
  interval?: string;
  limit?: number;
}

interface UseWindAggregatedDataReturn {
  data: WindAggregated1Min[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWindAggregatedData({
  stationId,
  date,
  interval = "1min",
  limit = 10
}: UseWindAggregatedDataProps): UseWindAggregatedDataReturn {
  const [data, setData] = useState<WindAggregated1Min[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        interval,
        limit: limit.toString(),
        ...(date && { date })
      });

      // Always use the base endpoint - data comes in m/s and conversion happens in frontend
      const endpoint = `/api/stations/${stationId}/wind/aggregated?${queryParams}`;

      const response = await fetch(endpoint);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: WindAggregatedResponse = await response.json();
      setData(result.data as WindAggregated1Min[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch aggregated wind data");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [stationId, date, interval, limit]); // Removed 'unit' from dependencies since we don't use it for API calls anymore

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

interface UseWindAggregatedSSEProps {
  stationId: string;
  onNewAggregate: (data: WindAggregated1Min) => void;
}

export function useWindAggregatedSSE({ stationId, onNewAggregate }: UseWindAggregatedSSEProps) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const transmit = new Transmit({
      baseUrl: window.location.origin,
    });

    const channelName = `wind/aggregated/1min/${stationId}`;
    const subscription = transmit.subscription(channelName);

    subscription
      .create()
      .then(() => {
        setConnected(true);
        setError(null);

        subscription.onMessage((data: any) => {
          if (data && data.stationId === stationId) {
            onNewAggregate({
              timestamp: data.timestamp,
              avgSpeed: data.avgSpeed,
              minSpeed: data.minSpeed,
              maxSpeed: data.maxSpeed,
              dominantDirection: data.dominantDirection,
              sampleCount: data.sampleCount,
            });
          }
        });
      })
      .catch(err => {
        setError(`Failed to connect to aggregated data stream: ${err.message}`);
        setConnected(false);
      });

    return () => {
      subscription
        .delete()
        .catch((err: Error) => console.error(`Failed to unsubscribe from ${channelName}:`, err));
    };
  }, [stationId, onNewAggregate]);

  return { connected, error };
}