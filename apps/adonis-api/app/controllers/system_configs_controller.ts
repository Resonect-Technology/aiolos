import type { HttpContext } from '@adonisjs/core/http'
import SystemConfig from '#app/models/system_config'

export default class SystemConfigsController {
  /**
   * Get a specific system configuration value
   */
  async get({ params, response }: HttpContext) {
    const key = params.key

    try {
      const config = await SystemConfig.query().where('key', key).first()

      if (!config) {
        return {
          key,
          value: null,
          message: `No configuration found for key: ${key}`,
        }
      }

      return {
        key: config.key,
        value: config.value,
      }
    } catch (error) {
      console.error(`Error fetching system configuration for key ${key}:`, error)
      return response.status(500).json({ error: 'Failed to fetch system configuration' })
    }
  }

  /**
   * Get all system configurations
   */
  async index({ response }: HttpContext) {
    try {
      const configs = await SystemConfig.all()

      // Transform to a key-value object
      const configObject = configs.reduce(
        (acc, config) => {
          acc[config.key] = config.value
          return acc
        },
        {} as Record<string, string>
      )

      return configObject
    } catch (error) {
      console.error('Error fetching system configurations:', error)
      return response.status(500).json({ error: 'Failed to fetch system configurations' })
    }
  }

  /**
   * Store/update a system configuration
   * This endpoint requires API key authentication
   */
  async set({ params, request, response }: HttpContext) {
    const key = params.key
    const { value } = request.body()

    // Check for API key authentication
    const apiKey = request.header('X-API-Key')
    const expectedApiKey = process.env.ADMIN_API_KEY

    if (!apiKey || apiKey !== expectedApiKey) {
      return response.status(401).json({ error: 'Unauthorized. Valid API key is required.' })
    }

    try {
      // Validate input
      if (value === undefined) {
        return response.badRequest({ error: 'Value is required' })
      }

      // Convert value to string if it's not already
      const stringValue = String(value)

      // Find existing config or create new one
      const existingConfig = await SystemConfig.query().where('key', key).first()

      if (existingConfig) {
        existingConfig.value = stringValue
        await existingConfig.save()
      } else {
        await SystemConfig.create({
          key,
          value: stringValue,
        })
      }

      // Log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`System configuration updated: ${key} = ${stringValue}`)
      }

      return {
        ok: true,
        message: 'System configuration updated successfully',
        key,
        value: stringValue,
      }
    } catch (error) {
      console.error(`Error updating system configuration for key ${key}:`, error)
      return response.status(500).json({ error: 'Failed to update system configuration' })
    }
  }
}
