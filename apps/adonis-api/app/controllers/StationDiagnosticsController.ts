import type { HttpContext } from '@adonisjs/core/http'
import transmit from '@adonisjs/transmit/services/main'

export default class StationDiagnosticsController {
    /**
     * Store new diagnostics data for a station
     */
    async store({ params, request, response }: HttpContext) {
        const stationId = params.station_id
        const data = request.body()

        try {
            // Validate required fields
            const { battery_voltage, solar_voltage, signal_quality } = data
            if (
                typeof battery_voltage !== 'number' ||
                typeof solar_voltage !== 'number' ||
                typeof signal_quality !== 'number'
            ) {
                return response.badRequest({ error: 'Invalid diagnostics data' })
            }

            // Prepare diagnostics data with timestamp
            const diagnosticsData = {
                ...data,
                timestamp: data.timestamp || new Date().toISOString(),
            }

            // Broadcast the diagnostics data via Transmit
            await transmit.broadcast(`station/diagnostics/${stationId}`, diagnosticsData)

            // Log diagnostics in development
            if (process.env.NODE_ENV === 'development') {
                console.log(`Diagnostics for station ${stationId}:`, diagnosticsData)
            }

            return { ok: true }
        } catch (error) {
            console.error('Error processing diagnostics data:', error)
            return response.status(500).json({ error: 'Failed to process diagnostics data' })
        }
    }

    /**
     * Get the latest diagnostics for a station
     */
    async show({ params }: HttpContext) {
        const stationId = params.station_id

        // In a real implementation, you would fetch data from a database
        // For now, return a placeholder response
        return {
            station_id: stationId,
            message: 'Latest diagnostics would be returned here',
            note: 'This endpoint is a placeholder. Implement database storage to see actual data.'
        }
    }
}
