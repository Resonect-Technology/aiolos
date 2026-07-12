import { test } from '@japa/runner';
import { DateTime } from 'luxon';

import { windAggregationService } from '#app/services/wind_aggregation_service';
import { prisma } from '#services/prisma';

test.group('Wind Aggregation Service', (group) => {
  const testStationId = 'test-station-aggregation';

  group.each.setup(async () => {
    // Clean up any existing test data
    await prisma.windData1Min.deleteMany();
    await prisma.weatherStation.deleteMany();

    // Create the test weather station
    await prisma.weatherStation.create({
      data: {
        stationId: testStationId,
        name: 'Test Aggregation Station',
        location: 'Test Environment',
        description: 'Test station for wind aggregation',
        isActive: true,
      },
    });
  });

  group.each.teardown(async () => {
    // Clean up after each test
    await prisma.windData1Min.deleteMany();
    await prisma.weatherStation.deleteMany();
  });

  test('should aggregate wind data into 1-minute intervals', async ({ assert }) => {
    // Process multiple data points for the same minute
    const baseTimestamp = DateTime.now().startOf('minute').toISO();

    await windAggregationService.processWindData(testStationId, 10.0, 180, baseTimestamp);
    await windAggregationService.processWindData(testStationId, 15.0, 180, baseTimestamp);
    await windAggregationService.processWindData(testStationId, 8.0, 190, baseTimestamp);

    // Force flush to save the aggregated data
    await windAggregationService.forceFlushBuckets();

    // Check that aggregated data was saved
    const aggregatedData = await prisma.windData1Min.findFirst({
      where: { stationId: testStationId },
    });

    assert.isNotNull(aggregatedData);
    assert.equal(aggregatedData!.stationId, testStationId);
    assert.equal(aggregatedData!.avgSpeed, 11.0); // (10 + 15 + 8) / 3
    assert.equal(aggregatedData!.minSpeed, 8.0);
    assert.equal(aggregatedData!.maxSpeed, 15.0);
    assert.equal(aggregatedData!.sampleCount, 3);
    assert.equal(aggregatedData!.dominantDirection, 183); // Circular mean of 180, 180, 190
  });

  test('should calculate dominant direction correctly', async ({ assert }) => {
    const baseTimestamp = DateTime.now().startOf('minute').toISO();

    // Add more samples for direction 270 than 180
    await windAggregationService.processWindData(testStationId, 10.0, 180, baseTimestamp);
    await windAggregationService.processWindData(testStationId, 12.0, 270, baseTimestamp);
    await windAggregationService.processWindData(testStationId, 11.0, 270, baseTimestamp);

    await windAggregationService.forceFlushBuckets();

    const aggregatedData = await prisma.windData1Min.findFirst({
      where: { stationId: testStationId },
    });

    assert.isNotNull(aggregatedData);
    assert.equal(aggregatedData!.dominantDirection, 243); // Circular mean of 180, 270, 270
  });

  test('should handle multiple stations independently', async ({ assert }) => {
    const station2Id = 'test-station-2';
    await prisma.weatherStation.create({
      data: {
        stationId: station2Id,
        name: 'Test Station 2',
        location: 'Test Environment',
        description: 'Second test station',
        isActive: true,
      },
    });

    const baseTimestamp = DateTime.now().startOf('minute').toISO();

    await windAggregationService.processWindData(testStationId, 10.0, 180, baseTimestamp);
    await windAggregationService.processWindData(station2Id, 20.0, 270, baseTimestamp);

    await windAggregationService.forceFlushBuckets();

    const station1Data = await prisma.windData1Min.findFirst({
      where: { stationId: testStationId },
    });

    const station2Data = await prisma.windData1Min.findFirst({ where: { stationId: station2Id } });

    assert.isNotNull(station1Data);
    assert.isNotNull(station2Data);
    assert.equal(station1Data!.avgSpeed, 10.0);
    assert.equal(station2Data!.avgSpeed, 20.0);
    assert.equal(station1Data!.dominantDirection, 180);
    assert.equal(station2Data!.dominantDirection, 270);
  });

  test('should fold reported gust and lull into the 1-minute row', async ({ assert }) => {
    const baseTimestamp = DateTime.now().startOf('minute').toISO();

    await windAggregationService.processWindData(
      testStationId,
      10.0,
      180,
      baseTimestamp,
      14.0,
      7.0,
    );
    await windAggregationService.processWindData(
      testStationId,
      11.0,
      180,
      baseTimestamp,
      16.5,
      6.0,
    );

    await windAggregationService.forceFlushBuckets();

    const row = await prisma.windData1Min.findFirst({ where: { stationId: testStationId } });

    assert.isNotNull(row);
    assert.equal(row!.gustSpeed, 16.5); // Max of reported gusts (> max raw sample 11.0)
    assert.equal(row!.minSpeed, 6.0); // Reported lull lowers the row minimum
  });

  test('should leave gust null when firmware reports none', async ({ assert }) => {
    const baseTimestamp = DateTime.now().startOf('minute').toISO();

    await windAggregationService.processWindData(testStationId, 10.0, 180, baseTimestamp);

    await windAggregationService.forceFlushBuckets();

    const row = await prisma.windData1Min.findFirst({ where: { stationId: testStationId } });

    assert.isNotNull(row);
    assert.isNull(row!.gustSpeed);
  });

  test('should merge late samples into an already-flushed minute', async ({ assert }) => {
    const baseTimestamp = DateTime.now().startOf('minute').toISO();

    await windAggregationService.processWindData(testStationId, 10.0, 180, baseTimestamp);
    await windAggregationService.forceFlushBuckets();

    // Late samples for the same minute would previously violate the unique
    // constraint and be silently dropped
    await windAggregationService.processWindData(testStationId, 20.0, 180, baseTimestamp);
    await windAggregationService.processWindData(testStationId, 30.0, 180, baseTimestamp);
    await windAggregationService.forceFlushBuckets();

    const rows = await prisma.windData1Min.findMany({ where: { stationId: testStationId } });

    assert.lengthOf(rows, 1);
    assert.equal(rows[0].sampleCount, 3);
    assert.equal(rows[0].avgSpeed, 20.0); // (10 + 20 + 30) / 3, sample-weighted
    assert.equal(rows[0].minSpeed, 10.0);
    assert.equal(rows[0].maxSpeed, 30.0);
    assert.equal(rows[0].dominantDirection, 180);
  });

  test('should flush pending buckets before the 10-minute rollup', async ({ assert }) => {
    // Build a bucket, then backdate it to a completed minute: this mirrors
    // the boundary race where the interval's final minute is still in memory
    // when the 10-minute job fires (the 30 s flush timer hasn't run yet)
    const currentMinute = DateTime.now().startOf('minute');
    await windAggregationService.processWindData(testStationId, 12.0, 180, currentMinute.toISO());

    const internals = windAggregationService as unknown as {
      buckets: Map<string, { intervalStart: DateTime }>;
    };
    for (const bucket of internals.buckets.values()) {
      bucket.intervalStart = currentMinute.minus({ minutes: 1 });
    }

    await windAggregationService.process10MinuteAggregation();

    // The backdated minute must have been persisted by the rollup's flush
    const flushed = await prisma.windData1Min.findFirst({
      where: { stationId: testStationId },
    });
    assert.isNotNull(flushed);
    assert.equal(flushed!.avgSpeed, 12.0);
    assert.equal(windAggregationService.getBucketCount(), 0);
  });

  test('should provide bucket monitoring information', async ({ assert }) => {
    const baseTimestamp = DateTime.now().startOf('minute').toISO();

    await windAggregationService.processWindData(testStationId, 10.0, 180, baseTimestamp);

    const bucketCount = windAggregationService.getBucketCount();
    const bucketInfo = windAggregationService.getBucketInfo();

    assert.equal(bucketCount, 1);
    assert.equal(bucketInfo.length, 1);
    assert.equal(bucketInfo[0].stationId, testStationId);
    assert.equal(bucketInfo[0].sampleCount, 1);
  });
});
