import { memo, useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Eye, Moon, AlertTriangle } from "lucide-react";
import { formatSleepSchedule, calculateNextSleepWakeTime } from "@/lib/time-utils";

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

interface FloatingStatusIndicatorProps {
  stationId: string;
}

export const FloatingStatusIndicator = memo(function FloatingStatusIndicator({
  stationId,
}: FloatingStatusIndicatorProps) {
  const [stationConfig, setStationConfig] = useState<StationConfig | null>(null);
  const [stationMode, setStationMode] = useState<'live' | 'sleeping' | 'unknown'>('unknown');
  const [nextSleepWakeInfo, setNextSleepWakeInfo] = useState<{
    nextEventType: 'sleep' | 'wake' | null;
    nextEventTime: Date | null;
    timeUntilNext: string;
  }>({
    nextEventType: null,
    nextEventTime: null,
    timeUntilNext: "No sleep schedule"
  });

  // Fetch station config
  useEffect(() => {
    const fetchStationConfig = async () => {
      try {
        const response = await fetch(`/api/stations/${stationId}/config`);
        if (response.ok) {
          const config: StationConfig = await response.json();
          setStationConfig(config);
        } else {
          console.warn('Failed to fetch station config for floating indicator:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching station config for floating indicator:', error);
      }
    };

    fetchStationConfig();
  }, [stationId]);

  // Determine station mode based on current time and config
  useEffect(() => {
    const updateStationMode = () => {
      if (!stationConfig || stationConfig.sleepStartHour === null || stationConfig.sleepEndHour === null) {
        setStationMode('live'); // Default to live if no sleep config
        setNextSleepWakeInfo({
          nextEventType: null,
          nextEventTime: null,
          timeUntilNext: "No sleep schedule"
        });
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
      
      // Calculate next sleep/wake time
      const nextInfo = calculateNextSleepWakeTime(sleepStart, sleepEnd);
      setNextSleepWakeInfo(nextInfo);
    };

    updateStationMode();

    // Update every 30 seconds to keep countdown accurate
    const interval = setInterval(updateStationMode, 30000);

    return () => clearInterval(interval);
  }, [stationConfig]);

  const getModeDisplay = () => {
    switch (stationMode) {
      case 'live':
        return {
          label: 'Live',
          icon: <Eye className="h-4 w-4" />,
          className: 'bg-green-600 hover:bg-green-700 text-white border-green-600'
        };
      case 'sleeping':
        return {
          label: 'Sleeping',
          icon: <Moon className="h-4 w-4" />,
          className: 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600'
        };
      default:
        return {
          label: 'Unknown',
          icon: <AlertTriangle className="h-4 w-4" />,
          className: 'bg-gray-500 hover:bg-gray-600 text-white border-gray-500'
        };
    }
  };

  const modeDisplay = getModeDisplay();
  const sleepScheduleText = formatSleepSchedule(
    stationConfig?.sleepStartHour ?? null,
    stationConfig?.sleepEndHour ?? null
  );

  return (
    <div className="fixed top-16 right-4 z-40 transition-all duration-300 ease-in-out">
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg shadow-lg p-3 min-w-[200px]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-muted-foreground">Status</span>
          <Badge
            className={`flex items-center gap-2 px-3 py-1 text-sm font-medium transition-all duration-200 ${modeDisplay.className}`}
          >
            {modeDisplay.icon}
            {modeDisplay.label}
          </Badge>
        </div>
        
        <div className="text-xs text-muted-foreground mb-1">
          {sleepScheduleText}
        </div>
        
        {nextSleepWakeInfo.nextEventType && (
          <div className="text-xs text-muted-foreground">
            Next {nextSleepWakeInfo.nextEventType} in {nextSleepWakeInfo.timeUntilNext}
          </div>
        )}
      </div>
    </div>
  );
});