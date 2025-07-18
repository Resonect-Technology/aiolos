import type { HttpContext } from '@adonisjs/core/http'
import { windAggregationService } from '#services/wind_aggregation_service'
import WindData1Min from '#models/wind_data_1_min'
import { DateTime } from 'luxon'

/**
 * Controller for managing wind aggregation processes
 */
export default class WindAggregationController {
    /**
     * Manually trigger 10-minute aggregation
     * 
     * POST /api/wind/aggregation/10min/trigger
     */
    async trigger10MinAggregation({ response }: HttpContext) {
        try {
            await windAggregationService.process10MinuteAggregation()

            return response.ok({
                message: '10-minute aggregation triggered successfully'
            })
        } catch (error) {
            console.error('Error triggering 10-minute aggregation:', error)

            return response.internalServerError({
                error: 'Failed to trigger 10-minute aggregation'
            })
        }
    }

    /**
     * Manually trigger processing of the last hour's 10-minute intervals
     * 
     * POST /api/wind/aggregation/10min/process-last-hour
     */
    async processLastHour({ response }: HttpContext) {
        try {
            await windAggregationService.processLastHourIntervals()

            return response.ok({
                message: 'Last hour 10-minute intervals processed successfully'
            })
        } catch (error) {
            console.error('Error processing last hour intervals:', error)

            return response.internalServerError({
                error: 'Failed to process last hour intervals'
            })
        }
    }

    /**
     * Force process any missing recent 10-minute intervals
     * 
     * POST /api/wind/aggregation/10min/force-catchup
     */
    async forceCatchup({ response }: HttpContext) {
        try {
            // Force process the main aggregation which now includes catchup logic
            await windAggregationService.process10MinuteAggregation()

            return response.ok({
                message: 'Force catchup completed - missing 10-minute intervals processed'
            })
        } catch (error) {
            console.error('Error in force catchup:', error)

            return response.internalServerError({
                error: 'Failed to complete force catchup'
            })
        }
    }

    /**
     * Get aggregation service status
     * 
     * GET /api/wind/aggregation/status
     */
    async status({ response }: HttpContext) {
        try {
            const bucketCount = windAggregationService.getBucketCount()
            const bucketInfo = windAggregationService.getBucketInfo()

            return response.ok({
                bucketCount,
                bucketInfo,
                message: 'Wind aggregation service is running'
            })
        } catch (error) {
            console.error('Error getting aggregation status:', error)

            return response.internalServerError({
                error: 'Failed to get aggregation status'
            })
        }
    }

    /**
     * Debug endpoint to test specific 10-minute aggregation queries
     * 
     * POST /api/debug/test-10min-query
     */
    async test10MinQuery({ response }: HttpContext) {
        try {
            console.log('🔍 Testing 10-minute query approaches...')

            const station = 'vasiliki-001'
            const now = DateTime.now()
            const tenMinutesAgo = now.minus({ minutes: 10 })

            console.log(`Station: ${station}`)
            console.log(`Now: ${now.toISO()}`)
            console.log(`10 minutes ago: ${tenMinutesAgo.toISO()}`)

            // Test 1: Station ID only (camelCase) - SHOULD WORK
            const stationCountResult = await WindData1Min.query().where('stationId', station).count('* as total')
            const stationCount = stationCountResult[0].$extras.total
            console.log(`1. Station ID (camelCase): ${stationCount} records`)

            // Test 2: Get sample record to see actual timestamp format
            const sampleRecord = await WindData1Min.query().where('stationId', station).first()
            console.log(`Sample record timestamp: ${sampleRecord?.timestamp.toISO()}`)
            console.log(`Sample record timestamp SQL: ${sampleRecord?.timestamp.toSQL()}`)

            // Test 3: Try different DateTime formatting approaches
            const isoCountResult = await WindData1Min.query()
                .where('stationId', station)
                .where('timestamp', '>=', tenMinutesAgo.toISO())
                .count('* as total')
            const isoCount = isoCountResult[0].$extras.total
            console.log(`3. ISO format: ${isoCount} records`)

            const sqlCountResult = await WindData1Min.query()
                .where('stationId', station)
                .where('timestamp', '>=', tenMinutesAgo.toSQL())
                .count('* as total')
            const sqlCount = sqlCountResult[0].$extras.total
            console.log(`4. SQL format: ${sqlCount} records`)

            // Test 5: Try raw DateTime object converted to JSDate
            const rawCountResult = await WindData1Min.query()
                .where('stationId', station)
                .where('timestamp', '>=', tenMinutesAgo.toJSDate())
                .count('* as total')
            const rawCount = rawCountResult[0].$extras.total
            console.log(`5. JSDate format: ${rawCount} records`)

            // Test 6: Try plain string format
            const plainCountResult = await WindData1Min.query()
                .where('stationId', station)
                .where('timestamp', '>=', '2025-01-17 12:00:00')
                .count('* as total')
            const plainCount = plainCountResult[0].$extras.total
            console.log(`6. Plain string: ${plainCount} records`)

            // Test 7: Check what the actual database sees with a raw query
            const db = (await import('@adonisjs/lucid/services/db')).default

            const rawResult = await db.rawQuery(
                'SELECT COUNT(*) as count FROM wind_data_1min WHERE station_id = ? AND timestamp >= ?',
                [station, tenMinutesAgo.toSQL()]
            )
            console.log(`7. Raw SQL query result:`, rawResult)

            // Different databases return results differently
            let rawQueryCount = 0
            if (rawResult.rows && rawResult.rows[0]) {
                rawQueryCount = rawResult.rows[0].count || rawResult.rows[0][0]
            } else if (Array.isArray(rawResult) && rawResult[0]) {
                rawQueryCount = rawResult[0].count || rawResult[0][0]
            }
            console.log(`7. Raw SQL query count: ${rawQueryCount} records`)

            return response.ok({
                success: true,
                sampleTimestamp: sampleRecord?.timestamp.toISO(),
                tests: {
                    stationIdCamelCase: stationCount,
                    isoFormat: isoCount,
                    sqlFormat: sqlCount,
                    jsDateFormat: rawCount,
                    plainString: plainCount,
                    rawSqlQuery: rawQueryCount,
                },
            })
        } catch (error) {
            console.error('❌ Test query failed:', error)
            return response.internalServerError({
                success: false,
                error: error.message,
            })
        }
    }

    /**
     * Recalculate tendencies for existing 10-minute records
     * 
     * POST /api/wind/aggregation/recalculate-tendencies
     */
    async recalculateTendencies({ request, response }: HttpContext) {
        try {
            const { stationId } = request.qs()

            await windAggregationService.recalculateTendencies(stationId)

            return response.ok({
                message: 'Tendencies recalculated successfully',
                stationId: stationId || 'all stations'
            })
        } catch (error) {
            console.error('Error recalculating tendencies:', error)

            return response.internalServerError({
                error: 'Failed to recalculate tendencies',
                details: error.message
            })
        }
    }
}
