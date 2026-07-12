import { Badge } from '@/components/ui/badge';
import { Chart } from '@eunchurn/react-windrose';
import type { ChartData as BaseChartData } from '@eunchurn/react-windrose';
import { useMemo } from 'react';

import {
  getWindRoseColumns,
  getWindSpeedRangeDisplay,
  WIND_SPEED_COLORS,
} from '../../../lib/wind-utils';
import { calculateCustomWindRose, createEmptyWindRoseData } from '../../../lib/windrose-utils';

import './wind-rose-chart.css';

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
    <div className="w-full max-w-full">
      {/* Rose with cardinal direction overlay (the library's own labels are hidden) */}
      <div
        className="relative mx-auto aspect-square w-full max-w-md lg:max-w-lg"
        role="img"
        aria-label="Wind rose showing how often the wind blew from each direction, colored by speed"
      >
        <div className="wind-rose-chart h-full w-full">
          {/* className lands on the library's own div so the measured
              container really is the square wrapper */}
          <Chart
            chartData={windRoseData as unknown as BaseChartData[]}
            columns={windRoseColumns}
            responsive
            legendGap={0}
            className="flex h-full w-full items-center justify-center"
          />
        </div>
        <span className="text-muted-foreground absolute top-0 left-1/2 -translate-x-1/2 text-xs font-medium">
          N
        </span>
        <span className="text-muted-foreground absolute bottom-0 left-1/2 -translate-x-1/2 text-xs font-medium">
          S
        </span>
        <span className="text-muted-foreground absolute top-1/2 right-0 -translate-y-1/2 text-xs font-medium">
          E
        </span>
        <span className="text-muted-foreground absolute top-1/2 left-0 -translate-y-1/2 text-xs font-medium">
          W
        </span>
      </div>

      {/* Compact legend: one chip per speed bin, low to high */}
      <div className="mt-4 space-y-2 text-center">
        <div className="text-muted-foreground text-xs">
          Wind speed ({unitDisplay.unitLabel}) — longer petals mean more frequent wind from that
          direction
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
          {unitDisplay.ranges.map((range, index) => (
            <span key={index} className="flex items-center gap-1.5" title={range.description}>
              <span
                className="border-border h-3 w-3 shrink-0 rounded-full border"
                style={{ backgroundColor: WIND_SPEED_COLORS[index] }}
              ></span>
              <span className="text-foreground text-xs">{range.range}</span>
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 text-center">
        <Badge variant="outline" className="text-xs">
          {windHistory.length > 0
            ? `Based on ${windHistory.length} most recent measurements`
            : 'No wind data collected yet. The chart will update as data arrives.'}
        </Badge>
      </div>
    </div>
  );
}
