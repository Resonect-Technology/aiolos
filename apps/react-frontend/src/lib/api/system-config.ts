/**
 * Base API URL for the backend services
 */
const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

/**
 * Interface for system configuration values
 */
interface SystemConfig {
  key: string;
  value: string | null;
  message?: string;
}

/**
 * Interface for all system configurations
 */
interface SystemConfigs {
  [key: string]: string;
}

/**
 * Fetches a specific system configuration value
 * @param key The configuration key to fetch
 * @returns Promise with the configuration value
 */
export const getSystemConfig = async (key: string): Promise<SystemConfig> => {
  try {
    const response = await fetch(`${API_URL}/api/system/config/${key}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch system config: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching system config:", error);
    return { key, value: null, message: "Failed to fetch configuration" };
  }
};

/**
 * Fetches all system configurations
 * @returns Promise with all system configurations
 */
export const getAllSystemConfigs = async (): Promise<SystemConfigs> => {
  try {
    const response = await fetch(`${API_URL}/api/system/config`);

    if (!response.ok) {
      throw new Error(`Failed to fetch system configs: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching system configs:", error);
    return {};
  }
};

/**
 * Parses a string value to determine if it represents a boolean true value
 * @param value The string value to parse
 * @returns boolean indicating if the value represents true
 */
export const parseBooleanConfig = (value: string | null): boolean => {
  if (!value) return false;

  // Convert to lowercase for case-insensitive comparison
  const lowerValue = value.toLowerCase();

  // Check various truthy string representations
  return lowerValue === "true" || lowerValue === "1" || lowerValue === "yes" || lowerValue === "on";
};
