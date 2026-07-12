import type { HttpContext } from '@adonisjs/core/http';
import transmit from '@adonisjs/transmit/services/main';

import type { TemperatureLivePayload } from '@repo/schemas';

import { stationDataCache } from '#app/services/station_data_cache';
import { prisma } from '#services/prisma';
import { temperatureValueSchema } from '#validators/station_temperature';

export default class StationTemperatureController {
  /**
   * @summary Store temperature reading
   * @description Store a temperature reading from the station's external temperature sensor
   * @paramPath station_id - The station's unique ID - @type(string) @required
   * @requestBody temperature - The temperature value - @type(number) @required
   * @responseBody 201 - The created temperature reading
   */
  async store({ request, response, params }: HttpContext) {
    // Capture arrival timestamp immediately for accuracy
    const arrivalTimestamp = new Date().toISOString();

    const rawTemperature = request.input('temperature');

    if (rawTemperature === undefined) {
      return response.badRequest({ error: 'Temperature value is required' });
    }

    // Use station-provided timestamp if available, otherwise use server arrival time
    const temperatureTimestamp: string = request.input('timestamp') || arrivalTimestamp;

    // Silently filter implausible readings (sensor errors, non-numbers) —
    // NEVER a 400: the station shouldn't retry these
    const parsed = temperatureValueSchema.safeParse(rawTemperature);
    if (!parsed.success) {
      console.warn(
        `Filtered invalid temperature reading: ${rawTemperature}°C from station ${params.station_id}`,
      );
      // Return success but don't update cache/broadcast/store
      return response.created({
        message: 'Reading received',
        filtered: true,
      });
    }
    const temperature = parsed.data;

    // Cache the temperature data
    stationDataCache.setTemperatureData(params.station_id, {
      temperature,
      timestamp: temperatureTimestamp,
    });

    // Broadcast to SSE subscribers with timestamp
    await transmit.broadcast(`temperature/live/${params.station_id}`, {
      temperature,
      timestamp: temperatureTimestamp,
    } satisfies TemperatureLivePayload);

    const reading = await prisma.temperatureReading.create({
      data: {
        stationId: params.station_id,
        temperature,
        readingTimestamp: new Date(temperatureTimestamp),
      },
    });

    // Return the same structure as the old SensorReading for API compatibility
    return response.created({
      id: reading.id,
      sensorId: reading.stationId,
      type: 'temperature',
      temperature: reading.temperature,
      windSpeed: null,
      windDirection: null,
      createdAt: reading.createdAt,
      updatedAt: reading.updatedAt,
    });
  }

  /**
   * @summary Get the most recent temperature reading
   * @description Get the most recent temperature reading for the specified station
   * @paramPath station_id - The station's unique ID - @type(string) @required
   * @responseBody 200 - The most recent temperature reading with last update time
   * @responseBody 404 - Not found
   */
  async latest({ params, response }: HttpContext) {
    const reading = await prisma.temperatureReading.findFirst({
      where: { stationId: params.station_id },
      orderBy: { readingTimestamp: 'desc' },
    });

    if (!reading) return response.notFound({ message: 'No temperature readings found' });

    // Return the same structure as the old SensorReading for API compatibility
    return {
      id: reading.id,
      sensorId: reading.stationId,
      type: 'temperature',
      temperature: reading.temperature,
      windSpeed: null,
      windDirection: null,
      createdAt: reading.createdAt,
      updatedAt: reading.updatedAt,
      lastUpdated: reading.readingTimestamp.toISOString(),
    };
  }

  /**
   * @summary Get temperature history
   * @description Get temperature readings history for the specified station
   * @paramPath station_id - The station's unique ID - @type(string) @required
   * @paramQuery limit - Maximum number of results to return - @type(number)
   * @paramQuery from - Start date (ISO format) - @type(string)
   * @paramQuery to - End date (ISO format) - @type(string)
   * @responseBody 200 - List of temperature readings
   */
  async index({ request, params }: HttpContext) {
    const limit = request.input('limit', 100);
    const from = request.input('from');
    const to = request.input('to');

    const readings = await prisma.temperatureReading.findMany({
      where: {
        stationId: params.station_id,
        ...(from || to
          ? {
              readingTimestamp: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { readingTimestamp: 'desc' },
      take: Number(limit),
    });

    // Return the same structure as the old SensorReading for API compatibility
    return readings.map((reading) => ({
      id: reading.id,
      sensorId: reading.stationId,
      type: 'temperature',
      temperature: reading.temperature,
      windSpeed: null,
      windDirection: null,
      createdAt: reading.createdAt,
      updatedAt: reading.updatedAt,
    }));
  }
}
