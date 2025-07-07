import { memo } from 'react';
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Wifi, WifiOff } from "lucide-react";

interface ConnectionStatusProps {
  isConnected: boolean;
  error: string | null;
}

export const ConnectionStatus = memo(function ConnectionStatus({
  isConnected,
  error
}: ConnectionStatusProps) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-primary">
          Aiolos Wind Monitoring
        </h1>
        <p className="text-muted-foreground">
          Real-time wind data from Vasiliki
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm font-medium text-foreground">
          Station: Vasiliki Weather Station
        </div>
        <Badge 
          variant={isConnected ? "default" : "destructive"} 
          className="flex items-center gap-2 w-fit"
        >
          {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>
      </div>
      
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
});
