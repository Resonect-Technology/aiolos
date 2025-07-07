import SensorReading from '#models/sensor_reading'
import type { HttpContext } from '@adonisjs/core/http'
import { stationDataCache } from '#app/services/station_data_cache'

export default class StationTemperatureController {
    /**
     * @summary Store temperature reading
     * @description Store a temperature reading from the station's external temperature sensor
     * @paramPath station_id - The station's unique ID - @type(string) @required
     * @requestBody temperature - The temperature value - @type(number) @required
     * @responseBody 201 - <SensorReading> - The created temperature reading
     */
    async store({ request, response, params }: HttpContext) {
        const temperature = request.input('temperature')

        if (temperature === undefined) {
            return response.badRequest({ error: 'Temperature value is required' })
        }

        const timestamp = new Date().toISOString()

        // Cache the temperature data
        stationDataCache.setTemperatureData(params.station_id, {
            temperature,
            timestamp,
        })

        const data = {
            type: 'temperature' as const,
            temperature,
            sensorId: params.station_id,
        }

        const reading = await SensorReading.create(data)
        return response.created(reading)
    }

    /**
     * @summary Get the most recent temperature reading
     * @description Get the most recent temperature reading for the specified station
     * @paramPath station_id - The station's unique ID - @type(string) @required
     * @responseBody 200 - <SensorReading> - The most recent temperature reading
     * @responseBody 404 - Not found
     */
    async latest({ params, response }: HttpContext) {
        const reading = await SensorReading.query()
            .where('sensorId', params.station_id)
            .where('type', 'temperature')
            .orderBy('createdAt', 'desc')
            .first()

        if (!reading) return response.notFound({ message: 'No temperature readings found' })
        return reading
    }

    /**
     * @summary Get temperature history
     * @description Get temperature readings history for the specified station
     * @paramPath station_id - The station's unique ID - @type(string) @required
     * @paramQuery limit - Maximum number of results to return - @type(number)
     * @paramQuery from - Start date (ISO format) - @type(string)
     * @paramQuery to - End date (ISO format) - @type(string)
     * @responseBody 200 - <SensorReading[]> - List of temperature readings
     */
    async index({ request, params }: HttpContext) {
        const limit = request.input('limit', 100)
        const from = request.input('from')
        const to = request.input('to')

        const query = SensorReading.query()
            .where('sensorId', params.station_id)
            .where('type', 'temperature')
            .orderBy('createdAt', 'desc')
            .limit(limit)

        if (from) {
            query.where('createdAt', '>=', new Date(from))
        }

        if (to) {
            query.where('createdAt', '<=', new Date(to))
        }

        return query
    }
}
