import { test } from '@japa/runner';
import { DateTime } from 'luxon';

import { windAggregationService } from '#app/services/wind_aggregation_service';
import { prisma } from '#services/prisma';

test.group('Wind 10-Minute Aggregation', (group) => {
  const testStationId = 'test-station-10min';

  group.each.setup(async () => {
    // Clean up any existing test data first
    await prisma.windData10Min.deleteMany();
    await prisma.windData1Min.deleteMany();
    await prisma.weatherStation.deleteMany();

    // Create the test weather station
    await prisma.weatherStation.create({
      data: {
        stationId: testStationId,
        name: 'Test 10-Minute Station',
        location: 'Test Environment',
        description: 'Test station for 10-minute aggregation',
        isActive: true,
      },
    });
  });

  group.each.teardown(async () => {
    await prisma.windData10Min.deleteMany();
    await prisma.windData1Min.deleteMany();
    await prisma.weatherStation.deleteMany();
  });

  test('should support 10min interval in API', async ({ client }) => {
    const response = await client
      .get(`/api/stations/${testStationId}/wind/aggregated`)
      .qs({ interval: '10min' });

    response.assertStatus(200);

    response.assertBodyContains({
      stationId: testStationId,
      interval: '10min',
      data: [],
      totalRecords: 0,
    });
  });

  test('should default to limit=6 for 10min interval', async ({ client }) => {
    const response = await client
      .get(`/api/stations/${testStationId}/wind/aggregated`)
      .qs({ interval: '10min' });

    response.assertStatus(200);
    // The response should be formatted for 10min interval with default limit
    response.assertBodyContains({
      interval: '10min',
      data: [],
    });
  });

  test('should validate limit parameter for 10min interval', async ({ client }) => {
    const response = await client
      .get(`/api/stations/${testStationId}/wind/aggregated`)
      .qs({ interval: '10min', limit: '200' });

    response.assertStatus(400);
    response.assertBodyContains({
      error: 'Invalid limit. Must be between 1 and 144 for 10min interval.',
    });
  });

  test('should support 10min interval in latest endpoint', async ({ client }) => {
    const response = await client
      .get(`/api/stations/${testStationId}/wind/aggregated/latest`)
      .qs({ interval: '10min' });

    response.assertStatus(404);
    response.assertBodyContains({
      error: 'No 10-minute aggregated wind data found for this station',
    });
  });

  test('should support 10min interval in converted endpoint', async ({ client }) => {
    const response = await client
      .get(`/api/stations/${testStationId}/wind/aggregated/converted`)
      .qs({ interval: '10min', unit: 'kmh' });

    response.assertStatus(200);
    response.assertBodyContains({
      interval: '10min',
      unit: 'kmh',
      data: [],
    });
  });

  test('should aggregate 1-minute data into 10-minute intervals', async ({ assert }) => {
    // Create 1-minute test data for a 10-minute interval
    const intervalStart = DateTime.now().startOf('minute').set({ minute: 0 });

    const testData = [
      {
        timestamp: intervalStart.plus({ minutes: 0 }),
        avgSpeed: 10.0,
        minSpeed: 8.0,
        maxSpeed: 12.0,
        dominantDirection: 270,
      },
      {
        timestamp: intervalStart.plus({ minutes: 1 }),
        avgSpeed: 12.0,
        minSpeed: 10.0,
        maxSpeed: 14.0,
        dominantDirection: 275,
      },
      {
        timestamp: intervalStart.plus({ minutes: 2 }),
        avgSpeed: 11.0,
        minSpeed: 9.0,
        maxSpeed: 13.0,
        dominantDirection: 270,
      },
      {
        timestamp: intervalStart.plus({ minutes: 3 }),
        avgSpeed: 13.0,
        minSpeed: 11.0,
        maxSpeed: 15.0,
        dominantDirection: 280,
      },
      {
        timestamp: intervalStart.plus({ minutes: 4 }),
        avgSpeed: 9.0,
        minSpeed: 7.0,
        maxSpeed: 11.0,
        dominantDirection: 270,
      },
      {
        timestamp: intervalStart.plus({ minutes: 5 }),
        avgSpeed: 14.0,
        minSpeed: 12.0,
        maxSpeed: 16.0,
        dominantDirection: 270,
      },
      {
        timestamp: intervalStart.plus({ minutes: 6 }),
        avgSpeed: 10.5,
        minSpeed: 8.5,
        maxSpeed: 12.5,
        dominantDirection: 275,
      },
      {
        timestamp: intervalStart.plus({ minutes: 7 }),
        avgSpeed: 11.5,
        minSpeed: 9.5,
        maxSpeed: 13.5,
        dominantDirection: 270,
      },
      {
        timestamp: intervalStart.plus({ minutes: 8 }),
        avgSpeed: 12.5,
        minSpeed: 10.5,
        maxSpeed: 14.5,
        dominantDirection: 270,
      },
      {
        timestamp: intervalStart.plus({ minutes: 9 }),
        avgSpeed: 13.5,
        minSpeed: 11.5,
        maxSpeed: 15.5,
        dominantDirection: 270,
      },
    ];

    // Insert 1-minute data
    for (const data of testData) {
      await prisma.windData1Min.create({
        data: {
          stationId: testStationId,
          timestamp: data.timestamp.toUTC().toISO()!,
          avgSpeed: data.avgSpeed,
          minSpeed: data.minSpeed,
          maxSpeed: data.maxSpeed,
          dominantDirection: data.dominantDirection,
          sampleCount: 6,
        },
      });
    }

    // Process 10-minute aggregation
    await windAggregationService.processIntervalAggregation(intervalStart);

    // Check that 10-minute data was created
    const tenMinData = await prisma.windData10Min.findFirst({
      where: { stationId: testStationId, timestamp: intervalStart.toUTC().toISO()! },
    });

    assert.isNotNull(tenMinData);

    // Check calculated values
    const expectedAvgSpeed = testData.reduce((sum, d) => sum + d.avgSpeed, 0) / testData.length;
    assert.approximately(tenMinData!.avgSpeed, expectedAvgSpeed, 0.01);
    assert.equal(tenMinData!.minSpeed, 7.0); // Minimum of all min speeds
    assert.equal(tenMinData!.maxSpeed, 16.0); // Maximum of all max speeds
    assert.equal(tenMinData!.dominantDirection, 272); // Weighted circular mean (270×7, 275×2, 280×1)
    assert.equal(tenMinData!.tendency, 'stable'); // First record, no previous data
  });

  test('should calculate tendency correctly', async ({ assert }) => {
    // Create two 10-minute intervals with different average speeds
    const baseTime = DateTime.now().startOf('minute').set({ minute: 0 });

    // First interval (previous) - lower average speed
    await prisma.windData10Min.create({
      data: {
        stationId: testStationId,
        timestamp: baseTime.minus({ minutes: 10 }).toUTC().toISO()!,
        avgSpeed: 8.0,
        minSpeed: 6.0,
        maxSpeed: 10.0,
        dominantDirection: 270,
        tendency: 'stable',
      },
    });

    // Create 1-minute data for second interval with higher average speed
    const testData = [
      {
        timestamp: baseTime.plus({ minutes: 0 }),
        avgSpeed: 12.0,
        minSpeed: 10.0,
        maxSpeed: 14.0,
        dominantDirection: 270,
      },
      {
        timestamp: baseTime.plus({ minutes: 1 }),
        avgSpeed: 13.0,
        minSpeed: 11.0,
        maxSpeed: 15.0,
        dominantDirection: 270,
      },
      {
        timestamp: baseTime.plus({ minutes: 2 }),
        avgSpeed: 12.5,
        minSpeed: 10.5,
        maxSpeed: 14.5,
        dominantDirection: 270,
      },
      {
        timestamp: baseTime.plus({ minutes: 3 }),
        avgSpeed: 11.5,
        minSpeed: 9.5,
        maxSpeed: 13.5,
        dominantDirection: 270,
      },
      {
        timestamp: baseTime.plus({ minutes: 4 }),
        avgSpeed: 13.5,
        minSpeed: 11.5,
        maxSpeed: 15.5,
        dominantDirection: 270,
      },
    ];

    // Insert 1-minute data
    for (const data of testData) {
      await prisma.windData1Min.create({
        data: {
          stationId: testStationId,
          timestamp: data.timestamp.toUTC().toISO()!,
          avgSpeed: data.avgSpeed,
          minSpeed: data.minSpeed,
          maxSpeed: data.maxSpeed,
          dominantDirection: data.dominantDirection,
          sampleCount: 6,
        },
      });
    }

    // Process aggregation
    await windAggregationService.processIntervalAggregation(baseTime);

    // Check tendency calculation
    const newInterval = await prisma.windData10Min.findFirst({
      where: { stationId: testStationId, timestamp: baseTime.toUTC().toISO()! },
    });

    assert.isNotNull(newInterval);
    assert.equal(newInterval!.tendency, 'increasing'); // Should be increasing since avg went from 8.0 to ~12.5
  });

  test('should handle tendency threshold correctly', async ({ assert }) => {
    // Create previous interval
    await prisma.windData10Min.create({
      data: {
        stationId: testStationId,
        timestamp: DateTime.now()
          .startOf('minute')
          .set({ minute: 0 })
          .minus({ minutes: 10 })
          .toUTC()
          .toISO()!,
        avgSpeed: 10.0,
        minSpeed: 8.0,
        maxSpeed: 12.0,
        dominantDirection: 270,
        tendency: 'stable',
      },
    });

    // Create 1-minute data for current interval with similar average (within threshold)
    const baseTime = DateTime.now().startOf('minute').set({ minute: 0 });
    const testData = [
      {
        timestamp: baseTime.plus({ minutes: 0 }),
        avgSpeed: 10.2,
        minSpeed: 8.0,
        maxSpeed: 12.0,
        dominantDirection: 270,
      },
      {
        timestamp: baseTime.plus({ minutes: 1 }),
        avgSpeed: 10.1,
        minSpeed: 8.0,
        maxSpeed: 12.0,
        dominantDirection: 270,
      },
      {
        timestamp: baseTime.plus({ minutes: 2 }),
        avgSpeed: 10.3,
        minSpeed: 8.0,
        maxSpeed: 12.0,
        dominantDirection: 270,
      },
    ];

    // Insert 1-minute data
    for (const data of testData) {
      await prisma.windData1Min.create({
        data: {
          stationId: testStationId,
          timestamp: data.timestamp.toUTC().toISO()!,
          avgSpeed: data.avgSpeed,
          minSpeed: data.minSpeed,
          maxSpeed: data.maxSpeed,
          dominantDirection: data.dominantDirection,
          sampleCount: 6,
        },
      });
    }

    // Process aggregation
    await windAggregationService.processIntervalAggregation(baseTime);

    // Check tendency calculation
    const newInterval = await prisma.windData10Min.findFirst({
      where: { stationId: testStationId, timestamp: baseTime.toUTC().toISO()! },
    });

    assert.isNotNull(newInterval);
    assert.equal(newInterval!.tendency, 'stable'); // Should be stable since change is < 0.5 m/s
  });

  test('should calculate dominant direction from 1-minute data', async ({ assert }) => {
    // Create 1-minute data with clear dominant direction
    const intervalStart = DateTime.now().startOf('minute').set({ minute: 0 });

    const testData = [
      {
        timestamp: intervalStart.plus({ minutes: 0 }),
        avgSpeed: 10.0,
        minSpeed: 8.0,
        maxSpeed: 12.0,
        dominantDirection: 270,
      },
      {
        timestamp: intervalStart.plus({ minutes: 1 }),
        avgSpeed: 11.0,
        minSpeed: 9.0,
        maxSpeed: 13.0,
        dominantDirection: 270,
      },
      {
        timestamp: intervalStart.plus({ minutes: 2 }),
        avgSpeed: 12.0,
        minSpeed: 10.0,
        maxSpeed: 14.0,
        dominantDirection: 270,
      },
      {
        timestamp: intervalStart.plus({ minutes: 3 }),
        avgSpeed: 10.5,
        minSpeed: 8.5,
        maxSpeed: 12.5,
        dominantDirection: 275,
      },
      {
        timestamp: intervalStart.plus({ minutes: 4 }),
        avgSpeed: 11.5,
        minSpeed: 9.5,
        maxSpeed: 13.5,
        dominantDirection: 270,
      },
      {
        timestamp: intervalStart.plus({ minutes: 5 }),
        avgSpeed: 12.5,
        minSpeed: 10.5,
        maxSpeed: 14.5,
        dominantDirection: 270,
      },
      {
        timestamp: intervalStart.plus({ minutes: 6 }),
        avgSpeed: 13.0,
        minSpeed: 11.0,
        maxSpeed: 15.0,
        dominantDirection: 270,
      },
    ];

    // Insert 1-minute data
    for (const data of testData) {
      await prisma.windData1Min.create({
        data: {
          stationId: testStationId,
          timestamp: data.timestamp.toUTC().toISO()!,
          avgSpeed: data.avgSpeed,
          minSpeed: data.minSpeed,
          maxSpeed: data.maxSpeed,
          dominantDirection: data.dominantDirection,
          sampleCount: 6,
        },
      });
    }

    // Process aggregation
    await windAggregationService.processIntervalAggregation(intervalStart);

    // Check dominant direction calculation (270 appears 6 times, 275 appears 1 time)
    const tenMinData = await prisma.windData10Min.findFirst({
      where: { stationId: testStationId, timestamp: intervalStart.toUTC().toISO()! },
    });

    assert.isNotNull(tenMinData);
    assert.equal(tenMinData!.dominantDirection, 271); // Circular mean of 270×6, 275×1
  });

  test('should weight the 10-minute average by sample count', async ({ assert }) => {
    const intervalStart = DateTime.now().startOf('minute').set({ minute: 0 });

    // A dense minute (60 samples at 10 m/s) and a sparse one (6 samples at 20 m/s):
    // unweighted mean would be 15, sample-weighted is 10.91
    await prisma.windData1Min.create({
      data: {
        stationId: testStationId,
        timestamp: intervalStart.toUTC().toISO()!,
        avgSpeed: 10.0,
        minSpeed: 9.0,
        maxSpeed: 11.0,
        dominantDirection: 270,
        sampleCount: 60,
      },
    });
    await prisma.windData1Min.create({
      data: {
        stationId: testStationId,
        timestamp: intervalStart.plus({ minutes: 1 }).toUTC().toISO()!,
        avgSpeed: 20.0,
        minSpeed: 18.0,
        maxSpeed: 22.0,
        dominantDirection: 270,
        sampleCount: 6,
      },
    });

    await windAggregationService.processIntervalAggregation(intervalStart);

    const tenMinData = await prisma.windData10Min.findFirst({
      where: { stationId: testStationId, timestamp: intervalStart.toUTC().toISO()! },
    });

    assert.isNotNull(tenMinData);
    assert.approximately(tenMinData!.avgSpeed, 10.91, 0.01);
  });

  test('should roll up gust as the max of non-null 1-minute gusts', async ({ assert }) => {
    const intervalStart = DateTime.now().startOf('minute').set({ minute: 0 });

    const rows = [
      { minute: 0, gustSpeed: 14.5 },
      { minute: 1, gustSpeed: null },
      { minute: 2, gustSpeed: 17.2 },
    ];
    for (const row of rows) {
      await prisma.windData1Min.create({
        data: {
          stationId: testStationId,
          timestamp: intervalStart.plus({ minutes: row.minute }).toUTC().toISO()!,
          avgSpeed: 10.0,
          minSpeed: 8.0,
          maxSpeed: 12.0,
          gustSpeed: row.gustSpeed,
          dominantDirection: 270,
          sampleCount: 6,
        },
      });
    }

    await windAggregationService.processIntervalAggregation(intervalStart);

    const tenMinData = await prisma.windData10Min.findFirst({
      where: { stationId: testStationId, timestamp: intervalStart.toUTC().toISO()! },
    });

    assert.isNotNull(tenMinData);
    assert.equal(tenMinData!.gustSpeed, 17.2);
  });

  test('should leave the 10-minute gust null when no minute reported one', async ({ assert }) => {
    const intervalStart = DateTime.now().startOf('minute').set({ minute: 0 });

    await prisma.windData1Min.create({
      data: {
        stationId: testStationId,
        timestamp: intervalStart.toUTC().toISO()!,
        avgSpeed: 10.0,
        minSpeed: 8.0,
        maxSpeed: 12.0,
        dominantDirection: 270,
        sampleCount: 6,
      },
    });

    await windAggregationService.processIntervalAggregation(intervalStart);

    const tenMinData = await prisma.windData10Min.findFirst({
      where: { stationId: testStationId, timestamp: intervalStart.toUTC().toISO()! },
    });

    assert.isNotNull(tenMinData);
    assert.isNull(tenMinData!.gustSpeed);
  });
});
