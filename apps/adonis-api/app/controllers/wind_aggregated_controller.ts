import type { HttpContext } from '@adonisjs/core/http';
import { DateTime } from 'luxon';

import { prisma } from '#services/prisma';

/**
 * Controller for aggregated wind data endpoints
 */
export default class WindAggregatedController {
  /**
   * Get aggregated wind data for a station
   *
   * GET /api/stations/:station_id/wind/aggregated?interval=1min|10min&date=YYYY-MM-DD&limit=10
   */
  async index({ params, request, response }: HttpContext) {
    const { station_id } = params;
    const { interval = '1min', date, limit } = request.qs();

    // Validate interval parameter
    if (!['1min', '10min'].includes(interval)) {
      return response.badRequest({
        error: 'Invalid interval. Supported intervals: 1min, 10min',
      });
    }

    // Set default limits based on interval
    const defaultLimit = interval === '10min' ? 6 : 10;
    const maxLimit = interval === '10min' ? 144 : 1440; // 144 = full day for 10min, 1440 = full day for 1min

    // Parse and validate limit parameter
    const recordLimit = limit ? parseInt(limit) : defaultLimit;
    if (recordLimit < 1 || recordLimit > maxLimit) {
      return response.badRequest({
        error: `Invalid limit. Must be between 1 and ${maxLimit} for ${interval} interval.`,
      });
    }

    try {
      if (interval === '10min') {
        return await this.get10MinuteData(station_id, date, recordLimit);
      } else {
        return await this.get1MinuteData(station_id, date, recordLimit);
      }
    } catch (error) {
      console.error('Error fetching aggregated wind data:', error);

      // Handle specific validation errors
      if (error.message && error.message.includes('Invalid date format')) {
        return response.badRequest({
          error: error.message,
        });
      }

      return response.internalServerError({
        error: 'Failed to fetch aggregated wind data',
      });
    }
  }

  /**
   * Build the timestamp range filter for a YYYY-MM-DD date (UTC day bounds).
   * Wind timestamps are UTC ISO strings compared lexicographically.
   */
  private dateRange(date: string): { gte: string; lte: string } {
    const queryDate = DateTime.fromISO(date);
    if (!queryDate.isValid) {
      throw new Error('Invalid date format. Use YYYY-MM-DD format.');
    }
    return {
      gte: queryDate.startOf('day').toUTC().toISO()!,
      lte: queryDate.endOf('day').toUTC().toISO()!,
    };
  }

