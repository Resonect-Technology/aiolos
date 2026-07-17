import { DateTime } from 'luxon';

import { prisma } from '#services/prisma';
import { circularMean } from '#services/wind_aggregation_service';

/**
 * Rollup Service
 *
 * Downsamples time-series data into coarse aggregates that are kept
 * indefinitely (no retention policy), while the fine-grained sources are
 * eventually deleted by the retention cleanup:
 *
 * - temperature_readings (5 min) -> temperature_hourly
 * - wind_data_10min             -> wind_data_hourly
 * - station_diagnostics (5 min) -> station_diagnostics_daily
 *
 * Rollup timestamps are UTC ISO-8601 strings (hour start) / "YYYY-MM-DD"
 * (UTC day), compared lexicographically — same convention as the wind
 * aggregate tables. All writes are upserts on the (stationId, timestamp)
 * unique key, so reruns and overlapping runs are safe.
 *
 * `catchUp()` MUST run before the retention cleanup (bin/server.ts chains
 * them) so data is always downsampled before it can be deleted.
 */
export class RollupService {
  /**
   * Fill missing rollup intervals. The most recent complete interval is
   * always recomputed (late data may have arrived); older intervals are
   * skipped when a row already exists. When a rollup table is still empty,
   * the lookback extends to the oldest source row — this is the one-time
   * backfill on the first boot after the tables are introduced.
   */
  async catchUp(options?: { lookbackDays?: number }): Promise<void> {
    const lookbackHours = options?.lookbackDays ? options.lookbackDays * 24 : 48;
    const lookbackDays = options?.lookbackDays ?? 7;

    await this.catchUpHourly('temperature', lookbackHours);
    await this.catchUpHourly('wind', lookbackHours);
    await this.catchUpDiagnosticsDaily(lookbackDays);
  }

  /**
   * Roll up one hour of temperature readings into temperature_hourly
   */
  async rollupTemperatureHour(hourStart: DateTime): Promise<void> {
    const start = hourStart.toUTC().startOf('hour');
    const timestamp = start.toISO()!;

    const groups = await prisma.temperatureReading.groupBy({
      by: ['stationId'],
      where: {
        readingTimestamp: { gte: start.toJSDate(), lt: start.plus({ hours: 1 }).toJSDate() },
      },
      _avg: { temperature: true },
      _min: { temperature: true },
      _max: { temperature: true },
      _count: { _all: true },
    });

    for (const group of groups) {
      if (group._avg.temperature === null) continue;
      const data = {
        avgTemperature: Math.round(group._avg.temperature * 100) / 100,
        minTemperature: group._min.temperature!,
        maxTemperature: group._max.temperature!,
        sampleCount: group._count._all,
      };
      await prisma.temperatureHourly.upsert({
        where: { stationId_timestamp: { stationId: group.stationId, timestamp } },
        update: data,
        create: { stationId: group.stationId, timestamp, ...data },
      });
    }
  }

  /**
   * Roll up one hour of 10-minute wind aggregates into wind_data_hourly.
   * The 10-minute rows cover equal windows, so a plain mean of their
   * averages is sound; direction is the circular mean of the six dominant
   * directions.
   */
  async rollupWindHour(hourStart: DateTime): Promise<void> {
    const start = hourStart.toUTC().startOf('hour');
    const timestamp = start.toISO()!;

    const rows = await prisma.windData10Min.findMany({
      where: { timestamp: { gte: timestamp, lt: start.plus({ hours: 1 }).toISO()! } },
      orderBy: { timestamp: 'asc' },
    });

    const byStation = new Map<string, typeof rows>();
    for (const row of rows) {
      const stationRows = byStation.get(row.stationId) ?? [];
      stationRows.push(row);
      byStation.set(row.stationId, stationRows);
    }

    for (const [stationId, stationRows] of byStation.entries()) {
      const avgSpeed = stationRows.reduce((sum, r) => sum + r.avgSpeed, 0) / stationRows.length;
      const gusts = stationRows.map((r) => r.gustSpeed).filter((g): g is number => g !== null);

      let sinSum = 0;
      let cosSum = 0;
      for (const row of stationRows) {
        const radians = (row.dominantDirection * Math.PI) / 180;
        sinSum += Math.sin(radians);
        cosSum += Math.cos(radians);
      }

      const data = {
        avgSpeed: Math.round(avgSpeed * 100) / 100,
        minSpeed: Math.min(...stationRows.map((r) => r.minSpeed)),
        maxSpeed: Math.max(...stationRows.map((r) => r.maxSpeed)),
        gustSpeed: gusts.length > 0 ? Math.max(...gusts) : null,
        dominantDirection: circularMean(sinSum, cosSum),
        intervalCount: stationRows.length,
      };
      await prisma.windDataHourly.upsert({
        where: { stationId_timestamp: { stationId, timestamp } },
        update: data,
        create: { stationId, timestamp, ...data },
      });
    }
  }

