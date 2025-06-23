import { memo } from 'react';

interface WindData {
  wind_speed: number;
  wind_direction: number;
  timestamp: string;
}

interface ControlPanelProps {
  windData: WindData | null;
  formatTimestamp: (timestamp: string) => string;
  startMockData: () => void;
  stopMockData: () => void;
  sendSingleMockData: () => void;
  clearWindHistory: () => void;
}

export const ControlPanel = memo(function ControlPanel({
  windData,
  formatTimestamp,
  startMockData,
  stopMockData,
  sendSingleMockData,
  clearWindHistory
}: ControlPanelProps) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 p-4 bg-background rounded-lg mt-6">
      {windData ? (
        <div className="text-muted-foreground">
          Last Updated: <span className="font-medium">{formatTimestamp(windData.timestamp)}</span>
        </div>
      ) : (
        <div className="text-muted-foreground">Waiting for wind data...</div>
      )}
      
      <div className="flex flex-wrap gap-2">
        <button onClick={startMockData} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90">
          Start Mock Data
        </button>
        <button onClick={stopMockData} className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md hover:bg-destructive/90">
          Stop Mock Data
        </button>
        <button onClick={sendSingleMockData} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/90">
          Send Single Event
        </button>
        <button onClick={clearWindHistory} className="bg-tertiary text-tertiary-foreground px-4 py-2 rounded-md hover:bg-tertiary/90">
          Clear History
        </button>
      </div>
    </div>
  );
});
