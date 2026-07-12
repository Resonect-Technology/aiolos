import type { HttpContext } from '@adonisjs/core/http';

import { prisma } from '#services/prisma';
import { stationConfigWriteSchema } from '#validators/station_config';

export default class StationConfigsController {
  /**
   * Get the current configuration for a station
   */
  async show({ params, response }: HttpContext) {
    const stationId = params.station_id;

    try {
      // Get the latest config for the station
      const config = await prisma.stationConfig.findFirst({
        where: { stationId },
        orderBy: { id: 'desc' },
      });

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
          utcOffsetMinutes: null,
          livestreamStartHour: null,
          lowBatteryThreshold: null,
          message: 'No configuration found for this station. Default values will be used.',
        };
      }

      return config;
    } catch (error) {
      console.error(`Error fetching configuration for station ${stationId}:`, error);
      return response.status(500).json({ error: 'Failed to fetch station configuration' });
    }
  }

  /**
   * Store/update configuration for a station
   * Guarded by the adminAuth middleware (admin session cookie)
   */
  async store({ params, request, response }: HttpContext) {
    const stationId = params.station_id;
    const data = request.body();

    try {
      // Coerce/validate the allowlisted fields; unknown keys are stripped
      const parsed = stationConfigWriteSchema.safeParse(data);
      if (!parsed.success) {
        const issue = parsed.error.issues[0];
        const field = String(issue?.path[0] ?? 'field');
        return response.badRequest({
          error: `Invalid value for ${field}. ${issue?.message ?? 'Must be a number.'}`,
        });
      }

      // Carry forward the latest row's values for omitted fields — a partial
      // POST must not null them out, or the station silently reverts those
      // settings to compile-time defaults at its next restart
      const previous = await prisma.stationConfig.findFirst({
        where: { stationId },
        orderBy: { id: 'desc' },
      });
      const carried = previous
        ? {
            tempInterval: previous.tempInterval,
            windSendInterval: previous.windSendInterval,
            windSampleInterval: previous.windSampleInterval,
            diagInterval: previous.diagInterval,
            timeInterval: previous.timeInterval,
            restartInterval: previous.restartInterval,
            sleepStartHour: previous.sleepStartHour,
            sleepEndHour: previous.sleepEndHour,
            otaHour: previous.otaHour,
            otaMinute: previous.otaMinute,
            otaDuration: previous.otaDuration,
            remoteOta: previous.remoteOta,
            utcOffsetMinutes: previous.utcOffsetMinutes,
            livestreamStartHour: previous.livestreamStartHour,
            lowBatteryThreshold: previous.lowBatteryThreshold,
          }
        : {};
      const configData = { ...carried, ...parsed.data, stationId };

      // Create new config record
      await prisma.stationConfig.create({ data: configData });

      // Log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(`Configuration updated for station ${stationId}:`, configData);
      }

      return { ok: true, message: 'Configuration updated successfully' };
    } catch (error) {
      console.error(`Error updating configuration for station ${stationId}:`, error);
      return response.status(500).json({ error: 'Failed to update station configuration' });
    }
  }

  /**
   * Confirm that OTA mode has been started on the device
   * This endpoint resets the remote_ota flag to false
   */
  async confirmOta({ params, response }: HttpContext) {
    const stationId = params.station_id;

    try {
      // Get the latest config for the station
      const config = await prisma.stationConfig.findFirst({
        where: { stationId },
        orderBy: { id: 'desc' },
      });

      if (!config) {
        return response.status(404).json({
          error: 'No configuration found for this station',
        });
      }

      // Create a new config record with remoteOta set to false
      // We create a new record to maintain the audit trail
      await prisma.stationConfig.create({
        data: {
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
          utcOffsetMinutes: config.utcOffsetMinutes,
          livestreamStartHour: config.livestreamStartHour,
          lowBatteryThreshold: config.lowBatteryThreshold,
          remoteOta: false, // Reset the OTA flag
        },
      });

      // Log in development mode
      if (process.env.NODE_ENV === 'development') {
        console.log(
          `OTA confirmation received for station ${stationId}. Remote OTA flag reset to false.`,
        );
      }

      return { ok: true, message: 'OTA confirmation received' };
    } catch (error) {
      console.error(`Error confirming OTA for station ${stationId}:`, error);
      return response.status(500).json({ error: 'Failed to confirm OTA' });
    }
  }
}
