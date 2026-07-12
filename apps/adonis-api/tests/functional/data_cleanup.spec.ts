import { test } from '@japa/runner';
import { DateTime } from 'luxon';

import { dataCleanupService } from '#app/services/data_cleanup_service';
import { prisma } from '#services/prisma';

test.group('Data Cleanup Service', (group) => {
  const testStationId = 'test-station-cleanup';

  group.each.setup(async () => {
    await prisma.windData1Min.deleteMany();
    await prisma.windData10Min.deleteMany();
    await prisma.dataRetentionPolicy.deleteMany();
    await prisma.weatherStation.deleteMany();

    await prisma.weatherStation.create({
      data: {
        stationId: testStationId,
        name: 'Test Cleanup Station',
        location: 'Test Environment',
        description: 'Test station for data cleanup',
        isActive: true,
      },
    });

    await prisma.dataRetentionPolicy.createMany({
      data: [
        { dataType: 'wind_1min', retentionDays: 90, isActive: true, description: 'test' },
        { dataType: 'wind_10min', retentionDays: 365, isActive: true, description: 'test' },
      ],
    });
  });

  group.each.teardown(async () => {
    await prisma.windData1Min.deleteMany();
    await prisma.windData10Min.deleteMany();
    await prisma.dataRetentionPolicy.deleteMany();
    await prisma.weatherStation.deleteMany();
  });

  test('should delete only wind rows older than their retention policy', async ({ assert }) => {
    const now = DateTime.now();

    const windRow = (timestamp: DateTime) => ({
      stationId: testStationId,
      timestamp: timestamp.toUTC().toISO()!,
      avgSpeed: 10.0,
      minSpeed: 8.0,
      maxSpeed: 12.0,
      dominantDirection: 270,
    });

    await prisma.windData1Min.createMany({
      data: [
        { ...windRow(now.minus({ days: 91 })), sampleCount: 6 }, // expired
        { ...windRow(now.minus({ days: 1 })), sampleCount: 6 }, // fresh
      ],
    });
    await prisma.windData10Min.createMany({
      data: [
        { ...windRow(now.minus({ days: 366 })), tendency: 'stable' }, // expired
        { ...windRow(now.minus({ days: 1 })), tendency: 'stable' }, // fresh
      ],
    });

    const result = await dataCleanupService.runAllCleanups();

    assert.equal(result.windData1MinCleanup.deleted, 1);
    assert.equal(result.windData10MinCleanup.deleted, 1);

    const remaining1Min = await prisma.windData1Min.findMany();
    const remaining10Min = await prisma.windData10Min.findMany();
    assert.lengthOf(remaining1Min, 1);
    assert.lengthOf(remaining10Min, 1);
    assert.isTrue(remaining1Min[0].timestamp > now.minus({ days: 2 }).toUTC().toISO()!);
    assert.isTrue(remaining10Min[0].timestamp > now.minus({ days: 2 }).toUTC().toISO()!);
  });

  test('should apply defaults when no wind retention policies exist', async ({ assert }) => {
    await prisma.dataRetentionPolicy.deleteMany();

    const result = await dataCleanupService.runAllCleanups();

    assert.match(result.windData1MinCleanup.policy, /Default retention: 1 days/);
    assert.match(result.windData10MinCleanup.policy, /Default retention: 365 days/);
  });
});
