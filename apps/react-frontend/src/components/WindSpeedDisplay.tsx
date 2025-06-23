import { useMemo } from 'react';
import GaugeComponent from 'react-gauge-component';
import { convertWindSpeed, WIND_UNIT_LABELS, getGaugeMinValue, getGaugeMaxValue, getWindSpeedColorByValue } from '../lib/wind-utils';

interface WindData {
  wind_speed: number;
  wind_direction: number;
  timestamp: string;
}

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
  // Get the unit label for display
  const currentUnitLabel = useMemo((): string => {
    return WIND_UNIT_LABELS[selectedUnit] || 'm/s';
  }, [selectedUnit]);

  // Convert wind speed to selected unit
  const convertedValue = useMemo(
    () => convertWindSpeed(windData?.wind_speed || 0, selectedUnit),
    [windData, selectedUnit]
  );

  // Format the gauge value label
  const formatGaugeValueLabel = (value: number): string => {
    if (selectedUnit === "beaufort") {
      return `${Math.round(value)} ${currentUnitLabel}`;
    } else {
      return `${value.toFixed(1)} ${currentUnitLabel}`;
    }
  };

  // Configure gauge arcs based on selected unit using unified color scheme
  const gaugeSubArcs = useMemo((): GaugeArc[] => {
    const arcs: GaugeArc[] = [];
    switch (selectedUnit) {
      case "m/s":
        arcs.push(
          { limit: 1, color: getWindSpeedColorByValue(0.5), tooltip: { text: "Calm" }, showTick: true },
          { limit: 3, color: getWindSpeedColorByValue(2), tooltip: { text: "Light air" }, showTick: true },
          { limit: 5, color: getWindSpeedColorByValue(4), tooltip: { text: "Light breeze" }, showTick: true },
          { limit: 8, color: getWindSpeedColorByValue(6.5), tooltip: { text: "Gentle breeze" }, showTick: true },
          { limit: 11, color: getWindSpeedColorByValue(9.5), tooltip: { text: "Moderate breeze" }, showTick: true },
          { limit: 14, color: getWindSpeedColorByValue(12.5), tooltip: { text: "Fresh breeze" }, showTick: true },
          { limit: 17, color: getWindSpeedColorByValue(15.5), tooltip: { text: "Strong breeze" }, showTick: true },
          { limit: 20, color: getWindSpeedColorByValue(18.5), tooltip: { text: "Near gale" }, showTick: true },
          { color: getWindSpeedColorByValue(25), tooltip: { text: "Gale or stronger" } }
        );
        break;
      case "km/h":
        arcs.push(
          { limit: 4, color: getWindSpeedColorByValue(0.5), tooltip: { text: "Calm" }, showTick: true },
          { limit: 11, color: getWindSpeedColorByValue(2), tooltip: { text: "Light air" }, showTick: true },
          { limit: 18, color: getWindSpeedColorByValue(4), tooltip: { text: "Light breeze" }, showTick: true },
          { limit: 29, color: getWindSpeedColorByValue(6.5), tooltip: { text: "Gentle breeze" }, showTick: true },
          { limit: 40, color: getWindSpeedColorByValue(9.5), tooltip: { text: "Moderate breeze" }, showTick: true },
          { limit: 50, color: getWindSpeedColorByValue(12.5), tooltip: { text: "Fresh breeze" }, showTick: true },
          { limit: 61, color: getWindSpeedColorByValue(15.5), tooltip: { text: "Strong breeze" }, showTick: true },
          { limit: 72, color: getWindSpeedColorByValue(18.5), tooltip: { text: "Near gale" }, showTick: true },
          { color: getWindSpeedColorByValue(25), tooltip: { text: "Gale or stronger" } }
        );
        break;
      case "knots":
        arcs.push(
          { limit: 2, color: getWindSpeedColorByValue(0.5), tooltip: { text: "Calm" }, showTick: true },
          { limit: 6, color: getWindSpeedColorByValue(2), tooltip: { text: "Light air" }, showTick: true },
          { limit: 10, color: getWindSpeedColorByValue(4), tooltip: { text: "Light breeze" }, showTick: true },
          { limit: 15, color: getWindSpeedColorByValue(6.5), tooltip: { text: "Gentle breeze" }, showTick: true },
          { limit: 21, color: getWindSpeedColorByValue(9.5), tooltip: { text: "Moderate breeze" }, showTick: true },
          { limit: 27, color: getWindSpeedColorByValue(12.5), tooltip: { text: "Fresh breeze" }, showTick: true },
          { limit: 33, color: getWindSpeedColorByValue(15.5), tooltip: { text: "Strong breeze" }, showTick: true },
          { limit: 39, color: getWindSpeedColorByValue(18.5), tooltip: { text: "Near gale" }, showTick: true },
          { color: getWindSpeedColorByValue(25), tooltip: { text: "Gale or stronger" } }
        );
        break;
      case "beaufort":
        arcs.push(
          { limit: 1, color: getWindSpeedColorByValue(0.5), tooltip: { text: "Calm" }, showTick: true },
          { limit: 2, color: getWindSpeedColorByValue(2), tooltip: { text: "Light air" }, showTick: true },
          { limit: 3, color: getWindSpeedColorByValue(4), tooltip: { text: "Light breeze" }, showTick: true },
          { limit: 4, color: getWindSpeedColorByValue(6.5), tooltip: { text: "Gentle breeze" }, showTick: true },
          { limit: 5, color: getWindSpeedColorByValue(9.5), tooltip: { text: "Moderate breeze" }, showTick: true },
          { limit: 6, color: getWindSpeedColorByValue(12.5), tooltip: { text: "Fresh breeze" }, showTick: true },
          { limit: 7, color: getWindSpeedColorByValue(15.5), tooltip: { text: "Strong breeze" }, showTick: true },
          { limit: 8, color: getWindSpeedColorByValue(18.5), tooltip: { text: "Near gale" }, showTick: true },
          { limit: 9, color: getWindSpeedColorByValue(22), tooltip: { text: "Gale" }, showTick: true },
          { limit: 10, color: getWindSpeedColorByValue(25), tooltip: { text: "Strong gale" }, showTick: true },
          { limit: 11, color: getWindSpeedColorByValue(30), tooltip: { text: "Storm" }, showTick: true },
          { color: getWindSpeedColorByValue(35), tooltip: { text: "Hurricane" } }
        );
        break;
      default:
        arcs.push(
          { limit: 5, color: "#EA4228", tooltip: { text: "Too slow" }, showTick: true },
          { limit: 10, color: "#F5CD19", tooltip: { text: "Barely..." }, showTick: true },
          { limit: 20, color: "#5BE12C", tooltip: { text: "Let's gooo!" }, showTick: true },
          { color: "#EA4228", tooltip: { text: "Jesus" } }
        );
    }
    return arcs;
  }, [selectedUnit]);

  // Get gauge min/max values
  const gaugeMinValue = useMemo(() => getGaugeMinValue(selectedUnit), [selectedUnit]);
  const gaugeMaxValue = useMemo(() => getGaugeMaxValue(selectedUnit), [selectedUnit]);

  // Define gauge tick values
  const gaugeTicks = useMemo((): GaugeTick[] => {
    let values: number[] = [];
    switch (selectedUnit) {
      case "m/s": values = [0, 5, 10, 15, 20, 25, 30]; break;
      case "km/h": values = [0, 20, 40, 60, 80, 100, 120]; break;
      case "knots": values = [0, 10, 20, 30, 40, 50, 60]; break;
      case "beaufort": values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]; break;
      default: values = [0, 5, 10, 15, 20, 25, 30];
    }
    return values.map(v => ({ value: v }));
  }, [selectedUnit]);

  return (
    <div className="text-center">
      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Wind Speed</h3>
      <div className="relative">
        <div className="w-full h-96 flex items-center justify-center px-4">
          <div className="w-full max-w-lg">
            <GaugeComponent
              id="wind-speed-gauge"
              type="semicircle"
              arc={{
                width: 0.25,
                padding: 0.005,
                cornerRadius: 1,
                subArcs: gaugeSubArcs,
              }}
              pointer={{
                color: "#1e293b",
                length: 0.8,
                width: 18,
                elastic: true
              }}
              labels={{
                valueLabel: {
                  formatTextValue: formatGaugeValueLabel,
                  style: {
                    fontSize: "36px",
                    fill: "#1e293b",
                    fontWeight: "bold",
                    textShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  },
                },
                tickLabels: {
                  type: "outer",
                  ticks: gaugeTicks,
                  defaultTickValueConfig: {
                    formatTextValue: formatGaugeValueLabel,
                    style: {
                      fontSize: "15px",
                      fill: "#64748b"
                    }
                  }
                }
              }}
              value={convertedValue}
              minValue={gaugeMinValue}
              maxValue={gaugeMaxValue}
            />
          </div>
        </div>
      </div>
      {windData && (
        <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
          <div className="text-center">
            <span className="text-4xl font-bold text-slate-800 dark:text-slate-100">
              {convertedValue.toFixed(selectedUnit === 'beaufort' ? 0 : 1)}
            </span>
            <span className="text-lg font-medium text-slate-600 dark:text-slate-400 ml-2">
              {currentUnitLabel}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
