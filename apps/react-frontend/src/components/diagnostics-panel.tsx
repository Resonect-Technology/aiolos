import { useState, useEffect, useRef } from "react";
import { Transmit } from "@adonisjs/transmit-client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Activity, Battery, Sun, Wifi, Clock, AlertTriangle } from "lucide-react";
import { formatLastUpdated } from "../lib/time-utils";

interface DiagnosticsData {
  id?: number;
  stationId: string;
  batteryVoltage: number;
  solarVoltage: number;
  internalTemperature: number | null;
  signalQuality: number;
  uptime: number;
  timestamp: string;
  createdAt?: string;
  updatedAt?: string;
}

interface DiagnosticsPanelProps {
  stationId: string;
}

export function DiagnosticsPanel({ stationId }: DiagnosticsPanelProps) {
  const [diagnosticsData, setDiagnosticsData] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const transmitInstanceRef = useRef<Transmit | null>(null);
  const subscriptionRef = useRef<any | null>(null);

  useEffect(() => {
    // Clear any previous connection state
    setError(null);
    setLoading(true);

    // Initialize Transmit instance if it doesn't exist
    if (!transmitInstanceRef.current) {
      console.log("Creating new Transmit instance for diagnostics");
      transmitInstanceRef.current = new Transmit({
        baseUrl: window.location.origin,
      });
    }

    const transmit = transmitInstanceRef.current;
    const channelName = `station/diagnostics/${stationId}`;

    const newSubscription = transmit.subscription(channelName);
    subscriptionRef.current = newSubscription;

    newSubscription
      .create()
      .then(() => {
        setLoading(false);
        setError(null);
        console.log(`Connected to diagnostics channel: ${channelName}`);

        newSubscription.onMessage((data: DiagnosticsData) => {
          console.log("Diagnostics data received:", data);
          if (data && typeof data.batteryVoltage === "number") {
            setDiagnosticsData(data);
          } else {
            // Handle wrapped message format
            const messagePayload = (data as any).data;
            if (messagePayload && typeof messagePayload.batteryVoltage === "number") {
              setDiagnosticsData(messagePayload);
            } else {
              console.warn("Received diagnostics message in unexpected format:", data);
            }
          }
        });
      })
      .catch(err => {
        console.error("Failed to connect to diagnostics channel:", err);
        setError(`Failed to connect: ${err.message || "Unknown error"}`);
        setLoading(false);

        // Fallback to API polling if SSE fails
        fetchDiagnosticsFromAPI();
      });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current
          .delete()
          .catch((err: Error) => console.error(`Failed to unsubscribe from ${channelName}:`, err));
        subscriptionRef.current = null;
      }
    };
  }, [stationId]);

  // Fallback function for API polling
  const fetchDiagnosticsFromAPI = async () => {
    try {
      console.log(`Fetching diagnostics from API for station: ${stationId}`);
      const url = `/api/stations/${stationId}/diagnostics`;
      const response = await fetch(url);

      if (!response.ok) {
        if (response.status === 404) {
          console.log("No diagnostics data found for this station");
          setDiagnosticsData(null);
          return;
        }
        console.log(`API Error (${response.status}): Could not fetch diagnostics data`);
        return;
      }

      const data = await response.json();
      console.log("Diagnostics data from API:", data);

      // Convert API response to expected format
      if (data.batteryVoltage !== undefined) {
        setDiagnosticsData({
          ...data,
          timestamp: data.createdAt || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Error fetching diagnostics from API:", err);
    }
  };

  // Format uptime from seconds to a human-readable format
  const formatUptime = (seconds: number) => {
    if (seconds === undefined || seconds === null || isNaN(seconds)) return "N/A";

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
    if (csq === undefined || csq === null) return "N/A";

    // CSQ values are typically 0-31 for 2G/GPRS modems
    let quality = "";
    if (csq >= 20) {
      quality = "Excellent";
    } else if (csq >= 15) {
      quality = "Good";
    } else if (csq >= 10) {
      quality = "Fair";
    } else if (csq >= 5) {
      quality = "Poor";
    } else {
      quality = "Very Poor";
    }

    return `CSQ: ${csq} (${quality})`;
  };

  const getSignalQualityVariant = (
    csq: number
  ): "default" | "secondary" | "destructive" | "outline" => {
    if (csq >= 15) return "default";
    if (csq >= 10) return "secondary";
    if (csq >= 5) return "outline";
    return "destructive";
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Station Diagnostics</h2>
      </div>

      {loading && !diagnosticsData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Battery Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Battery className="h-4 w-4 text-primary" />
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
                        : "N/A"}
                    </span>
                  </div>
                  {diagnosticsData.batteryVoltage && (
                    <Progress
                      value={Math.min(
                        100,
                        Math.max(0, ((diagnosticsData.batteryVoltage - 3.0) / (4.2 - 3.0)) * 100)
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
                      : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* System Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-4 w-4 text-primary" />
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
                      : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Connectivity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wifi className="h-4 w-4 text-primary" />
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
                        : "N/A"}
                    </Badge>
                  </div>
                  {diagnosticsData.signalQuality && (
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
