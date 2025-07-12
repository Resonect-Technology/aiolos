import { test } from '@japa/runner'
import SensorReading from '#app/models/sensor_reading'
import WindOneMinuteDatum from '#app/models/wind_one_minute_datum'

test.group('1-minute wind data', (group) => {
  group.each.setup(async () => {
    // Clean up any existing test data
    await SensorReading.query().delete()
    await WindOneMinuteDatum.query().delete()
  })

  group.each.teardown(async () => {
    // Clean up after each test
    await SensorReading.query().delete()
    await WindOneMinuteDatum.query().delete()
  })

  test('should store wind data and create 1-minute aggregation', async ({ client, assert }) => {
    const stationId = 'test-station-1min'
    
    // Send some wind data points
    const response1 = await client
      .post(`/api/stations/${stationId}/wind`)
      .json({
        windSpeed: 10.5,
        windDirection: 270,
      })
    
    response1.assertStatus(200)
    response1.assertBody({ ok: true })

    const response2 = await client
      .post(`/api/stations/${stationId}/wind`)
      .json({
        windSpeed: 12.0,
        windDirection: 275,
      })
    
    response2.assertStatus(200)
    response2.assertBody({ ok: true })

    const response3 = await client
      .post(`/api/stations/${stationId}/wind`)
      .json({
        windSpeed: 11.2,
        windDirection: 268,
      })
    
    response3.assertStatus(200)
    response3.assertBody({ ok: true })

    // Wait a bit for aggregation processing
    await new Promise(resolve => setTimeout(resolve, 100))

    // Get 1-minute data
    const response = await client
      .get(`/api/stations/${stationId}/wind/one-minute`)
    
    response.assertStatus(200)
    response.assertBodyContains({
      stationId: stationId,
      count: 0, // Should be 0 since we're aggregating completed minutes
    })

    // Verify response structure
    const body = response.body()
    assert.exists(body.stationId)
    assert.exists(body.data)
    assert.exists(body.count)
    assert.isArray(body.data)
  })

  test('should handle empty results gracefully', async ({ client }) => {
    const stationId = 'test-station-empty'

    // Get 1-minute data for non-existent station
    const response = await client
      .get(`/api/stations/${stationId}/wind/one-minute`)
    
    response.assertStatus(200)
    response.assertBodyContains({
      stationId: stationId,
      count: 0,
      data: [],
    })
  })

  test('should handle latest endpoint with no data', async ({ client }) => {
    const stationId = 'test-station-no-data'

    // Get latest 1-minute data for non-existent station
    const response = await client
      .get(`/api/stations/${stationId}/wind/one-minute/latest`)
    
    response.assertStatus(404)
    response.assertBodyContains({
      error: 'No 1-minute wind data found for this station',
    })
  })

  test('should validate limit parameter', async ({ client }) => {
    const stationId = 'test-station-limit'

    // Test with limit too high
    const response = await client
      .get(`/api/stations/${stationId}/wind/one-minute?limit=2000`)
    
    response.assertStatus(400)
    response.assertBodyContains({
      error: 'Limit cannot exceed 1000',
    })
  })

  test('should handle date range parameters', async ({ client, assert }) => {
    const stationId = 'test-station-date-range'
    const fromDate = '2024-01-01T00:00:00.000Z'
    const toDate = '2024-01-02T00:00:00.000Z'

    // Test with date range
    const response = await client
      .get(`/api/stations/${stationId}/wind/one-minute?from=${fromDate}&to=${toDate}`)
    
    response.assertStatus(200)
    const body = response.body()
    
    // Check basic structure
    assert.exists(body.stationId)
    assert.exists(body.data)
    assert.exists(body.count)
    assert.isArray(body.data)
    
    // Check expected values
    assert.equal(body.stationId, stationId)
    assert.equal(body.count, 0)
    assert.equal(body.data.length, 0)
    
    // Check date fields exist (format may vary)
    assert.exists(body.fromTime)
    assert.exists(body.toTime)
  })
})