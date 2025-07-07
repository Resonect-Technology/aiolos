import type { HttpContext } from '@adonisjs/core/http'
import transmit from '@adonisjs/transmit/services/main'
import { stationDataCache } from '#app/services/station_data_cache'

// In-memory interval map for dev-only mock streaming
interface MockStationData {
  intervalId: NodeJS.Timeout
  lastWindSpeed: number
  lastWindDirection: number
}
const mockStationStates: Record<string, MockStationData> = {}

export default class StationLiveController {
  /**
   * Receives wind data and broadcasts it via Transmit SSE for real-time updates.
   *
   * ⚠️ IMPORTANT: This endpoint is used by BOTH routes:
   * - POST /stations/:station_id/wind (used by firmware - see firmware_endpoints.spec.ts)
   * - POST /stations/:station_id/live/wind (used for real-time broadcasting & development)
   *
   * The firmware uses the simpler /wind route, while /live/wind is primarily for:
   * - Real-time data broadcasting to web clients via SSE
   * - Development and testing purposes
   * - IoT/CoAP proxy integration
   *
   * Body: { windSpeed: number, windDirection: number, timestamp?: string }
   */
  async wind({ params, request, response }: HttpContext) {
    // Capture arrival timestamp immediately for accuracy
    const arrivalTimestamp = new Date().toISOString()

    const { station_id } = params
    const { windSpeed, windDirection, timestamp } = request.only([
      'windSpeed',
      'windDirection',
      'timestamp',
    ])
    if (typeof windSpeed !== 'number' || typeof windDirection !== 'number') {
      return response.badRequest({ error: 'Invalid wind data' })
    }

    // Use station-provided timestamp if available, otherwise use server arrival time
    const windTimestamp = timestamp || arrivalTimestamp

    // Cache the latest wind data using the shared cache service
    stationDataCache.setWindData(station_id, {
      windSpeed,
      windDirection,
      timestamp: windTimestamp,
    })

    // Broadcast to SSE subscribers
    await transmit.broadcast(`wind/live/${station_id}`, {
      windSpeed,
      windDirection,
      timestamp: windTimestamp,
    })

    return { ok: true }
  }

  /**
   * Mocks wind data for development and testing purposes.
   *
   * POST /stations/:station_id/live/wind/mock
   * Body: { windSpeed?: number, windDirection?: number, timestamp?: string }
   *
   * Purpose: Generate mock wind data for frontend development and SSE testing.
   * If values not provided, random values will be used.
   * Broadcasts the mock data to connected clients via SSE.
   */
  async mockWind({ params, request }: HttpContext) {
    // Capture arrival timestamp immediately for accuracy
    const arrivalTimestamp = new Date().toISOString()

    const { station_id } = params
    let { windSpeed, windDirection, timestamp } = request.only([
      'windSpeed',
      'windDirection',
      'timestamp',
    ])
    // Generate random values if not provided
    if (typeof windSpeed !== 'number') {
      windSpeed = Math.round((Math.random() * 20 + 1) * 10) / 10 // 1.0 - 21.0 m/s
    }
    if (typeof windDirection !== 'number') {
      windDirection = Math.floor(Math.random() * 360) // 0 - 359 degrees
    }
    // Use provided timestamp or server arrival time
    if (!timestamp) {
      timestamp = arrivalTimestamp
    }

    // Cache the mock wind data using the shared cache service
    stationDataCache.setWindData(station_id, {
      windSpeed,
      windDirection,
      timestamp,
    })

    await transmit.broadcast(`wind/live/${station_id}`, {
      windSpeed,
      windDirection,
      timestamp,
    })
    return { ok: true, windSpeed, windDirection, timestamp }
  }

  /**
   * Starts broadcasting random wind data every 1s for a station (dev only).
   * POST /stations/:station_id/live/wind/mock/start
   */
  async startMockWind({ params, response }: HttpContext) {
    const { station_id } = params
    if (mockStationStates[station_id]) {
      return response.conflict({ error: 'Mock already running' })
    }

    console.log(`Starting smoother mock wind data for station: ${station_id}`)

    // Initial random values
    let currentWindSpeed = Math.round((Math.random() * 15 + 5) * 10) / 10 // Start between 5 and 20 m/s
    let currentWindDirection = Math.floor(Math.random() * 360)

    const sendData = async (speed: number, direction: number) => {
      const timestamp = new Date().toISOString()
      const data = { windSpeed: speed, windDirection: direction, timestamp }
      console.log(`Broadcasting wind data for ${station_id}:`, data)
      await transmit.broadcast(`wind/live/${station_id}`, data)
      return data
    }

    // Send initial data immediately
    await sendData(currentWindSpeed, currentWindDirection)

    const intervalId = setInterval(async () => {
      // Generate small changes
      const speedChange = (Math.random() - 0.5) * 2 // -1 to +1 m/s change
      const directionChange = Math.floor((Math.random() - 0.5) * 30) // -15 to +15 degrees change

      currentWindSpeed += speedChange
      currentWindDirection += directionChange

      // Clamp values to reasonable ranges
      currentWindSpeed = Math.max(0, Math.min(25, currentWindSpeed)) // 0-25 m/s
      currentWindSpeed = Math.round(currentWindSpeed * 10) / 10 // Round to 1 decimal place

      currentWindDirection = (currentWindDirection + 360) % 360 // Keep direction 0-359
      currentWindDirection = Math.floor(currentWindDirection)

      // Update state for next iteration (though not strictly needed here as vars are in closure)
      mockStationStates[station_id].lastWindSpeed = currentWindSpeed
      mockStationStates[station_id].lastWindDirection = currentWindDirection

      await sendData(currentWindSpeed, currentWindDirection)
    }, 1000)

    mockStationStates[station_id] = {
      intervalId,
      lastWindSpeed: currentWindSpeed,
      lastWindDirection: currentWindDirection,
    }

    return { ok: true, message: `Smoother mock wind started for ${station_id}` }
  }

  /**
   * Stops broadcasting random wind data for a station (dev only).
   * POST /stations/:station_id/live/wind/mock/stop
   */
  async stopMockWind({ params, response }: HttpContext) {
    const { station_id } = params
    if (mockStationStates[station_id]) {
      clearInterval(mockStationStates[station_id].intervalId)
      delete mockStationStates[station_id]
      console.log(`Mock wind stopped for station: ${station_id}`)
      return { ok: true, message: `Mock wind stopped for ${station_id}` }
    }
    return response.notFound({ error: 'No mock running for this station' })
  }
}
