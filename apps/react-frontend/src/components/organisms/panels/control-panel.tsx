import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Settings,
  Clock,
  Play,
  Square,
  Send,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { memo } from 'react';

interface WindData {
  windSpeed: number;
  windDirection: number;
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
  clearWindHistory,
}: ControlPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="text-primary h-5 w-5" />
          Dashboard Controls
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-between space-y-6 lg:flex-row lg:space-y-0 lg:space-x-6">
          {/* Status Information */}
          <div className="flex-1 text-center lg:text-left">
            {windData ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 lg:justify-start">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-muted-foreground text-sm font-medium">
                    Last Data Received
                  </span>
                </div>
                <Badge variant="outline" className="text-sm">
                  <Clock className="mr-1 h-3 w-3" />
                  {formatTimestamp(windData.timestamp)}
                </Badge>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 lg:justify-start">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-muted-foreground text-sm font-medium">Status</span>
                </div>
                <Badge variant="secondary">Waiting for wind data...</Badge>
              </div>
            )}
          </div>

          <Separator orientation="vertical" className="hidden h-16 lg:block" />
          <Separator className="lg:hidden" />

          {/* Control Buttons */}
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={startMockData} className="gap-2">
              <Play className="h-4 w-4" />
              Start Mock Data
            </Button>
            <Button onClick={stopMockData} variant="destructive" className="gap-2">
              <Square className="h-4 w-4" />
              Stop Mock Data
            </Button>
            <Button onClick={sendSingleMockData} variant="secondary" className="gap-2">
              <Send className="h-4 w-4" />
              Send Single Event
            </Button>
            <Button onClick={clearWindHistory} variant="outline" className="gap-2">
              <Trash2 className="h-4 w-4" />
              Clear History
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});
