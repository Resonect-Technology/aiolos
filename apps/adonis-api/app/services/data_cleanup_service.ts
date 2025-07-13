import TemperatureReading from '#models/temperature_reading'
import StationDiagnostic from '#models/station_diagnostic'
import DataRetentionPolicy from '#models/data_retention_policy'
import WindData1Min from '#models/wind_data_1_min'
import { DateTime } from 'luxon'

/**
 * Data Cleanup Service
 * 
 * Provides basic cleanup functionality for old data based on retention policies
 */
export class DataCleanupService {
  /**
   * Clean up temperature readings based on retention policy
   */
  async cleanupTemperatureReadings(): Promise<{ deleted: number; policy: string }> {
    const policy = await DataRetentionPolicy.query()
      .where('dataType', 'temperature')
      .where('isActive', true)
      .first()

    if (!policy) {
      return { deleted: 0, policy: 'No active policy found' }
    }

    const cutoffDate = DateTime.now().minus({ days: policy.retentionDays })

    const result = await TemperatureReading.query()
      .where('readingTimestamp', '<', cutoffDate.toSQL())
      .delete()

    console.log(`Cleaned up ${result.length || 0} temperature readings older than ${policy.retentionDays} days`)
    
    return { 
      deleted: result.length || 0, 
      policy: `Retention: ${policy.retentionDays} days` 
    }
  }

  /**
   * Clean up 1-minute wind data based on retention policy
   * Default retention: 1 day (configurable via retention policy)
   */
  async cleanupWindData1Min(): Promise<{ deleted: number; policy: string }> {
    const policy = await DataRetentionPolicy.query()
      .where('dataType', 'wind_1min')
      .where('isActive', true)
      .first()

    // Default to 1 day retention if no policy exists
    const retentionDays = policy?.retentionDays || 1
    const cutoffDate = DateTime.now().minus({ days: retentionDays })

    const result = await WindData1Min.query()
      .where('timestamp', '<', cutoffDate.toSQL())
      .delete()

    console.log(`Cleaned up ${result.length || 0} 1-minute wind records older than ${retentionDays} days`)
    
    return { 
      deleted: result.length || 0, 
      policy: policy ? `Retention: ${retentionDays} days` : `Default retention: ${retentionDays} days` 
    }
  }
  /**
   * Clean up diagnostics data based on retention policy
   */
  async cleanupDiagnostics(): Promise<{ deleted: number; policy: string }> {
    const policy = await DataRetentionPolicy.query()
      .where('dataType', 'diagnostics')
      .where('isActive', true)
      .first()

    if (!policy) {
      return { deleted: 0, policy: 'No active policy found' }
    }

    const cutoffDate = DateTime.now().minus({ days: policy.retentionDays })

    const result = await StationDiagnostic.query()
      .where('createdAt', '<', cutoffDate.toSQL())
      .delete()

    console.log(`Cleaned up ${result.length || 0} diagnostics records older than ${policy.retentionDays} days`)
    
    return { 
      deleted: result.length || 0, 
      policy: `Retention: ${policy.retentionDays} days` 
    }
  }

  /**
   * Run all cleanup operations
   */
  async runAllCleanups(): Promise<{ temperatureCleanup: any; diagnosticsCleanup: any; windData1MinCleanup: any }> {
    console.log('Starting data cleanup operations...')

    const temperatureCleanup = await this.cleanupTemperatureReadings()
    const diagnosticsCleanup = await this.cleanupDiagnostics()
    const windData1MinCleanup = await this.cleanupWindData1Min()

    console.log('Data cleanup operations completed')

    return {
      temperatureCleanup,
      diagnosticsCleanup,
      windData1MinCleanup,
    }
  }
}

// Export singleton instance
export const dataCleanupService = new DataCleanupService()