import { useState, useEffect, useCallback } from "react";
import { Wind, ArrowUp, ArrowDown, TrendingUp, Loader2 } from "lucide-react";
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
import { useWindAggregatedData, useWindAggregatedSSE } from "../../../hooks/useWindAggregatedData";
import { convertWindSpeed, WIND_UNIT_LABELS } from "../../../lib/wind-utils";
import type { WindAggregated1Min } from "../../../types/wind-aggregated";

interface WindData1MinTableProps {
  stationId: string;
  selectedUnit: string;
}

export function WindData1MinTable({ stationId, selectedUnit }: WindData1MinTableProps) {
  const [tableData, setTableData] = useState<WindAggregated1Min[]>([]);

  const { data, loading, error } = useWindAggregatedData({
    stationId,
    interval: "1min",
    limit: 10
  });

  // Update table data when new data is fetched
  useEffect(() => {
    // Sort data to show latest first
    const sortedData = [...data].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setTableData(sortedData);
  }, [data]);

  // Real-time updates for new aggregated data
  const handleNewAggregate = useCallback((newData: WindAggregated1Min) => {
    setTableData(prev => {
      // Remove any existing entry for the same timestamp and add the new one
      const filtered = prev.filter(item => item.timestamp !== newData.timestamp);
      const updated = [...filtered, newData].sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime() // Sort descending (latest first)
      );
      // Keep only the last 10 records (most recent)
      return updated.slice(0, 10);
    });
  }, []);

  useWindAggregatedSSE({ stationId, onNewAggregate: handleNewAggregate });

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
    // Data always comes in m/s from backend, convert to selected unit
    return convertWindSpeed(speed, selectedUnit);
  };

  const formatSpeed = (speed: number) => {
    const converted = convertSpeed(speed);
    return selectedUnit === "beaufort" ? Math.round(converted) : converted.toFixed(1);
  };

  const getUnitLabel = () => {
    return WIND_UNIT_LABELS[selectedUnit] || "m/s";
  };

  const getSpeedTrend = (current: WindAggregated1Min, index: number) => {
    if (index === tableData.length - 1) return null; // Last item (oldest) has no previous
    const previous = tableData[index + 1]; // Next item in array is older due to descending sort
    const currentAvg = convertSpeed(current.avgSpeed);
    const previousAvg = convertSpeed(previous.avgSpeed);

    if (currentAvg > previousAvg) {
      return <ArrowUp className="h-3 w-3 text-green-500" />;
    } else if (currentAvg < previousAvg) {
      return <ArrowDown className="h-3 w-3 text-red-500" />;
    }
    return null;
  };

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Recent Wind Data (Last 10 Minutes)</CardTitle>
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
            <span className="ml-2">Loading wind data...</span>
          </div>
        ) : tableData.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Wind className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent wind data available</p>
            <p className="text-sm mt-2">Check if the station is active and transmitting data.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Badge variant="outline">
                {tableData.length} records (last 10 minutes) • Unit: {getUnitLabel()}
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
                    <TableHead className="text-right">Samples</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableData.map((row, index) => (
                    <TableRow key={row.timestamp}>
                      <TableCell className="font-mono text-sm">
                        {formatTime(row.timestamp)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {formatSpeed(row.avgSpeed)} {getUnitLabel()}
                          </span>
                          {getSpeedTrend(row, index)}
                        </div>
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
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {row.sampleCount}
                        </Badge>
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