  /**
   * Roll up one UTC day of diagnostics into station_diagnostics_daily
   */
  async rollupDiagnosticsDay(dayStart: DateTime): Promise<void> {
    const start = dayStart.toUTC().startOf('day');
    const date = start.toISODate()!;

    const groups = await prisma.stationDiagnostic.groupBy({
      by: ['stationId'],
      where: { createdAt: { gte: start.toJSDate(), lt: start.plus({ days: 1 }).toJSDate() } },
      _min: { batteryVoltage: true, solarVoltage: true, internalTemperature: true },
      _avg: {
        batteryVoltage: true,
        solarVoltage: true,
        internalTemperature: true,
        signalQuality: true,
      },
      _max: { batteryVoltage: true, solarVoltage: true, internalTemperature: true },
      _count: { _all: true },
    });

    const round2 = (value: number) => Math.round(value * 100) / 100;

    for (const group of groups) {
      if (group._avg.batteryVoltage === null || group._avg.solarVoltage === null) continue;
      const data = {
        batteryMin: group._min.batteryVoltage!,
        batteryAvg: round2(group._avg.batteryVoltage),
        batteryMax: group._max.batteryVoltage!,
        solarMin: group._min.solarVoltage!,
        solarAvg: round2(group._avg.solarVoltage),
        solarMax: group._max.solarVoltage!,
        signalQualityAvg: round2(group._avg.signalQuality ?? 0),
        internalTempMin: group._min.internalTemperature,
        internalTempAvg:
          group._avg.internalTemperature === null ? null : round2(group._avg.internalTemperature),
        internalTempMax: group._max.internalTemperature,
        sampleCount: group._count._all,
      };
      await prisma.diagnosticsDaily.upsert({
        where: { stationId_date: { stationId: group.stationId, date } },
        update: data,
        create: { stationId: group.stationId, date, ...data },
      });
    }
  }

  /**
   * Fill missing hourly rollups for one source (temperature or wind)
   */
  private async catchUpHourly(
    source: 'temperature' | 'wind',
    lookbackHours: number,
  ): Promise<void> {
    // The current hour is still accumulating data — only earlier hours are complete
    const lastComplete = DateTime.utc().startOf('hour').minus({ hours: 1 });
    let start: DateTime = lastComplete.minus({ hours: lookbackHours });

    // Empty rollup table: backfill from the oldest source row instead
    const rollupCount =
      source === 'temperature'
        ? await prisma.temperatureHourly.count()
        : await prisma.windDataHourly.count();
    if (rollupCount === 0) {
      const oldestHour = await this.oldestSourceHour(source);
      if (!oldestHour) return; // no source data at all
      start = oldestHour;
      console.log(`Rollup backfill (${source} hourly): starting from ${start.toISO()}`);
    }

    for (let hour = start; hour <= lastComplete; hour = hour.plus({ hours: 1 })) {
      try {
        if (hour < lastComplete) {
          const timestamp = hour.toISO()!;
          const existing =
            source === 'temperature'
              ? await prisma.temperatureHourly.findFirst({ where: { timestamp } })
              : await prisma.windDataHourly.findFirst({ where: { timestamp } });
          if (existing) continue;
        }
        if (source === 'temperature') {
          await this.rollupTemperatureHour(hour);
        } else {
          await this.rollupWindHour(hour);
        }
      } catch (error) {
        console.error(`Error rolling up ${source} hour ${hour.toISO()}:`, error);
      }
    }
  }

  /**
   * Hour of the oldest source row, for the one-time backfill
   */
  private async oldestSourceHour(source: 'temperature' | 'wind'): Promise<DateTime | null> {
    if (source === 'temperature') {
      const oldest = await prisma.temperatureReading.findFirst({
        orderBy: { readingTimestamp: 'asc' },
      });
      return oldest ? DateTime.fromJSDate(oldest.readingTimestamp).toUTC().startOf('hour') : null;
    }
    const oldest = await prisma.windData10Min.findFirst({ orderBy: { timestamp: 'asc' } });
    return oldest ? DateTime.fromISO(oldest.timestamp).toUTC().startOf('hour') : null;
  }

  /**
   * Fill missing daily diagnostics rollups
   */
  private async catchUpDiagnosticsDaily(lookbackDays: number): Promise<void> {
    // Today is still accumulating — yesterday is the most recent complete day
    const lastComplete = DateTime.utc().startOf('day').minus({ days: 1 });
    let start: DateTime = lastComplete.minus({ days: lookbackDays });

    const count = await prisma.diagnosticsDaily.count();
    if (count === 0) {
      const oldest = await prisma.stationDiagnostic.findFirst({ orderBy: { createdAt: 'asc' } });
      if (!oldest) return;
      if (oldest.createdAt) {
        start = DateTime.fromJSDate(oldest.createdAt).toUTC().startOf('day');
        console.log(`Rollup backfill (diagnostics daily): starting from ${start.toISODate()}`);
      }
    }

    for (let day = start; day <= lastComplete; day = day.plus({ days: 1 })) {
      try {
        if (day < lastComplete) {
          const existing = await prisma.diagnosticsDaily.findFirst({
            where: { date: day.toISODate()! },
          });
          if (existing) continue;
        }
        await this.rollupDiagnosticsDay(day);
      } catch (error) {
        console.error(`Error rolling up diagnostics day ${day.toISODate()}:`, error);
      }
    }
  }
}

// Export singleton instance
export const rollupService = new RollupService();
