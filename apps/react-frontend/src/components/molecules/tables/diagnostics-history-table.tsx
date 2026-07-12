import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { getDiagnosticsHistory, type DiagnosticsHistoryRow } from '@/lib/api/admin';
import { History, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

const RANGES = [
  { label: '24h', hours: 24 },
  { label: '72h', hours: 72 },
  { label: '7d', hours: 168 },
];

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return days > 0 ? `${days}d ${hours}h` : `${hours}h ${minutes}m`;
}

export function DiagnosticsHistoryTable({ stationId }: { stationId: string }) {
  const [hours, setHours] = useState(24);
  const [rows, setRows] = useState<DiagnosticsHistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);

    getDiagnosticsHistory(stationId, hours)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message || 'Failed to load diagnostics history');
      });

    return () => {
      cancelled = true;
    };
  }, [stationId, hours]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
        <div className="space-y-1.5">
          <CardTitle className="flex items-center gap-2">
            <History className="text-primary h-4 w-4" />
            Diagnostics History
          </CardTitle>
          <CardDescription>Reports received from the station, newest first.</CardDescription>
        </div>
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={String(hours)}
          onValueChange={(value) => value && setHours(Number(value))}
        >
          {RANGES.map((range) => (
            <ToggleGroupItem key={range.hours} value={String(range.hours)}>
              {range.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!error && rows === null && (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        )}

        {!error && rows !== null && rows.length === 0 && (
          <p className="text-muted-foreground py-8 text-center text-sm">
            No diagnostics received in the selected period.
          </p>
        )}

        {!error && rows !== null && rows.length > 0 && (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Battery</TableHead>
                  <TableHead className="text-right">Solar</TableHead>
                  <TableHead className="text-right">Int. temp</TableHead>
                  <TableHead className="text-right">Signal</TableHead>
                  <TableHead className="text-right">Uptime</TableHead>
                  <TableHead>Firmware</TableHead>
                  <TableHead>Reset reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {new Date(row.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">{row.batteryVoltage.toFixed(2)} V</TableCell>
                    <TableCell className="text-right">{row.solarVoltage.toFixed(2)} V</TableCell>
                    <TableCell className="text-right">
                      {row.internalTemperature !== null
                        ? `${row.internalTemperature.toFixed(1)} °C`
                        : '—'}
                    </TableCell>
                    <TableCell className="text-right">CSQ {row.signalQuality}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatUptime(row.uptime)}
                    </TableCell>
                    <TableCell>{row.firmwareVersion ?? '—'}</TableCell>
                    <TableCell>
                      {row.resetReason ? (
                        <Badge
                          variant={
                            ['POWERON', 'DEEPSLEEP'].includes(row.resetReason)
                              ? 'secondary'
                              : 'destructive'
                          }
                        >
                          {row.resetReason}
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
