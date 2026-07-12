import { test } from '@japa/runner';

import { prisma } from '#services/prisma';

test.group('Station Configs Controller', (group) => {
  group.each.setup(async () => {
    // Clean up any existing test data
    await prisma.stationConfig.deleteMany();
    await prisma.weatherStation.deleteMany();
  });

  group.each.teardown(async () => {
    // Clean up after each test
    await prisma.stationConfig.deleteMany();
    await prisma.weatherStation.deleteMany();
  });

  /**
   * Test: GET /api/stations/:station_id/config - Configuration not found
   * This test validates the exact JSON structure returned when no config exists
   * This format is consumed by firmware, so structure must remain consistent
   */
  test('should return default config structure when no configuration exists', async ({
    client,
    assert,
  }) => {
    const stationId = 'test-station-001';

    const response = await client.get(`/api/stations/${stationId}/config`);

    response.assertStatus(200);

    // Validate exact JSON structure that firmware expects
    const expectedStructure = {
      stationId: stationId,
      tempInterval: null,
      windSendInterval: null,
      windSampleInterval: null,
      diagInterval: null,
      timeInterval: null,
      restartInterval: null,
      sleepStartHour: null,
      sleepEndHour: null,
      otaHour: null,
      otaMinute: null,
      otaDuration: null,
      remoteOta: false,
      utcOffsetMinutes: null,
      livestreamStartHour: null,
      lowBatteryThreshold: null,
      message: 'No configuration found for this station. Default values will be used.',
    };

    response.assertBody(expectedStructure);

    // Validate data types for critical fields
    const body = response.body();
    assert.equal(typeof body.stationId, 'string');
    assert.equal(typeof body.remoteOta, 'boolean');
    assert.equal(typeof body.message, 'string');
    assert.equal(body.remoteOta, false);

    // Validate that all interval fields are null when no config exists
    const intervalFields = [
      'tempInterval',
      'windSendInterval',
      'windSampleInterval',
      'diagInterval',
      'timeInterval',
      'restartInterval',
      'sleepStartHour',
      'sleepEndHour',
      'otaHour',
      'otaMinute',
      'otaDuration',
    ];

    intervalFields.forEach((field) => {
      assert.isNull(body[field], `${field} should be null when no config exists`);
    });
  });

  /**
   * Test: GET /api/stations/:station_id/config - Configuration exists
   * This test validates the JSON structure when a config record exists
   */
  test('should return existing config structure when configuration exists', async ({
    client,
    assert,
  }) => {
    const stationId = 'test-station-002';

    // Create weather station first
    await prisma.weatherStation.create({
      data: {
        stationId: stationId,
        name: 'Test Station 2',
        location: 'Test Environment',
        description: 'Test station for config test',
        isActive: true,
      },
    });

    // Create a test configuration
    const testConfig = {
      stationId: stationId,
      tempInterval: 300,
      windSendInterval: 60,
      windSampleInterval: 10,
      diagInterval: 3600,
      timeInterval: 86400,
      restartInterval: 604800,
      sleepStartHour: 22,
      sleepEndHour: 6,
      otaHour: 3,
      otaMinute: 30,
      otaDuration: 1800,
      remoteOta: true,
    };

    await prisma.stationConfig.create({ data: testConfig });

    const response = await client.get(`/api/stations/${stationId}/config`);

    response.assertStatus(200);

    const body = response.body();

    // Validate that all expected fields are present (model serializes to camelCase)
    const expectedFields = [
      'id',
      'stationId',
      'tempInterval',
      'windSendInterval',
      'windSampleInterval',
      'diagInterval',
      'timeInterval',
      'restartInterval',
      'sleepStartHour',
      'sleepEndHour',
      'otaHour',
      'otaMinute',
      'otaDuration',
      'remoteOta',
      'createdAt',
      'updatedAt',
    ];

    expectedFields.forEach((field) => {
      assert.property(body, field, `Response should contain ${field} field`);
    });

    // Validate data types for firmware-critical fields (camelCase from model)
    assert.equal(typeof body.stationId, 'string');
    assert.equal(typeof body.tempInterval, 'number');
    assert.equal(typeof body.windSendInterval, 'number');
    assert.equal(typeof body.windSampleInterval, 'number');
    assert.equal(typeof body.diagInterval, 'number');
    assert.equal(typeof body.timeInterval, 'number');
    assert.equal(typeof body.restartInterval, 'number');
    assert.equal(typeof body.sleepStartHour, 'number');
    assert.equal(typeof body.sleepEndHour, 'number');
    assert.equal(typeof body.otaHour, 'number');
    assert.equal(typeof body.otaMinute, 'number');
    assert.equal(typeof body.otaDuration, 'number');
    // Note: SQLite stores boolean as number (1/0), so we check the actual value
    assert.equal(typeof body.remoteOta, 'boolean');

    // Validate specific values
    assert.equal(body.stationId, stationId);
    assert.equal(body.tempInterval, 300);
    assert.equal(body.windSendInterval, 60);
    assert.equal(body.remoteOta, true);

    // Validate that no unexpected 'message' field is present when config exists
    assert.notProperty(body, 'message', 'Message field should not be present when config exists');
  });

  /**
   * Test: POST /api/stations/:station_id/config - Store configuration (Success)
   * This test validates the response structure for successful config updates
   */
  test('should return success response structure when storing configuration', async ({
    client,
    assert,
  }) => {
    const stationId = 'test-station-003';

    // Create weather station first
    await prisma.weatherStation.create({
      data: {
        stationId: stationId,
        name: 'Test Station 3',
        location: 'Test Environment',
        description: 'Test station for config store test',
        isActive: true,
      },
    });

    const configData = {
      tempInterval: 600,
      windSendInterval: 30,
      windSampleInterval: 5,
      diagInterval: 1800,
      remoteOta: true,
    };

    const response = await client
      .post(`/api/stations/${stationId}/config`)
      .withEncryptedCookie('aiolos_admin', { loggedInAt: new Date().toISOString() })
      .json(configData);

    response.assertStatus(200);

    // Validate exact success response structure
    const expectedResponse = {
      ok: true,
      message: 'Configuration updated successfully',
    };

    response.assertBody(expectedResponse);

    const body = response.body();
    assert.equal(typeof body.ok, 'boolean');
    assert.equal(typeof body.message, 'string');
    assert.equal(body.ok, true);
  });

  /**
   * Test: POST /api/stations/:station_id/config - Unauthorized (Missing admin session)
   * This test validates the error response structure for authentication failures
   */
  test('should return error response structure when admin session is missing', async ({
    client,
    assert,
  }) => {
    const stationId = 'test-station-004';

    const configData = {
      tempInterval: 600,
      windSendInterval: 30,
    };

    const response = await client.post(`/api/stations/${stationId}/config`).json(configData);

    response.assertStatus(401);

    // Validate exact error response structure
    const expectedResponse = {
      error: 'Unauthorized',
    };

    response.assertBody(expectedResponse);

    const body = response.body();
    assert.equal(typeof body.error, 'string');
    assert.notProperty(body, 'ok', 'Success field should not be present in error response');
  });

  /**
   * Test: POST /api/stations/:station_id/config - Invalid data type
   * This test validates the error response structure for validation failures
   */
  test('should return error response structure for invalid data types', async ({
    client,
    assert,
  }) => {
    const stationId = 'test-station-005';

    const configData = {
      tempInterval: 'invalid-number', // Invalid data type
      windSendInterval: 30,
    };

    const response = await client
      .post(`/api/stations/${stationId}/config`)
      .withEncryptedCookie('aiolos_admin', { loggedInAt: new Date().toISOString() })
      .json(configData);

    response.assertStatus(400);

    const body = response.body();

    // Validate error response structure
    assert.property(body, 'error');
    assert.equal(typeof body.error, 'string');
    assert.include(body.error, 'Invalid value for tempInterval');
    assert.notProperty(body, 'ok', 'Success field should not be present in error response');
  });

  /**
   * Test: POST /api/stations/:station_id/ota-confirm - OTA confirmation success
   * This test validates the OTA confirmation response structure
   */
  test('should return success response structure for OTA confirmation', async ({
    client,
    assert,
  }) => {
    const stationId = 'test-station-006';

    // Create weather station first
    await prisma.weatherStation.create({
      data: {
        stationId: stationId,
        name: 'Test Station 6',
        location: 'Test Environment',
        description: 'Test station for OTA confirmation test',
        isActive: true,
      },
    });

    // Create a test configuration first
    await prisma.stationConfig.create({
      data: {
        stationId: stationId,
        tempInterval: 300,
        windSendInterval: 60,
        windSampleInterval: 10,
        diagInterval: 3600,
        timeInterval: 86400,
        restartInterval: 604800,
        sleepStartHour: 22,
        sleepEndHour: 6,
        otaHour: 3,
        otaMinute: 30,
        otaDuration: 1800,
        remoteOta: true,
      },
    });

    const response = await client.post(`/api/stations/${stationId}/ota-confirm`);

    response.assertStatus(200);

    // Validate exact success response structure
    const expectedResponse = {
      ok: true,
      message: 'OTA confirmation received',
    };

    response.assertBody(expectedResponse);

    const body = response.body();
    assert.equal(typeof body.ok, 'boolean');
    assert.equal(typeof body.message, 'string');
    assert.equal(body.ok, true);
  });

  /**
   * Test: POST /api/stations/:station_id/ota-confirm - No configuration found
   * This test validates the error response structure when no config exists for OTA confirmation
   */
  test('should return error response structure when no config exists for OTA confirmation', async ({
    client,
    assert,
  }) => {
    const stationId = 'test-station-007';

    const response = await client.post(`/api/stations/${stationId}/ota-confirm`);

    response.assertStatus(404);

    // Validate exact error response structure
    const expectedResponse = {
      error: 'No configuration found for this station',
    };

    response.assertBody(expectedResponse);

    const body = response.body();
    assert.equal(typeof body.error, 'string');
    assert.notProperty(body, 'ok', 'Success field should not be present in error response');
  });

  /**
   * Test: Validate that OTA confirmation actually resets remote_ota flag
   * This test ensures the business logic works correctly and maintains data integrity
   */
  test('should reset remote_ota flag to false after OTA confirmation', async ({
    client,
    assert,
  }) => {
    const stationId = 'test-station-008';

    // Create weather station first
    await prisma.weatherStation.create({
      data: {
        stationId: stationId,
        name: 'Test Station 8',
        location: 'Test Environment',
        description: 'Test station for OTA reset test',
        isActive: true,
      },
    });

    // Create a test configuration with remoteOta = true
    await prisma.stationConfig.create({
      data: {
        stationId: stationId,
        tempInterval: 300,
        windSendInterval: 60,
        windSampleInterval: 10,
        diagInterval: 3600,
        timeInterval: 86400,
        restartInterval: 604800,
        sleepStartHour: 22,
        sleepEndHour: 6,
        otaHour: 3,
        otaMinute: 30,
        otaDuration: 1800,
        remoteOta: true,
      },
    });

    // Call OTA confirmation
    const confirmResponse = await client.post(`/api/stations/${stationId}/ota-confirm`);
    confirmResponse.assertStatus(200);

    // Fetch the updated config
    const configResponse = await client.get(`/api/stations/${stationId}/config`);
    configResponse.assertStatus(200);

    const body = configResponse.body();

    // Validate that remoteOta is now false (SQLite stores false as 0)
    assert.equal(body.remoteOta, 0, 'remoteOta should be 0 (false) after OTA confirmation');

    // Validate that all other fields remain unchanged
    assert.equal(body.stationId, stationId);
    assert.equal(body.tempInterval, 300);
    assert.equal(body.windSendInterval, 60);
    assert.equal(body.windSampleInterval, 10);
  });

  /**
   * Test: scheduling fields (utcOffsetMinutes, livestreamStartHour,
   * lowBatteryThreshold) round-trip through store -> show and survive
   * the confirmOta copy.
   */
  test('should round-trip scheduling fields and preserve them across OTA confirmation', async ({
    client,
    assert,
  }) => {
    const stationId = 'test-station-sched';

    await prisma.weatherStation.create({
      data: {
        stationId: stationId,
        name: 'Test Station Sched',
        location: 'Test Environment',
        description: 'Test station for scheduling fields',
        isActive: true,
      },
    });

    const storeResponse = await client
      .post(`/api/stations/${stationId}/config`)
      .withEncryptedCookie('aiolos_admin', { loggedInAt: new Date().toISOString() })
      .json({
        utcOffsetMinutes: 180,
        livestreamStartHour: 11,
        lowBatteryThreshold: 4.0,
        remoteOta: true,
      });

    storeResponse.assertStatus(200);

    // Round-trip via show()
    const showResponse = await client.get(`/api/stations/${stationId}/config`);
    showResponse.assertStatus(200);
    let body = showResponse.body();
    assert.equal(body.utcOffsetMinutes, 180);
    assert.equal(body.livestreamStartHour, 11);
    assert.equal(body.lowBatteryThreshold, 4.0);

    // confirmOta copies the config into a new row - the fields must survive
    const confirmResponse = await client.post(`/api/stations/${stationId}/ota-confirm`);
    confirmResponse.assertStatus(200);

    const afterConfirm = await client.get(`/api/stations/${stationId}/config`);
    afterConfirm.assertStatus(200);
    body = afterConfirm.body();
    assert.equal(body.remoteOta, 0, 'remoteOta should be reset');
    assert.equal(body.utcOffsetMinutes, 180);
    assert.equal(body.livestreamStartHour, 11);
    assert.equal(body.lowBatteryThreshold, 4.0);
  });
});
