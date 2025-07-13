import { DateTime } from 'luxon'
import WindData1Min from '#models/wind_data_1_min'
import transmit from '@adonisjs/transmit/services/main'

/**
 * Data structure for tracking wind data within a minute interval
 */
interface WindBucket {
  stationId: string
  intervalStart: DateTime
  speedSum: number
  speedCount: number
  minSpeed: number
  maxSpeed: number
  directionFrequency: Record<number, number>
  sampleCount: number
}

/**
 * Wind Aggregation Service
 * 
 * Handles real-time aggregation of wind data into 1-minute intervals.
 * Maintains in-memory buckets for current minute data and saves to database
 * at minute boundaries.
 */
export class WindAggregationService {
  private buckets: Map<string, WindBucket> = new Map()
  private flushTimer: NodeJS.Timeout | null = null

  /**
   * Process incoming wind data and update aggregation buckets
   */
  async processWindData(stationId: string, windSpeed: number, windDirection: number, timestamp: string): Promise<void> {
    const dataTime = DateTime.fromISO(timestamp)
    const intervalStart = this.getIntervalStart(dataTime)
    const bucketKey = `${stationId}_${intervalStart.toISODate()}_${intervalStart.toFormat('HH:mm')}`

    // Start the flush timer if not already running
    this.startFlushTimer()

    // Get or create bucket for this minute interval
    let bucket = this.buckets.get(bucketKey)
    if (!bucket) {
      bucket = {
        stationId,
        intervalStart,
        speedSum: 0,
        speedCount: 0,
        minSpeed: windSpeed,
        maxSpeed: windSpeed,
        directionFrequency: {},
        sampleCount: 0,
      }
      this.buckets.set(bucketKey, bucket)
    }

    // Update bucket with new data
    bucket.speedSum += windSpeed
    bucket.speedCount += 1
    bucket.minSpeed = Math.min(bucket.minSpeed, windSpeed)
    bucket.maxSpeed = Math.max(bucket.maxSpeed, windSpeed)
    bucket.sampleCount += 1

    // Track direction frequency (round to nearest degree)
    const roundedDirection = Math.round(windDirection)
    bucket.directionFrequency[roundedDirection] = (bucket.directionFrequency[roundedDirection] || 0) + 1

    // Check if we need to save completed intervals
    await this.checkAndSaveCompletedIntervals()
  }

  /**
   * Get the start of the minute interval for a given timestamp
   */
  private getIntervalStart(timestamp: DateTime): DateTime {
    return timestamp.startOf('minute')
  }

  /**
   * Check if any buckets represent completed intervals and save them
   */
  private async checkAndSaveCompletedIntervals(): Promise<void> {
    const now = DateTime.now()
    const currentMinuteStart = this.getIntervalStart(now)

    for (const [bucketKey, bucket] of this.buckets.entries()) {
      // If bucket is for a previous minute, save it
      if (bucket.intervalStart < currentMinuteStart) {
        await this.saveAggregatedData(bucket)
        this.buckets.delete(bucketKey)
      }
    }
  }

  /**
   * Save aggregated data to database and broadcast via SSE
   */
  private async saveAggregatedData(bucket: WindBucket): Promise<void> {
    try {
      // Calculate statistics
      const avgSpeed = bucket.speedSum / bucket.speedCount
      const dominantDirection = this.calculateDominantDirection(bucket.directionFrequency)

      // Save to database
      const windData = await WindData1Min.create({
        stationId: bucket.stationId,
        timestamp: bucket.intervalStart,
        avgSpeed: Math.round(avgSpeed * 100) / 100, // Round to 2 decimal places
        minSpeed: bucket.minSpeed,
        maxSpeed: bucket.maxSpeed,
        dominantDirection,
        sampleCount: bucket.sampleCount,
      })

      // Broadcast to SSE subscribers
      await transmit.broadcast(`wind/aggregated/1min/${bucket.stationId}`, {
        stationId: bucket.stationId,
        timestamp: bucket.intervalStart.toISO(),
        avgSpeed: windData.avgSpeed,
        minSpeed: windData.minSpeed,
        maxSpeed: windData.maxSpeed,
        dominantDirection: windData.dominantDirection,
        sampleCount: windData.sampleCount,
      })

      console.log(`Saved 1-minute wind aggregate for station ${bucket.stationId} at ${bucket.intervalStart.toISO()}`)
    } catch (error) {
      console.error('Error saving wind aggregate:', error)
    }
  }

  /**
   * Calculate dominant direction from frequency map
   */
  private calculateDominantDirection(directionFrequency: Record<number, number>): number {
    let maxFrequency = 0
    let dominantDirection = 0

    for (const [direction, frequency] of Object.entries(directionFrequency)) {
      if (frequency > maxFrequency) {
        maxFrequency = frequency
        dominantDirection = parseInt(direction)
      }
    }

    return dominantDirection
  }

  /**
   * Force save all current buckets (useful for testing or shutdown)
   */
  async forceFlushBuckets(): Promise<void> {
    for (const [bucketKey, bucket] of this.buckets.entries()) {
      await this.saveAggregatedData(bucket)
      this.buckets.delete(bucketKey)
    }
  }

  /**
   * Get current bucket count (for monitoring)
   */
  getBucketCount(): number {
    return this.buckets.size
  }

  /**
   * Get bucket info for debugging
   */
  getBucketInfo(): Array<{ stationId: string; intervalStart: string; sampleCount: number }> {
    return Array.from(this.buckets.values()).map(bucket => ({
      stationId: bucket.stationId,
      intervalStart: bucket.intervalStart.toISO() || 'unknown',
      sampleCount: bucket.sampleCount,
    }))
  }

  /**
   * Start periodic timer to flush completed buckets
   */
  private startFlushTimer(): void {
    if (this.flushTimer) return // Timer already running

    // Run every 30 seconds to check for completed intervals
    this.flushTimer = setInterval(async () => {
      await this.checkAndSaveCompletedIntervals()
    }, 30 * 1000) // 30 seconds

    console.log('Wind aggregation flush timer started')
  }

  /**
   * Stop the periodic flush timer
   */
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
      this.flushTimer = null
      console.log('Wind aggregation flush timer stopped')
    }
  }
}

// Export singleton instance
export const windAggregationService = new WindAggregationService()