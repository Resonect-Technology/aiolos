import { Card, CardContent } from '@/components/ui/card';
import { useNow } from '@/hooks/use-now';
import { staleThresholdMs } from '@/lib/time-utils';
import type { WindData } from '@/types/wind';

import { WindDirectionCompass } from '../../atoms/displays/wind-direction-compass';
import { WindSpeedDisplay } from '../../atoms/displays/wind-speed-display';

interface WindChartInteractiveProps {
  windData: WindData | null;
  selectedUnit: string;
}

export function WindChartInteractive({ windData, selectedUnit }: WindChartInteractiveProps) {
  const now = useNow();
  const stale =
    windData !== null &&
    now - new Date(windData.timestamp).getTime() > staleThresholdMs(windData.intervalMs);

  return (
    <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Wind Speed Card */}
      <Card>
        <CardContent>
          <WindSpeedDisplay windData={windData} selectedUnit={selectedUnit} />
        </CardContent>
      </Card>

      {/* Wind Direction Card */}
      <Card>
        <CardContent>
          <WindDirectionCompass windDirection={windData?.windDirection} stale={stale} />
        </CardContent>
      </Card>
    </div>
  );
}
