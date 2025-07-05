import type { HttpContext } from '@adonisjs/core/http'
import StationConfig from '#app/models/station_config'

// Define a type that supports indexing with strings
type ConfigRecord = Record<string, any>

export default class StationConfigsController {
    /**
     * Get the current configuration for a station
     */
    async show({ params, response }: HttpContext) {
        const stationId = params.station_id

        try {
            // Get the latest config for the station
            const config = await StationConfig.query()
                .where('station_id', stationId)
                .orderBy('created_at', 'desc')
                .first()

            if (!config) {
                return {
                    station_id: stationId,
                    temp_interval: null,
                    wind_send_interval: null,
                    wind_sample_interval: null,
                    diag_interval: null,
                    time_interval: null,
                    restart_interval: null,
                    sleep_start_hour: null,
                    sleep_end_hour: null,
                    ota_hour: null,
                    ota_minute: null,
                    ota_duration: null,
                    remote_ota: false,
                    message: 'No configuration found for this station. Default values will be used.'
                }
            }

            return config
        } catch (error) {
            console.error(`Error fetching configuration for station ${stationId}:`, error)
            return response.status(500).json({ error: 'Failed to fetch station configuration' })
        }
    }

    /**
     * Store/update configuration for a station
     * This endpoint requires API key authentication
     */
    async store({ params, request, response }: HttpContext) {
        const stationId = params.station_id
        const data = request.body()

        // Check for API key authentication
        const apiKey = request.header('X-API-Key')
        const expectedApiKey = process.env.ADMIN_API_KEY

        if (!apiKey || apiKey !== expectedApiKey) {
            return response.status(401).json({ error: 'Unauthorized. Valid API key is required.' })
        }

        try {
            // Validate data types if values are provided
            const configData: Record<string, any> = {}

            // Only include fields that are provided and are valid numbers
            const configFields = [
                'temp_interval', 'wind_send_interval', 'wind_sample_interval', 'diag_interval',
                'time_interval', 'restart_interval',
                'sleep_start_hour', 'sleep_end_hour',
                'ota_hour', 'ota_minute', 'ota_duration'
            ]

            for (const field of configFields) {
                if (data[field] !== undefined) {
                    const value = Number(data[field])
                    if (isNaN(value)) {
                        return response.badRequest({ error: `Invalid value for ${field}. Must be a number.` })
                    }
                    configData[field] = value
                }
            }

            // Handle remote_ota flag (boolean)
            if (data.remote_ota !== undefined) {
                configData.remote_ota = Boolean(data.remote_ota)
            }

            // Add station_id to the data
            configData.station_id = stationId

            // Create new config record
            await StationConfig.create(configData)

            // Log in development mode
            if (process.env.NODE_ENV === 'development') {
                console.log(`Configuration updated for station ${stationId}:`, configData)
            }

            return { ok: true, message: 'Configuration updated successfully' }
        } catch (error) {
            console.error(`Error updating configuration for station ${stationId}:`, error)
            return response.status(500).json({ error: 'Failed to update station configuration' })
        }
    }

    /**
     * Confirm that OTA mode has been started on the device
     * This endpoint resets the remote_ota flag to false
     */
    async confirmOta({ params, response }: HttpContext) {
        const stationId = params.station_id

        try {
            // Get the latest config for the station
            const config = await StationConfig.query()
                .where('station_id', stationId)
                .orderBy('created_at', 'desc')
                .first()

            if (!config) {
                return response.status(404).json({
                    error: 'No configuration found for this station'
                })
            }

            // Create a new config record with remote_ota set to false
            // We create a new record to maintain the audit trail
            const configData = {
                station_id: stationId,
                temp_interval: config.temp_interval,
                wind_send_interval: config.wind_send_interval,
                wind_sample_interval: config.wind_sample_interval,
                diag_interval: config.diag_interval,
                time_interval: config.time_interval,
                restart_interval: config.restart_interval,
                sleep_start_hour: config.sleep_start_hour,
                sleep_end_hour: config.sleep_end_hour,
                ota_hour: config.ota_hour,
                ota_minute: config.ota_minute,
                ota_duration: config.ota_duration,
                remote_ota: false  // Reset the OTA flag
            }

            await StationConfig.create(configData)

            // Log in development mode
            if (process.env.NODE_ENV === 'development') {
                console.log(`OTA confirmation received for station ${stationId}. Remote OTA flag reset to false.`)
            }

            return { ok: true, message: 'OTA confirmation received' }
        } catch (error) {
            console.error(`Error confirming OTA for station ${stationId}:`, error)
            return response.status(500).json({ error: 'Failed to confirm OTA' })
        }
    }
}