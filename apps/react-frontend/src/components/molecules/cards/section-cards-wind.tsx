import { UnitSelector } from '@/components/atoms/controls/unit-selector';
import { TemperatureDisplay } from '@/components/atoms/displays/temperature-display';
import { ConnectionStatus } from '@/components/molecules/status/connection-status';
import { Card, CardContent } from '@/components/ui/card';
import type { WindData } from '@/types/wind';

interface SectionCardsProps {
  stationId: string;
  error: string | null;
  selectedUnit: string;
  onUnitChange: (unit: string) => void;
  lastWindData: WindData | null;
}

export function SectionCards({
  stationId,
  error,
  selectedUnit,
  onUnitChange,
  lastWindData,
}: SectionCardsProps) {
  return (
    <div className="grid auto-rows-min gap-4 px-4 md:grid-cols-3 lg:px-6">
      {/* Connection Status */}
      <Card>
        <CardContent>
          <ConnectionStatus error={error} stationId={stationId} lastWindData={lastWindData} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <TemperatureDisplay stationId={stationId} />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <UnitSelector selectedUnit={selectedUnit} onUnitChange={onUnitChange} />
        </CardContent>
      </Card>
    </div>
  );
}
