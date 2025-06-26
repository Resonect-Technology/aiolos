import type { HttpContext } from '@adonisjs/core/http'
import transmit from '@adonisjs/transmit/services/main'

export default class StationDiagnosticsController {
    /**
     * Receives diagnostics data from a station and broadcasts it via Transmit SSE.
     * POST /stations/:station_id/diagnostics
     * Body: { 
     *   battery_voltage: number, 
     *   solar_voltage: number, 
     *   signal_quality: number,
     *   temperature?: number,
     *   errors?: string,
     *   timestamp?: string 
     * }
     */
    async store({ params, request, response }: HttpContext) {
        const { station_id } = params
        const {
            battery_voltage,
            solar_voltage,
            signal_quality,
            temperature,
            errors,
            timestamp
        } = request.only([
            'battery_voltage',
            'solar_voltage',
            'signal_quality',
            'temperature',
            'errors',
            'timestamp',
        ])

        // Validate required fields
        if (
            typeof battery_voltage !== 'number' ||
            typeof solar_voltage !== 'number' ||
            typeof signal_quality !== 'number'
        ) {
            return response.badRequest({ error: 'Invalid diagnostics data' })
        }

        // Prepare diagnostics data
        const diagnosticsData: Record<string, any> = {
            battery_voltage,
            solar_voltage,
            signal_quality,
            timestamp: timestamp || new Date().toISOString(),
        }

        // Add optional fields if present
        if (temperature !== undefined) {
            diagnosticsData.temperature = temperature
        }

        if (errors !== undefined) {
            diagnosticsData.errors = errors
        }

        // Broadcast the diagnostics data
        await transmit.broadcast(`station/diagnostics/${station_id}`, diagnosticsData)

        // Log diagnostics to console in development
        if (process.env.NODE_ENV === 'development') {
            console.log(`Diagnostics for station ${station_id}:`, diagnosticsData)
        }

        return { ok: true }
    }

    /**
     * Returns the latest diagnostics for a station
     * GET /stations/:station_id/diagnostics
     */
    async show({ params }: HttpContext) {
        const { station_id } = params

        // In a real implementation, you would fetch the data from a database
        // For now, we'll return a placeholder
        return {
            station_id,
            message: 'Latest diagnostics would be returned here',
            note: 'This endpoint is a placeholder. Implement database storage to see actual data.'
        }
    }
}
