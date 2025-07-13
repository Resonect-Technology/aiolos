import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import WindData1Min from '#app/models/wind_data_1_min'
import WindData10Min from '#app/models/wind_data_10_min'
import WeatherStation from '#app/models/weather_station'
import { windAggregationService } from '#app/services/wind_aggregation_service'

test.group('Wind 10-Minute Aggregation Debug', (group) => {
  const testStationId = 'test-station-10min-debug'

  group.each.setup(async () => {
    // Clean up any existing test data first
    await WindData10Min.query().delete()
    await WindData1Min.query().delete()
    await WeatherStation.query().delete()

    // Create the test weather station
    await WeatherStation.create({
      stationId: testStationId,
      name: 'Test 10-Minute Station',
      location: 'Test Environment',
      description: 'Test station for 10-minute aggregation',
      isActive: true,
    })
  })

  group.each.teardown(async () => {
    await WindData10Min.query().delete()
    await WindData1Min.query().delete()
    await WeatherStation.query().delete()
  })

  test('should debug aggregation process', async ({ assert }) => {
    // Create simple 1-minute test data for a completed 10-minute interval
    // Use a fixed time that's definitely in the past
    const intervalStart = DateTime.fromISO('2025-01-01T12:00:00.000Z')
    
    console.log('Interval start:', intervalStart.toISO())
    console.log('Current time:', DateTime.now().toISO())
    
    const testData = [
      { timestamp: intervalStart.plus({ minutes: 0 }), avgSpeed: 10.0, minSpeed: 8.0, maxSpeed: 12.0, dominantDirection: 270 },
      { timestamp: intervalStart.plus({ minutes: 1 }), avgSpeed: 12.0, minSpeed: 10.0, maxSpeed: 14.0, dominantDirection: 275 },
      { timestamp: intervalStart.plus({ minutes: 2 }), avgSpeed: 11.0, minSpeed: 9.0, maxSpeed: 13.0, dominantDirection: 270 },
    ]

    // Insert 1-minute data
    for (const data of testData) {
      console.log('Inserting 1-min data:', data.timestamp.toISO())
      await WindData1Min.create({
        stationId: testStationId,
        timestamp: data.timestamp,
        avgSpeed: data.avgSpeed,
        minSpeed: data.minSpeed,
        maxSpeed: data.maxSpeed,
        dominantDirection: data.dominantDirection,
        sampleCount: 6,
      })
    }

    // Verify 1-minute data was inserted
    const oneMinData = await WindData1Min.query()
      .where('stationId', testStationId)
      .orderBy('timestamp', 'asc')
    
    console.log('1-minute data count:', oneMinData.length)
    oneMinData.forEach(record => {
      console.log('1-min record:', record.timestamp.toISO(), 'avg:', record.avgSpeed)
    })

    // Process 10-minute aggregation
    console.log('Processing 10-minute aggregation for interval:', intervalStart.toISO())
    await windAggregationService.process10MinuteAggregationForInterval(intervalStart)

    // Check if 10-minute data was created
    const tenMinData = await WindData10Min.query()
      .where('stationId', testStationId)
      .orderBy('timestamp', 'asc')
    
    console.log('10-minute data count:', tenMinData.length)
    tenMinData.forEach(record => {
      console.log('10-min record:', record.timestamp.toISO(), 'avg:', record.avgSpeed, 'tendency:', record.tendency)
    })

    // Check that 10-minute data was created
    const tenMinRecord = await WindData10Min.query()
      .where('stationId', testStationId)
      .where('timestamp', intervalStart.toJSDate())
      .first()

    console.log('Found 10-min record:', tenMinRecord ? 'YES' : 'NO')
    if (tenMinRecord) {
      console.log('10-min record details:', {
        timestamp: tenMinRecord.timestamp.toISO(),
        avgSpeed: tenMinRecord.avgSpeed,
        minSpeed: tenMinRecord.minSpeed,
        maxSpeed: tenMinRecord.maxSpeed,
        dominantDirection: tenMinRecord.dominantDirection,
        tendency: tenMinRecord.tendency,
      })
    }

    assert.isNotNull(tenMinRecord)
  })
})