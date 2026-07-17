import { test } from '@japa/runner';
import { DateTime } from 'luxon';

import { prisma } from '#services/prisma';

test.group('Rollup Endpoints', (group) => {
  const testStationId = 'test-station-rollup-api';

  const cleanup = async () => {
    await prisma.temperatureHourly.deleteMany();
    await prisma.windDataHourly.deleteMany();
    await prisma.diagnosticsDaily.deleteMany();
    await prisma.weatherStation.deleteMany();
  };

  group.each.setup(async () => {
    await cleanup();
    await prisma.weatherStation.create({
      data: {
        stationId: testStationId,
        name: 'Test Rollup API Station',
        location: 'Test Environment',
        description: 'Test station for rollup endpoints',
        isActive: true,
      },
    });
  });

  group.each.teardown(cleanup);

  test('should return hourly temperature aggregates in chronological order', async ({
    client,
    assert,
  }) => {
    const hour = DateTime.utc().startOf('hour').minus({ hours: 3 });

    await prisma.temperatureHourly.createMany({
      data: [0, 1, 2].map((offset) => ({
        stationId: testStationId,
        timestamp: hour.plus({ hours: offset }).toISO()!,
        avgTemperature: 20.0 + offset,
        minTemperature: 18.0 + offset,
        maxTemperature: 24.0 + offset,
        sampleCount: 12,
      })),
    });

    const response = await client.get(`/api/stations/${testStationId}/temperature/aggregated`);

    response.assertStatus(200);
    const body = response.body();
    assert.equal(body.stationId, testStationId);
    assert.equal(body.interval, 'hourly');
    assert.equal(body.totalRecords, 3);
    assert.equal(body.data[0].timestamp, hour.toISO()!);
    assert.equal(body.data[0].avgTemperature, 20.0);
    assert.equal(body.data[0].minTemperature, 18.0);
    assert.equal(body.data[0].maxTemperature, 24.0);
    assert.equal(body.data[0].sampleCount, 12);
  });

  test('should filter hourly temperature aggregates by date and respect limit', async ({
    client,
    assert,
  }) => {
    const day = DateTime.utc().minus({ days: 3 }).startOf('day');

    await prisma.temperatureHourly.createMany({
      data: [0, 1, 2].map((offset) => ({
        stationId: testStationId,
        timestamp: day.plus({ hours: offset }).toISO()!,
        avgTemperature: 20.0,
        minTemperature: 18.0,
        maxTemperature: 22.0,
        sampleCount: 12,
      })),
    });
    // Different day — excluded by the date filter
    await prisma.temperatureHourly.create({
      data: {
        stationId: testStationId,
        timestamp: day.plus({ days: 1 }).toISO()!,
        avgTemperature: 30.0,
        minTemperature: 28.0,
        maxTemperature: 32.0,
        sampleCount: 12,
      },
    });

    const response = await client
      .get(`/api/stations/${testStationId}/temperature/aggregated`)
      .qs({ date: day.toISODate()!, limit: 2 });

    response.assertStatus(200);
    const body = response.body();
    assert.equal(body.date, day.toISODate()!);
    assert.equal(body.totalRecords, 2);
  });

  test('should reject an invalid temperature aggregation interval', async ({ client, assert }) => {
    const response = await client
      .get(`/api/stations/${testStationId}/temperature/aggregated`)
      .qs({ interval: '10min' });

    response.assertStatus(400);
    assert.equal(response.body().error, 'Invalid interval. Supported intervals: hourly');
  });

  test('should return daily diagnostics aggregates newest first', async ({ client, assert }) => {
    const today = DateTime.utc().startOf('day');

    await prisma.diagnosticsDaily.createMany({
      data: [1, 2, 40].map((daysAgo) => ({
        stationId: testStationId,
        date: today.minus({ days: daysAgo }).toISODate()!,
        batteryMin: 3.8,
        batteryAvg: 4.0,
        batteryMax: 4.2,
        solarMin: 0.0,
        solarAvg: 3.0,
        solarMax: 6.0,
        signalQualityAvg: 22.0,
        internalTempMin: null,
        internalTempAvg: null,
        internalTempMax: null,
        sampleCount: 288,
      })),
    });

    // Default window is 30 days — the 40-day-old row is excluded
    const response = await client.get(`/api/stations/${testStationId}/diagnostics/aggregated`);

    response.assertStatus(200);
    const body = response.body();
    assert.lengthOf(body, 2);
    assert.equal(body[0].date, today.minus({ days: 1 }).toISODate()!);
    assert.equal(body[0].batteryAvg, 4.0);
    assert.equal(body[0].sampleCount, 288);

    // Widening the window includes it
    const wide = await client
      .get(`/api/stations/${testStationId}/diagnostics/aggregated`)
      .qs({ days: 60 });
    assert.lengthOf(wide.body(), 3);
  });

  test('should return hourly wind aggregates via the wind aggregated endpoint', async ({
    client,
    assert,
  }) => {
    const hour = DateTime.utc().startOf('hour').minus({ hours: 2 });

    await prisma.windDataHourly.create({
      data: {
        stationId: testStationId,
        timestamp: hour.toISO()!,
        avgSpeed: 10.0,
        minSpeed: 6.0,
        maxSpeed: 14.0,
        gustSpeed: 16.0,
        dominantDirection: 200,
        intervalCount: 6,
      },
    });

    const response = await client
      .get(`/api/stations/${testStationId}/wind/aggregated`)
      .qs({ interval: 'hourly' });

    response.assertStatus(200);
    const body = response.body();
    assert.equal(body.interval, 'hourly');
    assert.equal(body.totalRecords, 1);
    assert.equal(body.data[0].avgSpeed, 10.0);
    assert.equal(body.data[0].intervalCount, 6);

    const converted = await client
      .get(`/api/stations/${testStationId}/wind/aggregated/converted`)
      .qs({ interval: 'hourly', unit: 'knots' });

    converted.assertStatus(200);
    const convertedBody = converted.body();
    assert.equal(convertedBody.unit, 'knots');
    assert.equal(convertedBody.data[0].avgSpeed, 19.44); // 10 m/s in knots

    const latest = await client
      .get(`/api/stations/${testStationId}/wind/aggregated/latest`)
      .qs({ interval: 'hourly' });

    latest.assertStatus(200);
    assert.equal(latest.body().timestamp, hour.toISO()!);
  });
});
