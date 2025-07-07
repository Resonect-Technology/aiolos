/**
 * Custom wind rose calculation function based on the original from @eunchurn/react-windrose
 * but supporting custom wind speed ranges for Vasiliki, Greece
 */
import type { ChartData as BaseChartData } from "@eunchurn/react-windrose";
import { WIND_DIRECTIONS } from "./wind-utils";
import type { WindDirectionAngle } from "./wind-utils";

// Custom chart data type with our specific bin ranges
export interface CustomChartData
  extends Omit<BaseChartData, "1-2" | "2-3" | "3-4" | "4-5" | "5-6" | "6-7" | "7+"> {
  angle: WindDirectionAngle;
  "0-1": number;
  "1-3": number;
  "3-5": number;
  "5-8": number;
  "8-11": number;
  "11-14": number;
  "14-17": number;
  "17-20": number;
  "20+": number;
  total: number;
}

interface WindData {
  direction: number[];
  speed: number[];
}

/**
 * Classify a wind direction in degrees to cardinal or intercardinal direction
 * @param dir Wind direction in degrees
 * @returns Cardinal or intercardinal direction (N, NE, E, etc.)
 */
export const classifyDir = (dir: number): WindDirectionAngle => {
  // Normalize direction to 0-360 range
  const normalizedDir = ((dir % 360) + 360) % 360;

  // Define direction ranges (each spanning 22.5 degrees)
  const directions: WindDirectionAngle[] = WIND_DIRECTIONS;

  // Calculate the index (0-15) of the direction
  const index = Math.round(normalizedDir / 22.5) % 16;

  return directions[index];
};

/**
 * Create empty wind rose data with all directions set to zero
 * @returns Empty wind rose data
 */
export const createEmptyWindRoseData = (): CustomChartData[] => {
  return WIND_DIRECTIONS.map(angle => ({
    angle,
    "0-1": 0,
    "1-3": 0,
    "3-5": 0,
    "5-8": 0,
    "8-11": 0,
    "11-14": 0,
    "14-17": 0,
    "17-20": 0,
    "20+": 0,
    total: 0,
  }));
};

/**
 * Calculate the wind rose data from raw wind data
 * @param data Raw wind direction and speed data
 * @returns Processed wind rose chart data
 */
export const calculateCustomWindRose = (data: WindData): CustomChartData[] => {
  if (!data.direction || !data.speed || data.direction.length === 0 || data.speed.length === 0) {
    return createEmptyWindRoseData();
  }

  // Initialize with empty data
  const result = createEmptyWindRoseData();

  // Process each data point
  for (let i = 0; i < Math.min(data.direction.length, data.speed.length); i++) {
    const dir = data.direction[i];
    const speed = data.speed[i];

    // Skip invalid data
    if (typeof dir !== "number" || typeof speed !== "number" || isNaN(dir) || isNaN(speed)) {
      continue;
    }

    // Classify the direction
    const directionCategory = classifyDir(dir);

    // Find the corresponding direction in our result array
    const directionData = result.find(item => item.angle === directionCategory);
    if (!directionData) continue;

    // Increment the appropriate speed category and total
    if (speed < 1) {
      directionData["0-1"] += 1;
    } else if (speed < 3) {
      directionData["1-3"] += 1;
    } else if (speed < 5) {
      directionData["3-5"] += 1;
    } else if (speed < 8) {
      directionData["5-8"] += 1;
    } else if (speed < 11) {
      directionData["8-11"] += 1;
    } else if (speed < 14) {
      directionData["11-14"] += 1;
    } else if (speed < 17) {
      directionData["14-17"] += 1;
    } else if (speed < 20) {
      directionData["17-20"] += 1;
    } else {
      directionData["20+"] += 1;
    }

    directionData.total += 1;
  }

  return result;
};
