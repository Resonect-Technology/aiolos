import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import WindData1Min from '#app/models/wind_data_1_min'
import WeatherStation from '#app/models/weather_station'

test.group('Wind Aggregated Controller', (group) => {
  const testStationId = 'test-station-aggregated-api'

  group.each.setup(async () => {
    // Clean up any existing test data first
    await WindData1Min.query().delete()
    await WeatherStation.query().delete()

    // Create the test weather station
    await WeatherStation.create({
      stationId: testStationId,
      name: 'Test Aggregated API Station',
      location: 'Test Environment',
      description: 'Test station for aggregated API',
      isActive: true,
    })

    // Create test aggregated data for the latest endpoint
    const now = DateTime.now().startOf('minute')
    await WindData1Min.create({
      stationId: testStationId,
      timestamp: now.minus({ minutes: 1 }),
      avgSpeed: 12.0,
      minSpeed: 9.0,
      maxSpeed: 15.0,
      dominantDirection: 270,
      sampleCount: 3,
    })
  })

  group.each.teardown(async () => {
    await WindData1Min.query().delete()
    await WeatherStation.query().delete()
  })

  test('should return latest aggregated wind data', async ({ client, assert }) => {
    const response = await client.get(`/api/stations/${testStationId}/wind/aggregated/latest`)

    response.assertStatus(200)
    const body = response.body()

    assert.equal(body.stationId, testStationId)
    assert.equal(body.avgSpeed, 12.0)
    assert.equal(body.minSpeed, 9.0)
    assert.equal(body.maxSpeed, 15.0)
    assert.equal(body.dominantDirection, 270)
    assert.equal(body.sampleCount, 3)
  })

  test('should return 404 when no aggregated data exists', async ({ client, assert }) => {
    const nonExistentStationId = 'non-existent-station'

    const response = await client.get(`/api/stations/${nonExistentStationId}/wind/aggregated/latest`)

    response.assertStatus(404)
    const body = response.body()
    assert.equal(body.error, 'No aggregated wind data found for this station')
  })

  test('should validate interval parameter', async ({ client, assert }) => {
    const response = await client.get(`/api/stations/${testStationId}/wind/aggregated`)
      .qs({ interval: '10min' })

    response.assertStatus(400)
    const body = response.body()
    assert.equal(body.error, 'Invalid interval. Only "1min" is supported currently.')
  })

  test('should validate date parameter', async ({ client, assert }) => {
    const response = await client.get(`/api/stations/${testStationId}/wind/aggregated`)
      .qs({ interval: '1min', date: 'invalid-date' })

    response.assertStatus(400)
    const body = response.body()
    assert.equal(body.error, 'Invalid date format. Use YYYY-MM-DD format.')
  })

  test('should validate unit parameter', async ({ client, assert }) => {
    const response = await client.get(`/api/stations/${testStationId}/wind/aggregated/converted`)
      .qs({ interval: '1min', unit: 'invalid' })

    response.assertStatus(400)
    const body = response.body()
    assert.equal(body.error, 'Invalid unit. Supported units: ms, kmh, knots')
  })

  test('should default to current date when date not provided', async ({ client, assert }) => {
    const response = await client.get(`/api/stations/${testStationId}/wind/aggregated`)
      .qs({ interval: '1min' })

    response.assertStatus(200)
    const body = response.body()

    assert.equal(body.date, DateTime.now().toISODate())
    assert.isArray(body.data)
    // Should return data without requiring a specific date
  })
})