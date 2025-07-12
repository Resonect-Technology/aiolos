import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import { windAggregationService } from '#app/services/wind_aggregation_service'

export default class WindOneMinutesController {
  /**
   * Get 1-minute wind data for a station
   * 
   * @param {HttpContext} ctx - HTTP context
   * @returns {Promise<object>} List of 1-minute wind data points
   */
  async index({ params, request, response }: HttpContext) {
    const { station_id } = params
    const { from, to, limit } = request.qs()

    try {
      // Parse optional date parameters
      const fromTime = from ? DateTime.fromISO(from) : undefined
      const toTime = to ? DateTime.fromISO(to) : undefined
      const dataLimit = limit ? parseInt(limit) : 100

      // Validate limit
      if (dataLimit > 1000) {
        return response.badRequest({ error: 'Limit cannot exceed 1000' })
      }

      // Get 1-minute data
      const windData = await windAggregationService.getOneMinuteData(
        station_id,
        fromTime,
        toTime,
        dataLimit
      )

      return {
        stationId: station_id,
        data: windData.map(record => ({
          id: record.id,
          intervalStart: record.intervalStart.toISO(),
          avgWindSpeed: record.avgWindSpeed,
          minWindSpeed: record.minWindSpeed,
          maxWindSpeed: record.maxWindSpeed,
          avgWindDirection: record.avgWindDirection,
          createdAt: record.createdAt.toISO(),
        })),
        count: windData.length,
        ...(fromTime && { fromTime: fromTime.toISO() }),
        ...(toTime && { toTime: toTime.toISO() }),
      }
    } catch (error) {
      return response.badRequest({ error: 'Invalid request parameters' })
    }
  }

  /**
   * Get latest 1-minute wind data for a station
   * 
   * @param {HttpContext} ctx - HTTP context
   * @returns {Promise<object>} Latest 1-minute wind data point
   */
  async latest({ params, response }: HttpContext) {
    const { station_id } = params

    try {
      // Get latest 1-minute data
      const latestData = await windAggregationService.getOneMinuteData(station_id, undefined, undefined, 1)
      
      if (latestData.length === 0) {
        return response.notFound({ error: 'No 1-minute wind data found for this station' })
      }

      const record = latestData[0]
      return {
        stationId: station_id,
        data: {
          id: record.id,
          intervalStart: record.intervalStart.toISO(),
          avgWindSpeed: record.avgWindSpeed,
          minWindSpeed: record.minWindSpeed,
          maxWindSpeed: record.maxWindSpeed,
          avgWindDirection: record.avgWindDirection,
          createdAt: record.createdAt.toISO(),
        },
      }
    } catch (error) {
      return response.internalServerError({ error: 'Failed to retrieve latest wind data' })
    }
  }
}