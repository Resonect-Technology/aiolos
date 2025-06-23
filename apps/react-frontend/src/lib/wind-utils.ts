/**
 * Wind unit conversion and utility functions for Aiolos
 */

// Wind unit labels
export const WIND_UNIT_LABELS: Record<string, string> = {
    'm/s': 'm/s',
    'km/h': 'km/h',
    'knots': 'knots',
    'beaufort': 'Bft'
};

// Valid wind direction angles
export type WindDirectionAngle = 'N' | 'NNE' | 'NE' | 'ENE' | 'E' | 'ESE' | 'SE' | 'SSE' |
    'S' | 'SSW' | 'SW' | 'WSW' | 'W' | 'WNW' | 'NW' | 'NNW';

export const WIND_DIRECTIONS: WindDirectionAngle[] = [
    'N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'
];

// Beaufort scale descriptions
export const BEAUFORT_DESCRIPTIONS = [
    { force: 0, description: 'Calm', minSpeed: 0, maxSpeed: 0.3 },
    { force: 1, description: 'Light air', minSpeed: 0.3, maxSpeed: 1.6 },
    { force: 2, description: 'Light breeze', minSpeed: 1.6, maxSpeed: 3.4 },
    { force: 3, description: 'Gentle breeze', minSpeed: 3.4, maxSpeed: 5.5 },
    { force: 4, description: 'Moderate breeze', minSpeed: 5.5, maxSpeed: 8.0 },
    { force: 5, description: 'Fresh breeze', minSpeed: 8.0, maxSpeed: 10.8 },
    { force: 6, description: 'Strong breeze', minSpeed: 10.8, maxSpeed: 13.9 },
    { force: 7, description: 'High wind, near gale', minSpeed: 13.9, maxSpeed: 17.2 },
    { force: 8, description: 'Gale', minSpeed: 17.2, maxSpeed: 20.8 },
    { force: 9, description: 'Strong gale', minSpeed: 20.8, maxSpeed: 24.5 },
    { force: 10, description: 'Storm', minSpeed: 24.5, maxSpeed: 28.5 },
    { force: 11, description: 'Violent storm', minSpeed: 28.5, maxSpeed: 32.7 },
    { force: 12, description: 'Hurricane', minSpeed: 32.7, maxSpeed: Infinity }
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
    { min: 20, max: Infinity, description: 'Gale or stronger' }
];

// Color codes for different wind speed ranges
export const WIND_SPEED_COLORS = [
    '#d73027', // 0-1 m/s (red)
    '#f46d43', // 1-3 m/s (orange-red)
    '#fdae61', // 3-5 m/s (light orange)
    '#fee090', // 5-8 m/s (yellow)
    '#e0f3f8', // 8-11 m/s (light blue)
    '#abd9e9', // 11-14 m/s (medium light blue)
    '#74add1', // 14-17 m/s (medium blue)
    '#4575b4', // 17-20 m/s (dark blue)
    '#313695'  // 20+ m/s (deep blue)
];

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
            if (speed < 0.3) return 0;
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

    // For Beaufort scale, we'll use the descriptions instead of numerical ranges
    if (unit === 'beaufort') {
        return {
            unitLabel,
            ranges: [
                { range: '0', description: 'Calm' },
                { range: '1-2', description: 'Light air' },
                { range: '3', description: 'Light breeze' },
                { range: '4', description: 'Gentle breeze' },
                { range: '5', description: 'Moderate breeze' },
                { range: '6', description: 'Fresh breeze' },
                { range: '7', description: 'Strong breeze' },
                { range: '8', description: 'Near gale' },
                { range: '9+', description: 'Gale or stronger' }
            ]
        };
    }

    // For other units, we'll convert the numerical ranges
    return {
        unitLabel,
        ranges: WIND_SPEED_RANGES.map(range => {
            const minValue = Math.round(convertWindSpeed(range.min, unit));
            const maxValue = range.max === Infinity
                ? '+'
                : Math.round(convertWindSpeed(range.max, unit));

            return {
                range: range.max === Infinity
                    ? `${minValue}${maxValue}`
                    : `${minValue}-${maxValue}`,
                description: range.description
            };
        })
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
        case 'm/s': return 30;       // Up to 30 m/s for Vasiliki conditions
        case 'km/h': return 120;     // Approx 30 m/s in km/h
        case 'knots': return 60;     // Approx 30 m/s in knots
        case 'beaufort': return 12;  // Max on Beaufort scale
        default: return 30;
    }
};
