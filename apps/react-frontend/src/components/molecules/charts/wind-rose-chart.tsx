import { useMemo } from "react";
import { Chart } from "@eunchurn/react-windrose";
import type { ChartData as BaseChartData } from "@eunchurn/react-windrose";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BarChart3, Info } from "lucide-react";
import { getWindRoseColumns, getWindSpeedRangeDisplay, WIND_SPEED_COLORS } from "../../../lib/wind-utils";
import { calculateCustomWindRose, createEmptyWindRoseData } from "../../../lib/windrose-utils";

interface WindData {
  windSpeed: number;
  windDirection: number;
  timestamp: string;
}

interface WindRoseChartProps {
  windHistory: WindData[];
  selectedUnit: string;
}

// Default empty wind rose data showing all directions with zero values
const emptyWindRoseData = createEmptyWindRoseData();

export function WindRoseChart({ windHistory, selectedUnit }: WindRoseChartProps) {

  // Process wind data for the Windrose chart
  const windRoseData = useMemo(() => {
    if (windHistory.length === 0) {
      return emptyWindRoseData;
    }

    const data = {
      direction: windHistory.map(data => data.windDirection),
      speed: windHistory.map(data => data.windSpeed),
    };

    return calculateCustomWindRose(data);
  }, [windHistory]);

  // Define Windrose columns
  const windRoseColumns = useMemo(() => {
    return getWindRoseColumns();
  }, []);

  // Get the appropriate unit labels and conversions based on selected unit
  const unitDisplay = useMemo(() => {
    return getWindSpeedRangeDisplay(selectedUnit);
  }, [selectedUnit]);

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 min-h-[400px]">
        {/* Chart Container */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-col h-full">
            <div className="flex-grow flex items-center justify-center min-h-[300px] lg:min-h-[400px] overflow-hidden px-2">
              {/* Responsive container that maintains aspect ratio */}
              <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl aspect-square">
                <Chart
                  chartData={windRoseData as unknown as BaseChartData[]}
                  columns={windRoseColumns}
                  responsive
                  legendGap={8}
                />
              </div>
            </div>

            <div className="mt-4 text-center px-4">
              <Badge variant="outline" className="text-xs">
                {windHistory.length > 0
                  ? `Based on ${windHistory.length} most recent measurements`
                  : "No wind data collected yet. The chart will update as data arrives."}
              </Badge>
            </div>
          </div>
        </div>

        {/* Legend - Right side on desktop, bottom on mobile */}
        <div className="lg:w-72 xl:w-80 flex-shrink-0">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="h-4 w-4 text-primary" />
                Wind Speed Ranges
              </CardTitle>
              <div className="text-sm text-muted-foreground">({unitDisplay.unitLabel})</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {unitDisplay.ranges.slice().reverse().map((range, index) => {
                  const originalIndex = unitDisplay.ranges.length - 1 - index;
                  return (
                    <div key={originalIndex} className="flex items-center space-x-3">
                      <span
                        className="w-4 h-4 rounded-full shadow-sm border border-border flex-shrink-0"
                        style={{ backgroundColor: WIND_SPEED_COLORS[originalIndex] }}
                      ></span>
                      <span className="text-sm font-medium text-foreground">
                        {range.range} {unitDisplay.unitLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              <Separator />

              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-start gap-2">
                  <Info className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p>• Each spoke represents a wind direction</p>
                    <p>• Length shows frequency of winds from that direction</p>
                    <p>• Colors represent different wind speed ranges</p>
                    <p>• Longer sections = more frequent winds</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
