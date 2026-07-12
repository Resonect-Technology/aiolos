import { test } from '@japa/runner';
import { DateTime } from 'luxon';

import { rollupService } from '#app/services/rollup_service';
import { prisma } from '#services/prisma';

test.group('Rollup Service', (group) => {
  const testStationId = 'test-station-rollup';

  const cleanup = async () => {
    await prisma.temperatureReading.deleteMany();
    await prisma.temperatureHourly.deleteMany();
    await prisma.windData10Min.deleteMany();
    await prisma.windDataHourly.deleteMany();
    await prisma.stationDiagnostic.deleteMany();
    await prisma.diagnosticsDaily.deleteMany();
    await prisma.weatherStation.deleteMany();
  };

  group.each.setup(async () => {
    await cleanup();
    await prisma.weatherStation.create({
      data: {
        stationId: testStationId,
        name: 'Test Rollup Station',
        location: 'Test Environment',
        description: 'Test station for rollups',
        isActive: true,
      },
    });
  });

  group.each.teardown(cleanup);

  test('should roll up an hour of temperature readings into avg/min/max', async ({ assert }) => {
    const hour = DateTime.utc().startOf('hour').minus({ hours: 2 });

    await prisma.temperatureReading.createMany({
      data: [20.0, 22.0, 27.0].map((temperature, index) => ({
        stationId: testStationId,
        temperature,
        readingTimestamp: hour.plus({ minutes: index * 5 }).toJSDate(),
      })),
    });
    // A reading outside the hour must not be included
    await prisma.temperatureReading.create({
      data: {
        stationId: testStationId,
        temperature: 99.0,
        readingTimestamp: hour.plus({ hours: 1 }).toJSDate(),
      },
    });

    await rollupService.rollupTemperatureHour(hour);

    const rows = await prisma.temperatureHourly.findMany();
    assert.lengthOf(rows, 1);
    assert.equal(rows[0].timestamp, hour.toISO()!);
    assert.equal(rows[0].avgTemperature, 23.0);
    assert.equal(rows[0].minTemperature, 20.0);
    assert.equal(rows[0].maxTemperature, 27.0);
    assert.equal(rows[0].sampleCount, 3);
  });

  test('should roll up an hour of 10-minute wind data with circular direction', async ({
    assert,
  }) => {
    const hour = DateTime.utc().startOf('hour').minus({ hours: 2 });

    // Directions straddling north: circular mean of 350 and 10 is 0, not 180
    await prisma.windData10Min.createMany({
      data: [
        {
          stationId: testStationId,
          timestamp: hour.toISO()!,
          avgSpeed: 10.0,
          minSpeed: 8.0,
          maxSpeed: 12.0,
          gustSpeed: null,
          dominantDirection: 350,
          tendency: 'stable',
        },
        {
          stationId: testStationId,
          timestamp: hour.plus({ minutes: 10 }).toISO()!,
          avgSpeed: 14.0,
          minSpeed: 9.0,
          maxSpeed: 16.0,
          gustSpeed: 18.0,
          dominantDirection: 10,
          tendency: 'increasing',
        },
      ],
    });

    await rollupService.rollupWindHour(hour);

    const rows = await prisma.windDataHourly.findMany();
    assert.lengthOf(rows, 1);
    assert.equal(rows[0].timestamp, hour.toISO()!);
    assert.equal(rows[0].avgSpeed, 12.0);
    assert.equal(rows[0].minSpeed, 8.0);
    assert.equal(rows[0].maxSpeed, 16.0);
    assert.equal(rows[0].gustSpeed, 18.0);
    assert.equal(rows[0].dominantDirection, 0);
    assert.equal(rows[0].intervalCount, 2);
  });

  test('should keep gustSpeed null when no 10-minute row reported a gust', async ({ assert }) => {
    const hour = DateTime.utc().startOf('hour').minus({ hours: 2 });

    await prisma.windData10Min.create({
      data: {
        stationId: testStationId,
        timestamp: hour.toISO()!,
        avgSpeed: 5.0,
        minSpeed: 4.0,
        maxSpeed: 6.0,
        gustSpeed: null,
        dominantDirection: 90,
        tendency: 'stable',
      },
    });

    await rollupService.rollupWindHour(hour);

    const rows = await prisma.windDataHourly.findMany();
    assert.lengthOf(rows, 1);
    assert.isNull(rows[0].gustSpeed);
  });

  test('should roll up a day of diagnostics into daily min/avg/max', async ({ assert }) => {
    const day = DateTime.utc().startOf('day').minus({ days: 2 });

    await prisma.stationDiagnostic.createMany({
      data: [
        { batteryVoltage: 3.8, solarVoltage: 5.0, internalTemperature: 30.0, signalQuality: 20 },
        { batteryVoltage: 4.0, solarVoltage: 6.0, internalTemperature: 34.0, signalQuality: 24 },
        { batteryVoltage: 4.2, solarVoltage: 1.0, internalTemperature: null, signalQuality: 28 },
      ].map((values, index) => ({
        stationId: testStationId,
        uptime: 1000,
        createdAt: day.plus({ hours: index * 6 }).toJSDate(),
        ...values,
      })),
    });

    await rollupService.rollupDiagnosticsDay(day);

    const rows = await prisma.diagnosticsDaily.findMany();
    assert.lengthOf(rows, 1);
    assert.equal(rows[0].date, day.toISODate()!);
    assert.equal(rows[0].batteryMin, 3.8);
    assert.equal(rows[0].batteryAvg, 4.0);
    assert.equal(rows[0].batteryMax, 4.2);
    assert.equal(rows[0].solarMin, 1.0);
    assert.equal(rows[0].solarAvg, 4.0);
    assert.equal(rows[0].solarMax, 6.0);
    assert.equal(rows[0].signalQualityAvg, 24);
    assert.equal(rows[0].internalTempMin, 30.0);
    assert.equal(rows[0].internalTempAvg, 32.0);
    assert.equal(rows[0].internalTempMax, 34.0);
    assert.equal(rows[0].sampleCount, 3);
  });

  test('should be idempotent — rerunning a rollup updates the same row', async ({ assert }) => {
    const hour = DateTime.utc().startOf('hour').minus({ hours: 2 });

    await prisma.temperatureReading.create({
      data: {
        stationId: testStationId,
        temperature: 20.0,
        readingTimestamp: hour.toJSDate(),
      },
    });

    await rollupService.rollupTemperatureHour(hour);
    await prisma.temperatureReading.create({
      data: {
        stationId: testStationId,
        temperature: 30.0,
        readingTimestamp: hour.plus({ minutes: 5 }).toJSDate(),
      },
    });
    await rollupService.rollupTemperatureHour(hour);

    const rows = await prisma.temperatureHourly.findMany();
    assert.lengthOf(rows, 1);
    assert.equal(rows[0].avgTemperature, 25.0);
    assert.equal(rows[0].sampleCount, 2);
  });

  test('catchUp should backfill empty rollup tables from the oldest data', async ({ assert }) => {
    // Data older than the default 48h lookback — only reachable via the
    // empty-table backfill
    const oldHour = DateTime.utc().startOf('hour').minus({ days: 4 });
    const oldDay = DateTime.utc().startOf('day').minus({ days: 10 });

    await prisma.temperatureReading.create({
      data: {
        stationId: testStationId,
        temperature: 21.0,
        readingTimestamp: oldHour.toJSDate(),
      },
    });
    await prisma.windData10Min.create({
      data: {
        stationId: testStationId,
        timestamp: oldHour.toISO()!,
        avgSpeed: 7.0,
        minSpeed: 6.0,
        maxSpeed: 8.0,
        dominantDirection: 180,
        tendency: 'stable',
      },
    });
    await prisma.stationDiagnostic.create({
      data: {
        stationId: testStationId,
        batteryVoltage: 4.0,
        solarVoltage: 5.0,
        signalQuality: 20,
        uptime: 1000,
        createdAt: oldDay.toJSDate(),
      },
    });

    await rollupService.catchUp();

    assert.lengthOf(await prisma.temperatureHourly.findMany(), 1);
    assert.lengthOf(await prisma.windDataHourly.findMany(), 1);
    assert.lengthOf(await prisma.diagnosticsDaily.findMany(), 1);
  });

  test('catchUp should fill gaps and recompute the most recent complete hour', async ({
    assert,
  }) => {
    const lastComplete = DateTime.utc().startOf('hour').minus({ hours: 1 });
    const gapHour = lastComplete.minus({ hours: 5 });

    await prisma.temperatureReading.createMany({
      data: [
        { temperature: 18.0, readingTimestamp: gapHour.toJSDate() },
        { temperature: 20.0, readingTimestamp: lastComplete.toJSDate() },
      ].map((values) => ({ stationId: testStationId, ...values })),
    });

    // Existing rollup for the most recent complete hour, computed before a
    // late reading arrived
    await rollupService.rollupTemperatureHour(lastComplete);
    await prisma.temperatureReading.create({
      data: {
        stationId: testStationId,
        temperature: 24.0,
        readingTimestamp: lastComplete.plus({ minutes: 30 }).toJSDate(),
      },
    });

    await rollupService.catchUp();

    const rows = await prisma.temperatureHourly.findMany({ orderBy: { timestamp: 'asc' } });
    assert.lengthOf(rows, 2);
    // Gap hour was filled
    assert.equal(rows[0].timestamp, gapHour.toISO()!);
    // Most recent complete hour was recomputed with the late reading
    assert.equal(rows[1].timestamp, lastComplete.toISO()!);
    assert.equal(rows[1].sampleCount, 2);
    assert.equal(rows[1].avgTemperature, 22.0);
  });
});
