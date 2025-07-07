import { useState, useEffect, useRef, useCallback } from 'react';
import { Transmit } from '@adonisjs/transmit-client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Wind, Compass } from "lucide-react";

import { WindDirectionCompass } from './wind-direction-compass';
import { WindRoseChart } from './wind-rose-chart';
import { UnitSelector } from './unit-selector';
import { WindSpeedDisplay } from './wind-speed-display';
import { ConnectionStatus } from './connection-status';
import { DiagnosticsPanel } from './diagnostics-panel';
import { TemperatureDisplay } from './temperature-display';
import { ThemeToggle } from './theme-toggle';
import './wind-direction-compass.css';

interface WindData {
  windSpeed: number;
  windDirection: number;
  timestamp: string;
}

interface WindDashboardProps {
  stationId: string;
}

export function WindDashboard({ stationId }: WindDashboardProps) {
  const [windData, setWindData] = useState<WindData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUnit, setSelectedUnit] = useState<string>("m/s");
  const [windHistory, setWindHistory] = useState<WindData[]>([]);

  const transmitInstanceRef = useRef<Transmit | null>(null);
  const subscriptionRef = useRef<any | null>(null);

  const handleUnitChange = useCallback((unit: string) => {
    setSelectedUnit(unit);
  }, []);

  useEffect(() => {
    // Clear any previous connection state
    setIsConnected(false);
    setError(null);

    // Initialize Transmit instance if it doesn't exist
    if (!transmitInstanceRef.current) {
      console.log('Creating new Transmit instance');
      transmitInstanceRef.current = new Transmit({
        baseUrl: window.location.origin,
      });
    }

    const transmit = transmitInstanceRef.current;
    const channelName = `wind/live/${stationId}`;

    const newSubscription = transmit.subscription(channelName);
    subscriptionRef.current = newSubscription;

    newSubscription.create()
      .then(() => {
        setIsConnected(true);
        setError(null);

        newSubscription.onMessage((data: WindData) => {
          if (data && typeof data.windSpeed === 'number') {
             setWindData(data);
             setWindHistory(prev => [...prev.slice(-99), data]); // Keep last 100 readings
          } else {
            const messagePayload = (data as any).data;
            if (messagePayload && typeof messagePayload.windSpeed === 'number') {
              setWindData(messagePayload);
              setWindHistory(prev => [...prev.slice(-99), messagePayload]); // Keep last 100 readings
            } else {
               console.warn('Received message in unexpected format:', data);
            }
          }
        });
      })
      .catch(err => {
        setError(`Failed to connect: ${err.message || 'Unknown error'}`);
        setIsConnected(false);
      });

    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.delete()
          .catch((err: Error) => console.error(`Failed to unsubscribe from ${channelName}:`, err));
        subscriptionRef.current = null;
      }
    };
  }, [stationId]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        
        {/* Dashboard Header with Theme Toggle */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Wind className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold text-foreground">Wind Dashboard</h1>
          </div>
          <ThemeToggle />
        </div>
        
        {/* Main Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          
          {/* Header Row - Connection Status + Temperature + Unit Selector */}
          <div className="lg:col-span-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Connection Status */}
              <Card className="lg:col-span-2">
                <CardContent className="p-6">
                  <ConnectionStatus 
                    isConnected={isConnected}
                    error={error}
                  />
                </CardContent>
              </Card>
              
              {/* Temperature + Unit Selector */}
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-6">
                    <TemperatureDisplay stationId={stationId} />
                    <Separator />
                    <UnitSelector 
                      selectedUnit={selectedUnit} 
                      onUnitChange={handleUnitChange} 
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Wind Speed Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wind className="h-5 w-5 text-primary" />
                Wind Speed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WindSpeedDisplay 
                windData={windData} 
                selectedUnit={selectedUnit} 
              />
            </CardContent>
          </Card>

          {/* Wind Direction Card */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Compass className="h-5 w-5 text-primary" />
                Wind Direction
              </CardTitle>
            </CardHeader>
            <CardContent>
              <WindDirectionCompass 
                windDirection={windData?.windDirection} 
              />
            </CardContent>
          </Card>

          {/* Wind Rose Chart - Spans full width */}
          <Card className="lg:col-span-4">
            <CardHeader>
              <CardTitle className="text-center">Wind Rose Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <WindRoseChart 
                windHistory={windHistory} 
                selectedUnit={selectedUnit} 
              />
            </CardContent>
          </Card>

          {/* Diagnostics Panel - Full width */}
          <Card className="lg:col-span-4">
            <DiagnosticsPanel stationId={stationId} />
          </Card>
          
        </div>
      </div>
    </div>
  );
}
