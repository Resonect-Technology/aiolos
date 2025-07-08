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

  // Format the value for display
  const formatDisplayValue = (value: number): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return `0 ${currentUnitLabel}`;
    }

    if (selectedUnit === "beaufort") {
      return `${Math.round(value)} ${currentUnitLabel}`;
    } else {
      return `${value.toFixed(1)} ${currentUnitLabel}`;
    }
  };  // Configure gauge arcs based on selected unit using theme colors
  const gaugeSubArcs = useMemo((): GaugeArc[] => {
    const arcs: GaugeArc[] = [];
    // Theme colors: light to dark green progression for better visual distribution
    const themeColors = ["#22c55e", "#10b981", "#059669", "#047857", "#065f46"];

    switch (selectedUnit) {
      case "m/s":
        arcs.push(
          {
            limit: 3,
            color: themeColors[0], // Calm/Light air (0-3 m/s)
            tooltip: { text: "Calm to Light air" },
            showTick: true,
          },
          {
            limit: 7,
            color: themeColors[1], // Light/Gentle breeze (3-7 m/s)
            tooltip: { text: "Light to Gentle breeze" },
            showTick: true,
          },
          {
            limit: 12,
            color: themeColors[2], // Moderate/Fresh breeze (7-12 m/s)
            tooltip: { text: "Moderate to Fresh breeze" },
            showTick: true,
          },
          {
            limit: 18,
            color: themeColors[3], // Strong breeze/Near gale (12-18 m/s)
            tooltip: { text: "Strong breeze to Near gale" },
            showTick: true,
          },
          {
            color: themeColors[4], // Gale and above (18+ m/s)
            tooltip: { text: "Gale or stronger" }
          }
        );
        break;
      case "km/h":
        arcs.push(
          {
            limit: 11,
            color: themeColors[0], // Calm/Light air (0-11 km/h)
            tooltip: { text: "Calm to Light air" },
            showTick: true,
          },
          {
            limit: 25,
            color: themeColors[1], // Light/Gentle breeze (11-25 km/h)
            tooltip: { text: "Light to Gentle breeze" },
            showTick: true,
          },
          {
            limit: 43,
            color: themeColors[2], // Moderate/Fresh breeze (25-43 km/h)
            tooltip: { text: "Moderate to Fresh breeze" },
            showTick: true,
          },
          {
            limit: 65,
            color: themeColors[3], // Strong breeze/Near gale (43-65 km/h)
            tooltip: { text: "Strong breeze to Near gale" },
            showTick: true,
          },
          {
            color: themeColors[4], // Gale and above (65+ km/h)
            tooltip: { text: "Gale or stronger" }
          }
        );
        break;
      case "knots":
        arcs.push(
          {
            limit: 6,
            color: themeColors[0], // Calm/Light air (0-6 knots)
            tooltip: { text: "Calm to Light air" },
            showTick: true,
          },
          {
            limit: 13,
            color: themeColors[1], // Light/Gentle breeze (6-13 knots)
            tooltip: { text: "Light to Gentle breeze" },
            showTick: true,
          },
          {
            limit: 23,
            color: themeColors[2], // Moderate/Fresh breeze (13-23 knots)
            tooltip: { text: "Moderate to Fresh breeze" },
            showTick: true,
          },
          {
            limit: 35,
            color: themeColors[3], // Strong breeze/Near gale (23-35 knots)
            tooltip: { text: "Strong breeze to Near gale" },
            showTick: true,
          },
          {
            color: themeColors[4], // Gale and above (35+ knots)
            tooltip: { text: "Gale or stronger" }
          }
        );
        break;
      case "beaufort":
        arcs.push(
          {
            limit: 2,
            color: themeColors[0], // Beaufort 0-2 (Calm to Light breeze)
            tooltip: { text: "Calm to Light breeze" },
            showTick: true,
          },
          {
            limit: 4,
            color: themeColors[1], // Beaufort 3-4 (Gentle to Moderate breeze)
            tooltip: { text: "Gentle to Moderate breeze" },
            showTick: true,
          },
          {
            limit: 6,
            color: themeColors[2], // Beaufort 5-6 (Fresh to Strong breeze)
            tooltip: { text: "Fresh to Strong breeze" },
            showTick: true,
          },
          {
            limit: 8,
            color: themeColors[3], // Beaufort 7-8 (Near gale to Gale)
            tooltip: { text: "Near gale to Gale" },
            showTick: true,
          },
          {
            color: themeColors[4], // Beaufort 9+ (Strong gale and above)
            tooltip: { text: "Strong gale or stronger" }
          }
        );
        break;
      default:
        arcs.push(
          { limit: 5, color: themeColors[0], tooltip: { text: "Too slow" }, showTick: true },
          { limit: 10, color: themeColors[1], tooltip: { text: "Getting there" }, showTick: true },
          { limit: 15, color: themeColors[2], tooltip: { text: "Good conditions" }, showTick: true },
          { limit: 20, color: themeColors[3], tooltip: { text: "Strong winds" }, showTick: true },
          { color: themeColors[4], tooltip: { text: "Very strong" } }
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
          <Wind className="h-5 w-5 card-foreground" />
          <h3 className="text-2xl font-bold card-foreground">Current Wind Speed</h3>
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
                  hide: true,
                },
                tickLabels: {
                  type: "outer",
                  ticks: gaugeTicks,
                  defaultTickValueConfig: {
                    hide: false,
                    style: {
                      fontSize: "12px",
                      fontWeight: "500",
                      fill: "hsl(var(--muted-foreground))",
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

        <div className="text-center">
          <div className="text-5xl font-bold text-primary">
            {formatDisplayValue(convertedValue)}
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
