import { useState, useEffect, useCallback } from "react";
import { Transmit } from "@adonisjs/transmit-client";
import type { WindAggregatedResponse, WindAggregated10Min } from "../types/wind-aggregated";

interface UseWind10MinDataProps {
  stationId: string;
  date?: string;
  limit?: number;
}

interface UseWind10MinDataReturn {
  data: WindAggregated10Min[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useWind10MinData({
  stationId,
  date,
  limit = 6
}: UseWind10MinDataProps): UseWind10MinDataReturn {
  const [data, setData] = useState<WindAggregated10Min[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const queryParams = new URLSearchParams({
        interval: "10min",
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
      setData(result.data as WindAggregated10Min[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch 10-minute wind data");
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [stationId, date, limit]); // Removed 'unit' from dependencies since we don't use it for API calls anymore

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

interface UseWind10MinSSEProps {
  stationId: string;
  onNewAggregate: (data: WindAggregated10Min) => void;
}

export function useWind10MinSSE({ stationId, onNewAggregate }: UseWind10MinSSEProps) {
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const transmit = new Transmit({
      baseUrl: window.location.origin,
    });

    const channelName = `wind/aggregated/10min/${stationId}`;
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
              tendency: data.tendency,
            });
          }
        });
      })
      .catch(err => {
        setError(`Failed to connect to 10-minute data stream: ${err.message}`);
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