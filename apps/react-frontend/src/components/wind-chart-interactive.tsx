import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wind, Compass } from "lucide-react";
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
    <div className="grid auto-rows-min gap-4 md:grid-cols-2">
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
