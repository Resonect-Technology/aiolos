import type { HttpContext } from '@adonisjs/core/http'
import transmit from '@adonisjs/transmit/services/main'
import StationDiagnostic from '#app/models/station_diagnostic'

export default class StationDiagnosticsController {
    /**
     * Store new diagnostics data for a station
     */
    async store({ params, request, response }: HttpContext) {
        const stationId = params.station_id
        const data = request.body()

        try {
            // Validate required fields
            const { battery_voltage, solar_voltage, signal_quality, uptime } = data
            if (
                typeof battery_voltage !== 'number' ||
                typeof solar_voltage !== 'number' ||
                typeof signal_quality !== 'number' ||
                typeof uptime !== 'number'
            ) {
                return response.badRequest({ error: 'Invalid diagnostics data. Required fields: battery_voltage, solar_voltage, signal_quality, uptime' })
            }

            // Prepare diagnostics data with timestamp
            const diagnosticsData = {
                ...data,
                timestamp: data.timestamp || new Date().toISOString(),
            }

            // Save diagnostics to database
            await StationDiagnostic.create({
                station_id: stationId,
                battery_voltage: battery_voltage,
                solar_voltage: solar_voltage,
                internal_temperature: data.internal_temperature || null,
                signal_quality: signal_quality,
                uptime: uptime
            })

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

        try {
            // Get the latest diagnostics for the station
            const latestDiagnostics = await StationDiagnostic.query()
                .where('station_id', stationId)
                .orderBy('created_at', 'desc')
                .first()

            if (!latestDiagnostics) {
                return {
                    station_id: stationId,
                    message: 'No diagnostics found for this station'
                }
            }

            return latestDiagnostics
        } catch (error) {
            console.error('Error fetching diagnostics data:', error)
            return { error: 'Failed to fetch diagnostics data' }
        }
    }
}
