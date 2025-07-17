import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import WeatherStation from './weather_station.js'

export default class WindData1Min extends BaseModel {
  static table = 'wind_data_1min'

  /**
   * @summary Unique ID
   */
  @column({ isPrimary: true })
  declare id: number

  /**
   * @summary Station ID (references weather_stations)
   */
  @column()
  declare stationId: string

  /**
   * @summary Timestamp for the start of the 1-minute interval
   * Stored as ISO string for universal timezone compatibility
   */
  @column({
    prepare: (value: DateTime | string) => {
      // Always store as UTC ISO string for universal compatibility
      if (value instanceof DateTime) {
        return value.setZone('utc').toISO()
      }
      // If already a string, ensure it's in UTC ISO format
      return DateTime.fromISO(value).setZone('utc').toISO()
    },
    consume: (value: string) => {
      // Always return as UTC DateTime for consistent queries
      return DateTime.fromISO(value, { zone: 'utc' })
    },
    serialize: (value: DateTime) => {
      // Always serialize as UTC ISO string for API responses
      return value?.setZone('utc').toISO()
    }
  })
  declare timestamp: DateTime

  /**
   * @summary Average wind speed during the interval (m/s)
   */
  @column()
  declare avgSpeed: number

  /**
   * @summary Minimum wind speed during the interval (m/s)
   */
  @column()
  declare minSpeed: number

  /**
   * @summary Maximum wind speed during the interval (m/s)
   */
  @column()
  declare maxSpeed: number

  /**
   * @summary Dominant wind direction during the interval (degrees)
   */
  @column()
  declare dominantDirection: number

  /**
   * @summary Number of samples received during the interval
   */
  @column()
  declare sampleCount: number

  /**
   * @summary Creation timestamp
   */
  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  /**
   * @summary Update timestamp
   */
  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  /**
   * Relationship to weather station
   */
  @belongsTo(() => WeatherStation, {
    foreignKey: 'stationId',
    localKey: 'stationId',
  })
  declare station: BelongsTo<typeof WeatherStation>
}