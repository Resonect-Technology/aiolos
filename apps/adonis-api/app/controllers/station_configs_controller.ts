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
          message: 'No configuration found for this station. Default values will be used.',
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

      // Define all valid camelCase field names
      const validFields = [
        'tempInterval',
        'windSendInterval',
        'windSampleInterval',
        'diagInterval',
        'timeInterval',
        'restartInterval',
        'sleepStartHour',
        'sleepEndHour',
        'otaHour',
        'otaMinute',
        'otaDuration',
        'remoteOta',
      ]

      // Process numeric fields
      for (const field of validFields) {
        if (data[field] !== undefined) {
          // Skip the boolean field (handle separately)
          if (field === 'remoteOta') continue

          const value = Number(data[field])
          if (isNaN(value)) {
            return response.badRequest({ error: `Invalid value for ${field}. Must be a number.` })
          }
          configData[field] = value
        }
      }

      // Handle remoteOta flag (boolean)
      if (data.remoteOta !== undefined) {
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
          error: 'No configuration found for this station',
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
        remoteOta: false, // Reset the OTA flag
      }

      await StationConfig.create(configData)

      // Log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `OTA confirmation received for station ${stationId}. Remote OTA flag reset to false.`
        )
      }

      return { ok: true, message: 'OTA confirmation received' }
    } catch (error) {
      console.error(`Error confirming OTA for station ${stationId}:`, error)
      return response.status(500).json({ error: 'Failed to confirm OTA' })
    }
  }
}
