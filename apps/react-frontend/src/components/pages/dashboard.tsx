import { ConstructionModeAlert } from '@/components/atoms/alerts/construction-mode-alert';
import { FloatingStatusIndicator } from '@/components/atoms/indicators/floating-status-indicator';
import { PageMeta } from '@/components/atoms/seo/page-meta';
import { SectionCards } from '@/components/molecules/cards/section-cards-wind';
import { WindChartInteractive } from '@/components/molecules/charts/wind-chart-interactive';
import { WindTrendChart } from '@/components/molecules/charts/wind-trend-chart';
import { WindData1MinTable } from '@/components/molecules/tables/wind-data-1min-table';
import { WindData10MinTable } from '@/components/molecules/tables/wind-data-10min-table';
import { WindDataTable } from '@/components/molecules/tables/wind-data-table';
import { AppSidebar } from '@/components/organisms/navigation/app-sidebar';
import { SiteHeader } from '@/components/organisms/navigation/site-header';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { useTransmitSubscription } from '@/hooks/use-transmit-subscription';
import type { WindData } from '@/types/wind';
import { useState, useCallback } from 'react';

import { windLivePayloadSchema } from '@repo/schemas';

const UNIT_STORAGE_KEY = 'aiolos:wind-unit';

export function Dashboard() {
  // Fixed station ID for Vasiliki weather station
  const stationId = 'vasiliki-001';

  // Wind data state
  const [windData, setWindData] = useState<WindData | null>(null);
  // Knots is the windsurfer default; the choice persists across visits
  const [selectedUnit, setSelectedUnit] = useState<string>(
    () => localStorage.getItem(UNIT_STORAGE_KEY) ?? 'knots',
  );
  const [windHistory, setWindHistory] = useState<WindData[]>([]);

  const handleUnitChange = useCallback((unit: string) => {
    localStorage.setItem(UNIT_STORAGE_KEY, unit);
    setSelectedUnit(unit);
  }, []);

  const { error } = useTransmitSubscription(
    `wind/live/${stationId}`,
    windLivePayloadSchema,
    (payload) => {
      setWindData(payload);
      setWindHistory((prev) => [...prev.slice(-99), payload]); // Keep last 100 readings
    },
  );

  return (
    <SidebarProvider
      defaultOpen={false}
      style={
        {
          '--sidebar-width': 'calc(var(--spacing) * 72)',
          '--header-height': 'calc(var(--spacing) * 12)',
        } as React.CSSProperties
      }
    >
      <PageMeta
        title="Live Wind Dashboard — Vasiliki | Aiolos"
        description="Real-time wind speed, direction, gusts and temperature for Vasiliki, Lefkada — updated live from the Aiolos weather station."
        path="/dashboard"
      />
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="px-4 lg:px-6">
                <ConstructionModeAlert />
              </div>

              {/* Current conditions first — most valuable on a phone at the beach */}
              <div className="px-4 lg:px-6">
                <WindChartInteractive windData={windData} selectedUnit={selectedUnit} />
              </div>

              <div className="px-4 lg:px-6">
                <WindTrendChart stationId={stationId} selectedUnit={selectedUnit} />
              </div>

              <SectionCards
                stationId={stationId}
                error={error}
                selectedUnit={selectedUnit}
                onUnitChange={handleUnitChange}
                lastWindData={windData}
              />

              <div className="px-4 lg:px-6">
                <WindData10MinTable stationId={stationId} selectedUnit={selectedUnit} />
              </div>

              <div className="px-4 lg:px-6">
                <WindData1MinTable stationId={stationId} selectedUnit={selectedUnit} />
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

          <footer className="text-muted-foreground mt-12 p-4 text-center text-sm">
            <p>Resonect Technology s.r.o. &copy; {new Date().getFullYear()}</p>
          </footer>
        </div>
      </SidebarInset>

      {/* Floating Status Indicator */}
      <FloatingStatusIndicator stationId={stationId} lastWindData={windData} />
    </SidebarProvider>
  );
}
