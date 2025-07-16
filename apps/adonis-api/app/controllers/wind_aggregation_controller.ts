import type { HttpContext } from '@adonisjs/core/http'
import { windAggregationService } from '#services/wind_aggregation_service'

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
}