  /**
   * Get 1-minute aggregated data
   */
  private async get1MinuteData(stationId: string, date: string | undefined, recordLimit: number) {
    const aggregatedData = await prisma.windData1Min.findMany({
      where: {
        stationId,
        ...(date ? { timestamp: this.dateRange(date) } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: recordLimit,
    });

    const responseDate = date ? DateTime.fromISO(date).toISODate()! : DateTime.now().toISODate()!;

    // Format response data (reverse to get chronological order)
    const formattedData = aggregatedData.reverse().map((record) => ({
      timestamp: record.timestamp,
      avgSpeed: record.avgSpeed,
      minSpeed: record.minSpeed,
      maxSpeed: record.maxSpeed,
      gustSpeed: record.gustSpeed,
      dominantDirection: record.dominantDirection,
      sampleCount: record.sampleCount,
    }));

    return {
      stationId,
      date: responseDate,
      interval: '1min',
      data: formattedData,
      totalRecords: formattedData.length,
    };
  }

  /**
   * Get 10-minute aggregated data
   */
  private async get10MinuteData(stationId: string, date: string | undefined, recordLimit: number) {
    console.log(
      `Fetching 10-minute data for station ${stationId}, date: ${date || 'latest'}, limit: ${recordLimit}`,
    );

    const aggregatedData = await prisma.windData10Min.findMany({
      where: {
        stationId,
        ...(date ? { timestamp: this.dateRange(date) } : {}),
      },
      orderBy: { timestamp: 'desc' },
      take: recordLimit,
    });

    const responseDate = date ? DateTime.fromISO(date).toISODate()! : DateTime.now().toISODate()!;

    console.log(`Found ${aggregatedData.length} 10-minute records for station ${stationId}`);

    // Format response data (reverse to get chronological order)
    const formattedData = aggregatedData.reverse().map((record) => ({
      timestamp: record.timestamp,
      avgSpeed: record.avgSpeed,
      minSpeed: record.minSpeed,
      maxSpeed: record.maxSpeed,
      gustSpeed: record.gustSpeed,
      dominantDirection: record.dominantDirection,
      tendency: record.tendency,
    }));

    return {
      stationId,
      date: responseDate,
      interval: '10min',
      data: formattedData,
      totalRecords: formattedData.length,
    };
  }

  /**
   * Get latest aggregated wind data for a station
   *
   * GET /api/stations/:station_id/wind/aggregated/latest?interval=1min|10min
   */
  async latest({ params, request, response }: HttpContext) {
    const { station_id } = params;
    const { interval = '1min' } = request.qs();

    // Validate interval parameter
    if (!['1min', '10min'].includes(interval)) {
      return response.badRequest({
        error: 'Invalid interval. Supported intervals: 1min, 10min',
      });
    }

    try {
      if (interval === '10min') {
        const latestData = await prisma.windData10Min.findFirst({
          where: { stationId: station_id },
          orderBy: { timestamp: 'desc' },
        });

        if (!latestData) {
          return response.notFound({
            error: 'No 10-minute aggregated wind data found for this station',
          });
        }

        return {
          stationId: station_id,
          timestamp: latestData.timestamp,
          avgSpeed: latestData.avgSpeed,
          minSpeed: latestData.minSpeed,
          maxSpeed: latestData.maxSpeed,
          gustSpeed: latestData.gustSpeed,
          dominantDirection: latestData.dominantDirection,
          tendency: latestData.tendency,
          interval: '10min',
        };
      } else {
        const latestData = await prisma.windData1Min.findFirst({
          where: { stationId: station_id },
          orderBy: { timestamp: 'desc' },
        });

        if (!latestData) {
          return response.notFound({
            error: 'No aggregated wind data found for this station',
          });
        }

        return {
          stationId: station_id,
          timestamp: latestData.timestamp,
          avgSpeed: latestData.avgSpeed,
          minSpeed: latestData.minSpeed,
          maxSpeed: latestData.maxSpeed,
          gustSpeed: latestData.gustSpeed,
          dominantDirection: latestData.dominantDirection,
          sampleCount: latestData.sampleCount,
          interval: '1min',
        };
      }
    } catch (error) {
      console.error('Error fetching latest aggregated wind data:', error);
      return response.internalServerError({
        error: 'Failed to fetch latest aggregated wind data',
      });
    }
  }

  /**
   * Get aggregated wind data with unit conversion
   *
   * GET /api/stations/:station_id/wind/aggregated/converted?interval=1min|10min&date=YYYY-MM-DD&unit=kmh|knots|ms&limit=10
   */
  async converted({ params, request, response }: HttpContext) {
    const { station_id } = params;
    const { interval = '1min', date, unit = 'ms', limit } = request.qs();

    // Validate interval parameter
    if (!['1min', '10min'].includes(interval)) {
      return response.badRequest({
        error: 'Invalid interval. Supported intervals: 1min, 10min',
      });
    }

    // Validate unit parameter
    const validUnits = ['ms', 'kmh', 'knots'];
    if (!validUnits.includes(unit)) {
      return response.badRequest({
        error: `Invalid unit. Supported units: ${validUnits.join(', ')}`,
      });
    }

    // Set default limits based on interval
    const defaultLimit = interval === '10min' ? 6 : 10;
    const maxLimit = interval === '10min' ? 144 : 1440;

    // Parse and validate limit parameter
    const recordLimit = limit ? parseInt(limit) : defaultLimit;
    if (recordLimit < 1 || recordLimit > maxLimit) {
      return response.badRequest({
        error: `Invalid limit. Must be between 1 and ${maxLimit} for ${interval} interval.`,
      });
    }

    try {
      if (date && !DateTime.fromISO(date).isValid) {
        return response.badRequest({
          error: 'Invalid date format. Use YYYY-MM-DD format.',
        });
      }

      const responseDate = date ? DateTime.fromISO(date).toISODate()! : DateTime.now().toISODate()!;

      let responseData: any[];

      if (interval === '10min') {
        const aggregatedData = await prisma.windData10Min.findMany({
          where: {
            stationId: station_id,
            ...(date ? { timestamp: this.dateRange(date) } : {}),
          },
          orderBy: { timestamp: 'desc' },
          take: recordLimit,
        });

        // Format response data with unit conversion (reverse to get chronological order)
        responseData = aggregatedData.reverse().map((record) => ({
          timestamp: record.timestamp,
          avgSpeed: this.convertSpeed(record.avgSpeed, unit),
          minSpeed: this.convertSpeed(record.minSpeed, unit),
          maxSpeed: this.convertSpeed(record.maxSpeed, unit),
          gustSpeed: record.gustSpeed === null ? null : this.convertSpeed(record.gustSpeed, unit),
          dominantDirection: record.dominantDirection,
          tendency: record.tendency,
        }));
      } else {
        const aggregatedData = await prisma.windData1Min.findMany({
          where: {
            stationId: station_id,
            ...(date ? { timestamp: this.dateRange(date) } : {}),
          },
          orderBy: { timestamp: 'desc' },
          take: recordLimit,
        });

        // Format response data with unit conversion (reverse to get chronological order)
        responseData = aggregatedData.reverse().map((record) => ({
          timestamp: record.timestamp,
          avgSpeed: this.convertSpeed(record.avgSpeed, unit),
          minSpeed: this.convertSpeed(record.minSpeed, unit),
          maxSpeed: this.convertSpeed(record.maxSpeed, unit),
          gustSpeed: record.gustSpeed === null ? null : this.convertSpeed(record.gustSpeed, unit),
          dominantDirection: record.dominantDirection,
          sampleCount: record.sampleCount,
        }));
      }

      return {
        stationId: station_id,
        date: responseDate,
        interval,
        unit,
        data: responseData,
        totalRecords: responseData.length,
      };
    } catch (error) {
      console.error('Error fetching converted aggregated wind data:', error);

      // Handle specific validation errors
      if (error.message && error.message.includes('Invalid date format')) {
        return response.badRequest({
          error: error.message,
        });
      }

      return response.internalServerError({
        error: 'Failed to fetch aggregated wind data',
      });
    }
  }

  /**
   * Convert speed based on unit
   */
  private convertSpeed(speedMs: number, unit: string): number {
    switch (unit) {
      case 'kmh':
        return Math.round(speedMs * 3.6 * 100) / 100; // m/s to km/h
      case 'knots':
        return Math.round(speedMs * 1.94384 * 100) / 100; // m/s to knots
      case 'ms':
      default:
        return speedMs;
    }
  }
}
