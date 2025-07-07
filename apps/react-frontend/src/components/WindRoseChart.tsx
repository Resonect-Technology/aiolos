import { useMemo } from 'react';
import { Chart } from '@eunchurn/react-windrose';
import type { ChartData as BaseChartData } from '@eunchurn/react-windrose';
import { 
  getWindRoseColumns,
  getWindSpeedRangeDisplay,
  WIND_SPEED_COLORS
} from '../lib/wind-utils';
import { 
  calculateCustomWindRose, 
  createEmptyWindRoseData
} from '../lib/windrose-utils';
import './WindRoseChart.css';

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
      speed: windHistory.map(data => data.windSpeed)
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
    <div className="w-full h-full">
      <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[400px]">
        {/* Chart Container */}
        <div className="flex-1">
          <div className="flex flex-col h-full">
            <div className="flex-grow flex items-center justify-center min-h-[400px]">
              <Chart 
                chartData={windRoseData as unknown as BaseChartData[]} 
                columns={windRoseColumns}
                responsive 
                legendGap={20}
              />
            </div>
            
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {windHistory.length > 0 
                  ? `Based on ${windHistory.length} most recent measurements` 
                  : "No wind data collected yet. The chart will update as data arrives."}
              </p>
            </div>
          </div>
        </div>
        
        {/* Legend - Right side on desktop, bottom on mobile */}
        <div className="lg:w-64 flex-shrink-0">
          <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-xl border border-slate-200 dark:border-slate-600 h-full">
            <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">
              Wind Speed Ranges
            </h4>
            <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
              ({unitDisplay.unitLabel})
            </div>
            
            <div className="space-y-3">
              {unitDisplay.ranges.map((range, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <span 
                    className="w-4 h-4 rounded-full shadow-sm border border-slate-300 dark:border-slate-600 flex-shrink-0"
                    style={{ backgroundColor: WIND_SPEED_COLORS[index] }}
                  ></span>
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {range.range} {unitDisplay.unitLabel}
                  </span>
                </div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-600">
              <div className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                <p>• Each spoke represents a wind direction</p>
                <p>• Length shows frequency of winds from that direction</p>
                <p>• Colors represent different wind speed ranges</p>
                <p>• Longer sections = more frequent winds</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
