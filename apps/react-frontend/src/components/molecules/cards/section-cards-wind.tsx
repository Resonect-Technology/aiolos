import { Card, CardContent } from "@/components/ui/card";
import { ConnectionStatus } from "@/components/molecules/status/connection-status";
import { TemperatureDisplay } from "@/components/atoms/displays/temperature-display";
import { UnitSelector } from "@/components/atoms/controls/unit-selector";

interface SectionCardsProps {
  stationId: string;
  error: string | null;
  selectedUnit: string;
  onUnitChange: (unit: string) => void;
}

export function SectionCards({
  stationId,
  error,
  selectedUnit,
  onUnitChange,
}: SectionCardsProps) {
  return (
    <div className="grid auto-rows-min gap-4 md:grid-cols-3 px-4 lg:px-6">
      {/* Connection Status */}
      <Card >
        <CardContent >
          <ConnectionStatus error={error} stationId={stationId} />
        </CardContent>
      </Card>

      <Card >
        <CardContent >
          <TemperatureDisplay stationId={stationId} />
        </CardContent>
      </Card>

      <Card >
        <CardContent >
          <UnitSelector selectedUnit={selectedUnit} onUnitChange={onUnitChange} />
        </CardContent>
      </Card>
    </div>
  );
}
