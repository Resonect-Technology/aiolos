/**
 * Wind unit conversion and utility functions for Aiolos
 *
 * This file contains the unified color scheme used across all wind components:
 * - WindSpeedDisplay (gauge colors)
 * - WindRoseChart (legend colors)
 * - WindDirectionCompass (arrow and point colors)
 *
 * Colors are based on the @eunchurn/react-windrose default palette to ensure consistency.
 */

// Wind unit labels
export const WIND_UNIT_LABELS: Record<string, string> = {
  'm/s': 'm/s',
  'km/h': 'km/h',
  knots: 'knots',
  beaufort: 'Bft',
};

// Valid wind direction angles
export type WindDirectionAngle =
  | 'N'
  | 'NNE'
  | 'NE'
  | 'ENE'
  | 'E'
  | 'ESE'
  | 'SE'
  | 'SSE'
  | 'S'
  | 'SSW'
  | 'SW'
  | 'WSW'
  | 'W'
  | 'WNW'
  | 'NW'
  | 'NNW';

export const WIND_DIRECTIONS: WindDirectionAngle[] = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
];

// Wind speed ranges for the wind rose chart
export const WIND_SPEED_RANGES = [
  { min: 0, max: 1, description: 'Calm' },
  { min: 1, max: 3, description: 'Light air' },
  { min: 3, max: 5, description: 'Light breeze' },
  { min: 5, max: 8, description: 'Gentle breeze' },
  { min: 8, max: 11, description: 'Moderate breeze' },
  { min: 11, max: 14, description: 'Fresh breeze' },
  { min: 14, max: 17, description: 'Strong breeze' },
  { min: 17, max: 20, description: 'Near gale' },
  { min: 20, max: Infinity, description: 'Gale or stronger' },
];

// Canonical wind-strength palette, used by the wind rose legend, the speed
// gauge, the trend chart and the tables. MUST stay identical to the scale
// hardcoded inside @eunchurn/react-windrose (v1.3.5) — the library accepts no
// color props, so the rose arcs always use its internal palette and everything
// else matches it from here.
export const WIND_SPEED_COLORS = [
  '#8e44ad', // 0-1 m/s (purple)
  '#4242f4', // 1-3 m/s (blue)
  '#42c5f4', // 3-5 m/s (light blue)
  '#42f4ce', // 5-8 m/s (cyan)
  '#42f456', // 8-11 m/s (green)
  '#adf442', // 11-14 m/s (light green/yellow)
  '#f4e242', // 14-17 m/s (yellow)
  '#f4a142', // 17-20 m/s (orange)
  '#f44242', // 20+ m/s (red)
];

// Helper function to get color by wind speed range index
export const getWindSpeedColor = (rangeIndex: number): string => {
  return WIND_SPEED_COLORS[Math.min(rangeIndex, WIND_SPEED_COLORS.length - 1)] ?? '#f44242';
};

// Gust readings are highlighted with the near-gale bin color everywhere
// (tables, trend chart) so "gust orange" always means the same thing
export const WIND_GUST_COLOR = getWindSpeedColor(7);

// Helper function to get color by wind speed value (in m/s)
export const getWindSpeedColorByValue = (speed: number): string => {
  // Range boundaries matching WIND_SPEED_RANGES / WIND_SPEED_COLORS
  const thresholds = [1, 3, 5, 8, 11, 14, 17, 20];
  const index = thresholds.findIndex((threshold) => speed < threshold);
  return getWindSpeedColor(index === -1 ? WIND_SPEED_COLORS.length - 1 : index);
};

/**
 * Convert wind speed to different units
 * @param speed Wind speed in m/s
 * @param unit Target unit ('m/s', 'km/h', 'knots', 'beaufort')
 * @returns Converted wind speed value
 */
export const convertWindSpeed = (speed: number, unit: string): number => {
  switch (unit) {
    case 'km/h':
      return speed * 3.6;
    case 'knots':
      return speed * 1.94384;
    case 'beaufort':
      if (speed < 0.5) return 0;
      if (speed < 1.6) return 1;
      if (speed < 3.4) return 2;
      if (speed < 5.5) return 3;
      if (speed < 8.0) return 4;
      if (speed < 10.8) return 5;
      if (speed < 13.9) return 6;
      if (speed < 17.2) return 7;
      if (speed < 20.8) return 8;
      if (speed < 24.5) return 9;
      if (speed < 28.5) return 10;
      if (speed < 32.7) return 11;
      return 12;
    default: // m/s
      return speed;
  }
};

/**
 * Get wind speed range display information based on the selected unit
 * @param unit The selected wind speed unit
 * @returns Array of range display information with proper unit conversions
 */
export const getWindSpeedRangeDisplay = (unit: string) => {
  const unitLabel = WIND_UNIT_LABELS[unit] || 'm/s';

  return {
    unitLabel,
    ranges: WIND_SPEED_RANGES.map((range) => {
      if (unit === 'beaufort') {
        // Beaufort is a 0-12 step scale, not a linear conversion. The bin's
        // upper bound is exclusive, so convert just below it (a 5-8 m/s bin
        // spans forces 3-4, not 3-5).
        const minForce = convertWindSpeed(range.min, unit);
        if (range.max === Infinity) {
          return { range: `${minForce}+`, description: range.description };
        }
        const maxForce = convertWindSpeed(range.max - 0.01, unit);
        return {
          range: minForce === maxForce ? `${minForce}` : `${minForce}-${maxForce}`,
          description: range.description,
        };
      }

      const minValue = Math.round(convertWindSpeed(range.min, unit));
      const maxValue = range.max === Infinity ? '+' : Math.round(convertWindSpeed(range.max, unit));

      return {
        range: range.max === Infinity ? `${minValue}${maxValue}` : `${minValue}-${maxValue}`,
        description: range.description,
      };
    }),
  };
};

/**
 * Get wind rose columns for chart configuration
 * @returns Array of column names for wind rose chart
 */
export const getWindRoseColumns = (): string[] => {
  return ['angle', '0-1', '1-3', '3-5', '5-8', '8-11', '11-14', '14-17', '17-20', '20+'];
};

/**
 * Get gauge min value based on selected unit
 * @param unit Selected wind speed unit
 * @returns Minimum value for gauge display
 */
export const getGaugeMinValue = (_unit: string): number => {
  return 0; // All units start at 0
};

/**
 * Get gauge max value based on selected unit
 * @param unit Selected wind speed unit
 * @returns Maximum value for gauge display
 */
export const getGaugeMaxValue = (unit: string): number => {
  switch (unit) {
    case 'm/s':
      return 30; // Up to 30 m/s for Vasiliki conditions
    case 'km/h':
      return 120; // Approx 30 m/s in km/h
    case 'knots':
      return 60; // Approx 30 m/s in knots
    case 'beaufort':
      return 12; // Max on Beaufort scale
    default:
      return 30;
  }
};
