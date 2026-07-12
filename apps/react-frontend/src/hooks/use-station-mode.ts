import { useEffect, useState } from 'react';

import type { StationConfig } from '../lib/api/admin';
import { getStationHour, isInSleepWindow, staleThresholdMs } from '../lib/time-utils';
import type { WindData } from '../types/wind';
import { useNow } from './use-now';

export type StationMode = 'live' | 'sleeping' | 'offline' | 'unknown';

/** GET /config responses carry a couple of fields beyond the write shape */
export type StationConfigResponse = StationConfig & { stationId?: string; message?: string };

/**
 * Fetch the station config and derive the station's mode.
 *
 * Status is driven by DATA freshness first; the sleep schedule (on the
 * STATION's clock) only explains the silence. A green "Live" must mean data
 * is flowing.
 */
export function useStationMode(
  stationId: string,
  lastWindData: WindData | null,
): { mode: StationMode; config: StationConfigResponse | null } {
  const [config, setConfig] = useState<StationConfigResponse | null>(null);
  const now = useNow(30_000);

  useEffect(() => {
    const fetchStationConfig = async () => {
      try {
        const response = await fetch(`/api/stations/${stationId}/config`);
        if (response.ok) {
          setConfig(await response.json());
        } else {
          console.warn('Failed to fetch station config:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching station config:', error);
      }
    };

    fetchStationConfig();
  }, [stationId]);

  const dataFresh =
    lastWindData !== null &&
    now - new Date(lastWindData.timestamp).getTime() <= staleThresholdMs(lastWindData.intervalMs);

  let mode: StationMode;
  if (dataFresh) {
    mode = 'live';
  } else if (
    config &&
    config.sleepStartHour !== null &&
    config.sleepEndHour !== null &&
    isInSleepWindow(
      getStationHour(config.utcOffsetMinutes ?? null),
      config.sleepStartHour,
      config.sleepEndHour,
    )
  ) {
    mode = 'sleeping';
  } else {
    // No fresh data outside sleep hours: before the config arrives we can't
    // tell sleeping from offline yet
    mode = config ? 'offline' : 'unknown';
  }

  return { mode, config };
}
