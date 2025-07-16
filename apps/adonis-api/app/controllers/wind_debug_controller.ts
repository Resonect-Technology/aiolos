import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import WindData1Min from '#models/wind_data_1_min'
import WindData10Min from '#models/wind_data_10_min'
import { windAggregationService } from '#services/wind_aggregation_service'

/**
 * Controller for debugging wind aggregation
 */
export default class WindDebugController {
    /**
     * Get debug info about wind data
     * 
     * GET /api/wind/debug/:station_id
     */
    async debug({ params, response }: HttpContext) {
        const { station_id } = params

        try {
            // Get last 10 1-minute records
            const oneMinRecords = await WindData1Min.query()
                .where('stationId', station_id)
                .orderBy('timestamp', 'desc')
                .limit(10)

            // Get last 10 10-minute records
            const tenMinRecords = await WindData10Min.query()
                .where('stationId', station_id)
                .orderBy('timestamp', 'desc')
                .limit(10)

            // Get aggregation service status
            const bucketCount = windAggregationService.getBucketCount()
            const bucketInfo = windAggregationService.getBucketInfo()

            // Calculate current and next 10-minute intervals
            const now = DateTime.now()
            const currentInterval = this.get10MinuteIntervalStart(now)
            const nextInterval = currentInterval.plus({ minutes: 10 })

            return response.ok({
                stationId: station_id,
                timestamp: now.toISO(),
                currentInterval: currentInterval.toISO(),
                nextInterval: nextInterval.toISO(),
                oneMinuteData: {
                    count: oneMinRecords.length,
                    latest: oneMinRecords[0]?.timestamp.toISO() || null,
                    records: oneMinRecords.map(r => ({
                        timestamp: r.timestamp.toISO(),
                        avgSpeed: r.avgSpeed,
                        sampleCount: r.sampleCount
                    }))
                },
                tenMinuteData: {
                    count: tenMinRecords.length,
                    latest: tenMinRecords[0]?.timestamp.toISO() || null,
                    records: tenMinRecords.map(r => ({
                        timestamp: r.timestamp.toISO(),
                        avgSpeed: r.avgSpeed,
                        tendency: r.tendency
                    }))
                },
                aggregationService: {
                    bucketCount,
                    bucketInfo
                }
            })
        } catch (error) {
            console.error('Error getting debug info:', error)

            return response.internalServerError({
                error: 'Failed to get debug info'
            })
        }
    }

    /**
     * Create mock 1-minute data for testing
     * 
     * POST /api/wind/debug/:station_id/create-mock-data
     */
    async createMockData({ params, response }: HttpContext) {
        const { station_id } = params

        try {
            const now = DateTime.now()
            const records = []

            // Create 1-minute records for the last 70 minutes (to cover multiple 10-minute intervals)
            for (let i = 70; i >= 1; i--) {
                const timestamp = now.minus({ minutes: i }).startOf('minute')

                // Generate mock wind data
                const avgSpeed = 5 + Math.sin(i * 0.1) * 3 + Math.random() * 2
                const minSpeed = Math.max(0, avgSpeed - 1 - Math.random())
                const maxSpeed = avgSpeed + 1 + Math.random() * 2
                const dominantDirection = Math.floor(Math.random() * 360)

                const record = await WindData1Min.create({
                    stationId: station_id,
                    timestamp,
                    avgSpeed: Math.round(avgSpeed * 100) / 100,
                    minSpeed: Math.round(minSpeed * 100) / 100,
                    maxSpeed: Math.round(maxSpeed * 100) / 100,
                    dominantDirection,
                    sampleCount: 10 + Math.floor(Math.random() * 50)
                })

                records.push(record)
            }

            return response.ok({
                message: `Created ${records.length} mock 1-minute records for station ${station_id}`,
                records: records.length
            })
        } catch (error) {
            console.error('Error creating mock data:', error)

            return response.internalServerError({
                error: 'Failed to create mock data'
            })
        }
    }

    /**
     * Get the start of the 10-minute interval for a given timestamp
     */
    private get10MinuteIntervalStart(timestamp: DateTime): DateTime {
        const minute = Math.floor(timestamp.minute / 10) * 10
        return timestamp.startOf('minute').set({ minute })
    }
}
