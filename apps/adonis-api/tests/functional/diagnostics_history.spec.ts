import { test } from '@japa/runner';

import { prisma } from '#services/prisma';

const STATION_ID = 'test-station-history';

function diagnosticRow(createdAt: Date, batteryVoltage: number) {
  return {
    stationId: STATION_ID,
    batteryVoltage,
    solarVoltage: 5.5,
    internalTemperature: 30.0,
    signalQuality: 20,
    uptime: 1200,
    firmwareVersion: '2.1.0',
    freeHeap: 150000,
    minFreeHeap: 120000,
    resetReason: 'ESP_RST_POWERON',
    createdAt,
  };
}

test.group('Station Diagnostics History', (group) => {
  group.each.setup(async () => {
    await prisma.stationDiagnostic.deleteMany();
    await prisma.weatherStation.deleteMany();

    await prisma.weatherStation.create({
      data: {
        stationId: STATION_ID,
        name: 'History Test Station',
        isActive: true,
      },
    });
  });

  group.each.teardown(async () => {
    await prisma.stationDiagnostic.deleteMany();
    await prisma.weatherStation.deleteMany();
  });

  test('should return rows newest-first within the requested window', async ({
    client,
    assert,
  }) => {
    const now = Date.now();
    await prisma.stationDiagnostic.createMany({
      data: [
        diagnosticRow(new Date(now - 1 * 60 * 60 * 1000), 4.1),
        diagnosticRow(new Date(now - 5 * 60 * 60 * 1000), 4.0),
        diagnosticRow(new Date(now - 30 * 60 * 60 * 1000), 3.9), // outside 24h default
      ],
    });

    const response = await client.get(`/api/stations/${STATION_ID}/diagnostics/history`);

    response.assertStatus(200);
    const body = response.body();
    assert.isArray(body);
    assert.lengthOf(body, 2, 'row older than 24h should be excluded by default');
    assert.equal(body[0].batteryVoltage, 4.1, 'newest row first');
    assert.equal(body[1].batteryVoltage, 4.0);
    assert.equal(body[0].firmwareVersion, '2.1.0');
    assert.equal(body[0].resetReason, 'ESP_RST_POWERON');
  });

  test('should widen the window via the hours query param', async ({ client, assert }) => {
    const now = Date.now();
    await prisma.stationDiagnostic.createMany({
      data: [
        diagnosticRow(new Date(now - 1 * 60 * 60 * 1000), 4.1),
        diagnosticRow(new Date(now - 30 * 60 * 60 * 1000), 3.9),
      ],
    });

    const response = await client.get(`/api/stations/${STATION_ID}/diagnostics/history?hours=48`);

    response.assertStatus(200);
    assert.lengthOf(response.body(), 2);
  });

  test('should respect and clamp the limit query param', async ({ client, assert }) => {
    const now = Date.now();
    await prisma.stationDiagnostic.createMany({
      data: [1, 2, 3, 4, 5].map((i) => diagnosticRow(new Date(now - i * 60 * 1000), 4.0)),
    });

    const limited = await client.get(`/api/stations/${STATION_ID}/diagnostics/history?limit=3`);
    limited.assertStatus(200);
    assert.lengthOf(limited.body(), 3);

    // Nonsense params fall back to defaults instead of erroring
    const fallback = await client.get(
      `/api/stations/${STATION_ID}/diagnostics/history?hours=bogus&limit=-5`,
    );
    fallback.assertStatus(200);
    assert.lengthOf(fallback.body(), 1, 'limit clamps to at least 1');
  });

  test('should return an empty array for a station without diagnostics', async ({
    client,
    assert,
  }) => {
    const response = await client.get('/api/stations/unknown-station/diagnostics/history');

    response.assertStatus(200);
    assert.deepEqual(response.body(), []);
  });
});
