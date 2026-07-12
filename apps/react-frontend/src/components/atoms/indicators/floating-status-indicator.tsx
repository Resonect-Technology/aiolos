import { Badge } from '@/components/ui/badge';
import { useStationMode } from '@/hooks/use-station-mode';
import { calculateNextSleepWakeTime, formatSleepSchedule } from '@/lib/time-utils';
import type { WindData } from '@/types/wind';
import { Eye, Moon, AlertTriangle, WifiOff } from 'lucide-react';
import { memo } from 'react';

interface FloatingStatusIndicatorProps {
  stationId: string;
  lastWindData: WindData | null;
}

export const FloatingStatusIndicator = memo(function FloatingStatusIndicator({
  stationId,
  lastWindData,
}: FloatingStatusIndicatorProps) {
  const { mode: stationMode, config: stationConfig } = useStationMode(stationId, lastWindData);

  const nextSleepWakeInfo = calculateNextSleepWakeTime(
    stationConfig?.sleepStartHour ?? null,
    stationConfig?.sleepEndHour ?? null,
    stationConfig?.utcOffsetMinutes ?? null,
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
