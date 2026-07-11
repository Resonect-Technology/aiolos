import type { HttpContext } from '@adonisjs/core/http';
import transmit from '@adonisjs/transmit/services/main';

import { stationDataCache } from '#app/services/station_data_cache';
import { prisma } from '#services/prisma';

export default class StationDiagnosticsController {
  /**
   * Store new diagnostics data for a station
   */
  async store({ params, request, response }: HttpContext) {
    // Capture arrival timestamp immediately for accuracy
    const arrivalTimestamp = new Date().toISOString();

    const stationId = params.station_id;
    const data = request.body();

    try {
      // Validate required fields
      const { batteryVoltage, solarVoltage, signalQuality, uptime } = data;
      if (
        typeof batteryVoltage !== 'number' ||
        typeof solarVoltage !== 'number' ||
        typeof signalQuality !== 'number' ||
        typeof uptime !== 'number'
      ) {
        return response.badRequest({
          error:
            'Invalid diagnostics data. Required fields: batteryVoltage, solarVoltage, signalQuality, uptime',
        });
      }

      // Prepare diagnostics data with timestamp
      const diagnosticsData = {
        ...data,
        timestamp: data.timestamp || arrivalTimestamp,
      };

      // Cache the diagnostics data
      stationDataCache.setDiagnosticsData(stationId, {
        batteryVoltage,
        solarVoltage,
        signalQuality,
        uptime,
        internalTemperature: data.internalTemperature,
        timestamp: diagnosticsData.timestamp,
      });

      // Save diagnostics to database
      await prisma.stationDiagnostic.create({
        data: {
          stationId: stationId,
          batteryVoltage: batteryVoltage,
          solarVoltage: solarVoltage,
          internalTemperature: data.internalTemperature ?? null,
          signalQuality: signalQuality,
          uptime: uptime,
        },
      });

      // Broadcast the diagnostics data via Transmit
      await transmit.broadcast(`station/diagnostics/${stationId}`, diagnosticsData);

      // Log diagnostics in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Diagnostics for station ${stationId}:`, diagnosticsData);
      }

      return { ok: true };
    } catch (error) {
      console.error('Error processing diagnostics data:', error);
      return response.status(500).json({ error: 'Failed to process diagnostics data' });
    }
  }

  /**
   * Get the latest diagnostics for a station
   */
  async show({ params }: HttpContext) {
    const stationId = params.station_id;

    try {
      // Get the latest diagnostics for the station
      const latestDiagnostics = await prisma.stationDiagnostic.findFirst({
        where: { stationId },
        orderBy: { createdAt: 'desc' },
      });

      if (!latestDiagnostics) {
        return {
          stationId: stationId,
          message: 'No diagnostics found for this station',
        };
      }

      return latestDiagnostics;
    } catch (error) {
      console.error('Error fetching diagnostics data:', error);
      return { error: 'Failed to fetch diagnostics data' };
    }
  }
}
