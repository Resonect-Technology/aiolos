import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { TrendingUp } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, XAxis, YAxis } from 'recharts';

import { useWindAggregatedData, useWindAggregatedSSE } from '../../../hooks/useWindAggregatedData';
import { convertWindSpeed, WIND_GUST_COLOR, WIND_UNIT_LABELS } from '../../../lib/wind-utils';
import type { WindAggregated1Min } from '../../../types/wind-aggregated';

interface WindTrendChartProps {
  stationId: string;
  selectedUnit: string;
}

const MAX_POINTS = 60;

// Rough planing threshold (~12 knots): the line every windsurfer measures
// the trend against
const PLANING_THRESHOLD_MS = 6;

// Series colors validated for >= 3:1 contrast and CVD separation on both
// surfaces (avg needs a lighter blue on the dark theme)
const chartConfig = {
  avg: { label: 'Average', theme: { light: '#4242f4', dark: '#7c86ff' } },
  gust: { label: 'Gusts', color: WIND_GUST_COLOR },
} satisfies ChartConfig;

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function WindTrendChart({ stationId, selectedUnit }: WindTrendChartProps) {
  const [points, setPoints] = useState<WindAggregated1Min[]>([]);

  const { data, loading } = useWindAggregatedData<WindAggregated1Min>({
    stationId,
    interval: '1min',
    limit: MAX_POINTS,
  });

  // Seed the chart from the fetched history (oldest first)
  useEffect(() => {
    const sorted = [...data].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    setPoints(sorted);
  }, [data]);

  // Append live 1-minute aggregates as they arrive
  const handleNewAggregate = useCallback((newData: WindAggregated1Min) => {
    setPoints((prev) => {
      const filtered = prev.filter((item) => item.timestamp !== newData.timestamp);
      return [...filtered, newData]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
        .slice(-MAX_POINTS);
    });
  }, []);

  useWindAggregatedSSE<WindAggregated1Min>({
    stationId,
    interval: '1min',
    onNewAggregate: handleNewAggregate,
  });

  const unitLabel = WIND_UNIT_LABELS[selectedUnit] || 'm/s';

  const round = useCallback(
    (speed: number) => {
      const converted = convertWindSpeed(speed, selectedUnit);
      return selectedUnit === 'beaufort' ? Math.round(converted) : Math.round(converted * 10) / 10;
    },
    [selectedUnit],
  );

  const chartData = useMemo(
    () =>
      points.map((point) => ({
        timestamp: point.timestamp,
        avg: round(point.avgSpeed),
        gust: point.gustSpeed !== null ? round(point.gustSpeed) : null,
      })),
    [points, round],
  );

  const planingThreshold = round(PLANING_THRESHOLD_MS);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="text-primary h-5 w-5" />
          <CardTitle>Wind Trend (Last Hour)</CardTitle>
        </div>
        <CardDescription>
          1-minute averages and gusts in {unitLabel} — is it picking up or dying?
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!loading && chartData.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No aggregated wind data yet. The trend will appear as data arrives.
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickLine={false}
                axisLine={false}
                minTickGap={48}
                tickFormatter={formatTime}
              />
              <YAxis width={34} tickLine={false} axisLine={false} domain={[0, 'auto']} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(_, payload) =>
                      payload?.[0] ? formatTime(payload[0].payload.timestamp) : ''
                    }
                    formatter={(value, name, item) => (
                      <>
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-[2px]"
                          style={{ backgroundColor: item.color }}
                        />
                        {chartConfig[name as keyof typeof chartConfig]?.label ?? name}
                        <span className="text-foreground ml-auto font-mono font-medium">
                          {value} {unitLabel}
                        </span>
                      </>
                    )}
                  />
                }
              />
              <ReferenceLine
                y={planingThreshold}
                stroke="var(--muted-foreground)"
                strokeDasharray="6 4"
                label={{
                  value: 'planing',
                  position: 'insideTopRight',
                  fill: 'var(--muted-foreground)',
                  fontSize: 11,
                }}
              />
              <Area
                dataKey="avg"
                type="monotone"
                fill="var(--color-avg)"
                fillOpacity={0.15}
                stroke="var(--color-avg)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                dataKey="gust"
                type="monotone"
                stroke="var(--color-gust)"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
              />
              <ChartLegend content={<ChartLegendContent />} />
            </ComposedChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
