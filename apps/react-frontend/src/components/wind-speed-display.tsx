import { useMemo } from "react";
import GaugeComponent from "react-gauge-component";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import { Wind } from "lucide-react";
import {
  convertWindSpeed,
  WIND_UNIT_LABELS,
  getGaugeMinValue,
  getGaugeMaxValue,
  getWindSpeedColorByValue,
} from "../lib/wind-utils";
import { formatLastUpdated } from "../lib/time-utils";

interface WindData {
  windSpeed: number;
  windDirection: number;
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
    return WIND_UNIT_LABELS[selectedUnit] || "m/s";
  }, [selectedUnit]);

  // Convert wind speed to selected unit
  const convertedValue = useMemo(
    () => convertWindSpeed(windData?.windSpeed || 0, selectedUnit),
    [windData, selectedUnit]
  );

  // Format the gauge value label
  const formatGaugeValueLabel = (value: number): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return `0 ${currentUnitLabel}`;
    }

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
          {
            limit: 1,
            color: getWindSpeedColorByValue(0.5),
            tooltip: { text: "Calm" },
            showTick: true,
          },
          {
            limit: 3,
            color: getWindSpeedColorByValue(2),
            tooltip: { text: "Light air" },
            showTick: true,
          },
          {
            limit: 5,
            color: getWindSpeedColorByValue(4),
            tooltip: { text: "Light breeze" },
            showTick: true,
          },
          {
            limit: 8,
            color: getWindSpeedColorByValue(6.5),
            tooltip: { text: "Gentle breeze" },
            showTick: true,
          },
          {
            limit: 11,
            color: getWindSpeedColorByValue(9.5),
            tooltip: { text: "Moderate breeze" },
            showTick: true,
          },
          {
            limit: 14,
            color: getWindSpeedColorByValue(12.5),
            tooltip: { text: "Fresh breeze" },
            showTick: true,
          },
          {
            limit: 17,
            color: getWindSpeedColorByValue(15.5),
            tooltip: { text: "Strong breeze" },
            showTick: true,
          },
          {
            limit: 20,
            color: getWindSpeedColorByValue(18.5),
            tooltip: { text: "Near gale" },
            showTick: true,
          },
          { color: getWindSpeedColorByValue(25), tooltip: { text: "Gale or stronger" } }
        );
        break;
      case "km/h":
        arcs.push(
          {
            limit: 4,
            color: getWindSpeedColorByValue(0.5),
            tooltip: { text: "Calm" },
            showTick: true,
          },
          {
            limit: 11,
            color: getWindSpeedColorByValue(2),
            tooltip: { text: "Light air" },
            showTick: true,
          },
          {
            limit: 18,
            color: getWindSpeedColorByValue(4),
            tooltip: { text: "Light breeze" },
            showTick: true,
          },
          {
            limit: 29,
            color: getWindSpeedColorByValue(6.5),
            tooltip: { text: "Gentle breeze" },
            showTick: true,
          },
          {
            limit: 40,
            color: getWindSpeedColorByValue(9.5),
            tooltip: { text: "Moderate breeze" },
            showTick: true,
          },
          {
            limit: 50,
            color: getWindSpeedColorByValue(12.5),
            tooltip: { text: "Fresh breeze" },
            showTick: true,
          },
          {
            limit: 61,
            color: getWindSpeedColorByValue(15.5),
            tooltip: { text: "Strong breeze" },
            showTick: true,
          },
          {
            limit: 72,
            color: getWindSpeedColorByValue(18.5),
            tooltip: { text: "Near gale" },
            showTick: true,
          },
          { color: getWindSpeedColorByValue(25), tooltip: { text: "Gale or stronger" } }
        );
        break;
      case "knots":
        arcs.push(
          {
            limit: 2,
            color: getWindSpeedColorByValue(0.5),
            tooltip: { text: "Calm" },
            showTick: true,
          },
          {
            limit: 6,
            color: getWindSpeedColorByValue(2),
            tooltip: { text: "Light air" },
            showTick: true,
          },
          {
            limit: 10,
            color: getWindSpeedColorByValue(4),
            tooltip: { text: "Light breeze" },
            showTick: true,
          },
          {
            limit: 15,
            color: getWindSpeedColorByValue(6.5),
            tooltip: { text: "Gentle breeze" },
            showTick: true,
          },
          {
            limit: 21,
            color: getWindSpeedColorByValue(9.5),
            tooltip: { text: "Moderate breeze" },
            showTick: true,
          },
          {
            limit: 27,
            color: getWindSpeedColorByValue(12.5),
            tooltip: { text: "Fresh breeze" },
            showTick: true,
          },
          {
            limit: 33,
            color: getWindSpeedColorByValue(15.5),
            tooltip: { text: "Strong breeze" },
            showTick: true,
          },
          {
            limit: 39,
            color: getWindSpeedColorByValue(18.5),
            tooltip: { text: "Near gale" },
            showTick: true,
          },
          { color: getWindSpeedColorByValue(25), tooltip: { text: "Gale or stronger" } }
        );
        break;
      case "beaufort":
        arcs.push(
          {
            limit: 1,
            color: getWindSpeedColorByValue(0.5),
            tooltip: { text: "Calm" },
            showTick: true,
          },
          {
            limit: 2,
            color: getWindSpeedColorByValue(2),
            tooltip: { text: "Light air" },
            showTick: true,
          },
          {
            limit: 3,
            color: getWindSpeedColorByValue(4),
            tooltip: { text: "Light breeze" },
            showTick: true,
          },
          {
            limit: 4,
            color: getWindSpeedColorByValue(6.5),
            tooltip: { text: "Gentle breeze" },
            showTick: true,
          },
          {
            limit: 5,
            color: getWindSpeedColorByValue(9.5),
            tooltip: { text: "Moderate breeze" },
            showTick: true,
          },
          {
            limit: 6,
            color: getWindSpeedColorByValue(12.5),
            tooltip: { text: "Fresh breeze" },
            showTick: true,
          },
          {
            limit: 7,
            color: getWindSpeedColorByValue(15.5),
            tooltip: { text: "Strong breeze" },
            showTick: true,
          },
          {
            limit: 8,
            color: getWindSpeedColorByValue(18.5),
            tooltip: { text: "Near gale" },
            showTick: true,
          },
          {
            limit: 9,
            color: getWindSpeedColorByValue(22),
            tooltip: { text: "Gale" },
            showTick: true,
          },
          {
            limit: 10,
            color: getWindSpeedColorByValue(25),
            tooltip: { text: "Strong gale" },
            showTick: true,
          },
          {
            limit: 11,
            color: getWindSpeedColorByValue(30),
            tooltip: { text: "Storm" },
            showTick: true,
          },
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
      case "m/s":
        values = [0, 5, 10, 15, 20, 25, 30];
        break;
      case "km/h":
        values = [0, 20, 40, 60, 80, 100, 120];
        break;
      case "knots":
        values = [0, 10, 20, 30, 40, 50, 60];
        break;
      case "beaufort":
        values = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
        break;
      default:
        values = [0, 5, 10, 15, 20, 25, 30];
    }
    return values.map(v => ({ value: v }));
  }, [selectedUnit]);

  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-2">
          <Wind className="h-5 w-5 text-primary" />
          <h3 className="text-xl lg:text-2xl font-bold text-primary">Current Wind Speed</h3>
        </div>

        <Alert className="mx-2">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            For good Vasiliki day the wind speed should be between 8 and 15 m/s
          </AlertDescription>
        </Alert>

        <div className="flex justify-center px-2">
          <div className="w-full max-w-xs lg:max-w-md xl:max-w-lg">
            <GaugeComponent
              id="wind-speed-gauge"
              type="radial"
              style={{ width: "100%", height: "100%" }}
              arc={{
                width: 0.2,
                padding: 0.005,
                cornerRadius: 1,
                subArcs: gaugeSubArcs,
              }}
              pointer={{
                color: "hsl(var(--foreground))",
                length: 0.8,
                width: 18,
                elastic: true,
              }}
              labels={{
                valueLabel: {
                  formatTextValue: formatGaugeValueLabel,
                  style: {
                    fontSize: "28px",
                    fill: "#000",
                    fontWeight: "bold",
                    textShadow: "0 2px 4px rgba(0,0,0,0.1)",
                  },
                },
                tickLabels: {
                  type: "outer",
                  ticks: gaugeTicks,
                  defaultTickValueConfig: {
                    hide: true,
                  },
                },
              }}
              value={convertedValue}
              minValue={gaugeMinValue}
              maxValue={gaugeMaxValue}
            />
          </div>
        </div>

        {windData?.timestamp && (
          <div className="text-center px-2">
            <Badge variant="outline" className="text-xs">
              Last updated: {formatLastUpdated(windData.timestamp)}
            </Badge>
          </div>
        )}
      </div>
    </div>
  );
}
