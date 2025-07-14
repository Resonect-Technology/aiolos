import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { windAggregationService } from '#services/wind_aggregation_service'
import WindData10Min from '#models/wind_data_10_min'
import WindDataHourly from '#models/wind_data_hourly'

test.group('Wind Hourly Aggregation', () => {
  test('should aggregate 10-minute data into hourly intervals', async ({ assert }) => {
    const testStationId = 'test-station-hourly'
    const intervalStart = DateTime.fromISO('2025-01-01T12:00:00.000Z')
    
    console.log(`Testing hourly aggregation for interval: ${intervalStart.toISO()}`)
    
    // Create 6 consecutive 10-minute records for the hour
    const tenMinuteRecords = []
    for (let i = 0; i < 6; i++) {
      const record = await WindData10Min.create({
        stationId: testStationId,
        timestamp: intervalStart.plus({ minutes: i * 10 }),
        avgSpeed: 5.0 + i, // Increasing speed
        minSpeed: 4.0 + i,
        maxSpeed: 6.0 + i,
        dominantDirection: 270,
        tendency: 'increasing',
      })
      tenMinuteRecords.push(record)
      console.log(`Created 10-min record: ${record.timestamp.toISO()}, avgSpeed: ${record.avgSpeed}`)
    }
    
    // Process hourly aggregation
    await windAggregationService.processHourlyAggregationForInterval(intervalStart)
    
    // Check that hourly record was created
    const hourlyRecord = await WindDataHourly.query()
      .where('stationId', testStationId)
      .where('timestamp', intervalStart.toJSDate())
      .first()
    
    assert.isNotNull(hourlyRecord)
    assert.equal(hourlyRecord!.stationId, testStationId)
    assert.equal(hourlyRecord!.timestamp.toISO(), intervalStart.toISO())
    
    // Check aggregated values
    const expectedAvgSpeed = (5.0 + 6.0 + 7.0 + 8.0 + 9.0 + 10.0) / 6 // 7.5
    assert.equal(hourlyRecord!.avgSpeed, 7.5)
    assert.equal(hourlyRecord!.minSpeed, 4.0) // Minimum of all min speeds
    assert.equal(hourlyRecord!.maxSpeed, 11.0) // Maximum of all max speeds (6.0 + 5 = 11.0)
    assert.equal(hourlyRecord!.gustSpeed, 11.0) // Same as max speed for this test
    assert.equal(hourlyRecord!.dominantDirection, 270)
    assert.equal(hourlyRecord!.tendency, 'stable') // First hourly record
    assert.equal(hourlyRecord!.calmPeriods, 0) // No calm periods (all > 1.0 m/s)
    
    console.log(`Hourly record created successfully:`, {
      avgSpeed: hourlyRecord!.avgSpeed,
      minSpeed: hourlyRecord!.minSpeed,
      maxSpeed: hourlyRecord!.maxSpeed,
      gustSpeed: hourlyRecord!.gustSpeed,
      calmPeriods: hourlyRecord!.calmPeriods,
      dominantDirection: hourlyRecord!.dominantDirection,
      tendency: hourlyRecord!.tendency,
    })
  })
  
  test('should calculate calm periods correctly', async ({ assert }) => {
    const testStationId = 'test-station-calm'
    const intervalStart = DateTime.fromISO('2025-01-01T13:00:00.000Z')
    
    // Create 6 records, some with calm periods (< 1.0 m/s)
    const speedValues = [0.5, 0.8, 1.5, 2.0, 0.3, 1.2] // 3 calm periods
    
    for (let i = 0; i < 6; i++) {
      await WindData10Min.create({
        stationId: testStationId,
        timestamp: intervalStart.plus({ minutes: i * 10 }),
        avgSpeed: speedValues[i],
        minSpeed: speedValues[i] - 0.1,
        maxSpeed: speedValues[i] + 0.1,
        dominantDirection: 180,
        tendency: 'stable',
      })
    }
    
    // Process hourly aggregation
    await windAggregationService.processHourlyAggregationForInterval(intervalStart)
    
    // Check calm periods
    const hourlyRecord = await WindDataHourly.query()
      .where('stationId', testStationId)
      .where('timestamp', intervalStart.toJSDate())
      .first()
    
    assert.isNotNull(hourlyRecord)
    assert.equal(hourlyRecord!.calmPeriods, 3) // 3 periods with < 1.0 m/s
    
    console.log(`Calm periods calculated correctly: ${hourlyRecord!.calmPeriods}`)
  })
  
  test('should calculate gust speed correctly', async ({ assert }) => {
    const testStationId = 'test-station-gust'
    const intervalStart = DateTime.fromISO('2025-01-01T14:00:00.000Z')
    
    // Create 6 records with different max speeds
    const maxSpeedValues = [5.0, 8.0, 12.0, 6.0, 15.0, 4.0] // Gust should be 15.0
    
    for (let i = 0; i < 6; i++) {
      await WindData10Min.create({
        stationId: testStationId,
        timestamp: intervalStart.plus({ minutes: i * 10 }),
        avgSpeed: 5.0,
        minSpeed: 3.0,
        maxSpeed: maxSpeedValues[i],
        dominantDirection: 90,
        tendency: 'stable',
      })
    }
    
    // Process hourly aggregation
    await windAggregationService.processHourlyAggregationForInterval(intervalStart)
    
    // Check gust speed
    const hourlyRecord = await WindDataHourly.query()
      .where('stationId', testStationId)
      .where('timestamp', intervalStart.toJSDate())
      .first()
    
    assert.isNotNull(hourlyRecord)
    assert.equal(hourlyRecord!.gustSpeed, 15.0) // Maximum of all max speeds
    
    console.log(`Gust speed calculated correctly: ${hourlyRecord!.gustSpeed}`)
  })
})