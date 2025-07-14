import type { HttpContext } from '@adonisjs/core/http'
import { DateTime } from 'luxon'
import WindData1Min from '#models/wind_data_1_min'
import WindData10Min from '#models/wind_data_10_min'
import WindDataHourly from '#models/wind_data_hourly'

/**
 * Controller for aggregated wind data endpoints
 */
export default class WindAggregatedController {
  /**
   * Get aggregated wind data for a station
   * 
   * GET /api/stations/:station_id/wind/aggregated?interval=1min|10min|hourly&date=YYYY-MM-DD&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=10
   */
  async index({ params, request, response }: HttpContext) {
    const { station_id } = params
    const { interval = '1min', date, from, to, limit } = request.qs()

    // Validate interval parameter
    if (!['1min', '10min', 'hourly'].includes(interval)) {
      return response.badRequest({
        error: 'Invalid interval. Supported intervals: 1min, 10min, hourly'
      })
    }

    // Handle date range vs single date
    if (from && to) {
      if (date) {
        return response.badRequest({
          error: 'Cannot specify both date and date range (from/to)'
        })
      }
      
      // Validate date range
      const fromDate = DateTime.fromISO(from)
      const toDate = DateTime.fromISO(to)
      
      if (!fromDate.isValid || !toDate.isValid) {
        return response.badRequest({
          error: 'Invalid date format. Use YYYY-MM-DD format for from/to dates.'
        })
      }
      
      if (fromDate > toDate) {
        return response.badRequest({
          error: 'From date must be before or equal to to date'
        })
      }
      
      // Check maximum range (31 days for hourly as per requirements)
      const daysDiff = toDate.diff(fromDate, 'days').days
      if (interval === 'hourly' && daysDiff > 31) {
        return response.badRequest({
          error: 'Maximum 31 days per request for hourly interval'
        })
      }
    }

    // Set default limits based on interval
    let defaultLimit: number
    let maxLimit: number
    
    if (interval === 'hourly') {
      defaultLimit = 24 // 24 hours for daily view
      maxLimit = 744 // 31 days * 24 hours
    } else if (interval === '10min') {
      defaultLimit = 6
      maxLimit = 144
    } else {
      defaultLimit = 10
      maxLimit = 1440
    }
    
    // Parse and validate limit parameter
    const recordLimit = limit ? parseInt(limit) : defaultLimit
    if (recordLimit < 1 || recordLimit > maxLimit) {
      return response.badRequest({
        error: `Invalid limit. Must be between 1 and ${maxLimit} for ${interval} interval.`
      })
    }

    try {
      if (interval === 'hourly') {
        return await this.getHourlyData(station_id, date, from, to, recordLimit)
      } else if (interval === '10min') {
        return await this.get10MinuteData(station_id, date, recordLimit)
      } else {
        return await this.get1MinuteData(station_id, date, recordLimit)
      }
    } catch (error) {
      console.error('Error fetching aggregated wind data:', error)
      
      // Handle specific validation errors
      if (error.message && error.message.includes('Invalid date format')) {
        return response.badRequest({
          error: error.message
        })
      }
      
      return response.internalServerError({
        error: 'Failed to fetch aggregated wind data'
      })
    }
  }

