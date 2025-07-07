/**
 * Station Data Cache Service
 *
 * Provides in-memory caching of latest station data for immediate delivery
 * to new SSE subscribers, solving the low-power mode delay issue.
 */

interface StationWindData {
  windSpeed: number
  windDirection: number
  timestamp: string
}

interface StationTemperatureData {
  temperature: number
  timestamp: string
}

interface StationDiagnosticsData {
  batteryVoltage: number
  solarVoltage: number
  signalQuality: number
  uptime: number
  internalTemperature?: number
  timestamp: string
}

interface StationCachedData {
  wind?: StationWindData
  temperature?: StationTemperatureData
  diagnostics?: StationDiagnosticsData
}

class StationDataCacheService {
  private cache: Record<string, StationCachedData> = {}

  /**
   * Cache wind data for a station
   */
  setWindData(stationId: string, data: StationWindData): void {
    if (!this.cache[stationId]) {
      this.cache[stationId] = {}
    }
    this.cache[stationId].wind = data
  }

  /**
   * Cache temperature data for a station
   */
  setTemperatureData(stationId: string, data: StationTemperatureData): void {
    if (!this.cache[stationId]) {
      this.cache[stationId] = {}
    }
    this.cache[stationId].temperature = data
  }

  /**
   * Cache diagnostics data for a station
   */
  setDiagnosticsData(stationId: string, data: StationDiagnosticsData): void {
    if (!this.cache[stationId]) {
      this.cache[stationId] = {}
    }
    this.cache[stationId].diagnostics = data
  }

  /**
   * Get cached wind data for a station
   */
  getWindData(stationId: string): StationWindData | null {
    return this.cache[stationId]?.wind || null
  }

  /**
   * Get cached temperature data for a station
   */
  getTemperatureData(stationId: string): StationTemperatureData | null {
    return this.cache[stationId]?.temperature || null
  }

  /**
   * Get cached diagnostics data for a station
   */
  getDiagnosticsData(stationId: string): StationDiagnosticsData | null {
    return this.cache[stationId]?.diagnostics || null
  }

  /**
   * Get all cached data for a station
   */
  getAllData(stationId: string): StationCachedData | null {
    return this.cache[stationId] || null
  }

  /**
   * Clear cached data for a station (optional, for cleanup)
   */
  clearStationData(stationId: string): void {
    delete this.cache[stationId]
  }

  /**
   * Clear old data (optional, for memory management)
   * Removes data older than specified hours
   */
  clearOldData(maxAgeHours: number = 24): void {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000)

    for (const stationId in this.cache) {
      const stationData = this.cache[stationId]

      // Remove old wind data
      if (stationData.wind && new Date(stationData.wind.timestamp) < cutoffTime) {
        delete stationData.wind
      }

      // Remove old temperature data
      if (stationData.temperature && new Date(stationData.temperature.timestamp) < cutoffTime) {
        delete stationData.temperature
      }

      // Remove old diagnostics data
      if (stationData.diagnostics && new Date(stationData.diagnostics.timestamp) < cutoffTime) {
        delete stationData.diagnostics
      }

      // Remove station entry if no data left
      if (!stationData.wind && !stationData.temperature && !stationData.diagnostics) {
        delete this.cache[stationId]
      }
    }
  }
}

// Export singleton instance
export const stationDataCache = new StationDataCacheService()
export type { StationWindData, StationTemperatureData, StationDiagnosticsData, StationCachedData }
