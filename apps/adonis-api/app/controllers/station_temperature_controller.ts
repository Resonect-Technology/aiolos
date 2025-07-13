import TemperatureReading from '#models/temperature_reading'
import type { HttpContext } from '@adonisjs/core/http'
import { stationDataCache } from '#app/services/station_data_cache'
import transmit from '@adonisjs/transmit/services/main'
import { DateTime } from 'luxon'

export default class StationTemperatureController {
  /**
   * Validate if temperature reading is reasonable
   * Filters out common sensor error values like -127
   */
  private isValidTemperature(temperature: number): boolean {
    // Filter out obvious sensor errors and unrealistic values
    return temperature > -40 && temperature < 60 && temperature !== -127
  }

  /**
   * @summary Store temperature reading
   * @description Store a temperature reading from the station's external temperature sensor
   * @paramPath station_id - The station's unique ID - @type(string) @required
   * @requestBody temperature - The temperature value - @type(number) @required
   * @responseBody 201 - <TemperatureReading> - The created temperature reading
   */
  async store({ request, response, params }: HttpContext) {
    // Capture arrival timestamp immediately for accuracy
    const arrivalTimestamp = new Date().toISOString()

    const temperature = request.input('temperature')

    if (temperature === undefined) {
      return response.badRequest({ error: 'Temperature value is required' })
    }

    // Use station-provided timestamp if available, otherwise use server arrival time
    const temperatureTimestamp = request.input('timestamp') || arrivalTimestamp

    // Silently filter invalid temperature readings
    if (!this.isValidTemperature(temperature)) {
      console.warn(
        `Filtered invalid temperature reading: ${temperature}°C from station ${params.station_id}`
      )
      // Return success but don't update cache/broadcast/store
      return response.created({
        message: 'Reading received',
        filtered: true
      })
    }

    // Cache the temperature data
    stationDataCache.setTemperatureData(params.station_id, {
      temperature,
      timestamp: temperatureTimestamp,
    })

    // Broadcast to SSE subscribers with timestamp
    await transmit.broadcast(`temperature/live/${params.station_id}`, {
      temperature,
      timestamp: temperatureTimestamp,
    })

    const reading = await TemperatureReading.create({
      stationId: params.station_id,
      temperature,
      readingTimestamp: DateTime.fromISO(temperatureTimestamp),
    })

    // Return the same structure as the old SensorReading for API compatibility
    return response.created({
      id: reading.id,
      sensorId: reading.stationId,
      type: 'temperature',
      temperature: reading.temperature,
      windSpeed: null,
      windDirection: null,
      createdAt: reading.createdAt,
      updatedAt: reading.updatedAt,
    })
  }

  /**
   * @summary Get the most recent temperature reading
   * @description Get the most recent temperature reading for the specified station
   * @paramPath station_id - The station's unique ID - @type(string) @required
   * @responseBody 200 - <TemperatureReading> - The most recent temperature reading with last update time
   * @responseBody 404 - Not found
   */
  async latest({ params, response }: HttpContext) {
    const reading = await TemperatureReading.query()
      .where('stationId', params.station_id)
      .orderBy('readingTimestamp', 'desc')
      .first()

    if (!reading) return response.notFound({ message: 'No temperature readings found' })

    // Return the same structure as the old SensorReading for API compatibility
    return {
      id: reading.id,
      sensorId: reading.stationId,
      type: 'temperature',
      temperature: reading.temperature,
      windSpeed: null,
      windDirection: null,
      createdAt: reading.createdAt,
      updatedAt: reading.updatedAt,
      lastUpdated: reading.readingTimestamp.toISO(),
    }
  }

  /**
   * @summary Get temperature history
   * @description Get temperature readings history for the specified station
   * @paramPath station_id - The station's unique ID - @type(string) @required
   * @paramQuery limit - Maximum number of results to return - @type(number)
   * @paramQuery from - Start date (ISO format) - @type(string)
   * @paramQuery to - End date (ISO format) - @type(string)
   * @responseBody 200 - <TemperatureReading[]> - List of temperature readings
   */
  async index({ request, params }: HttpContext) {
    const limit = request.input('limit', 100)
    const from = request.input('from')
    const to = request.input('to')

    const query = TemperatureReading.query()
      .where('stationId', params.station_id)
      .orderBy('readingTimestamp', 'desc')
      .limit(limit)

    if (from) {
      query.where('readingTimestamp', '>=', DateTime.fromISO(from))
    }

    if (to) {
      query.where('readingTimestamp', '<=', DateTime.fromISO(to))
    }

    const readings = await query

    // Return the same structure as the old SensorReading for API compatibility
    return readings.map(reading => ({
      id: reading.id,
      sensorId: reading.stationId,
      type: 'temperature',
      temperature: reading.temperature,
      windSpeed: null,
      windDirection: null,
      createdAt: reading.createdAt,
      updatedAt: reading.updatedAt,
    }))
  }
}
