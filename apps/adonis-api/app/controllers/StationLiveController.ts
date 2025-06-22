import type { HttpContext } from '@adonisjs/core/http'
import transmit from '@adonisjs/transmit/services/main'

// In-memory interval map for dev-only mock streaming
const mockIntervals: Record<string, NodeJS.Timeout> = {}

export default class StationLiveController {
    /**
     * Receives live wind data for a station and broadcasts it via Transmit SSE.
     * POST /stations/:station_id/live/wind
     * Body: { wind_speed: number, wind_direction: number, timestamp?: string }
     */
    async wind({ params, request, response }: HttpContext) {
        const { station_id } = params
        const { wind_speed, wind_direction, timestamp } = request.only([
            'wind_speed',
            'wind_direction',
            'timestamp',
        ])
        if (
            typeof wind_speed !== 'number' ||
            typeof wind_direction !== 'number'
        ) {
            return response.badRequest({ error: 'Invalid wind data' })
        }
        await transmit.broadcast(`wind/live/${station_id}`, {
            wind_speed,
            wind_direction,
            timestamp: timestamp || new Date().toISOString(),
        })
        return { ok: true }
    }

    /**
     * Mocks live wind data for a station and broadcasts it via Transmit SSE.
     * POST /stations/:station_id/live/wind/mock
     * Body: { wind_speed?: number, wind_direction?: number, timestamp?: string }
     * If not provided, random values will be used.
     */
    async mockWind({ params, request }: HttpContext) {
        const { station_id } = params
        let { wind_speed, wind_direction, timestamp } = request.only([
            'wind_speed',
            'wind_direction',
            'timestamp',
        ])
        // Generate random values if not provided
        if (typeof wind_speed !== 'number') {
            wind_speed = Math.round((Math.random() * 20 + 1) * 10) / 10 // 1.0 - 21.0 m/s
        }
        if (typeof wind_direction !== 'number') {
            wind_direction = Math.floor(Math.random() * 360) // 0 - 359 degrees
        }
        if (!timestamp) {
            timestamp = new Date().toISOString()
        }
        await transmit.broadcast(`wind/live/${station_id}`, {
            wind_speed,
            wind_direction,
            timestamp,
        })
        return { ok: true, wind_speed, wind_direction, timestamp }
    }

    /**
     * Starts broadcasting random wind data every 1s for a station (dev only).
     * POST /stations/:station_id/live/wind/mock/start
     */
    async startMockWind({ params, response }: HttpContext) {
        const { station_id } = params
        if (mockIntervals[station_id]) {
            return response.conflict({ error: 'Mock already running' })
        }

        console.log(`Starting mock wind data for station: ${station_id}`)

        // Send initial data immediately
        const initialWind = {
            wind_speed: Math.round((Math.random() * 20 + 1) * 10) / 10,
            wind_direction: Math.floor(Math.random() * 360),
            timestamp: new Date().toISOString()
        }
        console.log(`Broadcasting initial wind data:`, initialWind)
        await transmit.broadcast(`wind/live/${station_id}`, initialWind)

        mockIntervals[station_id] = setInterval(async () => {
            const wind_speed = Math.round((Math.random() * 20 + 1) * 10) / 10
            const wind_direction = Math.floor(Math.random() * 360)
            const timestamp = new Date().toISOString()

            const data = { wind_speed, wind_direction, timestamp }
            console.log(`Broadcasting wind data:`, data)

            await transmit.broadcast(`wind/live/${station_id}`, data)
        }, 1000)

        return { ok: true, message: `Mock wind started for ${station_id}` }
    }

    /**
     * Stops broadcasting random wind data for a station (dev only).
     * POST /stations/:station_id/live/wind/mock/stop
     */
    async stopMockWind({ params, response }: HttpContext) {
        const { station_id } = params
        if (mockIntervals[station_id]) {
            clearInterval(mockIntervals[station_id])
            delete mockIntervals[station_id]
            return { ok: true, message: `Mock wind stopped for ${station_id}` }
        }
        return response.notFound({ error: 'No mock running for this station' })
    }
}
