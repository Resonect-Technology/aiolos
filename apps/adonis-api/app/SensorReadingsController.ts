import SensorReading from '#models/SensorReading'
import type { HttpContext } from '@adonisjs/core/http'

export default class SensorReadingsController {
    /**
     * @summary Create a new sensor reading for a sensor
     * @description Store a new wind or temperature reading for the specified sensor.
     * @paramPath sensor_id - The sensor's unique ID - @type(string) @required
     * @requestBody <SensorReading>
     * @responseBody 201 - <SensorReading> - The created sensor reading
     */
    async store({ request, response, params }: HttpContext) {
        const data = request.only([
            'type',
            'temperature',
            'wind_speed',
            'wind_direction',
        ]) as any
        data.sensor_id = params.sensor_id
        const reading = await SensorReading.create(data)
        return response.created(reading)
    }

    /**
     * @summary List all readings for a sensor
     * @description Get all wind and temperature readings for the specified sensor. Optionally filter by type.
     * @paramPath sensor_id - The sensor's unique ID - @type(string) @required
     * @paramQuery type - Filter by reading type (wind or temperature) - @type(string)
     * @responseBody 200 - <SensorReading[]> - List of sensor readings
     */
    async index({ request, params }: HttpContext) {
        const type = request.input('type')
        const query = SensorReading.query().where('sensor_id', params.sensor_id)
        if (type) query.where('type', type)
        return query.orderBy('created_at', 'desc')
    }

    /**
     * @summary Get a specific reading for a sensor
     * @description Get a single wind or temperature reading by its ID for the specified sensor.
     * @paramPath sensor_id - The sensor's unique ID - @type(string) @required
     * @paramPath id - The reading's unique ID - @type(number) @required
     * @responseBody 200 - <SensorReading> - The requested sensor reading
     * @responseBody 404 - Not found
     */
    async show({ params, response }: HttpContext) {
        const reading = await SensorReading.query()
            .where('sensor_id', params.sensor_id)
            .where('id', params.id)
            .first()
        if (!reading) return response.notFound({ message: 'Not found' })
        return reading
    }
}
