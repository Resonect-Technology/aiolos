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
    console.log(`intervalStart.toJSDate(): ${intervalStart.toJSDate()}`)
    console.log(`intervalStart.plus({ hours: 1 }).toJSDate(): ${intervalStart.plus({ hours: 1 }).toJSDate()}`)
    
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
    console.log(`Record timestamp as JSDate: ${record.timestamp.toJSDate()}`)
    
    // Check if 10-minute data exists with different query approaches
    console.log(`\n=== Testing different query approaches`)
    
    // Approach 1: Exact match
    const exactMatch = await WindData10Min.query()
      .where('stationId', testStationId)
      .where('timestamp', intervalStart.toJSDate())
    
    console.log(`Exact match query found ${exactMatch.length} records`)
    
    // Approach 2: Try different timestamp formats
    const queryWithString = await WindData10Min.query()
      .where('stationId', testStationId)
      .where('timestamp', '>=', intervalStart.toSQL())
      .where('timestamp', '<', intervalStart.plus({ hours: 1 }).toSQL())
    
    console.log(`Query with SQL string found ${queryWithString.length} records`)
    
    const queryWithISO = await WindData10Min.query()
      .where('stationId', testStationId)
      .where('timestamp', '>=', intervalStart.toISO())
      .where('timestamp', '<', intervalStart.plus({ hours: 1 }).toISO())
    
    console.log(`Query with ISO string found ${queryWithISO.length} records`)
    
    // Let's try a very specific exact match with proper column names
    const exactTimestampMatch = await WindData10Min.query()
      .whereRaw('station_id = ? AND timestamp = ?', [testStationId, intervalStart.toJSDate()])
    
    console.log(`Exact timestamp match with raw SQL found ${exactTimestampMatch.length} records`)
    
    // Try the same approach as the working query
    const workingQuery = await WindData10Min.query()
      .where('stationId', testStationId)
    
    console.log(`Working stationId query found ${workingQuery.length} records`)
    
    // Now let's try to add the timestamp condition step by step
    const queryWithTimestamp = await WindData10Min.query()
      .where('stationId', testStationId)
      .where('timestamp', intervalStart.toJSDate())
    
    console.log(`Query with exact timestamp found ${queryWithTimestamp.length} records`)
    
    // And what about greater than or equal?
    const queryWithGTE = await WindData10Min.query()
      .where('stationId', testStationId)
      .where('timestamp', '>=', intervalStart.toJSDate())
    
    console.log(`Query with >= timestamp found ${queryWithGTE.length} records`)
    
    // Test the upper bound condition
    const queryWithLT = await WindData10Min.query()
      .where('stationId', testStationId)
      .where('timestamp', '<', intervalStart.plus({ hours: 1 }).toJSDate())
    
    console.log(`Query with < timestamp found ${queryWithLT.length} records`)
    
    // Test both conditions separately
    const queryWithBothConditions = await WindData10Min.query()
      .where('stationId', testStationId)
      .where('timestamp', '>=', intervalStart.toJSDate())
      .where('timestamp', '<', intervalStart.plus({ hours: 1 }).toJSDate())
    
    console.log(`Query with both conditions found ${queryWithBothConditions.length} records`)
    
    // Test with a much larger upper bound
    const queryWithLargeUpperBound = await WindData10Min.query()
      .where('stationId', testStationId)
      .where('timestamp', '>=', intervalStart.toJSDate())
      .where('timestamp', '<', intervalStart.plus({ days: 1 }).toJSDate())
    
    console.log(`Query with large upper bound found ${queryWithLargeUpperBound.length} records`)
    
    console.log(`\n=== Debugging interval bounds:`)
    console.log(`intervalStart: ${intervalStart.toJSDate()}`)
    console.log(`intervalStart + 1 hour: ${intervalStart.plus({ hours: 1 }).toJSDate()}`)
    console.log(`intervalStart + 1 day: ${intervalStart.plus({ days: 1 }).toJSDate()}`)
    
    // Test the fix: use <= instead of <
    const fixedQuery = await WindData10Min.query()
      .where('stationId', testStationId)
      .where('timestamp', '>=', intervalStart.toJSDate())
      .where('timestamp', '<=', intervalStart.plus({ hours: 1 }).minus({ milliseconds: 1 }).toJSDate())
    
    console.log(`Fixed query (using <=) found ${fixedQuery.length} records`)
    
    // Test the upper bound calculation
    const upperBound = intervalStart.plus({ hours: 1 }).minus({ milliseconds: 1 })
    console.log(`Upper bound: ${upperBound.toJSDate()}`)
    console.log(`Upper bound ISO: ${upperBound.toISO()}`)
    
    // Original range query (this should work now)
    const tenMinData = fixedQuery
    
    // Check what happens if we query for all records
    const allRecords = await WindData10Min.query()
      .where('stationId', testStationId)
    
    console.log(`Found ${allRecords.length} total records for this station`)
    allRecords.forEach((record, index) => {
      console.log(`Total record ${index + 1}: stationId='${record.stationId}', timestamp=${record.timestamp.toISO()}, avgSpeed: ${record.avgSpeed}`)
    })
    
    // Check if stationId is the issue
    const allRecordsNoFilter = await WindData10Min.query()
    console.log(`Found ${allRecordsNoFilter.length} total records in system`)
    allRecordsNoFilter.forEach((record, index) => {
      console.log(`System record ${index + 1}: stationId='${record.stationId}', timestamp=${record.timestamp.toISO()}, avgSpeed: ${record.avgSpeed}`)
    })
    
    // Try a different stationId match
    const testStationIdAlt = 'test-station-debug'
    const altStationQuery = await WindData10Min.query()
      .where('stationId', testStationIdAlt)
    
    console.log(`Alt station query for '${testStationIdAlt}' found ${altStationQuery.length} records`)
    
    console.log(`\n=== Test variables:`)
    console.log(`testStationId = '${testStationId}'`)
    console.log(`testStationId type = ${typeof testStationId}`)
    console.log(`intervalStart = ${intervalStart.toISO()}`)
    console.log(`intervalStart type = ${typeof intervalStart}`)
    console.log(`intervalStart.toJSDate() = ${intervalStart.toJSDate()}`)
    console.log(`intervalStart.toJSDate() type = ${typeof intervalStart.toJSDate()}`)
    
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