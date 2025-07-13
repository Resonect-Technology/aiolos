import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import WindData1Min from '#models/wind_data_1_min'

/**
 * Controller for aggregated wind data endpoints
 */
export default class WindAggregatedController {
  /**
   * Get 1-minute aggregated wind data for a station
   * 
   * GET /api/stations/:station_id/wind/aggregated?interval=1min&date=YYYY-MM-DD
   */
  async index({ params, request, response }: HttpContext) {
    const { station_id } = params
    const { interval, date, limit } = request.qs()

    // Validate interval parameter
    if (interval !== '1min') {
      return response.badRequest({
        error: 'Invalid interval. Only "1min" is supported currently.'
      })
    }

    // Parse and validate limit parameter
    const recordLimit = limit ? parseInt(limit) : 10
    if (recordLimit < 1 || recordLimit > 1440) {
      return response.badRequest({
        error: 'Invalid limit. Must be between 1 and 1440.'
      })
    }

    // Parse and validate date
    let queryDate: DateTime
    if (date) {
      queryDate = DateTime.fromISO(date)
      if (!queryDate.isValid) {
        return response.badRequest({
          error: 'Invalid date format. Use YYYY-MM-DD format.'
        })
      }
    } else {
      queryDate = DateTime.now()
    }

    try {
      // Query aggregated data for the specified date
      const startOfDay = queryDate.startOf('day')
      const endOfDay = queryDate.endOf('day')

      const aggregatedData = await WindData1Min.query()
        .where('stationId', station_id)
        .where('timestamp', '>=', startOfDay.toJSDate())
        .where('timestamp', '<=', endOfDay.toJSDate())
        .orderBy('timestamp', 'desc')
        .limit(recordLimit)

      // Format response data (reverse to get chronological order)
      const formattedData = aggregatedData.reverse().map(record => ({
        timestamp: record.timestamp.toISO(),
        avgSpeed: record.avgSpeed,
        minSpeed: record.minSpeed,
        maxSpeed: record.maxSpeed,
        dominantDirection: record.dominantDirection,
        sampleCount: record.sampleCount,
      }))

      return {
        stationId: station_id,
        date: queryDate.toISODate(),
        interval: '1min',
        data: formattedData,
        totalRecords: formattedData.length,
      }
    } catch (error) {
      console.error('Error fetching aggregated wind data:', error)
      return response.internalServerError({
        error: 'Failed to fetch aggregated wind data'
      })
    }
  }

  /**
   * Get latest 1-minute aggregated wind data for a station
   * 
   * GET /api/stations/:station_id/wind/aggregated/latest
   */
  async latest({ params, response }: HttpContext) {
    const { station_id } = params

    try {
      const latestData = await WindData1Min.query()
        .where('stationId', station_id)
        .orderBy('timestamp', 'desc')
        .first()

      if (!latestData) {
        return response.notFound({
          error: 'No aggregated wind data found for this station'
        })
      }

      return {
        stationId: station_id,
        timestamp: latestData.timestamp.toISO(),
        avgSpeed: latestData.avgSpeed,
        minSpeed: latestData.minSpeed,
        maxSpeed: latestData.maxSpeed,
        dominantDirection: latestData.dominantDirection,
        sampleCount: latestData.sampleCount,
      }
    } catch (error) {
      console.error('Error fetching latest aggregated wind data:', error)
      return response.internalServerError({
        error: 'Failed to fetch latest aggregated wind data'
      })
    }
  }

  /**
   * Get aggregated wind data with unit conversion
   * 
   * GET /api/stations/:station_id/wind/aggregated/converted?interval=1min&date=YYYY-MM-DD&unit=kmh|knots|ms
   */
  async converted({ params, request, response }: HttpContext) {
    const { station_id } = params
    const { interval, date, unit = 'ms', limit } = request.qs()

    // Validate interval parameter
    if (interval !== '1min') {
      return response.badRequest({
        error: 'Invalid interval. Only "1min" is supported currently.'
      })
    }

    // Validate unit parameter
    const validUnits = ['ms', 'kmh', 'knots']
    if (!validUnits.includes(unit)) {
      return response.badRequest({
        error: `Invalid unit. Supported units: ${validUnits.join(', ')}`
      })
    }

    // Parse and validate limit parameter
    const recordLimit = limit ? parseInt(limit) : 10
    if (recordLimit < 1 || recordLimit > 1440) {
      return response.badRequest({
        error: 'Invalid limit. Must be between 1 and 1440.'
      })
    }

    // Parse and validate date
    let queryDate: DateTime
    if (date) {
      queryDate = DateTime.fromISO(date)
      if (!queryDate.isValid) {
        return response.badRequest({
          error: 'Invalid date format. Use YYYY-MM-DD format.'
        })
      }
    } else {
      queryDate = DateTime.now()
    }

    try {
      // Query aggregated data for the specified date
      const startOfDay = queryDate.startOf('day')
      const endOfDay = queryDate.endOf('day')

      const aggregatedData = await WindData1Min.query()
        .where('stationId', station_id)
        .where('timestamp', '>=', startOfDay.toJSDate())
        .where('timestamp', '<=', endOfDay.toJSDate())
        .orderBy('timestamp', 'desc')
        .limit(recordLimit)

      // Convert speeds based on unit
      const convertSpeed = (speedMs: number): number => {
        switch (unit) {
          case 'kmh':
            return Math.round(speedMs * 3.6 * 100) / 100 // m/s to km/h
          case 'knots':
            return Math.round(speedMs * 1.94384 * 100) / 100 // m/s to knots
          case 'ms':
          default:
            return speedMs
        }
      }

      // Format response data with unit conversion (reverse to get chronological order)
      const formattedData = aggregatedData.reverse().map(record => ({
        timestamp: record.timestamp.toISO(),
        avgSpeed: convertSpeed(record.avgSpeed),
        minSpeed: convertSpeed(record.minSpeed),
        maxSpeed: convertSpeed(record.maxSpeed),
        dominantDirection: record.dominantDirection,
        sampleCount: record.sampleCount,
      }))

      return {
        stationId: station_id,
        date: queryDate.toISODate(),
        interval: '1min',
        unit,
        data: formattedData,
        totalRecords: formattedData.length,
      }
    } catch (error) {
      console.error('Error fetching converted aggregated wind data:', error)
      return response.internalServerError({
        error: 'Failed to fetch aggregated wind data'
      })
    }
  }
}