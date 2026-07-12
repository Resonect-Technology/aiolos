import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useNow } from '@/hooks/use-now';
import { getStationHour, isInSleepWindow, staleThresholdMs } from '@/lib/time-utils';
import type { WindData } from '@/types/wind';
import { AlertTriangle, Eye, Moon, WifiOff } from 'lucide-react';
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

interface ConnectionStatusProps {
  error: string | null;
  stationId: string;
  lastWindData: WindData | null;
}

type StationMode = 'live' | 'sleeping' | 'offline' | 'unknown';

export const ConnectionStatus = memo(function ConnectionStatus({
  error,
  stationId,
  lastWindData,
}: ConnectionStatusProps) {
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
          console.warn('Failed to fetch station config:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching station config:', error);
      }
    };

    fetchStationConfig();
  }, [stationId]);

  // Status is driven by DATA freshness first; the sleep schedule only
  // explains the silence. A green "Live" must mean data is flowing.
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
      const stationHour = getStationHour(stationConfig.utcOffsetMinutes ?? null);
      if (isInSleepWindow(stationHour, stationConfig.sleepStartHour, stationConfig.sleepEndHour)) {
        return 'sleeping';
      }
    }

    // No fresh data outside sleep hours: before the config arrives we can't
    // tell sleeping from offline yet
    return stationConfig ? 'offline' : 'unknown';
  };

  const stationMode = getStationMode();

  const getModeDisplay = () => {
    switch (stationMode) {
      case 'live':
        return {
          label: 'Live',
          variant: 'default' as const,
          icon: <Eye className="h-4 w-4" />,
          description: 'Station is actively transmitting data',
          className: 'bg-green-600 hover:bg-green-700 text-white border-green-600',
        };
      case 'sleeping':
        return {
          label: 'Sleeping',
          variant: 'secondary' as const,
          icon: <Moon className="h-4 w-4" />,
          description: 'Station is in power-saving mode',
          className: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600',
        };
      case 'offline':
        return {
          label: 'Offline',
          variant: 'secondary' as const,
          icon: <WifiOff className="h-4 w-4" />,
          description: 'No recent data from the station outside its sleep schedule',
          className: 'bg-amber-600 hover:bg-amber-700 text-white border-amber-600',
        };
      default:
        return {
          label: 'Unknown',
          variant: 'outline' as const,
          icon: <AlertTriangle className="h-4 w-4" />,
          description: 'Station mode could not be determined',
          className: '',
        };
    }
  };

  const modeDisplay = getModeDisplay();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="card-foreground text-2xl font-bold">Aiolos Vasiliki</h1>
        <p className="text-muted-foreground">Real-time wind data from Vasiliki</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-muted-foreground text-sm font-medium">Station Mode</div>
        <Badge
          variant={modeDisplay.variant}
          className={`flex w-fit items-center gap-3 px-4 py-2 text-lg font-semibold ${modeDisplay.className}`}
          title={modeDisplay.description}
        >
          {modeDisplay.icon}
          {modeDisplay.label}
        </Badge>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
});
