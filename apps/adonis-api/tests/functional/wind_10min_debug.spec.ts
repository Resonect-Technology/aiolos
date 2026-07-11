import { test } from '@japa/runner';
import { DateTime } from 'luxon';

import { windAggregationService } from '#app/services/wind_aggregation_service';
import { prisma } from '#services/prisma';

test.group('Wind 10-Minute Aggregation Debug', (group) => {
  const testStationId = 'test-station-10min-debug';

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

  test('should debug aggregation process', async ({ assert }) => {
    // Create simple 1-minute test data for a completed 10-minute interval
    // Use a fixed time that's definitely in the past
    const intervalStart = DateTime.fromISO('2025-01-01T12:00:00.000Z');

    console.log('Interval start:', intervalStart.toISO());
    console.log('Current time:', DateTime.now().toISO());

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
    ];

    // Insert 1-minute data
    for (const data of testData) {
      console.log('Inserting 1-min data:', data.timestamp.toISO());
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

    // Verify 1-minute data was inserted
    const oneMinData = await prisma.windData1Min.findMany({
      where: { stationId: testStationId },
      orderBy: { timestamp: 'asc' },
    });

    console.log('1-minute data count:', oneMinData.length);
    oneMinData.forEach((record) => {
      console.log('1-min record:', record.timestamp, 'avg:', record.avgSpeed);
    });

    // Process 10-minute aggregation
    console.log('Processing 10-minute aggregation for interval:', intervalStart.toISO());
    await windAggregationService.processIntervalAggregation(intervalStart);

    // Check if 10-minute data was created
    const tenMinData = await prisma.windData10Min.findMany({
      where: { stationId: testStationId },
      orderBy: { timestamp: 'asc' },
    });

    console.log('10-minute data count:', tenMinData.length);
    tenMinData.forEach((record) => {
      console.log(
        '10-min record:',
        record.timestamp,
        'avg:',
        record.avgSpeed,
        'tendency:',
        record.tendency,
      );
    });

    // Check that 10-minute data was created
    const tenMinRecord = await prisma.windData10Min.findFirst({
      where: { stationId: testStationId, timestamp: intervalStart.toUTC().toISO()! },
    });

    console.log('Found 10-min record:', tenMinRecord ? 'YES' : 'NO');
    if (tenMinRecord) {
      console.log('10-min record details:', {
        timestamp: tenMinRecord.timestamp,
        avgSpeed: tenMinRecord.avgSpeed,
        minSpeed: tenMinRecord.minSpeed,
        maxSpeed: tenMinRecord.maxSpeed,
        dominantDirection: tenMinRecord.dominantDirection,
        tendency: tenMinRecord.tendency,
      });
    }

    assert.isNotNull(tenMinRecord);
  });
});
