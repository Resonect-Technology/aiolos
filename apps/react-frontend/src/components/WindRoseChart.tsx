import { useMemo, useState } from 'react';
import { Chart } from '@eunchurn/react-windrose';
import type { ChartData as BaseChartData } from '@eunchurn/react-windrose';
import { 
  getWindRoseColumns,
  getWindSpeedRangeDisplay
} from '../lib/wind-utils';
import { 
  calculateCustomWindRose, 
  createEmptyWindRoseData
} from '../lib/windrose-utils';
import './WindRoseChart.css';

interface WindData {
  wind_speed: number;
  wind_direction: number;
  timestamp: string;
}

interface WindRoseChartProps {
  windHistory: WindData[];
  selectedUnit: string;
}

// Default empty wind rose data showing all directions with zero values
const emptyWindRoseData = createEmptyWindRoseData();

export function WindRoseChart({ windHistory, selectedUnit }: WindRoseChartProps) {
  const [showExplanation, setShowExplanation] = useState(false);

  // Process wind data for the Windrose chart
  const windRoseData = useMemo(() => {
    if (windHistory.length === 0) {
      return emptyWindRoseData;
    }
    
    const data = {
      direction: windHistory.map(data => data.wind_direction),
      speed: windHistory.map(data => data.wind_speed)
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
    <div className="mt-8 bg-background p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-4 text-center">Wind Rose Chart</h3>
      <div className="w-full h-96">
        <Chart 
          chartData={windRoseData as unknown as BaseChartData[]} 
          columns={windRoseColumns}
          responsive 
          legendGap={20}
        />
      </div>
      <p className="text-sm text-center text-muted-foreground mt-2">
        {windHistory.length > 0 
          ? `Based on ${windHistory.length} most recent measurements` 
          : "No wind data collected yet. The chart will update as data arrives."}
      </p>
      
      {/* Toggle button for explanation */}
      <div className="mt-3 text-center">
        <button 
          onClick={() => setShowExplanation(prev => !prev)}
          className="inline-flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
        >
          {showExplanation ? "Hide explanation" : "What is this chart?"}
          <svg 
            className={`w-4 h-4 ml-1 transition-transform ${showExplanation ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
      </div>
      
      {/* WindRose Explanation */}
      {showExplanation && (
        <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800 rounded-md text-sm">
          <h4 className="font-medium mb-2">Understanding the Wind Rose Chart</h4>
          <p className="mb-2">
            A wind rose is a graphical tool that shows wind speed and direction patterns at a location.
            All measurements are displayed in {unitDisplay.unitLabel}.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="font-medium text-xs mb-1">Reading the Chart:</h5>
              <ul className="list-disc pl-5 text-xs space-y-1">
                <li>Each "spoke" represents a wind direction (N, NE, E, SE, etc.)</li>
                <li>The length of each colored segment shows how frequently wind blows from that direction</li>
                <li>Different colors represent different wind speed ranges</li>
                <li>Longer sections indicate more frequent winds from that direction</li>
              </ul>
            </div>
            
            <div>
              <h5 className="font-medium text-xs mb-1">Color Legend:</h5>
              <ul className="space-y-1 text-xs">
                {unitDisplay.ranges.map((range, index) => (
                  <li key={index} className="flex items-center windrose-legend-item">
                    <span 
                      className="w-3 h-3 inline-block mr-2 color-box"
                    ></span>
                    <span>{`${range.range} ${unitDisplay.unitLabel} (${range.description})`}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
