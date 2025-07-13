import TemperatureReading from '#models/temperature_reading'
import StationDiagnostic from '#models/station_diagnostic'
import DataRetentionPolicy from '#models/data_retention_policy'
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

    console.log(`Cleaned up ${result} temperature readings older than ${policy.retentionDays} days`)
    
    return { 
      deleted: result, 
      policy: `Retention: ${policy.retentionDays} days` 
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

    console.log(`Cleaned up ${result} diagnostics records older than ${policy.retentionDays} days`)
    
    return { 
      deleted: result, 
      policy: `Retention: ${policy.retentionDays} days` 
    }
  }

  /**
   * Run all cleanup operations
   */
  async runAllCleanups(): Promise<{ temperatureCleanup: any; diagnosticsCleanup: any }> {
    console.log('Starting data cleanup operations...')

    const temperatureCleanup = await this.cleanupTemperatureReadings()
    const diagnosticsCleanup = await this.cleanupDiagnostics()

    console.log('Data cleanup operations completed')

    return {
      temperatureCleanup,
      diagnosticsCleanup,
    }
  }
}

// Export singleton instance
export const dataCleanupService = new DataCleanupService()