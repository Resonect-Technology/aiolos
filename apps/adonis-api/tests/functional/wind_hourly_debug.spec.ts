import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import { windAggregationService } from '#services/wind_aggregation_service'
import WindData10Min from '#models/wind_data_10_min'
import WindDataHourly from '#models/wind_data_hourly'

test.group('Wind Hourly Debug', () => {
  test('should debug hourly aggregation', async ({ assert }) => {
    const testStationId = 'test-station-debug'
    const intervalStart = DateTime.fromISO('2025-01-01T12:00:00.000Z')
    
    console.log(`\n=== DEBUG: Testing hourly aggregation for interval: ${intervalStart.toISO()}`)
    
    // Create one 10-minute record
    const record = await WindData10Min.create({
      stationId: testStationId,
      timestamp: intervalStart,
      avgSpeed: 5.0,
      minSpeed: 4.0,
      maxSpeed: 6.0,
      dominantDirection: 270,
      tendency: 'increasing',
    })
    
    console.log(`Created 10-min record: ${record.timestamp.toISO()}, avgSpeed: ${record.avgSpeed}`)
    
    // Check if 10-minute data exists
    const tenMinData = await WindData10Min.query()
      .where('stationId', testStationId)
      .where('timestamp', '>=', intervalStart.toJSDate())
      .where('timestamp', '<', intervalStart.plus({ hours: 1 }).toJSDate())
      .orderBy('timestamp', 'asc')
    
    console.log(`Found ${tenMinData.length} 10-minute records in the hour`)
    tenMinData.forEach((record, index) => {
      console.log(`Record ${index + 1}: ${record.timestamp.toISO()}, avgSpeed: ${record.avgSpeed}`)
    })
    
    // Process hourly aggregation
    console.log(`\n=== Calling processHourlyAggregationForInterval...`)
    await windAggregationService.processHourlyAggregationForInterval(intervalStart)
    
    // Check that hourly record was created
    const hourlyRecord = await WindDataHourly.query()
      .where('stationId', testStationId)
      .where('timestamp', intervalStart.toJSDate())
      .first()
    
    console.log(`\n=== Hourly record result:`)
    if (hourlyRecord) {
      console.log(`Hourly record found:`, {
        timestamp: hourlyRecord.timestamp.toISO(),
        avgSpeed: hourlyRecord.avgSpeed,
        minSpeed: hourlyRecord.minSpeed,
        maxSpeed: hourlyRecord.maxSpeed,
        gustSpeed: hourlyRecord.gustSpeed,
        calmPeriods: hourlyRecord.calmPeriods,
        dominantDirection: hourlyRecord.dominantDirection,
        tendency: hourlyRecord.tendency,
      })
    } else {
      console.log(`No hourly record found!`)
    }
    
    assert.isNotNull(hourlyRecord)
  })
})