import { Card, CardContent } from "@/components/ui/card";
import { WindRoseChart } from "./wind-rose-chart";
import { DiagnosticsPanel } from "./diagnostics-panel";

interface WindData {
  windSpeed: number;
  windDirection: number;
  timestamp: string;
}

interface WindDataTableProps {
  windHistory: WindData[];
  selectedUnit: string;
  stationId: string;
}

export function WindDataTable({ windHistory, selectedUnit, stationId }: WindDataTableProps) {
  return (
    <div className="grid auto-rows-min gap-4">
      {/* Wind Rose Chart - Full width */}
      <Card>
        <CardContent className="p-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-center">Wind Rose Analysis</h3>
            <WindRoseChart windHistory={windHistory} selectedUnit={selectedUnit} />
          </div>
        </CardContent>
      </Card>

      {/* Diagnostics Panel - Full width */}
      <DiagnosticsPanel stationId={stationId} />
    </div>
  );
}
