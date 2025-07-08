import { Card, CardContent } from "@/components/ui/card";
import { WindSpeedDisplay } from "./wind-speed-display";
import { WindDirectionCompass } from "./wind-direction-compass";

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
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
      {/* Wind Speed Card */}
      <Card className="min-w-0">
        <CardContent className="p-4 lg:p-6">
          <WindSpeedDisplay windData={windData} selectedUnit={selectedUnit} />
        </CardContent>
      </Card>

      {/* Wind Direction Card */}
      <Card className="min-w-0">
        <CardContent className="p-4 lg:p-6">
          <WindDirectionCompass windDirection={windData?.windDirection} />
        </CardContent>
      </Card>
    </div>
  );
}
