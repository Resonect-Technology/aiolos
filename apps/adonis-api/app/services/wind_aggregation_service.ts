import transmit from '@adonisjs/transmit/services/main';
import { DateTime } from 'luxon';

import type { WindTendency } from '#app/types';
import { prisma } from '#services/prisma';

import type { WindData1MinModel } from '../../generated/prisma/models.js';

/**
 * Data structure for tracking wind data in a minute interval
 */
interface WindBucket {
  stationId: string;
  intervalStart: DateTime;
  speedSum: number;
  speedCount: number;
  minSpeed: number;
  maxSpeed: number;
  directionFrequency: Record<number, number>;
  sampleCount: number;
}

/**
 * Wind Aggregation Service
 *
 * Handles real-time aggregation of wind data into 1-minute intervals.
 * Maintains in-memory buckets for current minute data and saves to database
 * at minute boundaries.
 *
 * Wind timestamps are UTC ISO-8601 strings end to end (stored as text,
 * compared lexicographically) — always pass `.toUTC().toISO()` values.
 */
export class WindAggregationService {
  private buckets: Map<string, WindBucket> = new Map();
  private flushTimer: NodeJS.Timeout | null = null;

  /**
   * Process incoming wind data and update aggregation buckets
   */
  async processWindData(
    stationId: string,
    windSpeed: number,
    windDirection: number,
    timestamp: string,
  ): Promise<void> {
    const dataTime = DateTime.fromISO(timestamp);
    const intervalStart = this.getIntervalStart(dataTime);
    const bucketKey = `${stationId}_${intervalStart.toISODate()}_${intervalStart.toFormat('HH:mm')}`;

    // Start the flush timer if not already running
    this.startFlushTimer();

    // Get or create bucket for this minute interval
    let bucket = this.buckets.get(bucketKey);
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
      };
      this.buckets.set(bucketKey, bucket);
    }

    // Update bucket with new data
    bucket.speedSum += windSpeed;
    bucket.speedCount += 1;
    bucket.minSpeed = Math.min(bucket.minSpeed, windSpeed);
    bucket.maxSpeed = Math.max(bucket.maxSpeed, windSpeed);
    bucket.sampleCount += 1;

    // Track direction frequency (round to nearest degree)
    const roundedDirection = Math.round(windDirection);
    bucket.directionFrequency[roundedDirection] =
      (bucket.directionFrequency[roundedDirection] || 0) + 1;

    // Check if we need to save completed intervals
    await this.checkAndSaveCompletedIntervals();
  }

  /**
   * Get the start of the minute interval for a given timestamp
   */
  private getIntervalStart(timestamp: DateTime): DateTime {
    return timestamp.startOf('minute');
  }

  /**
   * Check if any buckets represent completed intervals and save them
   */
  private async checkAndSaveCompletedIntervals(): Promise<void> {
    const now = DateTime.now();
    const currentMinuteStart = this.getIntervalStart(now);

    for (const [bucketKey, bucket] of this.buckets.entries()) {
      // If bucket is for a previous minute, save it
      if (bucket.intervalStart < currentMinuteStart) {
        await this.saveAggregatedData(bucket);
        this.buckets.delete(bucketKey);
      }
    }
  }

  /**
   * Save aggregated data to database and broadcast via SSE
   */
  private async saveAggregatedData(bucket: WindBucket): Promise<void> {
    try {
      // Calculate statistics
      const avgSpeed = bucket.speedSum / bucket.speedCount;
      const dominantDirection = this.calculateDominantDirection(bucket.directionFrequency);

      // Save to database
      const windData = await prisma.windData1Min.create({
        data: {
          stationId: bucket.stationId,
          timestamp: bucket.intervalStart.toUTC().toISO()!,
          avgSpeed: Math.round(avgSpeed * 100) / 100, // Round to 2 decimal places
          minSpeed: bucket.minSpeed,
          maxSpeed: bucket.maxSpeed,
          dominantDirection,
          sampleCount: bucket.sampleCount,
        },
      });

      // Broadcast to SSE subscribers
      await transmit.broadcast(`wind/aggregated/1min/${bucket.stationId}`, {
        stationId: bucket.stationId,
        timestamp: windData.timestamp,
        avgSpeed: windData.avgSpeed,
        minSpeed: windData.minSpeed,
        maxSpeed: windData.maxSpeed,
        dominantDirection: windData.dominantDirection,
        sampleCount: windData.sampleCount,
      });
    } catch (error) {
      console.error('Error saving wind aggregate:', error);
    }
  }

  /**
   * Calculate dominant direction from frequency map
   */
  private calculateDominantDirection(directionFrequency: Record<number, number>): number {
    let maxFrequency = 0;
    let dominantDirection = 0;

    for (const [direction, frequency] of Object.entries(directionFrequency)) {
      if (frequency > maxFrequency) {
        maxFrequency = frequency;
        dominantDirection = parseInt(direction);
      }
    }

    return dominantDirection;
  }

  /**
   * Force save all current buckets (useful for testing or shutdown)
   */
  async forceFlushBuckets(): Promise<void> {
    for (const [bucketKey, bucket] of this.buckets.entries()) {
      await this.saveAggregatedData(bucket);
      this.buckets.delete(bucketKey);
    }
  }

  /**
   * Get current bucket count (for monitoring)
   */
  getBucketCount(): number {
    return this.buckets.size;
  }

  /**
   * Get bucket info for debugging
   */
  getBucketInfo(): Array<{ stationId: string; intervalStart: string; sampleCount: number }> {
    return Array.from(this.buckets.values()).map((bucket) => ({
      stationId: bucket.stationId,
      intervalStart: bucket.intervalStart.toISO() || 'unknown',
      sampleCount: bucket.sampleCount,
    }));
  }

  /**
   * Process 10-minute aggregation from 1-minute data
   * Called every 10 minutes by scheduled job
   */
  async process10MinuteAggregation(): Promise<void> {
    const now = DateTime.now();
    const currentIntervalStart = this.get10MinuteIntervalStart(now);

    // Process the previous 10-minute interval (not the current one)
    const intervalStart = currentIntervalStart.minus({ minutes: 10 });

    try {
      // Get all stations that have 1-minute data for the interval
      const stations = await prisma.windData1Min.groupBy({
        by: ['stationId'],
        where: {
          timestamp: {
            gte: intervalStart.toUTC().toISO()!,
            lt: intervalStart.plus({ minutes: 10 }).toUTC().toISO()!,
          },
        },
      });

      for (const station of stations) {
        await this.aggregate10MinuteData(station.stationId, intervalStart);
      }
    } catch (error) {
      console.error('Error processing 10-minute aggregation:', error);
    }
  }

  /**
   * Process the last hour's worth of 10-minute intervals
   * Useful for testing and manual backfill
   */
  async processLastHourIntervals(): Promise<void> {
    const now = DateTime.now();
    const oneHourAgo = now.minus({ hours: 1 });

    // Get all 10-minute intervals in the last hour
    const intervals: DateTime[] = [];
    let currentInterval = this.get10MinuteIntervalStart(oneHourAgo);

    while (currentInterval < now.minus({ minutes: 10 })) {
      intervals.push(currentInterval);
      currentInterval = currentInterval.plus({ minutes: 10 });
    }

    for (const interval of intervals) {
      try {
        await this.processIntervalAggregation(interval);
      } catch (error) {
        console.error(`Error processing interval ${interval.toISO()}:`, error);
      }
    }
  }

  /**
   * Process any missing 10-minute intervals from the last hour
   * Called on startup to catch up on any missed aggregations
   */
  async processRecentMissingIntervals(): Promise<void> {
    const now = DateTime.now();
    const oneHourAgo = now.minus({ hours: 1 });

    // Get all 10-minute intervals in the last hour
    const intervals: DateTime[] = [];
    let currentInterval = this.get10MinuteIntervalStart(oneHourAgo);

    while (currentInterval < now.minus({ minutes: 10 })) {
      intervals.push(currentInterval);
      currentInterval = currentInterval.plus({ minutes: 10 });
    }

    for (const interval of intervals) {
      try {
        // Check if we already have data for this interval
        const existingData = await prisma.windData10Min.findFirst({
          where: { timestamp: interval.toUTC().toISO()! },
        });

        if (!existingData) {
          // Check if we have 1-minute data for this interval
          const total = await prisma.windData1Min.count({
            where: {
              timestamp: {
                gte: interval.toUTC().toISO()!,
                lt: interval.plus({ minutes: 10 }).toUTC().toISO()!,
              },
            },
          });

          if (total > 0) {
            await this.processIntervalAggregation(interval);
          }
        }
      } catch (error) {
        console.error(`Error processing missing interval ${interval.toISO()}:`, error);
      }
    }
  }

  /**
   * Process 10-minute aggregation for a specific interval
   */
  async processIntervalAggregation(intervalStart: DateTime): Promise<void> {
    try {
      // Get all stations that have 1-minute data for the interval
      const stations = await prisma.windData1Min.groupBy({
        by: ['stationId'],
        where: {
          timestamp: {
            gte: intervalStart.toUTC().toISO()!,
            lt: intervalStart.plus({ minutes: 10 }).toUTC().toISO()!,
          },
        },
      });

      for (const station of stations) {
        await this.aggregate10MinuteData(station.stationId, intervalStart);
      }
    } catch (error) {
      console.error('Error processing interval aggregation:', error);
      throw error;
    }
  }

  /**
   * Aggregate 10-minute data for a specific station
   */
  private async aggregate10MinuteData(stationId: string, intervalStart: DateTime): Promise<void> {
    try {
      const intervalStartIso = intervalStart.toUTC().toISO()!;

      // Get 1-minute data for the 10-minute interval
      const oneMinuteData = await prisma.windData1Min.findMany({
        where: {
          stationId,
          timestamp: {
            gte: intervalStartIso,
            lt: intervalStart.plus({ minutes: 10 }).toUTC().toISO()!,
          },
        },
        orderBy: { timestamp: 'asc' },
      });

      if (oneMinuteData.length === 0) {
        return; // No data to aggregate
      }

      // Calculate aggregated statistics
      const totalSpeedSum = oneMinuteData.reduce((sum, record) => sum + record.avgSpeed, 0);
      const avgSpeed = totalSpeedSum / oneMinuteData.length;
      const minSpeed = Math.min(...oneMinuteData.map((r) => r.minSpeed));
      const maxSpeed = Math.max(...oneMinuteData.map((r) => r.maxSpeed));

      // Calculate dominant direction using frequency
      const dominantDirection = this.calculateDominantDirectionFromRecords(oneMinuteData);

      // Calculate tendency by comparing with previous 10-minute record
      const tendency = await this.calculateTendency(stationId, intervalStart, avgSpeed);

      // Create or update the record for this interval
      const windData = await prisma.windData10Min.upsert({
        where: { stationId_timestamp: { stationId, timestamp: intervalStartIso } },
        update: {
          avgSpeed: Math.round(avgSpeed * 100) / 100,
          minSpeed,
          maxSpeed,
          dominantDirection,
          tendency,
        },
        create: {
          stationId,
          timestamp: intervalStartIso,
          avgSpeed: Math.round(avgSpeed * 100) / 100,
          minSpeed,
          maxSpeed,
          dominantDirection,
          tendency,
        },
      });

      // Broadcast to SSE subscribers
      await transmit.broadcast(`wind/aggregated/10min/${stationId}`, {
        stationId,
        timestamp: windData.timestamp,
        avgSpeed: windData.avgSpeed,
        minSpeed: windData.minSpeed,
        maxSpeed: windData.maxSpeed,
        dominantDirection: windData.dominantDirection,
        tendency: windData.tendency,
      });
    } catch (error) {
      console.error(`Error aggregating 10-minute data for station ${stationId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate dominant direction from 1-minute records
   */
  private calculateDominantDirectionFromRecords(records: WindData1MinModel[]): number {
    const directionFrequency: Record<number, number> = {};

    for (const record of records) {
      const direction = Math.round(record.dominantDirection);
      directionFrequency[direction] = (directionFrequency[direction] || 0) + 1;
    }

    return this.calculateDominantDirection(directionFrequency);
  }

  /**
   * Calculate tendency by comparing with previous 10-minute interval
   */
  private async calculateTendency(
    stationId: string,
    currentInterval: DateTime,
    currentAvg: number,
  ): Promise<WindTendency> {
    const threshold = 0.5; // m/s

    // Get previous 10-minute record
    const previousRecord = await prisma.windData10Min.findFirst({
      where: { stationId, timestamp: { lt: currentInterval.toUTC().toISO()! } },
      orderBy: { timestamp: 'desc' },
    });

    if (!previousRecord) {
      return 'stable'; // First record
    }

    const previousAvg = previousRecord.avgSpeed;

    if (currentAvg > previousAvg + threshold) {
      return 'increasing';
    } else if (currentAvg < previousAvg - threshold) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * Get the start of the 10-minute interval for a given timestamp
   */
  private get10MinuteIntervalStart(timestamp: DateTime): DateTime {
    const minute = Math.floor(timestamp.minute / 10) * 10;
    return timestamp.startOf('minute').set({ minute });
  }

  /**
   * Start periodic timer to flush completed buckets
   */
  private startFlushTimer(): void {
    if (this.flushTimer) return; // Timer already running

    // Run every 30 seconds to check for completed intervals
    this.flushTimer = setInterval(async () => {
      await this.checkAndSaveCompletedIntervals();
    }, 30 * 1000); // 30 seconds

    console.log('Wind aggregation flush timer started');
  }

  /**
   * Stop the periodic flush timer
   */
  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
      console.log('Wind aggregation flush timer stopped');
    }
  }

  /**
   * Recalculate tendencies for existing 10-minute records
   * This is useful when records were created out of order or tendencies need updating
   */
  async recalculateTendencies(stationId?: string): Promise<void> {
    try {
      // Get all 10-minute records, optionally filtered by station
      const records = await prisma.windData10Min.findMany({
        where: stationId ? { stationId } : undefined,
        orderBy: { timestamp: 'asc' },
      });

      // Group by station for processing
      const recordsByStation = new Map<string, typeof records>();
      for (const record of records) {
        if (!recordsByStation.has(record.stationId)) {
          recordsByStation.set(record.stationId, []);
        }
        recordsByStation.get(record.stationId)!.push(record);
      }

      // Process each station's records in chronological order
      for (const [station, stationRecords] of recordsByStation.entries()) {
        for (let i = 0; i < stationRecords.length; i++) {
          const currentRecord = stationRecords[i];
          const previousRecord = i > 0 ? stationRecords[i - 1] : null;

          let newTendency: WindTendency = 'stable';

          if (previousRecord) {
            const threshold = 0.5; // m/s
            const currentAvg = currentRecord.avgSpeed;
            const previousAvg = previousRecord.avgSpeed;

            if (currentAvg > previousAvg + threshold) {
              newTendency = 'increasing';
            } else if (currentAvg < previousAvg - threshold) {
              newTendency = 'decreasing';
            } else {
              newTendency = 'stable';
            }
          }

          // Update the record if tendency changed
          if (currentRecord.tendency !== newTendency) {
            await prisma.windData10Min.update({
              where: { id: currentRecord.id },
              data: { tendency: newTendency },
            });
            console.log(
              `Updated tendency for ${station} at ${currentRecord.timestamp}: ${currentRecord.tendency} -> ${newTendency}`,
            );
          }
        }
      }

      console.log('Tendency recalculation completed');
    } catch (error) {
      console.error('Error recalculating tendencies:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const windAggregationService = new WindAggregationService();
