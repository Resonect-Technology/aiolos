import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import WeatherStation from './weather_station.js'

export type WindTendency = 'increasing' | 'decreasing' | 'stable'

export default class WindData10Min extends BaseModel {
  static table = 'wind_data_10min'

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
   * @summary Timestamp for the start of the 10-minute interval
   */
  @column.dateTime()
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
   * @summary Wind tendency compared to previous 10-minute interval
   */
  @column()
  declare tendency: WindTendency

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