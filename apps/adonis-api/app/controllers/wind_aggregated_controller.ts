import type { HttpContext } from '@adonisjs/core/http';
import { DateTime } from 'luxon';

import { prisma } from '#services/prisma';
import {
  aggregateIntervalQuerySchema,
  dateQuerySchema,
  limitQuerySchema,
  windUnitQuerySchema,
} from '#validators/wind_aggregated';

/**
 * Controller for aggregated wind data endpoints
 */
export default class WindAggregatedController {
  /**
   * Default/max record limits per interval (max = a full day for 1min/10min,
   * a full month for hourly)
   */
  private limits(interval: '1min' | '10min' | 'hourly'): {
    defaultLimit: number;
    maxLimit: number;
  } {
    switch (interval) {
      case 'hourly':
        return { defaultLimit: 24, maxLimit: 744 };
      case '10min':
        return { defaultLimit: 6, maxLimit: 144 };
      default:
        return { defaultLimit: 10, maxLimit: 1440 };
    }
  }

  /**
   * Get aggregated wind data for a station
   *
   * GET /api/stations/:station_id/wind/aggregated?interval=1min|10min|hourly&date=YYYY-MM-DD&limit=10
   */
  async index({ params, request, response }: HttpContext) {
    const { station_id } = params;
    const qs = request.qs();

    // Validate interval parameter
    const intervalResult = aggregateIntervalQuerySchema.safeParse(qs.interval);
    if (!intervalResult.success) {
      return response.badRequest({
        error: 'Invalid interval. Supported intervals: 1min, 10min, hourly',
      });
    }
    const interval = intervalResult.data;

    // Set default limits based on interval
    const { defaultLimit, maxLimit } = this.limits(interval);

    // Parse and validate limit parameter
    const limitResult = limitQuerySchema(defaultLimit, maxLimit).safeParse(qs.limit);
    if (!limitResult.success) {
      return response.badRequest({
        error: `Invalid limit. Must be between 1 and ${maxLimit} for ${interval} interval.`,
      });
    }
    const recordLimit = limitResult.data;

    // Validate date parameter (dateRange keeps its own check as a safety net)
    const dateResult = dateQuerySchema.safeParse(qs.date);
    if (!dateResult.success) {
      return response.badRequest({
        error: 'Invalid date format. Use YYYY-MM-DD format.',
      });
    }
    const date = dateResult.data;

    try {
      if (interval === 'hourly') {
        return await this.getHourlyData(station_id, date, recordLimit);
      } else if (interval === '10min') {
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
   * Get hourly aggregated data (rollup of the 10-minute data, kept forever)
   */
  private async getHourlyData(stationId: string, date: string | undefined, recordLimit: number) {
    const aggregatedData = await prisma.windDataHourly.findMany({
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
      intervalCount: record.intervalCount,
    }));

    return {
      stationId,
      date: responseDate,
      interval: 'hourly',
      data: formattedData,
      totalRecords: formattedData.length,
    };
  }

  /**
   * Get latest aggregated wind data for a station
   *
   * GET /api/stations/:station_id/wind/aggregated/latest?interval=1min|10min|hourly
   */
  async latest({ params, request, response }: HttpContext) {
    const { station_id } = params;

    // Validate interval parameter
    const intervalResult = aggregateIntervalQuerySchema.safeParse(request.qs().interval);
    if (!intervalResult.success) {
      return response.badRequest({
        error: 'Invalid interval. Supported intervals: 1min, 10min, hourly',
      });
    }
    const interval = intervalResult.data;

    try {
      if (interval === 'hourly') {
        const latestData = await prisma.windDataHourly.findFirst({
          where: { stationId: station_id },
          orderBy: { timestamp: 'desc' },
        });

        if (!latestData) {
          return response.notFound({
            error: 'No hourly aggregated wind data found for this station',
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
          intervalCount: latestData.intervalCount,
          interval: 'hourly',
        };
      } else if (interval === '10min') {
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
   * GET /api/stations/:station_id/wind/aggregated/converted?interval=1min|10min|hourly&date=YYYY-MM-DD&unit=kmh|knots|ms&limit=10
   */
  async converted({ params, request, response }: HttpContext) {
    const { station_id } = params;
    const qs = request.qs();

    // Validate interval parameter
    const intervalResult = aggregateIntervalQuerySchema.safeParse(qs.interval);
    if (!intervalResult.success) {
      return response.badRequest({
        error: 'Invalid interval. Supported intervals: 1min, 10min, hourly',
      });
    }
    const interval = intervalResult.data;

    // Validate unit parameter
    const unitResult = windUnitQuerySchema.safeParse(qs.unit);
    if (!unitResult.success) {
      return response.badRequest({
        error: 'Invalid unit. Supported units: ms, kmh, knots',
      });
    }
    const unit = unitResult.data;

    // Set default limits based on interval
    const { defaultLimit, maxLimit } = this.limits(interval);

    // Parse and validate limit parameter
    const limitResult = limitQuerySchema(defaultLimit, maxLimit).safeParse(qs.limit);
    if (!limitResult.success) {
      return response.badRequest({
        error: `Invalid limit. Must be between 1 and ${maxLimit} for ${interval} interval.`,
      });
    }
    const recordLimit = limitResult.data;

    try {
      const dateResult = dateQuerySchema.safeParse(qs.date);
      if (!dateResult.success) {
        return response.badRequest({
          error: 'Invalid date format. Use YYYY-MM-DD format.',
        });
      }
      const date = dateResult.data;

      const responseDate = date ? DateTime.fromISO(date).toISODate()! : DateTime.now().toISODate()!;

      let responseData: any[];

      if (interval === 'hourly') {
        const aggregatedData = await prisma.windDataHourly.findMany({
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
          intervalCount: record.intervalCount,
        }));
      } else if (interval === '10min') {
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
