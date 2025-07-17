import { DateTime } from 'luxon'
import WindData1Min from '#models/wind_data_1_min'
import WindData10Min from '#models/wind_data_10_min'
import type { WindTendency } from '#models/wind_data_10_min'
import transmit from '@adonisjs/transmit/services/main'

/**
 * Data structure for tracking wind dat      // Get all unique stations that have 1-minute data in this interval
      const stations = await WindData1Min.query()
        .select('stationId')
        .whereNotNull('timestamp')  // Exclude corrupted records
        .where('timestamp', '>=', intervalStart.toJSDate())
        .where('timestamp', '<', intervalStart.plus({ minutes: 10 }).toJSDate())
        .groupBy('stationId')in a minute interval
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
      // Get all stations that have 1-minute data for the interval (excluding null timestamps)
      const stations = await WindData1Min.query()
        .select('stationId')
        .whereNotNull('timestamp')  // Exclude corrupted records
        .where('timestamp', '>=', intervalStart.toJSDate())
        .where('timestamp', '<', intervalStart.plus({ minutes: 10 }).toJSDate())
        .groupBy('stationId')

      for (const station of stations) {
        await this.aggregate10MinuteData(station.stationId, intervalStart)
      }
    } catch (error) {
      console.error('Error processing 10-minute aggregation:', error)
    }
  }

  /**
   * Process the last hour's worth of 10-minute intervals
   * Useful for testing and manual backfill
   */
  async processLastHourIntervals(): Promise<void> {
    const now = DateTime.now()
    const oneHourAgo = now.minus({ hours: 1 })

    // Get all 10-minute intervals in the last hour
    const intervals: DateTime[] = []
    let currentInterval = this.get10MinuteIntervalStart(oneHourAgo)

    while (currentInterval < now.minus({ minutes: 10 })) {
      intervals.push(currentInterval)
      currentInterval = currentInterval.plus({ minutes: 10 })
    }

    console.log(`Processing ${intervals.length} intervals from the last hour`)

    for (const interval of intervals) {
      try {
        await this.process10MinuteAggregationForInterval(interval)
      } catch (error) {
        console.error(`Error processing interval ${interval.toISO()}:`, error)
      }
    }

    console.log(`Completed processing ${intervals.length} intervals from the last hour`)
  }

  /**
   * Process any missing 10-minute intervals from the last hour
   * Called on startup to catch up on any missed aggregations
   */
  async processRecentMissingIntervals(): Promise<void> {
    const now = DateTime.now()
    const oneHourAgo = now.minus({ hours: 1 })

    // Get all 10-minute intervals in the last hour
    const intervals: DateTime[] = []
    let currentInterval = this.get10MinuteIntervalStart(oneHourAgo)

    while (currentInterval < now.minus({ minutes: 10 })) {
      intervals.push(currentInterval)
      currentInterval = currentInterval.plus({ minutes: 10 })
    }

    console.log(`Checking ${intervals.length} recent 10-minute intervals for missing data`)

    for (const interval of intervals) {
      try {
        // Check if we already have data for this interval
        const existingData = await WindData10Min.query()
          .where('timestamp', interval.toJSDate())
          .first()

        if (!existingData) {
          // Check if we have 1-minute data for this interval
          const oneMinuteCount = await WindData1Min.query()
            .where('timestamp', '>=', interval.toJSDate())
            .where('timestamp', '<', interval.plus({ minutes: 10 }).toJSDate())
            .count('* as total')

          const total = oneMinuteCount[0].$extras.total
          if (total > 0) {
            console.log(`Processing missing interval: ${interval.toISO()}`)
            await this.process10MinuteAggregationForInterval(interval)
          }
        }
      } catch (error) {
        console.error(`Error processing missing interval ${interval.toISO()}:`, error)
      }
    }
  }

  /**
   * EMERGENCY FIX: Process specific 10-minute intervals with valid timestamps
   * This method will forcefully process intervals that contain our valid data
   */
  async emergencyProcessValidIntervals(): Promise<{ processed: number; created: number }> {
    console.log('🚨 EMERGENCY FIX: Processing all intervals with valid timestamps')

    // Get all unique valid timestamps to determine which intervals to process
    const validRecords = await WindData1Min.query()
      .select('timestamp')
      .whereNotNull('timestamp')
      .orderBy('timestamp', 'asc')

    console.log(`Found ${validRecords.length} records with valid timestamps`)

    // Group timestamps by 10-minute intervals
    const intervalMap = new Map<string, DateTime[]>()

    for (const record of validRecords) {
      const timestamp = record.timestamp
      const intervalStart = this.get10MinuteIntervalStart(timestamp)
      const intervalKey = intervalStart.toISO()

      if (intervalKey) {  // Only process if we have a valid ISO string
        if (!intervalMap.has(intervalKey)) {
          intervalMap.set(intervalKey, [])
        }
        intervalMap.get(intervalKey)!.push(timestamp)
      }
    }

    console.log(`Found ${intervalMap.size} unique 10-minute intervals with valid data:`)
    for (const [intervalKey, timestamps] of intervalMap.entries()) {
      console.log(`  - ${intervalKey}: ${timestamps.length} records`)
    }

    let processedCount = 0
    let createdCount = 0

    // Process each interval
    for (const [intervalKey] of intervalMap.entries()) {
      try {
        const intervalStart = DateTime.fromISO(intervalKey)
        console.log(`🔧 Processing interval: ${intervalStart.toISO()}`)

        // Check if we already have this 10-minute record
        const existingRecord = await WindData10Min.query()
          .where('timestamp', intervalStart.toJSDate())
          .first()

        if (existingRecord) {
          console.log(`  ✅ Already exists, skipping`)
          continue
        }

        // Process this interval
        await this.process10MinuteAggregationForInterval(intervalStart)
        processedCount++

        // Check if it was actually created
        const newRecord = await WindData10Min.query()
          .where('timestamp', intervalStart.toJSDate())
          .first()

        if (newRecord) {
          createdCount++
          console.log(`  ✅ Created 10-minute record`)
        } else {
          console.log(`  ❌ Failed to create 10-minute record`)
        }

      } catch (error) {
        console.error(`Error processing interval ${intervalKey}:`, error)
      }
    }

    console.log(`🎉 Emergency fix completed: processed ${processedCount} intervals, created ${createdCount} records`)
    return { processed: processedCount, created: createdCount }
  }

  /**
   * Process 10-minute aggregation for a specific interval (for testing)
   */
  async process10MinuteAggregationForInterval(intervalStart: DateTime): Promise<void> {
    try {
      console.log(`Processing 10-minute aggregation for interval: ${intervalStart.toISO()}`)

      // First, let's check if we have any 1-minute data at all (including nulls for debugging)
      const allOneMinData = await WindData1Min.query()
        .where('timestamp', '>=', intervalStart.toJSDate())
        .where('timestamp', '<', intervalStart.plus({ minutes: 10 }).toJSDate())
        .orderBy('timestamp', 'asc')

      console.log(`Found ${allOneMinData.length} total 1-minute records in interval (including nulls)`)
      allOneMinData.forEach(record => {
        console.log(`1-min record: station=${record.stationId}, timestamp=${record.timestamp?.toISO() || 'NULL'}`)
      })

      // Get all stations that have 1-minute data for the interval (excluding null timestamps)
      const stations = await WindData1Min.query()
        .select('stationId')
        .whereNotNull('timestamp')  // Only include valid timestamps
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

      // Get 1-minute data for the 10-minute interval using proper Lucid DateTime queries
      // Use Luxon DateTime objects for reliable timestamp comparisons
      const intervalEnd = intervalStart.plus({ minutes: 10 })

      console.log(`Querying 1-minute data from ${intervalStart.toISO()} to ${intervalEnd.toISO()}`)

      const oneMinuteData = await WindData1Min.query()
        .where('stationId', stationId)
        .whereNotNull('timestamp')  // Exclude records with null timestamps (data quality issue)
        .where('timestamp', '>=', intervalStart.toJSDate())  // Use JSDate for reliable Lucid queries
        .where('timestamp', '<', intervalEnd.toJSDate())     // Use JSDate for reliable Lucid queries
        .orderBy('timestamp', 'asc')

      console.log(`Found ${oneMinuteData.length} 1-minute records for aggregation (excluding null timestamps)`)

      // Debug: Log actual timestamps found
      if (oneMinuteData.length > 0) {
        console.log('Sample timestamps found:')
        oneMinuteData.slice(0, 3).forEach(record => {
          console.log(`  - ${record.timestamp?.toISO() || 'NULL'} (${typeof record.timestamp})`)
        })
      }

      if (oneMinuteData.length === 0) {
        console.log(`No valid 1-minute data found for ${stationId} from ${intervalStart.toISO()} to ${intervalStart.plus({ minutes: 10 }).toISO()}, skipping aggregation`)
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

      let windData: WindData10Min

      // Check if record already exists
      const existingRecord = await WindData10Min.query()
        .where('stationId', stationId)
        .where('timestamp', intervalStart.toJSDate())
        .first()

      if (existingRecord) {
        console.log('Updating existing 10-minute record')
        // Update existing record
        windData = await existingRecord.merge({
          avgSpeed: Math.round(avgSpeed * 100) / 100,
          minSpeed,
          maxSpeed,
          dominantDirection,
          tendency,
        }).save()
      } else {
        console.log('Creating new 10-minute record')
        // Create new record
        windData = await WindData10Min.create({
          stationId,
          timestamp: intervalStart,
          avgSpeed: Math.round(avgSpeed * 100) / 100,
          minSpeed,
          maxSpeed,
          dominantDirection,
          tendency,
        })

        console.log(`Created 10-minute record with ID: ${windData.id}`)
      }

      // Always broadcast to SSE subscribers (for both new and updated records)
      await transmit.broadcast(`wind/aggregated/10min/${stationId}`, {
        stationId,
        timestamp: intervalStart.toISO(),
        avgSpeed: windData.avgSpeed,
        minSpeed: windData.minSpeed,
        maxSpeed: windData.maxSpeed,
        dominantDirection: windData.dominantDirection,
        tendency: windData.tendency,
      })

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
   * DIRECT FIX: Manually create 10-minute aggregations from valid 1-minute data
   * This bypasses all the complex logic and directly creates the records
   */
  async directManualAggregation(): Promise<{ success: boolean; created: number; details: any[] }> {
    console.log('🔧 DIRECT FIX: Creating 10-minute aggregations manually')

    const results = []
    let createdCount = 0

    try {
      // Get all valid 1-minute records
      const validRecords = await WindData1Min.query()
        .whereNotNull('timestamp')
        .orderBy('timestamp', 'asc')

      console.log(`Found ${validRecords.length} valid 1-minute records`)

      // Group by 10-minute intervals
      const intervalGroups = new Map()

      for (const record of validRecords) {
        const intervalStart = this.get10MinuteIntervalStart(record.timestamp)
        const intervalKey = intervalStart.toISO()

        if (!intervalGroups.has(intervalKey)) {
          intervalGroups.set(intervalKey, [])
        }
        intervalGroups.get(intervalKey).push(record)
      }

      console.log(`Grouped into ${intervalGroups.size} intervals`)

      // Process each interval manually
      for (const [intervalKey, records] of intervalGroups.entries()) {
        const intervalStart = DateTime.fromISO(intervalKey)
        const stationId = records[0].stationId

        // Check if record already exists
        const existing = await WindData10Min.query()
          .where('stationId', stationId)
          .where('timestamp', intervalStart.toJSDate())
          .first()

        if (existing) {
          results.push({ interval: intervalKey, status: 'exists', stationId })
          continue
        }

        // Calculate statistics manually
        const speeds = records.map((r: any) => r.avgSpeed)
        const avgSpeed = speeds.reduce((sum: number, speed: number) => sum + speed, 0) / speeds.length
        const minSpeed = Math.min(...records.map((r: any) => r.minSpeed))
        const maxSpeed = Math.max(...records.map((r: any) => r.maxSpeed))

        // Calculate dominant direction (simple approach)
        const directionFreq: { [key: number]: number } = {}
        records.forEach((r: any) => {
          const dir = Math.round(r.dominantDirection)
          directionFreq[dir] = (directionFreq[dir] || 0) + 1
        })

        let dominantDirection = 0
        let maxFreq = 0
        for (const [dir, freq] of Object.entries(directionFreq)) {
          if (Number(freq) > maxFreq) {
            maxFreq = Number(freq)
            dominantDirection = parseInt(dir)
          }
        }

        try {
          // Create the 10-minute record directly
          const newRecord = await WindData10Min.create({
            stationId,
            timestamp: intervalStart,
            avgSpeed: Math.round(avgSpeed * 100) / 100,
            minSpeed,
            maxSpeed,
            dominantDirection,
            tendency: 'stable' as const  // Default for now
          })

          createdCount++
          results.push({
            interval: intervalKey,
            status: 'created',
            stationId,
            recordId: newRecord.id,
            data: {
              avgSpeed: newRecord.avgSpeed,
              minSpeed: newRecord.minSpeed,
              maxSpeed: newRecord.maxSpeed,
              dominantDirection: newRecord.dominantDirection,
              inputRecords: records.length
            }
          })

          console.log(`✅ Created 10-min record for ${stationId} at ${intervalKey}`)

          // Broadcast to SSE
          await transmit.broadcast(`wind/aggregated/10min/${stationId}`, {
            stationId,
            timestamp: intervalStart.toISO(),
            avgSpeed: newRecord.avgSpeed,
            minSpeed: newRecord.minSpeed,
            maxSpeed: newRecord.maxSpeed,
            dominantDirection: newRecord.dominantDirection,
            tendency: newRecord.tendency,
          })

        } catch (error) {
          console.error(`❌ Failed to create record for ${intervalKey}:`, error)
          results.push({
            interval: intervalKey,
            status: 'error',
            stationId,
            error: error.message
          })
        }
      }

      console.log(`🎉 Direct fix completed: ${createdCount} records created`)
      return { success: true, created: createdCount, details: results }

    } catch (error) {
      console.error('Direct fix failed:', error)
      return { success: false, created: createdCount, details: [{ error: error.message }] }
    }
  }
}

// Export singleton instance
export const windAggregationService = new WindAggregationService()