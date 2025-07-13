import { useState, useEffect, useCallback } from "react";
import { Wind, Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { useWind10MinData, useWind10MinSSE } from "../hooks/useWind10MinData";
import { convertWindSpeed, WIND_UNIT_LABELS } from "../lib/wind-utils";
import { TendencyIndicator } from "../components/tendency-indicator";
import type { WindAggregated10Min } from "../types/wind-aggregated";

interface WindData10MinTableProps {
  stationId: string;
  selectedUnit: string;
}

export function WindData10MinTable({ stationId, selectedUnit }: WindData10MinTableProps) {
  const [tableData, setTableData] = useState<WindAggregated10Min[]>([]);

  const { data, loading, error } = useWind10MinData({
    stationId,
    unit: selectedUnit === "m/s" ? "ms" : selectedUnit,
    limit: 6
  });

  // Update table data when new data is fetched
  useEffect(() => {
    setTableData(data);
  }, [data]);

  // Real-time updates for new aggregated data
  const handleNewAggregate = useCallback((newData: WindAggregated10Min) => {
    setTableData(prev => {
      // Remove any existing entry for the same timestamp and add the new one
      const filtered = prev.filter(item => item.timestamp !== newData.timestamp);
      const updated = [...filtered, newData].sort((a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      // Keep only the last 6 records (most recent)
      return updated.slice(-6);
    });
  }, []);

  useWind10MinSSE({ stationId, onNewAggregate: handleNewAggregate });

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDirection = (degrees: number) => {
    const cardinalDirections = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return `${degrees}° ${cardinalDirections[index]}`;
  };

  const convertSpeed = (speed: number) => {
    if (selectedUnit === "m/s") return speed;
    return convertWindSpeed(speed, selectedUnit);
  };

  const formatSpeed = (speed: number) => {
    const converted = convertSpeed(speed);
    return selectedUnit === "beaufort" ? Math.round(converted) : converted.toFixed(1);
  };

  const getUnitLabel = () => {
    return WIND_UNIT_LABELS[selectedUnit] || "m/s";
  };

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Wind Trends (Last Hour)</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading 10-minute wind data...</span>
          </div>
        ) : tableData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wind className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No 10-minute wind data available</p>
            <p className="text-sm mt-2">Data will appear after some time when 1-minute data is aggregated.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Badge variant="outline">
                {tableData.length} intervals (last hour) • Unit: {getUnitLabel()}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Time</TableHead>
                    <TableHead>Avg Speed</TableHead>
                    <TableHead>Min Speed</TableHead>
                    <TableHead>Max Speed</TableHead>
                    <TableHead>Direction</TableHead>
                    <TableHead>Tendency</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row) => (
                    <TableRow key={row.timestamp}>
                      <TableCell className="font-mono text-sm">
                        {formatTime(row.timestamp)}
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">
                          {formatSpeed(row.avgSpeed)} {getUnitLabel()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-blue-600">
                          {formatSpeed(row.minSpeed)} {getUnitLabel()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-red-600">
                          {formatSpeed(row.maxSpeed)} {getUnitLabel()}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {formatDirection(row.dominantDirection)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <TendencyIndicator tendency={row.tendency} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}