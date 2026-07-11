import { Card, CardContent } from '@/components/ui/card';

import { WindDirectionCompass } from '../../atoms/displays/wind-direction-compass';
import { WindSpeedDisplay } from '../../atoms/displays/wind-speed-display';

interface WindData {
  windSpeed: number;
  windDirection: number;
  timestamp: string;
}

interface WindChartInteractiveProps {
  windData: WindData | null;
  selectedUnit: string;
}

export function WindChartInteractive({ windData, selectedUnit }: WindChartInteractiveProps) {
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
          <WindDirectionCompass windDirection={windData?.windDirection} />
        </CardContent>
      </Card>
    </div>
  );
}
