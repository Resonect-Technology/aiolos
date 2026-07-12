import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Wind, ArrowUp, ArrowDown, TrendingUp, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';

import { useWindAggregatedData, useWindAggregatedSSE } from '../../../hooks/useWindAggregatedData';
import {
  convertWindSpeed,
  formatWindDirection,
  formatWindSpeed,
  WIND_GUST_COLOR,
  WIND_UNIT_LABELS,
} from '../../../lib/wind-utils';
import type { WindAggregated1Min } from '../../../types/wind-aggregated';

interface WindData1MinTableProps {
  stationId: string;
  selectedUnit: string;
}

export function WindData1MinTable({ stationId, selectedUnit }: WindData1MinTableProps) {
  const [tableData, setTableData] = useState<WindAggregated1Min[]>([]);

  const { data, loading, error } = useWindAggregatedData<WindAggregated1Min>({
    stationId,
    interval: '1min',
    limit: 10,
  });

  // Update table data when new data is fetched
  useEffect(() => {
    // Sort data to show latest first
    const sortedData = [...data].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
    setTableData(sortedData);
  }, [data]);

  // Real-time updates for new aggregated data
  const handleNewAggregate = useCallback((newData: WindAggregated1Min) => {
    setTableData((prev) => {
      // Remove any existing entry for the same timestamp and add the new one
      const filtered = prev.filter((item) => item.timestamp !== newData.timestamp);
      const updated = [...filtered, newData].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(), // Sort descending (latest first)
      );
      // Keep only the last 10 records (most recent)
      return updated.slice(0, 10);
    });
  }, []);

  useWindAggregatedSSE<WindAggregated1Min>({
    stationId,
    interval: '1min',
    onNewAggregate: handleNewAggregate,
  });

  const formatTime = (timestamp: string) => {
    // Show the END of the 1-minute interval (matches the 10-minute table)
    const intervalEnd = new Date(new Date(timestamp).getTime() + 60 * 1000);
    return intervalEnd.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const unitLabel = WIND_UNIT_LABELS[selectedUnit] || 'm/s';

  const getSpeedTrend = (current: WindAggregated1Min, index: number) => {
    if (index === tableData.length - 1) return null; // Last item (oldest) has no previous
    const previous = tableData[index + 1]; // Next item in array is older due to descending sort
    if (!previous) return null;
    const currentAvg = convertWindSpeed(current.avgSpeed, selectedUnit);
    const previousAvg = convertWindSpeed(previous.avgSpeed, selectedUnit);

    if (currentAvg > previousAvg) {
      return <ArrowUp className="h-3 w-3 text-green-600 dark:text-green-400" />;
    } else if (currentAvg < previousAvg) {
      return <ArrowDown className="h-3 w-3 text-red-600 dark:text-red-400" />;
    }
    return null;
  };

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="text-primary h-5 w-5" />
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
          <div className="text-muted-foreground py-8 text-center">
            <Wind className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No recent wind data available</p>
            <p className="mt-2 text-sm">Check if the station is active and transmitting data.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-end">
              <Badge variant="outline">
                {tableData.length} records (last 10 minutes) • Unit: {unitLabel}
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Time (end)</TableHead>
                    <TableHead>Avg Speed</TableHead>
                    <TableHead>Min Speed</TableHead>
                    <TableHead>Max Speed</TableHead>
                    <TableHead>Gust</TableHead>
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
                            {formatWindSpeed(row.avgSpeed, selectedUnit)} {unitLabel}
                          </span>
                          {getSpeedTrend(row, index)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">
                          {formatWindSpeed(row.minSpeed, selectedUnit)} {unitLabel}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-foreground font-medium">
                          {formatWindSpeed(row.maxSpeed, selectedUnit)} {unitLabel}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium" style={{ color: WIND_GUST_COLOR }}>
                          {row.gustSpeed !== null
                            ? `${formatWindSpeed(row.gustSpeed, selectedUnit)} ${unitLabel}`
                            : '–'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {formatWindDirection(row.dominantDirection)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">{row.sampleCount}</Badge>
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
