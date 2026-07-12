import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Info } from 'lucide-react';
import { Wind } from 'lucide-react';
import { useMemo } from 'react';
// Named import: the package's `module` field points at a CJS file, so the
// default import resolves to the module object under Vite/Rolldown.
import { GaugeComponent } from 'react-gauge-component';

import { useNow } from '../../../hooks/use-now';
import { formatLastUpdated, staleThresholdMs } from '../../../lib/time-utils';
import {
  convertWindSpeed,
  WIND_SPEED_RANGES,
  WIND_UNIT_LABELS,
  getGaugeMinValue,
  getGaugeMaxValue,
  getWindSpeedColor,
} from '../../../lib/wind-utils';
import type { WindData } from '../../../types/wind';

interface WindSpeedDisplayProps {
  windData: WindData | null;
  selectedUnit: string;
}

// Local type definitions for react-gauge-component props
interface GaugeTooltip {
  text: string;
}

interface GaugeArc {
  limit?: number;
  color: string;
  tooltip?: GaugeTooltip;
  showTick?: boolean;
}

interface GaugeTick {
  value: number;
}

export function WindSpeedDisplay({ windData, selectedUnit }: WindSpeedDisplayProps) {
  // Ticks so the "ago" badge and staleness check stay honest when the
  // stream stops delivering messages
  const now = useNow();

  // Stale when older than 3x the station's reported send interval
  // (fallback 15 min — tolerates the 10-minute slow mode)
  const stale =
    windData !== null &&
    now - new Date(windData.timestamp).getTime() > staleThresholdMs(windData.intervalMs);

  // Get the unit label for display
  const currentUnitLabel = useMemo((): string => {
    return WIND_UNIT_LABELS[selectedUnit] || 'm/s';
  }, [selectedUnit]);

  // Convert wind speed to selected unit
  const convertedValue = useMemo(
    () => convertWindSpeed(windData?.windSpeed || 0, selectedUnit),
    [windData, selectedUnit],
  );

  // Format the value for display
  const formatDisplayValue = (value: number): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return `0 ${currentUnitLabel}`;
    }

    if (selectedUnit === 'beaufort') {
      return `${Math.round(value)} ${currentUnitLabel}`;
    } else {
      return `${value.toFixed(1)} ${currentUnitLabel}`;
    }
  };

  // Gauge bands are generated from the shared 9-bin ranges and palette, so a
  // color on the gauge means the same wind strength as on the wind rose,
  // legend and trend chart.
  const gaugeSubArcs = useMemo((): GaugeArc[] => {
    const arcs: GaugeArc[] = [];
    let previousLimit = 0;
    WIND_SPEED_RANGES.forEach((range, index) => {
      const color = getWindSpeedColor(index);
      if (range.max === Infinity) {
        arcs.push({ color, tooltip: { text: range.description } });
        return;
      }
      // Convert just below the bin edge so Beaufort (a step scale) lands in
      // the force the bin actually ends in
      const converted = convertWindSpeed(range.max - 0.01, selectedUnit);
      const limit = selectedUnit === 'beaufort' ? converted : Math.round(converted * 10) / 10;
      // Neighbouring bins can collapse to the same Beaufort force — merge
      // them instead of emitting a zero-width arc
      if (limit <= previousLimit) {
        return;
      }
      previousLimit = limit;
      arcs.push({ limit, color, tooltip: { text: range.description } });
    });
    return arcs;
  }, [selectedUnit]);

  // Get gauge min/max values
  const gaugeMinValue = useMemo(() => getGaugeMinValue(selectedUnit), [selectedUnit]);
  const gaugeMaxValue = useMemo(() => getGaugeMaxValue(selectedUnit), [selectedUnit]);

  // Define gauge tick values
  const gaugeTicks = useMemo((): GaugeTick[] => {
    let values: number[] = [];
    switch (selectedUnit) {
      case 'm/s':
        values = [0, 5, 10, 15, 20, 25, 30];
        break;
      case 'km/h':
        values = [0, 20, 40, 60, 80, 100, 120];
        break;
      case 'knots':
        values = [0, 10, 20, 30, 40, 50, 60];
        break;
      case 'beaufort':
        values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        break;
      default:
        values = [0, 5, 10, 15, 20, 25, 30];
    }
    return values.map((v) => ({ value: v }));
  }, [selectedUnit]);

  return (
    <div className="space-y-4 text-center">
      <div className="flex items-center justify-center gap-2">
        <Wind className="card-foreground h-5 w-5" />
        <h3 className="card-foreground text-2xl font-bold">Current Wind Speed</h3>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          For a good Vasiliki day the wind speed should be between{' '}
          {formatDisplayValue(convertWindSpeed(8, selectedUnit)).replace(
            ` ${currentUnitLabel}`,
            '',
          )}{' '}
          and {formatDisplayValue(convertWindSpeed(15, selectedUnit))}
        </AlertDescription>
      </Alert>

      <div className={`flex justify-center px-2 ${stale ? 'opacity-50' : ''}`}>
        <div className="w-full max-w-xs lg:max-w-md xl:max-w-lg">
          <GaugeComponent
            id="wind-speed-gauge"
            type="radial"
            style={{ width: '100%', height: '100%' }}
            arc={{
              width: 0.2,
              padding: 0.005,
              cornerRadius: 1,
              subArcs: gaugeSubArcs,
            }}
            pointer={{
              color: 'var(--foreground)',
              length: 0.8,
              width: 18,
              elastic: true,
            }}
            labels={{
              valueLabel: {
                hide: true,
              },
              tickLabels: {
                type: 'outer',
                ticks: gaugeTicks,
                defaultTickValueConfig: {
                  hide: false,
                  style: {
                    fontSize: '12px',
                    fontWeight: '500',
                    fill: 'var(--muted-foreground)',
                  },
                },
              },
            }}
            value={convertedValue}
            minValue={gaugeMinValue}
            maxValue={gaugeMaxValue}
          />
        </div>
      </div>

      <div className={`text-center ${stale ? 'opacity-50' : ''}`}>
        <div className="text-primary text-5xl font-bold">{formatDisplayValue(convertedValue)}</div>
        {windData?.gustSpeed !== undefined && (
          <div className="text-muted-foreground mt-1 text-lg">
            Gusts {formatDisplayValue(convertWindSpeed(windData.gustSpeed, selectedUnit))}
            {windData.minSpeed !== undefined &&
              ` · Lulls ${formatDisplayValue(convertWindSpeed(windData.minSpeed, selectedUnit))}`}
          </div>
        )}
      </div>

      {windData?.timestamp && (
        <div className="px-2 text-center">
          <Badge
            variant="outline"
            className={`text-xs ${stale ? 'border-orange-500 text-orange-500 dark:text-orange-400' : ''}`}
          >
            Last updated: {formatLastUpdated(windData.timestamp)}
            {stale && ' (stale)'}
          </Badge>
        </div>
      )}
    </div>
  );
}
