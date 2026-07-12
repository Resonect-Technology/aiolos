import { Badge } from '@/components/ui/badge';
import { useNow } from '@/hooks/use-now';
import {
  calculateNextSleepWakeTime,
  formatSleepSchedule,
  getStationHour,
  isInSleepWindow,
  staleThresholdMs,
} from '@/lib/time-utils';
import type { WindData } from '@/types/wind';
import { Eye, Moon, AlertTriangle, WifiOff } from 'lucide-react';
import { memo, useState, useEffect } from 'react';

interface StationConfig {
  stationId: string;
  sleepStartHour: number | null;
  sleepEndHour: number | null;
  tempInterval: number | null;
  windSendInterval: number | null;
  windSampleInterval: number | null;
  diagInterval: number | null;
  timeInterval: number | null;
  restartInterval: number | null;
  otaHour: number | null;
  otaMinute: number | null;
  otaDuration: number | null;
  remoteOta: boolean;
  utcOffsetMinutes?: number | null;
  message?: string;
}

interface FloatingStatusIndicatorProps {
  stationId: string;
  lastWindData: WindData | null;
}

type StationMode = 'live' | 'sleeping' | 'offline' | 'unknown';

export const FloatingStatusIndicator = memo(function FloatingStatusIndicator({
  stationId,
  lastWindData,
}: FloatingStatusIndicatorProps) {
  const [stationConfig, setStationConfig] = useState<StationConfig | null>(null);
  const now = useNow(30_000);

  // Fetch station config
  useEffect(() => {
    const fetchStationConfig = async () => {
      try {
        const response = await fetch(`/api/stations/${stationId}/config`);
        if (response.ok) {
          const config: StationConfig = await response.json();
          setStationConfig(config);
        } else {
          console.warn(
            'Failed to fetch station config for floating indicator:',
            response.statusText,
          );
        }
      } catch (error) {
        console.error('Error fetching station config for floating indicator:', error);
      }
    };

    fetchStationConfig();
  }, [stationId]);

  // Data freshness decides Live; the sleep schedule (on the STATION's clock)
  // only distinguishes Sleeping from Offline when data is missing
  const utcOffsetMinutes = stationConfig?.utcOffsetMinutes ?? null;
  const getStationMode = (): StationMode => {
    const dataFresh =
      lastWindData !== null &&
      now - new Date(lastWindData.timestamp).getTime() <= staleThresholdMs(lastWindData.intervalMs);

    if (dataFresh) {
      return 'live';
    }

    if (
      stationConfig &&
      stationConfig.sleepStartHour !== null &&
      stationConfig.sleepEndHour !== null
    ) {
      const stationHour = getStationHour(utcOffsetMinutes);
      if (isInSleepWindow(stationHour, stationConfig.sleepStartHour, stationConfig.sleepEndHour)) {
        return 'sleeping';
      }
    }

    return stationConfig ? 'offline' : 'unknown';
  };

  const stationMode = getStationMode();
  const nextSleepWakeInfo = calculateNextSleepWakeTime(
    stationConfig?.sleepStartHour ?? null,
    stationConfig?.sleepEndHour ?? null,
    utcOffsetMinutes,
  );

  const getModeDisplay = () => {
    switch (stationMode) {
      case 'live':
        return {
          label: 'Live',
          icon: <Eye className="h-3 w-3" />,
          className: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
        };
      case 'sleeping':
        return {
          label: 'Sleeping',
          icon: <Moon className="h-3 w-3" />,
          className: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
        };
      case 'offline':
        return {
          label: 'Offline',
          icon: <WifiOff className="h-3 w-3" />,
          className: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600',
        };
      default:
        return {
          label: 'Unknown',
          icon: <AlertTriangle className="h-3 w-3" />,
          className: 'bg-gray-500 hover:bg-gray-600 text-white border-gray-500',
        };
    }
  };

  const modeDisplay = getModeDisplay();
  const sleepScheduleText = formatSleepSchedule(
    stationConfig?.sleepStartHour ?? null,
    stationConfig?.sleepEndHour ?? null,
  );

  return (
    <div className="fixed right-4 bottom-4 z-40 transition-all duration-300 ease-in-out">
      <div className="bg-background/95 supports-[backdrop-filter]:bg-background/60 min-w-[100px] rounded-lg border p-1.5 shadow-lg backdrop-blur">
        <div className="flex flex-col items-center gap-1">
          <Badge
            className={`flex items-center justify-center gap-1 px-1.5 py-0.5 text-xs font-medium transition-all duration-200 ${modeDisplay.className}`}
          >
            <span className="flex h-3 w-3 items-center justify-center">{modeDisplay.icon}</span>
            {modeDisplay.label}
          </Badge>

          {/* Sleep schedule and next event info */}
          <div className="text-center">
            <div className="text-muted-foreground text-xs font-medium">{sleepScheduleText}</div>
            <div className="text-muted-foreground mt-0.5 text-xs">
              {nextSleepWakeInfo.timeUntilNext}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
