import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, Clock, Wind } from "lucide-react";

interface WindOneMinuteData {
  id: number;
  intervalStart: string;
  avgWindSpeed: number;
  minWindSpeed: number;
  maxWindSpeed: number;
  avgWindDirection: number;
  createdAt: string;
}

interface WindOneMinuteTableProps {
  stationId: string;
  selectedUnit: string;
}

export function WindOneMinuteTable({ stationId, selectedUnit }: WindOneMinuteTableProps) {
  const [data, setData] = useState<WindOneMinuteData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const convertWindSpeed = (speedInMs: number): number => {
    switch (selectedUnit) {
      case 'km/h':
        return speedInMs * 3.6;
      case 'mph':
        return speedInMs * 2.237;
      case 'kts':
        return speedInMs * 1.944;
      default:
        return speedInMs;
    }
  };

  const formatWindSpeed = (speedInMs: number): string => {
    const convertedSpeed = convertWindSpeed(speedInMs);
    return convertedSpeed.toFixed(1);
  };

  const getWindDirectionLabel = (degrees: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/stations/${stationId}/wind/one-minute?limit=50`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      setData(result.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch 1-minute wind data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Set up auto-refresh every 2 minutes
    const interval = setInterval(fetchData, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [stationId]);

  const formatDateTime = (isoString: string): string => {
    return new Date(isoString).toLocaleString();
  };

  const formatTime = (isoString: string): string => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl font-semibold">1-Minute Wind Data</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <Badge variant="outline" className="text-xs">
              Updated: {formatTime(lastUpdated.toISOString())}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-4">
            <p className="text-destructive text-sm">Error: {error}</p>
          </div>
        )}
        
        {data.length === 0 && !loading && !error && (
          <div className="text-center py-8 text-muted-foreground">
            <Wind className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No 1-minute wind data available yet.</p>
            <p className="text-xs mt-2">Data appears after wind measurements are aggregated into 1-minute intervals.</p>
          </div>
        )}

        {(data.length > 0 || loading) && (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Time</TableHead>
                  <TableHead className="text-right">Avg Speed</TableHead>
                  <TableHead className="text-right">Min Speed</TableHead>
                  <TableHead className="text-right">Max Speed</TableHead>
                  <TableHead className="text-right">Avg Direction</TableHead>
                  <TableHead className="w-[100px] text-center">Dir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      <RefreshCw className="h-4 w-4 animate-spin mx-auto mb-2" />
                      Loading wind data...
                    </TableCell>
                  </TableRow>
                )}
                {data.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-sm">
                      {formatDateTime(row.intervalStart)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatWindSpeed(row.avgWindSpeed)} {selectedUnit}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatWindSpeed(row.minWindSpeed)} {selectedUnit}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatWindSpeed(row.maxWindSpeed)} {selectedUnit}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {Math.round(row.avgWindDirection)}°
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className="text-xs">
                        {getWindDirectionLabel(row.avgWindDirection)}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {data.length > 0 && (
          <div className="flex justify-between items-center text-xs text-muted-foreground mt-4">
            <span>Showing last {data.length} entries</span>
            <span>Auto-refreshes every 2 minutes</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}