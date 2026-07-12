import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Battery, Sun, Wifi, Clock, AlertTriangle } from 'lucide-react';
import { useState } from 'react';

import {
  diagnosticsHistoryRowSchema,
  diagnosticsLivePayloadSchema,
  type DiagnosticsLivePayload,
} from '@repo/schemas';

import { useTransmitSubscription } from '../../../hooks/use-transmit-subscription';
import { formatLastUpdated } from '../../../lib/time-utils';

interface DiagnosticsPanelProps {
  stationId: string;
}

export function DiagnosticsPanel({ stationId }: DiagnosticsPanelProps) {
  const [diagnosticsData, setDiagnosticsData] = useState<DiagnosticsLivePayload | null>(null);

  // Fallback for when SSE fails
  const fetchDiagnosticsFromAPI = async () => {
    try {
      const response = await fetch(`/api/stations/${stationId}/diagnostics`);

      if (!response.ok) {
        if (response.status === 404) {
          setDiagnosticsData(null);
        }
        return;
      }

      // The "no diagnostics yet" message body simply fails the parse and
      // leaves the panel in its empty state
      const parsed = diagnosticsHistoryRowSchema.safeParse(await response.json());
      if (parsed.success) {
        setDiagnosticsData({
          ...parsed.data,
          timestamp: parsed.data.createdAt,
        });
      }
    } catch (err) {
      console.error('Error fetching diagnostics from API:', err);
    }
  };

  const { connected, error } = useTransmitSubscription(
    `station/diagnostics/${stationId}`,
    diagnosticsLivePayloadSchema,
    setDiagnosticsData,
    fetchDiagnosticsFromAPI,
  );

  const loading = !connected && !error;

  // Format uptime from seconds to a human-readable format
  const formatUptime = (seconds: number) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return 'N/A';

    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);

    return `${days}d ${hours}h ${minutes}m`;
  };

  // Format timestamp to local date and time (currently unused but kept for future use)
  // const formatTimestamp = (timestamp: string) => {
  //   if (!timestamp) return 'N/A';
  //   const date = new Date(timestamp);
  //   return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
  // };

  // Convert CSQ signal quality to a human-readable format for 2G/GPRS
  const formatSignalQuality = (csq: number) => {
    if (csq === undefined || csq === null) return 'N/A';

    // CSQ values are typically 0-31 for 2G/GPRS modems
    let quality = '';
    if (csq >= 20) {
      quality = 'Excellent';
    } else if (csq >= 15) {
      quality = 'Good';
    } else if (csq >= 10) {
      quality = 'Fair';
    } else if (csq >= 5) {
      quality = 'Poor';
    } else {
      quality = 'Very Poor';
    }

    return `CSQ: ${csq} (${quality})`;
  };

  const getSignalQualityVariant = (
    csq: number,
  ): 'default' | 'secondary' | 'destructive' | 'outline' => {
    if (csq >= 15) return 'default';
    if (csq >= 10) return 'secondary';
    if (csq >= 5) return 'outline';
    return 'destructive';
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-2">
        <Activity className="text-primary h-5 w-5" />
        <h2 className="text-foreground text-2xl font-bold">Station Diagnostics</h2>
      </div>

      {loading && !diagnosticsData && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {diagnosticsData && (
        <div className="space-y-6">
          {/* Timestamp */}
          {diagnosticsData.timestamp && (
            <div className="text-center">
              <Badge variant="outline" className="text-xs">
                Last updated: {formatLastUpdated(diagnosticsData.timestamp)}
              </Badge>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {/* Battery Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Battery className="text-primary h-4 w-4" />
                  Power Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Battery:</span>
                    <span className="font-medium">
                      {diagnosticsData.batteryVoltage !== null &&
                      diagnosticsData.batteryVoltage !== undefined
                        ? `${diagnosticsData.batteryVoltage.toFixed(2)}V`
                        : 'N/A'}
                    </span>
                  </div>
                  {diagnosticsData.batteryVoltage != null && (
                    <Progress
                      value={Math.min(
                        100,
                        Math.max(0, ((diagnosticsData.batteryVoltage - 3.0) / (4.2 - 3.0)) * 100),
                      )}
                      className="h-2"
                    />
                  )}
                </div>

                <Separator />

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Sun className="h-3 w-3" />
                    Solar:
                  </span>
                  <span className="font-medium">
                    {diagnosticsData.solarVoltage !== null &&
                    diagnosticsData.solarVoltage !== undefined
                      ? `${diagnosticsData.solarVoltage.toFixed(2)}V`
                      : 'N/A'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="text-primary h-4 w-4" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Uptime:
                  </span>
                  <span className="font-medium">
                    {diagnosticsData.uptime !== null && diagnosticsData.uptime !== undefined
                      ? formatUptime(diagnosticsData.uptime)
                      : 'N/A'}
                  </span>
                </div>
                {diagnosticsData.firmwareVersion && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Firmware:</span>
                    <Badge variant="outline">v{diagnosticsData.firmwareVersion}</Badge>
                  </div>
                )}
                {diagnosticsData.resetReason && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Last reset:</span>
                    <Badge
                      variant={
                        ['POWERON', 'DEEPSLEEP'].includes(diagnosticsData.resetReason)
                          ? 'secondary'
                          : 'destructive'
                      }
                    >
                      {diagnosticsData.resetReason}
                    </Badge>
                  </div>
                )}
                {typeof diagnosticsData.freeHeap === 'number' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Free heap:</span>
                    <span className="font-medium">
                      {Math.round(diagnosticsData.freeHeap / 1024)} kB
                      {typeof diagnosticsData.minFreeHeap === 'number' &&
                        ` (min ${Math.round(diagnosticsData.minFreeHeap / 1024)} kB)`}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Connectivity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wifi className="text-primary h-4 w-4" />
                  Connectivity
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Signal Quality:</span>
                    <Badge variant={getSignalQualityVariant(diagnosticsData.signalQuality)}>
                      {diagnosticsData.signalQuality !== null &&
                      diagnosticsData.signalQuality !== undefined
                        ? formatSignalQuality(diagnosticsData.signalQuality)
                        : 'N/A'}
                    </Badge>
                  </div>
                  {diagnosticsData.signalQuality != null && (
                    <Progress
                      value={Math.min(100, (diagnosticsData.signalQuality / 31) * 100)}
                      className="h-2"
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!loading && !error && !diagnosticsData && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No diagnostics data available for this station. Diagnostics data will appear here once
            the station has sent its first diagnostics report.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
