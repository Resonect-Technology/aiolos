import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Chart } from '@eunchurn/react-windrose';
import type { ChartData as BaseChartData } from '@eunchurn/react-windrose';
import { BarChart3, Info } from 'lucide-react';
import { useMemo } from 'react';

import {
  getWindRoseColumns,
  getWindSpeedRangeDisplay,
  WIND_SPEED_COLORS,
} from '../../../lib/wind-utils';
import { calculateCustomWindRose, createEmptyWindRoseData } from '../../../lib/windrose-utils';

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
      direction: windHistory.map((data) => data.windDirection),
      speed: windHistory.map((data) => data.windSpeed),
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
      <div className="flex min-h-[400px] flex-col gap-4 lg:flex-row lg:gap-6">
        {/* Chart Container */}
        <div className="min-w-0 flex-1">
          <div className="flex h-full flex-col">
            <div className="flex min-h-[300px] flex-grow items-center justify-center overflow-hidden px-2 lg:min-h-[400px]">
              {/* Responsive container that maintains aspect ratio */}
              <div className="aspect-square w-full max-w-sm sm:max-w-md lg:max-w-lg xl:max-w-xl">
                <Chart
                  chartData={windRoseData as unknown as BaseChartData[]}
                  columns={windRoseColumns}
                  responsive
                  legendGap={8}
                />
              </div>
            </div>

            <div className="mt-4 px-4 text-center">
              <Badge variant="outline" className="text-xs">
                {windHistory.length > 0
                  ? `Based on ${windHistory.length} most recent measurements`
                  : 'No wind data collected yet. The chart will update as data arrives.'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Legend - Right side on desktop, bottom on mobile */}
        <div className="flex-shrink-0 lg:w-72 xl:w-80">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="text-primary h-4 w-4" />
                Wind Speed Ranges
              </CardTitle>
              <div className="text-muted-foreground text-sm">({unitDisplay.unitLabel})</div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                {unitDisplay.ranges
                  .slice()
                  .reverse()
                  .map((range, index) => {
                    const originalIndex = unitDisplay.ranges.length - 1 - index;
                    return (
                      <div key={originalIndex} className="flex items-center space-x-3">
                        <span
                          className="border-border h-4 w-4 flex-shrink-0 rounded-full border shadow-sm"
                          style={{ backgroundColor: WIND_SPEED_COLORS[originalIndex] }}
                        ></span>
                        <span className="text-foreground text-sm font-medium">
                          {range.range} {unitDisplay.unitLabel}
                        </span>
                        <span className="text-muted-foreground text-sm">· {range.description}</span>
                      </div>
                    );
                  })}
              </div>

              <Separator />

              <div className="text-muted-foreground space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
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
