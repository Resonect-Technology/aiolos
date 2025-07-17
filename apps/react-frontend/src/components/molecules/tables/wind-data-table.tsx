import { Card, CardContent } from "@/components/ui/card";
import { WindRoseChart } from "../charts/wind-rose-chart";
import { DiagnosticsPanel } from "../../organisms/panels/diagnostics-panel";
import { Tornado } from "lucide-react";

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
        <div className="grid auto-rows-min gap-4 w-full">
            {/* Wind Rose Chart - Full width */}
            <Card className="min-w-0">
                <CardContent className="p-4 lg:p-6">
                    <div className="w-full max-w-full overflow-hidden">
                        <div className="space-y-4">
                            <div className="flex items-center justify-center gap-2">
                                <Tornado className="h-4 w-4 text-primary" />
                                <h3 className="text-xl lg:text-2xl font-semibold text-foreground">Wind Rose Analysis</h3>
                            </div>
                            <WindRoseChart windHistory={windHistory} selectedUnit={selectedUnit} />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Diagnostics Panel - Full width */}
            <DiagnosticsPanel stationId={stationId} />
        </div>
    );
}
