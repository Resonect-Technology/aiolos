import { DateTime } from 'luxon'
import WindData1Min from '#models/wind_data_1_min'
import WindData10Min from '#models/wind_data_10_min'
import WindDataHourly from '#models/wind_data_hourly'
import type { WindTendency } from '#models/wind_data_10_min'
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
   * Process 10-minute aggregation from 1-minute data
   * Called every 10 minutes by scheduled job
   */
  async process10MinuteAggregation(): Promise<void> {
    const now = DateTime.now()
    const currentIntervalStart = this.get10MinuteIntervalStart(now)
    
    // Process the previous 10-minute interval (not the current one)
    const intervalStart = currentIntervalStart.minus({ minutes: 10 })

    try {
      // Get all stations that have 1-minute data for the interval
      const stations = await WindData1Min.query()
        .select('station_id')
        .where('timestamp', '>=', intervalStart.toJSDate())
        .where('timestamp', '<', intervalStart.plus({ minutes: 10 }).toJSDate())
        .groupBy('station_id')

      for (const station of stations) {
        await this.aggregate10MinuteData(station.stationId, intervalStart)
      }
    } catch (error) {
      console.error('Error processing 10-minute aggregation:', error)
    }
  }

  /**
   * Process 10-minute aggregation for a specific interval (for testing)
   */
  async process10MinuteAggregationForInterval(intervalStart: DateTime): Promise<void> {
    try {
      console.log(`Processing 10-minute aggregation for interval: ${intervalStart.toISO()}`)
      
      // First, let's check if we have any 1-minute data at all
      const allOneMinData = await WindData1Min.query()
        .where('timestamp', '>=', intervalStart.toJSDate())
        .where('timestamp', '<', intervalStart.plus({ minutes: 10 }).toJSDate())
        .orderBy('timestamp', 'asc')
      
      console.log(`Found ${allOneMinData.length} total 1-minute records in interval`)
      allOneMinData.forEach(record => {
        console.log(`1-min record: station=${record.stationId}, timestamp=${record.timestamp.toISO()}`)
      })
      
      // Get all stations that have 1-minute data for the interval
      const stations = await WindData1Min.query()
        .select('stationId')
        .where('timestamp', '>=', intervalStart.toJSDate())
        .where('timestamp', '<', intervalStart.plus({ minutes: 10 }).toJSDate())
        .groupBy('stationId')

      console.log(`Found ${stations.length} stations with 1-minute data`)
      stations.forEach(station => {
        console.log(`Station: ${station.stationId}`)
      })

      for (const station of stations) {
        await this.aggregate10MinuteData(station.stationId, intervalStart)
      }
    } catch (error) {
      console.error('Error processing 10-minute aggregation for interval:', error)
      throw error
    }
  }

  /**
   * Aggregate 10-minute data for a specific station
   */
  private async aggregate10MinuteData(stationId: string, intervalStart: DateTime): Promise<void> {
    try {
      console.log(`Starting 10-minute aggregation for station ${stationId} at ${intervalStart.toISO()}`)
      
      // Get 1-minute data for the 10-minute interval
      const oneMinuteData = await WindData1Min.query()
        .where('stationId', stationId)
        .where('timestamp', '>=', intervalStart.toJSDate())
        .where('timestamp', '<', intervalStart.plus({ minutes: 10 }).toJSDate())
        .orderBy('timestamp', 'asc')

      console.log(`Found ${oneMinuteData.length} 1-minute records for aggregation`)
      
      if (oneMinuteData.length === 0) {
        console.log('No 1-minute data found, skipping aggregation')
        return
      }

      // Calculate aggregated statistics
      const totalSpeedSum = oneMinuteData.reduce((sum, record) => sum + record.avgSpeed, 0)
      const avgSpeed = totalSpeedSum / oneMinuteData.length
      const minSpeed = Math.min(...oneMinuteData.map(r => r.minSpeed))
      const maxSpeed = Math.max(...oneMinuteData.map(r => r.maxSpeed))

      // Calculate dominant direction using frequency
      const dominantDirection = this.calculateDominantDirectionFromRecords(oneMinuteData)

      // Calculate tendency by comparing with previous 10-minute record
      const tendency = await this.calculateTendency(stationId, intervalStart, avgSpeed)

      console.log(`Calculated values: avgSpeed=${avgSpeed}, minSpeed=${minSpeed}, maxSpeed=${maxSpeed}, dominantDirection=${dominantDirection}, tendency=${tendency}`)

      // Check if record already exists
      const existingRecord = await WindData10Min.query()
        .where('stationId', stationId)
        .where('timestamp', intervalStart.toJSDate())
        .first()

      if (existingRecord) {
        console.log('Updating existing 10-minute record')
        // Update existing record
        await existingRecord.merge({
          avgSpeed: Math.round(avgSpeed * 100) / 100,
          minSpeed,
          maxSpeed,
          dominantDirection,
          tendency,
        }).save()
      } else {
        console.log('Creating new 10-minute record')
        // Create new record
        const windData = await WindData10Min.create({
          stationId,
          timestamp: intervalStart,
          avgSpeed: Math.round(avgSpeed * 100) / 100,
          minSpeed,
          maxSpeed,
          dominantDirection,
          tendency,
        })

        console.log(`Created 10-minute record with ID: ${windData.id}`)

        // Broadcast to SSE subscribers
        await transmit.broadcast(`wind/aggregated/10min/${stationId}`, {
          stationId,
          timestamp: intervalStart.toISO(),
          avgSpeed: windData.avgSpeed,
          minSpeed: windData.minSpeed,
          maxSpeed: windData.maxSpeed,
          dominantDirection: windData.dominantDirection,
          tendency: windData.tendency,
        })
      }

      console.log(`Saved 10-minute wind aggregate for station ${stationId} at ${intervalStart.toISO()}`)
    } catch (error) {
      console.error('Error aggregating 10-minute data:', error)
      throw error
    }
  }

  /**
   * Calculate dominant direction from 1-minute records
   */
  private calculateDominantDirectionFromRecords(records: WindData1Min[]): number {
    const directionFrequency: Record<number, number> = {}
    
    for (const record of records) {
      const direction = Math.round(record.dominantDirection)
      directionFrequency[direction] = (directionFrequency[direction] || 0) + 1
    }

    return this.calculateDominantDirection(directionFrequency)
  }

  /**
   * Calculate dominant direction from 10-minute records
   */
  private calculateDominantDirectionFrom10MinRecords(records: WindData10Min[]): number {
    const directionFrequency: Record<number, number> = {}
    
    for (const record of records) {
      const direction = Math.round(record.dominantDirection)
      directionFrequency[direction] = (directionFrequency[direction] || 0) + 1
    }

    return this.calculateDominantDirection(directionFrequency)
  }

  /**
   * Calculate tendency by comparing with previous 10-minute interval
   */
  private async calculateTendency(stationId: string, currentInterval: DateTime, currentAvg: number): Promise<WindTendency> {
    const threshold = 0.5 // m/s
    
    // Get previous 10-minute record
    const previousRecord = await WindData10Min.query()
      .where('stationId', stationId)
      .where('timestamp', '<', currentInterval.toJSDate())
      .orderBy('timestamp', 'desc')
      .first()

    if (!previousRecord) {
      return 'stable' // First record
    }

    const previousAvg = previousRecord.avgSpeed
    
    if (currentAvg > previousAvg + threshold) {
      return 'increasing'
    } else if (currentAvg < previousAvg - threshold) {
      return 'decreasing'
    } else {
      return 'stable'
    }
  }

  /**
   * Get the start of the 10-minute interval for a given timestamp
   */
  private get10MinuteIntervalStart(timestamp: DateTime): DateTime {
    const minute = Math.floor(timestamp.minute / 10) * 10
    return timestamp.startOf('minute').set({ minute })
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

  /**
   * Process hourly aggregation from 10-minute data
   * Called every hour at XX:00 by scheduled job
   */
  async processHourlyAggregation(): Promise<void> {
    const now = DateTime.now()
    const currentHourStart = this.getHourlyIntervalStart(now)
    
    // Process the previous hour (not the current one)
    const intervalStart = currentHourStart.minus({ hours: 1 })

    try {
      // Get all stations that have 10-minute data for the interval
      const stations = await WindData10Min.query()
        .select('stationId')
        .where('timestamp', '>=', intervalStart.toJSDate())
        .where('timestamp', '<=', intervalStart.plus({ hours: 1 }).minus({ milliseconds: 1 }).toJSDate())
        .groupBy('stationId')

      for (const station of stations) {
        await this.aggregateHourlyData(station.stationId, intervalStart)
      }
    } catch (error) {
      console.error('Error processing hourly aggregation:', error)
    }
  }

  /**
   * Process hourly aggregation for a specific interval (for testing)
   */
  async processHourlyAggregationForInterval(intervalStart: DateTime): Promise<void> {
    try {
      console.log(`Processing hourly aggregation for interval: ${intervalStart.toISO()}`)
      
      // Get all stations that have 10-minute data for the interval
      const stations = await WindData10Min.query()
        .select('stationId')
        .where('timestamp', '>=', intervalStart.toJSDate())
        .where('timestamp', '<=', intervalStart.plus({ hours: 1 }).minus({ milliseconds: 1 }).toJSDate())
        .groupBy('stationId')

      console.log(`Found ${stations.length} stations with 10-minute data`)
      
      for (const station of stations) {
        await this.aggregateHourlyData(station.stationId, intervalStart)
      }
    } catch (error) {
      console.error('Error processing hourly aggregation for interval:', error)
      throw error
    }
  }

  /**
   * Aggregate hourly data for a specific station
   */
  private async aggregateHourlyData(stationId: string, intervalStart: DateTime): Promise<void> {
    try {
      console.log(`Starting hourly aggregation for station ${stationId} at ${intervalStart.toISO()}`)
      
      // Get 10-minute data for the hour (6 records expected)
      const tenMinuteData = await WindData10Min.query()
        .where('stationId', stationId)
        .where('timestamp', '>=', intervalStart.toJSDate())
        .where('timestamp', '<=', intervalStart.plus({ hours: 1 }).minus({ milliseconds: 1 }).toJSDate())
        .orderBy('timestamp', 'asc')

      console.log(`Found ${tenMinuteData.length} 10-minute records for hourly aggregation`)
      
      if (tenMinuteData.length === 0) {
        console.log('No 10-minute data found, skipping hourly aggregation')
        return
      }

      // Calculate aggregated statistics
      const totalSpeedSum = tenMinuteData.reduce((sum, record) => sum + record.avgSpeed, 0)
      const avgSpeed = totalSpeedSum / tenMinuteData.length
      const minSpeed = Math.min(...tenMinuteData.map(r => r.minSpeed))
      const maxSpeed = Math.max(...tenMinuteData.map(r => r.maxSpeed))
      
      // Calculate gust speed (maximum of max_speeds from 10-minute data)
      const gustSpeed = Math.max(...tenMinuteData.map(r => r.maxSpeed))

      // Calculate calm periods (count of 10-min intervals with avg < 1 m/s)
      const calmPeriods = tenMinuteData.filter(r => r.avgSpeed < 1.0).length

      // Calculate dominant direction using frequency from 10-minute data
      const dominantDirection = this.calculateDominantDirectionFrom10MinRecords(tenMinuteData)

      // Calculate tendency by comparing with previous hourly record
      const tendency = await this.calculateHourlyTendency(stationId, intervalStart, avgSpeed)

      console.log(`Calculated hourly values: avgSpeed=${avgSpeed}, minSpeed=${minSpeed}, maxSpeed=${maxSpeed}, gustSpeed=${gustSpeed}, calmPeriods=${calmPeriods}, dominantDirection=${dominantDirection}, tendency=${tendency}`)

      // Check if record already exists
      const existingRecord = await WindDataHourly.query()
        .where('stationId', stationId)
        .where('timestamp', intervalStart.toJSDate())
        .first()

      if (existingRecord) {
        console.log('Updating existing hourly record')
        // Update existing record
        await existingRecord.merge({
          avgSpeed: Math.round(avgSpeed * 100) / 100,
          minSpeed,
          maxSpeed,
          dominantDirection,
          tendency,
          gustSpeed,
          calmPeriods,
        }).save()
      } else {
        console.log('Creating new hourly record')
        // Create new record
        const windData = await WindDataHourly.create({
          stationId,
          timestamp: intervalStart,
          avgSpeed: Math.round(avgSpeed * 100) / 100,
          minSpeed,
          maxSpeed,
          dominantDirection,
          tendency,
          gustSpeed,
          calmPeriods,
        })

        console.log(`Created hourly record with ID: ${windData.id}`)

        // Broadcast to SSE subscribers
        await transmit.broadcast(`wind/aggregated/hourly/${stationId}`, {
          stationId,
          timestamp: intervalStart.toISO(),
          avgSpeed: windData.avgSpeed,
          minSpeed: windData.minSpeed,
          maxSpeed: windData.maxSpeed,
          dominantDirection: windData.dominantDirection,
          tendency: windData.tendency,
          gustSpeed: windData.gustSpeed,
          calmPeriods: windData.calmPeriods,
        })
      }

      console.log(`Saved hourly wind aggregate for station ${stationId} at ${intervalStart.toISO()}`)
    } catch (error) {
      console.error('Error aggregating hourly data:', error)
      throw error
    }
  }

  /**
   * Calculate tendency for hourly data by comparing with previous hourly interval
   */
  private async calculateHourlyTendency(stationId: string, currentInterval: DateTime, currentAvg: number): Promise<WindTendency> {
    const threshold = 0.5 // m/s
    
    // Get previous hourly record
    const previousRecord = await WindDataHourly.query()
      .where('stationId', stationId)
      .where('timestamp', '<', currentInterval.toJSDate())
      .orderBy('timestamp', 'desc')
      .first()

    if (!previousRecord) {
      return 'stable' // First record
    }

    const previousAvg = previousRecord.avgSpeed
    
    if (currentAvg > previousAvg + threshold) {
      return 'increasing'
    } else if (currentAvg < previousAvg - threshold) {
      return 'decreasing'
    } else {
      return 'stable'
    }
  }

  /**
   * Get the start of the hourly interval for a given timestamp
   */
  private getHourlyIntervalStart(timestamp: DateTime): DateTime {
    return timestamp.startOf('hour')
  }
}

// Export singleton instance
export const windAggregationService = new WindAggregationService()