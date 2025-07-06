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
                .where('stationId', stationId)
                .orderBy('id', 'desc')
                .first()

            if (!config) {
                return {
                    stationId: stationId,
                    tempInterval: null,
                    windSendInterval: null,
                    windSampleInterval: null,
                    diagInterval: null,
                    timeInterval: null,
                    restartInterval: null,
                    sleepStartHour: null,
                    sleepEndHour: null,
                    otaHour: null,
                    otaMinute: null,
                    otaDuration: null,
                    remoteOta: false,
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

            // Map snake_case input fields to camelCase model properties for backward compatibility
            const fieldMapping = {
                'temp_interval': 'tempInterval',
                'wind_send_interval': 'windSendInterval',
                'wind_sample_interval': 'windSampleInterval',
                'diag_interval': 'diagInterval',
                'time_interval': 'timeInterval',
                'restart_interval': 'restartInterval',
                'sleep_start_hour': 'sleepStartHour',
                'sleep_end_hour': 'sleepEndHour',
                'ota_hour': 'otaHour',
                'ota_minute': 'otaMinute',
                'ota_duration': 'otaDuration',
                'remote_ota': 'remoteOta'
            }

            // Support both snake_case (for backward compatibility) and camelCase
            const allPossibleFields = [
                ...Object.keys(fieldMapping), // snake_case
                ...Object.values(fieldMapping) // camelCase
            ]

            for (const inputField of allPossibleFields) {
                if (data[inputField] !== undefined) {
                    // Determine the model property name (always camelCase)
                    const modelProperty = fieldMapping[inputField as keyof typeof fieldMapping] || inputField

                    // Skip if it's the boolean field (handle separately)
                    if (modelProperty === 'remoteOta') continue

                    const value = Number(data[inputField])
                    if (isNaN(value)) {
                        return response.badRequest({ error: `Invalid value for ${inputField}. Must be a number.` })
                    }
                    configData[modelProperty] = value
                }
            }

            // Handle remoteOta flag (boolean) - support both naming conventions
            if (data.remote_ota !== undefined) {
                configData.remoteOta = Boolean(data.remote_ota)
            } else if (data.remoteOta !== undefined) {
                configData.remoteOta = Boolean(data.remoteOta)
            }

            // Add stationId to the data
            configData.stationId = stationId

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
                .where('stationId', stationId)
                .orderBy('id', 'desc')
                .first()

            if (!config) {
                return response.status(404).json({
                    error: 'No configuration found for this station'
                })
            }

            // Create a new config record with remoteOta set to false
            // We create a new record to maintain the audit trail
            const configData = {
                stationId: stationId,
                tempInterval: config.tempInterval,
                windSendInterval: config.windSendInterval,
                windSampleInterval: config.windSampleInterval,
                diagInterval: config.diagInterval,
                timeInterval: config.timeInterval,
                restartInterval: config.restartInterval,
                sleepStartHour: config.sleepStartHour,
                sleepEndHour: config.sleepEndHour,
                otaHour: config.otaHour,
                otaMinute: config.otaMinute,
                otaDuration: config.otaDuration,
                remoteOta: false  // Reset the OTA flag
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