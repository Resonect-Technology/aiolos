import type { HttpContext } from '@adonisjs/core/http';
import transmit from '@adonisjs/transmit/services/main';
import { DateTime } from 'luxon';

import { stationDataCache } from '#app/services/station_data_cache';
import { prisma } from '#services/prisma';
import {
  diagnosticsAggregatedQuerySchema,
  diagnosticsHistoryQuerySchema,
  diagnosticsIngestSchema,
} from '#validators/station_diagnostics';

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
      // Validate required fields; everything else passes through untouched
      const parsed = diagnosticsIngestSchema.safeParse(data);
      if (!parsed.success) {
        return response.badRequest({
          error:
            'Invalid diagnostics data. Required fields: batteryVoltage, solarVoltage, signalQuality, uptime',
        });
      }
      const { batteryVoltage, solarVoltage, signalQuality, uptime } = parsed.data;

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
        firmwareVersion: data.firmwareVersion,
        freeHeap: data.freeHeap,
        minFreeHeap: data.minFreeHeap,
        resetReason: data.resetReason,
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
          firmwareVersion: data.firmwareVersion ?? null,
          freeHeap: data.freeHeap ?? null,
          minFreeHeap: data.minFreeHeap ?? null,
          resetReason: data.resetReason ?? null,
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

  /**
   * Get recent diagnostics history for a station.
   * Query params: hours (default 24, max 720), limit (default 500, max 2000).
   */
  async history({ params, request, response }: HttpContext) {
    const stationId = params.station_id;

    // Coercing schema with per-field fallbacks — never throws
    const { hours, limit } = diagnosticsHistoryQuerySchema.parse({
      hours: request.input('hours'),
      limit: request.input('limit'),
    });
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);

    try {
      return await prisma.stationDiagnostic.findMany({
        where: { stationId, createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error('Error fetching diagnostics history:', error);
      return response.status(500).json({ error: 'Failed to fetch diagnostics history' });
    }
  }

  /**
   * Get daily diagnostics rollups (battery/solar/signal min/avg/max per UTC
   * day, kept indefinitely — unlike raw diagnostics), newest first.
   * Query params: days (default 30, max 3650), limit (default 365, max 3650).
   */
  async aggregated({ params, request, response }: HttpContext) {
    const stationId = params.station_id;

    // Coercing schema with per-field fallbacks — never throws
    const { days, limit } = diagnosticsAggregatedQuerySchema.parse({
      days: request.input('days'),
      limit: request.input('limit'),
    });
    // date is "YYYY-MM-DD" text compared lexicographically
    const since = DateTime.utc().minus({ days }).toISODate()!;

    try {
      return await prisma.diagnosticsDaily.findMany({
        where: { stationId, date: { gte: since } },
        orderBy: { date: 'desc' },
        take: limit,
      });
    } catch (error) {
      console.error('Error fetching aggregated diagnostics:', error);
      return response.status(500).json({ error: 'Failed to fetch aggregated diagnostics' });
    }
  }
}
