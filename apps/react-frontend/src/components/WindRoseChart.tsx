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
    <div className="h-full flex flex-col">
      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">Wind Rose Chart</h3>
      
      <div className="flex-grow flex items-center justify-center min-h-[400px]">
        <Chart 
          chartData={windRoseData as unknown as BaseChartData[]} 
          columns={windRoseColumns}
          responsive 
          legendGap={20}
        />
      </div>
      
      <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg text-center">
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {windHistory.length > 0 
            ? `Based on ${windHistory.length} most recent measurements` 
            : "No wind data collected yet. The chart will update as data arrives."}
        </p>
      </div>
      
      {/* WindRose Legend */}
      <div className="mt-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-xl border border-slate-200 dark:border-slate-600">
        <h4 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4 text-center">
          Wind Speed Ranges ({unitDisplay.unitLabel})
        </h4>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {unitDisplay.ranges.map((range, index) => (
            <div key={index} className="flex items-center space-x-3 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
              <span 
                className="w-4 h-4 rounded-full shadow-sm border border-slate-300 dark:border-slate-600"
                style={{ backgroundColor: WIND_SPEED_COLORS[index] }}
              ></span>
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {range.range} {unitDisplay.unitLabel}
              </span>
            </div>
          ))}
        </div>
        
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-600">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600 dark:text-slate-400">
            <div className="space-y-1">
              <p className="font-medium">• Each spoke represents a wind direction</p>
              <p className="font-medium">• Length shows frequency of winds from that direction</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">• Colors represent different wind speed ranges</p>
              <p className="font-medium">• Longer sections = more frequent winds</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
