import { test } from '@japa/runner'
import { DateTime } from 'luxon'
import WindData1Min from '#app/models/wind_data_1_min'
import WeatherStation from '#app/models/weather_station'
import { windAggregationService } from '#app/services/wind_aggregation_service'

test.group('Wind Aggregation Service', (group) => {
  const testStationId = 'test-station-aggregation'

  group.each.setup(async () => {
    // Clean up any existing test data
    await WindData1Min.query().delete()
    await WeatherStation.query().delete()

    // Create the test weather station
    await WeatherStation.create({
      stationId: testStationId,
      name: 'Test Aggregation Station',
      location: 'Test Environment',
      description: 'Test station for wind aggregation',
      isActive: true,
    })
  })

  group.each.teardown(async () => {
    // Clean up after each test
    await WindData1Min.query().delete()
    await WeatherStation.query().delete()
  })

  test('should aggregate wind data into 1-minute intervals', async ({ assert }) => {
    // Process multiple data points for the same minute
    const baseTimestamp = DateTime.now().startOf('minute').toISO()
    
    await windAggregationService.processWindData(testStationId, 10.0, 180, baseTimestamp)
    await windAggregationService.processWindData(testStationId, 15.0, 180, baseTimestamp)
    await windAggregationService.processWindData(testStationId, 8.0, 190, baseTimestamp)
    
    // Force flush to save the aggregated data
    await windAggregationService.forceFlushBuckets()

    // Check that aggregated data was saved
    const aggregatedData = await WindData1Min.query()
      .where('stationId', testStationId)
      .first()

    assert.isNotNull(aggregatedData)
    assert.equal(aggregatedData!.stationId, testStationId)
    assert.equal(aggregatedData!.avgSpeed, 11.0) // (10 + 15 + 8) / 3
    assert.equal(aggregatedData!.minSpeed, 8.0)
    assert.equal(aggregatedData!.maxSpeed, 15.0)
    assert.equal(aggregatedData!.sampleCount, 3)
    assert.equal(aggregatedData!.dominantDirection, 180) // Most frequent direction
  })

  test('should calculate dominant direction correctly', async ({ assert }) => {
    const baseTimestamp = DateTime.now().startOf('minute').toISO()
    
    // Add more samples for direction 270 than 180
    await windAggregationService.processWindData(testStationId, 10.0, 180, baseTimestamp)
    await windAggregationService.processWindData(testStationId, 12.0, 270, baseTimestamp)
    await windAggregationService.processWindData(testStationId, 11.0, 270, baseTimestamp)
    
    await windAggregationService.forceFlushBuckets()

    const aggregatedData = await WindData1Min.query()
      .where('stationId', testStationId)
      .first()

    assert.isNotNull(aggregatedData)
    assert.equal(aggregatedData!.dominantDirection, 270) // Most frequent direction
  })

  test('should handle multiple stations independently', async ({ assert }) => {
    const station2Id = 'test-station-2'
    await WeatherStation.create({
      stationId: station2Id,
      name: 'Test Station 2',
      location: 'Test Environment',
      description: 'Second test station',
      isActive: true,
    })

    const baseTimestamp = DateTime.now().startOf('minute').toISO()
    
    await windAggregationService.processWindData(testStationId, 10.0, 180, baseTimestamp)
    await windAggregationService.processWindData(station2Id, 20.0, 270, baseTimestamp)
    
    await windAggregationService.forceFlushBuckets()

    const station1Data = await WindData1Min.query()
      .where('stationId', testStationId)
      .first()
    
    const station2Data = await WindData1Min.query()
      .where('stationId', station2Id)
      .first()

    assert.isNotNull(station1Data)
    assert.isNotNull(station2Data)
    assert.equal(station1Data!.avgSpeed, 10.0)
    assert.equal(station2Data!.avgSpeed, 20.0)
    assert.equal(station1Data!.dominantDirection, 180)
    assert.equal(station2Data!.dominantDirection, 270)
  })

  test('should provide bucket monitoring information', async ({ assert }) => {
    const baseTimestamp = DateTime.now().startOf('minute').toISO()
    
    await windAggregationService.processWindData(testStationId, 10.0, 180, baseTimestamp)
    
    const bucketCount = windAggregationService.getBucketCount()
    const bucketInfo = windAggregationService.getBucketInfo()
    
    assert.equal(bucketCount, 1)
    assert.equal(bucketInfo.length, 1)
    assert.equal(bucketInfo[0].stationId, testStationId)
    assert.equal(bucketInfo[0].sampleCount, 1)
  })
})