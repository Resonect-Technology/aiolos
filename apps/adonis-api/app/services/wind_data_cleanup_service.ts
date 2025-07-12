import { windAggregationService } from './wind_aggregation_service.js'

class WindDataCleanupService {
  /**
   * Clean up old 1-minute wind data
   * This should be called after hourly aggregation is complete
   */
  async cleanupOldOneMinuteData(maxAgeHours: number = 25): Promise<number> {
    console.log(`Starting cleanup of 1-minute wind data older than ${maxAgeHours} hours...`)
    
    const deletedCount = await windAggregationService.cleanupOldData(maxAgeHours)
    
    console.log(`Cleaned up ${deletedCount} old 1-minute wind data records`)
    return deletedCount
  }

  /**
   * Scheduled cleanup for 1-minute data
   * Should be called after successful hourly data creation
   */
  async performScheduledCleanup(): Promise<void> {
    try {
      // Clean up data older than 25 hours (1 hour buffer after hourly aggregation)
      await this.cleanupOldOneMinuteData(25)
    } catch (error) {
      console.error('Error during scheduled cleanup of 1-minute wind data:', error)
    }
  }

  /**
   * Clean up 1-minute data at the end of the day
   * This ensures data is cleaned up even if hourly aggregation fails
   */
  async performDailyCleanup(): Promise<void> {
    try {
      // Clean up data older than 24 hours
      await this.cleanupOldOneMinuteData(24)
    } catch (error) {
      console.error('Error during daily cleanup of 1-minute wind data:', error)
    }
  }
}

// Export singleton instance
export const windDataCleanupService = new WindDataCleanupService()