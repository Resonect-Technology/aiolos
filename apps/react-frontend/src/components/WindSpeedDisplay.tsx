import { useMemo } from 'react';
import GaugeComponent from 'react-gauge-component';
import { convertWindSpeed, WIND_UNIT_LABELS, getGaugeMinValue, getGaugeMaxValue } from '../lib/wind-utils';

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

  // Configure gauge arcs based on selected unit
  const gaugeSubArcs = useMemo((): GaugeArc[] => {
    const arcs: GaugeArc[] = [];
    switch (selectedUnit) {
      case "m/s":
        arcs.push(
          { limit: 5, color: "#EA4228", tooltip: { text: "Too slow" }, showTick: true },
          { limit: 10, color: "#F5CD19", tooltip: { text: "Barely..." }, showTick: true },
          { limit: 20, color: "#5BE12C", tooltip: { text: "Let's gooo!" }, showTick: true },
          { limit: 25, color: "#F5CD19", tooltip: { text: "Pls stop" }, showTick: true },
          { color: "#EA4228", tooltip: { text: "Jesus" } }
        );
        break;
      case "km/h":
        arcs.push(
          { limit: 20, color: "#EA4228", tooltip: { text: "Too slow" }, showTick: true },
          { limit: 40, color: "#F5CD19", tooltip: { text: "Barely..." }, showTick: true },
          { limit: 80, color: "#5BE12C", tooltip: { text: "Let's gooo!" }, showTick: true },
          { limit: 100, color: "#F5CD19", tooltip: { text: "Pls stop" }, showTick: true },
          { color: "#EA4228", tooltip: { text: "Jesus" } }
        );
        break;
      case "knots":
        arcs.push(
          { limit: 10, color: "#EA4228", tooltip: { text: "Too slow" }, showTick: true },
          { limit: 20, color: "#F5CD19", tooltip: { text: "Barely..." }, showTick: true },
          { limit: 40, color: "#5BE12C", tooltip: { text: "Let's gooo!" }, showTick: true },
          { limit: 50, color: "#F5CD19", tooltip: { text: "Pls stop" }, showTick: true },
          { color: "#EA4228", tooltip: { text: "Jesus" } }
        );
        break;
      case "beaufort":
        arcs.push(
          { limit: 1, color: "#EA4228", tooltip: { text: "Calm" }, showTick: true },
          { limit: 2, color: "#EA4228", tooltip: { text: "Light air" }, showTick: true },
          { limit: 3, color: "#F5CD19", tooltip: { text: "Light breeze" }, showTick: true },
          { limit: 4, color: "#F5CD19", tooltip: { text: "Gentle breeze" }, showTick: true },
          { limit: 5, color: "#5BE12C", tooltip: { text: "Moderate breeze" }, showTick: true },
          { limit: 6, color: "#5BE12C", tooltip: { text: "Strong breeze" }, showTick: true },
          { limit: 7, color: "#5BE12C", tooltip: { text: "High wind, near gale" }, showTick: true },
          { limit: 8, color: "#5BE12C", tooltip: { text: "Gale" }, showTick: true },
          { limit: 9, color: "#F5CD19", tooltip: { text: "Strong gale" }, showTick: true },
          { limit: 10, color: "#F5CD19", tooltip: { text: "Storm" }, showTick: true },
          { limit: 11, color: "#EA4228", tooltip: { text: "Violent storm" }, showTick: true },
          { color: "#EA4228", tooltip: { text: "Hurricane" } }
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
    <div className="flex flex-col items-center bg-background p-4 rounded-lg">
      <h3 className="text-lg font-medium mb-2">Wind Speed</h3>
      <div className="w-full h-64">
        <GaugeComponent
          id="wind-speed-gauge"
          type="semicircle"
          arc={{
            width: 0.2,
            padding: 0.005,
            cornerRadius: 1,
            subArcs: gaugeSubArcs,
          }}
          pointer={{
            color: "#345243",
            length: 0.8,
            width: 15,
            elastic: true
          }}
          labels={{
            valueLabel: {
              formatTextValue: formatGaugeValueLabel,
              style: {
                fontSize: "30px",
                fill: "#03a1fc",
                textShadow: "white 1px 1px 0px",
              },
            },
            tickLabels: {
              type: "outer",
              ticks: gaugeTicks,
              defaultTickValueConfig: {
                formatTextValue: formatGaugeValueLabel
              }
            }
          }}
          value={convertedValue}
          minValue={gaugeMinValue}
          maxValue={gaugeMaxValue}
        />
      </div>
      {windData && (
        <div className="text-center mt-2">
          <span className="text-2xl font-bold">{convertedValue.toFixed(selectedUnit === 'beaufort' ? 0 : 1)}</span>
          <span className="text-sm ml-1">{currentUnitLabel}</span>
        </div>
      )}
    </div>
  );
}
