import { memo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Eye, Moon } from "lucide-react";

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
  message?: string;
}

interface ConnectionStatusProps {
  error: string | null;
  stationId: string;
}

export const ConnectionStatus = memo(function ConnectionStatus({
  error,
  stationId,
}: ConnectionStatusProps) {
  const [stationConfig, setStationConfig] = useState<StationConfig | null>(null);
  const [stationMode, setStationMode] = useState<'live' | 'sleeping' | 'unknown'>('unknown');

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

  // Determine station mode based on current time and config
  useEffect(() => {
    const updateStationMode = () => {
      if (!stationConfig || stationConfig.sleepStartHour === null || stationConfig.sleepEndHour === null) {
        setStationMode('live'); // Default to live if no sleep config
        return;
      }

      const now = new Date();
      const currentHour = now.getHours();
      const sleepStart = stationConfig.sleepStartHour;
      const sleepEnd = stationConfig.sleepEndHour;

      let isSleeping = false;

      if (sleepStart === sleepEnd) {
        // No sleep period configured
        isSleeping = false;
      } else if (sleepStart < sleepEnd) {
        // Sleep period within same day (e.g., 2 AM to 6 AM)
        isSleeping = currentHour >= sleepStart && currentHour < sleepEnd;
      } else {
        // Sleep period spans midnight (e.g., 22 PM to 6 AM)
        isSleeping = currentHour >= sleepStart || currentHour < sleepEnd;
      }

      setStationMode(isSleeping ? 'sleeping' : 'live');
    };

    updateStationMode();

    // Update every minute to keep mode accurate
    const interval = setInterval(updateStationMode, 60000);

    return () => clearInterval(interval);
  }, [stationConfig]);

  const getModeDisplay = () => {
    switch (stationMode) {
      case 'live':
        return {
          label: 'Live',
          variant: 'default' as const,
          icon: <Eye className="h-4 w-4" />,
          description: 'Station is actively transmitting data',
          className: 'bg-green-600 hover:bg-green-700 text-white border-green-600'
        };
      case 'sleeping':
        return {
          label: 'Sleeping',
          variant: 'secondary' as const,
          icon: <Moon className="h-4 w-4" />,
          description: 'Station is in power-saving mode',
          className: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
        };
      default:
        return {
          label: 'Unknown',
          variant: 'outline' as const,
          icon: <AlertTriangle className="h-4 w-4" />,
          description: 'Station mode could not be determined',
          className: ''
        };
    }
  };

  const modeDisplay = getModeDisplay();
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold card-foreground">Aiolos Vasiliki</h1>
        <p className="text-muted-foreground">Real-time wind data from Vasiliki</p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="text-sm font-medium text-muted-foreground">Station Mode</div>
        <Badge
          variant={modeDisplay.variant}
          className={`flex items-center gap-3 px-4 py-2 text-lg font-semibold w-fit ${modeDisplay.className}`}
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