  /**
   * Get 1-minute aggregated data
   */
  private async get1MinuteData(stationId: string, date: string | undefined, recordLimit: number) {
    let aggregatedData
    let responseDate: string

    if (date) {
      // Date-specific query: get data for the specified date
      const queryDate = DateTime.fromISO(date)
      if (!queryDate.isValid) {
        throw new Error('Invalid date format. Use YYYY-MM-DD format.')
      }

      const startOfDay = queryDate.startOf('day')
      const endOfDay = queryDate.endOf('day')

      aggregatedData = await WindData1Min.query()
        .where('stationId', stationId)
        .where('timestamp', '>=', startOfDay.toJSDate())
        .where('timestamp', '<=', endOfDay.toJSDate())
        .orderBy('timestamp', 'desc')
        .limit(recordLimit)

      responseDate = queryDate.toISODate()!
    } else {
      // Latest data query: get most recent records regardless of date
      aggregatedData = await WindData1Min.query()
        .where('stationId', stationId)
        .orderBy('timestamp', 'desc')
        .limit(recordLimit)

      responseDate = DateTime.now().toISODate()!
    }

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
      stationId,
      date: responseDate,
      interval: '1min',
      data: formattedData,
      totalRecords: formattedData.length,
    }
  }

  /**
   * Get 10-minute aggregated data
   */
  private async get10MinuteData(stationId: string, date: string | undefined, recordLimit: number) {
    let aggregatedData
    let responseDate: string

    if (date) {
      // Date-specific query: get data for the specified date
      const queryDate = DateTime.fromISO(date)
      if (!queryDate.isValid) {
        throw new Error('Invalid date format. Use YYYY-MM-DD format.')
      }

      aggregatedData = await WindData10Min.query()
        .where('stationId', stationId)
        .where('timestamp', '>=', queryDate.startOf('day').toJSDate())
        .where('timestamp', '<=', queryDate.endOf('day').toJSDate())
        .orderBy('timestamp', 'desc')
        .limit(recordLimit)

      responseDate = queryDate.toISODate()!
    } else {
      // Latest data query: get most recent records regardless of date
      aggregatedData = await WindData10Min.query()
        .where('stationId', stationId)
        .orderBy('timestamp', 'desc')
        .limit(recordLimit)

      responseDate = DateTime.now().toISODate()!
    }

    // Format response data (reverse to get chronological order)
    const formattedData = aggregatedData.reverse().map(record => ({
      timestamp: record.timestamp.toISO(),
      avgSpeed: record.avgSpeed,
      minSpeed: record.minSpeed,
      maxSpeed: record.maxSpeed,
      dominantDirection: record.dominantDirection,
      tendency: record.tendency,
    }))

    return {
      stationId,
      date: responseDate,
      interval: '10min',
      data: formattedData,
      totalRecords: formattedData.length,
    }
  }

  /**
   * Get hourly aggregated data
   */
  private async getHourlyData(stationId: string, date: string | undefined, from: string | undefined, to: string | undefined, recordLimit: number) {
    let aggregatedData
    let responseDate: string
    let isDateRange = false

    if (from && to) {
      // Date range query
      const fromDate = DateTime.fromISO(from).startOf('day')
      const toDate = DateTime.fromISO(to).endOf('day')

      aggregatedData = await WindDataHourly.query()
        .where('stationId', stationId)
        .where('timestamp', '>=', fromDate.toJSDate())
        .where('timestamp', '<=', toDate.toJSDate())
        .orderBy('timestamp', 'desc')
        .limit(recordLimit)

      responseDate = `${from} to ${to}`
      isDateRange = true
    } else if (date) {
      // Single date query
      const queryDate = DateTime.fromISO(date)
      if (!queryDate.isValid) {
        throw new Error('Invalid date format. Use YYYY-MM-DD format.')
      }

      const startOfDay = queryDate.startOf('day')
      const endOfDay = queryDate.endOf('day')

      aggregatedData = await WindDataHourly.query()
        .where('stationId', stationId)
        .where('timestamp', '>=', startOfDay.toJSDate())
        .where('timestamp', '<=', endOfDay.toJSDate())
        .orderBy('timestamp', 'desc')
        .limit(recordLimit)

      responseDate = queryDate.toISODate()!
    } else {
      // Latest data query
      aggregatedData = await WindDataHourly.query()
        .where('stationId', stationId)
        .orderBy('timestamp', 'desc')
        .limit(recordLimit)

      responseDate = DateTime.now().toISODate()!
    }

    // Format response data (reverse to get chronological order for single date/latest)
    const formattedData = (isDateRange ? aggregatedData : aggregatedData.reverse()).map(record => ({
      timestamp: record.timestamp.toISO(),
      avgSpeed: record.avgSpeed,
      minSpeed: record.minSpeed,
      maxSpeed: record.maxSpeed,
      dominantDirection: record.dominantDirection,
      tendency: record.tendency,
      gustSpeed: record.gustSpeed,
      calmPeriods: record.calmPeriods,
    }))

    return {
      stationId,
      date: responseDate,
      interval: 'hourly',
      data: formattedData,
      totalRecords: formattedData.length,
    }
  }

  /**
   * Get latest aggregated wind data for a station
   * 
   * GET /api/stations/:station_id/wind/aggregated/latest?interval=1min|10min|hourly
   */
  async latest({ params, request, response }: HttpContext) {
    const { station_id } = params
    const { interval = '1min' } = request.qs()

    // Validate interval parameter
    if (!['1min', '10min', 'hourly'].includes(interval)) {
      return response.badRequest({
        error: 'Invalid interval. Supported intervals: 1min, 10min, hourly'
      })
    }

    try {
      if (interval === 'hourly') {
        const latestData = await WindDataHourly.query()
          .where('stationId', station_id)
          .orderBy('timestamp', 'desc')
          .first()

        if (!latestData) {
          return response.notFound({
            error: 'No hourly aggregated wind data found for this station'
          })
        }

        return {
          stationId: station_id,
          timestamp: latestData.timestamp.toISO(),
          avgSpeed: latestData.avgSpeed,
          minSpeed: latestData.minSpeed,
          maxSpeed: latestData.maxSpeed,
          dominantDirection: latestData.dominantDirection,
          tendency: latestData.tendency,
          gustSpeed: latestData.gustSpeed,
          calmPeriods: latestData.calmPeriods,
          interval: 'hourly',
        }
      } else if (interval === '10min') {
        const latestData = await WindData10Min.query()
          .where('stationId', station_id)
          .orderBy('timestamp', 'desc')
          .first()

        if (!latestData) {
          return response.notFound({
            error: 'No 10-minute aggregated wind data found for this station'
          })
        }

        return {
          stationId: station_id,
          timestamp: latestData.timestamp.toISO(),
          avgSpeed: latestData.avgSpeed,
          minSpeed: latestData.minSpeed,
          maxSpeed: latestData.maxSpeed,
          dominantDirection: latestData.dominantDirection,
          tendency: latestData.tendency,
          interval: '10min',
        }
      } else {
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
          interval: '1min',
        }
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
   * GET /api/stations/:station_id/wind/aggregated/converted?interval=1min|10min|hourly&date=YYYY-MM-DD&unit=kmh|knots|ms&limit=10
   */
  async converted({ params, request, response }: HttpContext) {
    const { station_id } = params
    const { interval = '1min', date, unit = 'ms', limit } = request.qs()

    // Validate interval parameter
    if (!['1min', '10min', 'hourly'].includes(interval)) {
      return response.badRequest({
        error: 'Invalid interval. Supported intervals: 1min, 10min, hourly'
      })
    }

    // Validate unit parameter
    const validUnits = ['ms', 'kmh', 'knots']
    if (!validUnits.includes(unit)) {
      return response.badRequest({
        error: `Invalid unit. Supported units: ${validUnits.join(', ')}`
      })
    }

    // Set default limits based on interval
    let defaultLimit: number
    let maxLimit: number
    
    if (interval === 'hourly') {
      defaultLimit = 24
      maxLimit = 744 // 31 days * 24 hours
    } else if (interval === '10min') {
      defaultLimit = 6
      maxLimit = 144
    } else {
      defaultLimit = 10
      maxLimit = 1440
    }
    
    // Parse and validate limit parameter
    const recordLimit = limit ? parseInt(limit) : defaultLimit
    if (recordLimit < 1 || recordLimit > maxLimit) {
      return response.badRequest({
        error: `Invalid limit. Must be between 1 and ${maxLimit} for ${interval} interval.`
      })
    }

    try {
      let aggregatedData: any[]
      let responseData: any[]
      let responseDate: string

      if (interval === 'hourly') {
        if (date) {
          // Date-specific query: get data for the specified date
          const queryDate = DateTime.fromISO(date)
          if (!queryDate.isValid) {
            return response.badRequest({
              error: 'Invalid date format. Use YYYY-MM-DD format.'
            })
          }

          aggregatedData = await WindDataHourly.query()
            .where('stationId', station_id)
            .where('timestamp', '>=', queryDate.startOf('day').toJSDate())
            .where('timestamp', '<=', queryDate.endOf('day').toJSDate())
            .orderBy('timestamp', 'desc')
            .limit(recordLimit)

          responseDate = queryDate.toISODate()!
        } else {
          // Latest data query: get most recent records regardless of date
          aggregatedData = await WindDataHourly.query()
            .where('stationId', station_id)
            .orderBy('timestamp', 'desc')
            .limit(recordLimit)

          responseDate = DateTime.now().toISODate()!
        }

        // Format response data with unit conversion (reverse to get chronological order)
        responseData = aggregatedData.reverse().map(record => ({
          timestamp: record.timestamp.toISO(),
          avgSpeed: this.convertSpeed(record.avgSpeed, unit),
          minSpeed: this.convertSpeed(record.minSpeed, unit),
          maxSpeed: this.convertSpeed(record.maxSpeed, unit),
          gustSpeed: this.convertSpeed(record.gustSpeed, unit),
          dominantDirection: record.dominantDirection,
          tendency: record.tendency,
          calmPeriods: record.calmPeriods,
        }))
      } else if (interval === '10min') {
        if (date) {
          // Date-specific query: get data for the specified date
          const queryDate = DateTime.fromISO(date)
          if (!queryDate.isValid) {
            return response.badRequest({
              error: 'Invalid date format. Use YYYY-MM-DD format.'
            })
          }

          aggregatedData = await WindData10Min.query()
            .where('stationId', station_id)
            .where('timestamp', '>=', queryDate.startOf('day').toJSDate())
            .where('timestamp', '<=', queryDate.endOf('day').toJSDate())
            .orderBy('timestamp', 'desc')
            .limit(recordLimit)

          responseDate = queryDate.toISODate()!
        } else {
          // Latest data query: get most recent records regardless of date
          aggregatedData = await WindData10Min.query()
            .where('stationId', station_id)
            .orderBy('timestamp', 'desc')
            .limit(recordLimit)

          responseDate = DateTime.now().toISODate()!
        }

        // Format response data with unit conversion (reverse to get chronological order)
        responseData = aggregatedData.reverse().map(record => ({
          timestamp: record.timestamp.toISO(),
          avgSpeed: this.convertSpeed(record.avgSpeed, unit),
          minSpeed: this.convertSpeed(record.minSpeed, unit),
          maxSpeed: this.convertSpeed(record.maxSpeed, unit),
          dominantDirection: record.dominantDirection,
          tendency: record.tendency,
        }))
      } else {
        if (date) {
          // Date-specific query: get data for the specified date
          const queryDate = DateTime.fromISO(date)
          if (!queryDate.isValid) {
            return response.badRequest({
              error: 'Invalid date format. Use YYYY-MM-DD format.'
            })
          }

          const startOfDay = queryDate.startOf('day')
          const endOfDay = queryDate.endOf('day')

          aggregatedData = await WindData1Min.query()
            .where('stationId', station_id)
            .where('timestamp', '>=', startOfDay.toJSDate())
            .where('timestamp', '<=', endOfDay.toJSDate())
            .orderBy('timestamp', 'desc')
            .limit(recordLimit)

          responseDate = queryDate.toISODate()!
        } else {
          // Latest data query: get most recent records regardless of date
          aggregatedData = await WindData1Min.query()
            .where('stationId', station_id)
            .orderBy('timestamp', 'desc')
            .limit(recordLimit)

          responseDate = DateTime.now().toISODate()!
        }

        // Format response data with unit conversion (reverse to get chronological order)
        responseData = aggregatedData.reverse().map(record => ({
          timestamp: record.timestamp.toISO(),
          avgSpeed: this.convertSpeed(record.avgSpeed, unit),
          minSpeed: this.convertSpeed(record.minSpeed, unit),
          maxSpeed: this.convertSpeed(record.maxSpeed, unit),
          dominantDirection: record.dominantDirection,
          sampleCount: record.sampleCount,
        }))
      }

      return {
        stationId: station_id,
        date: responseDate,
        interval,
        unit,
        data: responseData,
        totalRecords: responseData.length,
      }
    } catch (error) {
      console.error('Error fetching converted aggregated wind data:', error)
      
      // Handle specific validation errors
      if (error.message && error.message.includes('Invalid date format')) {
        return response.badRequest({
          error: error.message
        })
      }
      
      return response.internalServerError({
        error: 'Failed to fetch aggregated wind data'
      })
    }
  }

  /**
   * Convert speed based on unit
   */
  private convertSpeed(speedMs: number, unit: string): number {
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
}