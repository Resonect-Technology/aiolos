import { DateTime } from 'luxon'

/**
 * Universal DateTime Service for Aiolos
 * 
 * This service provides consistent, timezone-aware datetime handling
 * across the entire application, solving timestamp query issues.
 * 
 * Key Features:
 * - Always works in UTC for database operations
 * - Provides consistent string formatting for queries
 * - Handles timezone conversion properly
 * - Universal compatibility across database systems
 */
export class UniversalDateTimeService {
    /**
     * Get current UTC time as DateTime
     */
    static now(): DateTime {
        return DateTime.utc()
    }

    /**
     * Create DateTime from various inputs, always in UTC
     */
    static fromInput(input: string | DateTime | Date): DateTime {
        if (input instanceof DateTime) {
            return input.setZone('utc')
        }
        if (input instanceof Date) {
            return DateTime.fromJSDate(input, { zone: 'utc' })
        }
        return DateTime.fromISO(input, { zone: 'utc' })
    }

    /**
     * Convert DateTime to universal database format (ISO string)
     * This format works consistently across all database systems
     */
    static toDatabaseFormat(dateTime: DateTime): string {
        return dateTime.setZone('utc').toISO()!
    }

    /**
     * Convert DateTime to SQL-friendly format for queries
     * Works universally with SQLite, PostgreSQL, MySQL
     */
    static toQueryFormat(dateTime: DateTime): string {
        return dateTime.setZone('utc').toISO()!
    }

    /**
     * Create interval boundaries for aggregation queries
     * Always returns UTC DateTimes aligned to interval boundaries
     */
    static createIntervalBoundaries(
        intervalType: '1min' | '10min' | '1hour',
        targetTime?: DateTime
    ): { start: DateTime; end: DateTime } {
        const time = targetTime || this.now()
        const utcTime = time.setZone('utc')

        let start: DateTime
        let end: DateTime

        switch (intervalType) {
            case '1min':
                start = utcTime.startOf('minute')
                end = start.plus({ minutes: 1 })
                break
            case '10min':
                // Align to 10-minute boundaries (00, 10, 20, 30, 40, 50)
                const minute = Math.floor(utcTime.minute / 10) * 10
                start = utcTime.startOf('hour').plus({ minutes: minute })
                end = start.plus({ minutes: 10 })
                break
            case '1hour':
                start = utcTime.startOf('hour')
                end = start.plus({ hours: 1 })
                break
            default:
                throw new Error(`Unsupported interval type: ${intervalType}`)
        }

        return { start, end }
    }

    /**
     * Create time range for aggregation queries
     * Returns properly formatted strings for database queries
     */
    static createTimeRange(
        start: DateTime,
        end: DateTime
    ): { startQuery: string; endQuery: string } {
        return {
            startQuery: this.toQueryFormat(start),
            endQuery: this.toQueryFormat(end),
        }
    }

    /**
     * Generate intervals for catchup operations
     * Returns array of interval boundaries
     */
    static generateIntervals(
        intervalType: '1min' | '10min' | '1hour',
        startTime: DateTime,
        endTime: DateTime
    ): Array<{ start: DateTime; end: DateTime }> {
        const intervals: Array<{ start: DateTime; end: DateTime }> = []
        let current = startTime.setZone('utc')
        const endUtc = endTime.setZone('utc')

        while (current < endUtc) {
            const boundaries = this.createIntervalBoundaries(intervalType, current)

            // Only add if the interval start is before our end time
            if (boundaries.start < endUtc) {
                intervals.push(boundaries)
            }

            // Move to next interval
            switch (intervalType) {
                case '1min':
                    current = current.plus({ minutes: 1 })
                    break
                case '10min':
                    current = current.plus({ minutes: 10 })
                    break
                case '1hour':
                    current = current.plus({ hours: 1 })
                    break
            }
        }

        return intervals
    }

    /**
     * Format datetime for human-readable display
     */
    static toDisplayFormat(dateTime: DateTime, timeZone: string = 'utc'): string {
        return dateTime.setZone(timeZone).toFormat('yyyy-MM-dd HH:mm:ss ZZZZ')
    }

    /**
     * Parse timestamp from database string format
     */
    static fromDatabaseFormat(isoString: string): DateTime {
        return DateTime.fromISO(isoString, { zone: 'utc' })
    }
}

export default UniversalDateTimeService
