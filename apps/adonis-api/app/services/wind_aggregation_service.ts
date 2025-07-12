import { DateTime } from 'luxon'
import WindOneMinuteDatum from '#models/wind_one_minute_datum'
import SensorReading from '#models/sensor_reading'

interface WindDataPoint {
  windSpeed: number
  windDirection: number
  timestamp: string
}

class WindAggregationService {
  /**
   * Store raw wind data point for aggregation
   */
  async storeWindData(stationId: string, windData: WindDataPoint): Promise<void> {
    // Store the raw wind data in sensor_readings table
    await SensorReading.create({
      sensorId: stationId,
      type: 'wind',
      windSpeed: windData.windSpeed,
      windDirection: windData.windDirection,
      // Use the provided timestamp or current time
      createdAt: windData.timestamp ? DateTime.fromISO(windData.timestamp) : DateTime.now(),
    })
  }

  /**
   * Aggregate wind data for a specific 1-minute interval
   */
  async aggregateWindDataForInterval(stationId: string, intervalStart: DateTime): Promise<void> {
    const intervalEnd = intervalStart.plus({ minutes: 1 })

    // Get all wind readings for this 1-minute interval
    const windReadings = await SensorReading.query()
      .where('sensor_id', stationId)
      .where('type', 'wind')
      .where('created_at', '>=', intervalStart.toSQL())
      .where('created_at', '<', intervalEnd.toSQL())

    // Skip if no data points
    if (windReadings.length === 0) {
      return
    }

    const windSpeeds = windReadings.map(r => r.windSpeed!).filter(s => s !== null)
    const windDirections = windReadings.map(r => r.windDirection!).filter(d => d !== null)

    if (windSpeeds.length === 0 || windDirections.length === 0) {
      return
    }

    // Calculate statistics
    const avgWindSpeed = windSpeeds.reduce((sum, speed) => sum + speed, 0) / windSpeeds.length
    const minWindSpeed = Math.min(...windSpeeds)
    const maxWindSpeed = Math.max(...windSpeeds)
    
    // Calculate average wind direction (handle circular nature)
    const avgWindDirection = this.calculateAverageDirection(windDirections)

    // Check if we already have data for this interval
    const existingData = await WindOneMinuteDatum.query()
      .where('station_id', stationId)
      .where('interval_start', intervalStart.toSQL())
      .first()

    if (existingData) {
      // Update existing record
      await existingData
        .merge({
          avgWindSpeed,
          minWindSpeed,
          maxWindSpeed,
          avgWindDirection,
        })
        .save()
    } else {
      // Create new record
      await WindOneMinuteDatum.create({
        stationId,
        intervalStart,
        avgWindSpeed,
        minWindSpeed,
        maxWindSpeed,
        avgWindDirection,
      })
    }
  }

  /**
   * Calculate average wind direction accounting for circular nature
   */
  private calculateAverageDirection(directions: number[]): number {
    // Convert to radians and calculate average using unit vectors
    const vectors = directions.map(deg => ({
      x: Math.cos(deg * Math.PI / 180),
      y: Math.sin(deg * Math.PI / 180)
    }))

    const avgX = vectors.reduce((sum, v) => sum + v.x, 0) / vectors.length
    const avgY = vectors.reduce((sum, v) => sum + v.y, 0) / vectors.length

    // Convert back to degrees
    let avgDirection = Math.atan2(avgY, avgX) * 180 / Math.PI
    if (avgDirection < 0) {
      avgDirection += 360
    }

    return Math.round(avgDirection)
  }

  /**
   * Process aggregation for completed minutes
   */
  async processCompletedMinutes(stationId: string, maxMinutesBack: number = 5): Promise<void> {
    const now = DateTime.now()
    
    // Process the last few completed minutes
    for (let i = 1; i <= maxMinutesBack; i++) {
      const intervalStart = now.minus({ minutes: i }).startOf('minute')
      await this.aggregateWindDataForInterval(stationId, intervalStart)
    }
  }

  /**
   * Clean up old 1-minute data (older than specified hours)
   */
  async cleanupOldData(maxAgeHours: number = 25): Promise<number> {
    const cutoffTime = DateTime.now().minus({ hours: maxAgeHours })
    
    const deletedCount = await WindOneMinuteDatum.query()
      .where('interval_start', '<', cutoffTime.toSQL())
      .delete()

    return deletedCount
  }

  /**
   * Get 1-minute wind data for a station
   */
  async getOneMinuteData(
    stationId: string, 
    fromTime?: DateTime, 
    toTime?: DateTime,
    limit: number = 100
  ): Promise<WindOneMinuteDatum[]> {
    const query = WindOneMinuteDatum.query()
      .where('station_id', stationId)
      .orderBy('interval_start', 'desc')
      .limit(limit)

    if (fromTime) {
      query.where('interval_start', '>=', fromTime.toSQL())
    }

    if (toTime) {
      query.where('interval_start', '<=', toTime.toSQL())
    }

    return await query
  }
}

// Export singleton instance
export const windAggregationService = new WindAggregationService()
export type { WindDataPoint }