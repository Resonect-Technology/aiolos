import { useState, useEffect, useRef, useCallback } from "react";
import { Transmit } from "@adonisjs/transmit-client";
import { AppSidebar } from "@/components/app-sidebar";
import { SectionCards } from "@/components/section-cards-wind";
import { WindChartInteractive } from "@/components/wind-chart-interactive";
import { WindDataTable } from "@/components/wind-data-table";
import { WindData1MinTable } from "@/components/wind-data-1min-table";
import { WindData10MinTable } from "@/components/wind-data-10min-table";
import { SiteHeader } from "@/components/site-header";
import { ConstructionModeAlert } from "./components/construction-mode-alert";
import { ThemeProvider } from "./components/theme-provider";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";

interface WindData {
  windSpeed: number;
  windDirection: number;
  timestamp: string;
}

function App() {
  // Fixed station ID for Vasiliki weather station
  const stationId = "vasiliki-001";

  // Wind data state
  const [windData, setWindData] = useState<WindData | null>(null);
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
    setError(null);

    // Initialize Transmit instance if it doesn't exist
    if (!transmitInstanceRef.current) {
      console.log("Creating new Transmit instance");
      transmitInstanceRef.current = new Transmit({
        baseUrl: window.location.origin,
      });
    }

    const transmit = transmitInstanceRef.current;
    const channelName = `wind/live/${stationId}`;

    const newSubscription = transmit.subscription(channelName);
    subscriptionRef.current = newSubscription;

    newSubscription
      .create()
      .then(() => {
        setError(null);

        newSubscription.onMessage((data: WindData) => {
          if (data && typeof data.windSpeed === "number") {
            setWindData(data);
            setWindHistory(prev => [...prev.slice(-99), data]); // Keep last 100 readings
          } else {
            const messagePayload = (data as any).data;
            if (messagePayload && typeof messagePayload.windSpeed === "number") {
              setWindData(messagePayload);
              setWindHistory(prev => [...prev.slice(-99), messagePayload]); // Keep last 100 readings
            } else {
              console.warn("Received message in unexpected format:", data);
            }
          }
        });
      })
      .catch(err => {
        setError(`Failed to connect: ${err.message || "Unknown error"}`);
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

  return (
    <ThemeProvider defaultTheme="light" storageKey="aiolos-ui-theme">
      <SidebarProvider
        defaultOpen={false}
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 72)",
            "--header-height": "calc(var(--spacing) * 12)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                <div className="px-4 lg:px-6">
                  <ConstructionModeAlert />
                </div>

                <SectionCards
                  stationId={stationId}
                  error={error}
                  selectedUnit={selectedUnit}
                  onUnitChange={handleUnitChange}
                />

                <div className="px-4 lg:px-6">
                  <WindChartInteractive windData={windData} selectedUnit={selectedUnit} />
                </div>

                <div className="px-4 lg:px-6">
                  <WindData1MinTable
                    stationId={stationId}
                    selectedUnit={selectedUnit}
                  />
                </div>

                <div className="px-4 lg:px-6">
                  <WindData10MinTable
                    stationId={stationId}
                    selectedUnit={selectedUnit}
                  />
                </div>

                <div className="px-4 lg:px-6">
                  <WindDataTable
                    windHistory={windHistory}
                    selectedUnit={selectedUnit}
                    stationId={stationId}
                  />
                </div>
              </div>
            </div>

            <footer className="mt-12 text-center text-muted-foreground text-sm p-4">
              <p>Resonect Technology s.r.o. &copy; {new Date().getFullYear()}</p>
            </footer>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ThemeProvider>
  );
}

export default App;
