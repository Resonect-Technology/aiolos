import { useState, useEffect, useRef } from "react";
import { Transmit } from "@adonisjs/transmit-client";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Thermometer } from "lucide-react";
import { formatLastUpdated } from "../../../lib/time-utils";

interface TemperatureData {
  temperature: number;
  timestamp: string;
}

interface TemperatureDisplayProps {
  stationId: string;
}

export function TemperatureDisplay({ stationId }: TemperatureDisplayProps) {
  const [temperatureData, setTemperatureData] = useState<TemperatureData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const transmitInstanceRef = useRef<Transmit | null>(null);
  const subscriptionRef = useRef<any | null>(null);

  useEffect(() => {
    // Clear any previous connection state
    setError(null);
    setLoading(true);

    // Initialize Transmit instance if it doesn't exist
    if (!transmitInstanceRef.current) {
      console.log("Creating new Transmit instance for temperature");
      transmitInstanceRef.current = new Transmit({
        baseUrl: window.location.origin,
      });
    }

    const transmit = transmitInstanceRef.current;
    const channelName = `temperature/live/${stationId}`;

    const newSubscription = transmit.subscription(channelName);
    subscriptionRef.current = newSubscription;

    newSubscription
      .create()
      .then(() => {
        setLoading(false);
        setError(null);
        console.log(`Connected to temperature channel: ${channelName}`);

        newSubscription.onMessage((data: TemperatureData) => {
          console.log("Temperature data received:", data);
          if (data && typeof data.temperature === "number") {
            setTemperatureData(data);
          } else {
            // Handle wrapped message format
            const messagePayload = (data as any).data;
            if (messagePayload && typeof messagePayload.temperature === "number") {
              setTemperatureData(messagePayload);
            } else {
              console.warn("Received temperature message in unexpected format:", data);
            }
          }
        });
      })
      .catch(err => {
        console.error("Failed to connect to temperature channel:", err);
        setError(`Failed to connect: ${err.message || "Unknown error"}`);
        setLoading(false);

        // Fallback to API polling if SSE fails
        fetchTemperatureFromAPI();
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
  const fetchTemperatureFromAPI = async () => {
    try {
      console.log(`Fetching temperature from API for station: ${stationId}`);
      const url = `/api/stations/${stationId}/temperature/latest`;
      const response = await fetch(url);

      if (!response.ok) {
        console.log(`API Error (${response.status}): Could not fetch temperature data`);
        return;
      }

      const data = await response.json();
      console.log("Temperature data from API:", data);

      // Convert API response to expected format
      if (data.temperature !== undefined) {
        setTemperatureData({
          temperature: data.temperature,
          timestamp: data.lastUpdated || data.createdAt || new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error("Error fetching temperature from API:", err);
    }
  };

  return (
    <div className="text-center space-y-2">
      <div className="flex items-center justify-center gap-2">
        <Thermometer className="h-4 w-4 card-foreground" />
        <h3 className="text-2xl font-bold card-foreground">Current Temperature</h3>
      </div>

      <div className="flex justify-center items-center min-h-[60px]">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        ) : error ? (
          <Badge variant="destructive">Error</Badge>
        ) : (
          <div className="text-5xl font-bold text-center text-primary">
            {temperatureData?.temperature !== null && temperatureData?.temperature !== undefined ? (
              <>
                {temperatureData.temperature.toFixed(1)}
                <span> °C</span>
              </>
            ) : (
              <span className="text-primary">N/A</span>
            )}
          </div>
        )}
      </div>

      {temperatureData?.timestamp && (
        <div className="text-center">
          <Badge variant="outline" className="text-xs">
            {formatLastUpdated(temperatureData.timestamp)}
          </Badge>
        </div>
      )}
    </div>
  );
}
